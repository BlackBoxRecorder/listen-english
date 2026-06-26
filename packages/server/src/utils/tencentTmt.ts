/**
 * 腾讯云机器翻译 TMT 共享模块
 * 从 translateSubtitles.ts 抽取，供 translate 路由和字幕翻译脚本复用
 * @author yinnan
 */
import crypto from "crypto";
import https from "https";

// ---- 类型定义 ----

interface TranslateResponse {
  Response: {
    TargetText?: string;
    Source?: string;
    Target?: string;
    Error?: { Code: string; Message: string };
    RequestId: string;
  };
}

// ---- 腾讯云 API 配置 ----

const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const HOST = "tmt.tencentcloudapi.com";
const SERVICE = "tmt";
const REGION = "ap-beijing";
const ACTION = "TextTranslate";
const VERSION = "2018-03-21";

// ---- 签名工具函数 ----

function sha256(message: string, secret?: string | Buffer): Buffer {
  const hmac = crypto.createHmac("sha256", secret ?? "");
  return hmac.update(message).digest();
}

function sha256Hex(message: string, secret?: string | Buffer): string {
  const hmac = crypto.createHmac("sha256", secret ?? "");
  return hmac.update(message).digest("hex");
}

/** 纯 SHA256 哈希（非 HMAC），用于 payload 和 canonical request 的哈希 */
function sha256Hash(message: string): string {
  const hash = crypto.createHash("sha256");
  return hash.update(message).digest("hex");
}

function makeSignHeaders(payload: string): Record<string, string | number> {
  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = new Date(timestamp * 1000).toISOString().slice(0, 10); // YYYY-MM-DD

  // 步骤 1: 拼接规范请求串
  const signedHeaders = "content-type;host";
  const hashedPayload = sha256Hash(payload);
  const canonicalRequest = [
    "POST",
    "/",
    "",
    `content-type:application/json; charset=utf-8\nhost:${HOST}\n`,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  // 步骤 2: 拼接待签名字符串
  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${dateStr}/${SERVICE}/tc3_request`;
  const hashedCanonicalRequest = sha256Hash(canonicalRequest);
  const stringToSign = [algorithm, String(timestamp), credentialScope, hashedCanonicalRequest].join(
    "\n",
  );

  // 步骤 3: 计算签名
  const kDate = sha256(dateStr, `TC3${SECRET_KEY}`);
  const kService = sha256(SERVICE, kDate);
  const kSigning = sha256("tc3_request", kService);
  const signature = sha256Hex(stringToSign, kSigning);

  // 步骤 4: 拼接 Authorization
  const authorization = [
    `${algorithm} Credential=${SECRET_ID}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    Host: HOST,
    "X-TC-Action": ACTION,
    "X-TC-Timestamp": timestamp,
    "X-TC-Version": VERSION,
    "X-TC-Region": REGION,
  };
}

// ---- 频率控制 ----

/** 上次调用时间戳（毫秒），用于控制频率 */
let lastCallTime = 0;
const MIN_INTERVAL_MS = 250; // 5 QPS 限制，留余量

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  lastCallTime = now; // 提前更新时间戳，防止并发请求同时通过频率检查
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
}

// ---- API 调用 ----

/**
 * 调用腾讯云 TextTranslate API
 * @returns 翻译后的目标语言文本
 */
function callTranslateApi(text: string, sourceLang: string, targetLang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      SourceText: text,
      Source: sourceLang,
      Target: targetLang,
      ProjectId: 0,
    });

    const headers = makeSignHeaders(payload);

    const options: https.RequestOptions = {
      hostname: HOST,
      method: "POST",
      headers,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        try {
          const result: TranslateResponse = JSON.parse(data);
          if (result.Response.Error) {
            reject(
              new Error(
                `API Error: ${result.Response.Error.Code} - ${result.Response.Error.Message}`,
              ),
            );
            return;
          }
          const targetText = result.Response.TargetText;
          if (!targetText) {
            reject(new Error("API returned empty TargetText"));
            return;
          }
          resolve(targetText);
        } catch (err) {
          reject(new Error(`Failed to parse API response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request error: ${err.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout after 15s"));
    });

    req.write(payload);
    req.end();
  });
}

// ---- 导出函数 ----

/**
 * 带重试和频率控制的翻译调用
 * @param text 待翻译文本
 * @param sourceLang 源语言 ("zh" | "en")
 * @param targetLang 目标语言 ("zh" | "en")
 * @param retriesLeft 剩余重试次数
 * @returns 翻译后的文本
 */
export async function translateViaTencentTmt(
  text: string,
  sourceLang: "zh" | "en",
  targetLang: "zh" | "en",
  retriesLeft = 3,
): Promise<string> {
  // 检查密钥配置
  if (!SECRET_ID || !SECRET_KEY) {
    throw new Error("TMT_NOT_CONFIGURED");
  }

  try {
    await rateLimitWait();
    return await callTranslateApi(text, sourceLang, targetLang);
  } catch (err) {
    if (retriesLeft <= 0) throw err;
    const delayMs = Math.pow(2, 3 - retriesLeft) * 1000; // 1s, 2s, 4s
    console.warn(
      `[TMT] Retrying (${4 - retriesLeft}/3) in ${delayMs / 1000}s: ${(err as Error).message}`,
    );
    await sleep(delayMs);
    return translateViaTencentTmt(text, sourceLang, targetLang, retriesLeft - 1);
  }
}
