/**
 * 字幕翻译脚本
 * 查询 subtitles 表中 chinese_text 为空但 english_text 不为空的记录，
 * 调用腾讯云机器翻译 API (en→zh) 翻译英文文本，写回数据库。
 *
 * 运行方式:
 *   pnpm --filter server exec tsx src/tasks/translateSubtitles.ts -- --limit 10
 *   pnpm --filter server exec tsx src/tasks/translateSubtitles.ts              (无限制)
 * 前置条件: 设置 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY 环境变量
 */
import crypto from "crypto";
import https from "https";
import { isNull, isNotNull, eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { subtitles } from "../db/schema.js";

// ---- 命令行参数解析 ----

function parseArgs(): { limit: number | null } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && i + 1 < args.length) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val) && val > 0) limit = val;
      i++;
    }
  }
  return { limit };
}

// ---- 类型定义 ----

interface SubtitlesRow {
  id: number;
  listeningId: number;
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string | null;
  chineseText: string | null;
}

interface TranslateResponse {
  Response: {
    TargetText?: string;
    Source?: string;
    Target?: string;
    Error?: { Code: string; Message: string };
    RequestId: string;
  };
}

// ---- 腾讯云 API 签名相关 ----

const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const HOST = "tmt.tencentcloudapi.com";
const SERVICE = "tmt";
const REGION = "ap-beijing";
const ACTION = "TextTranslate";
const VERSION = "2018-03-21";

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

// ---- API 调用 ----

/** 上次调用时间戳（毫秒），用于控制频率 */
let lastCallTime = 0;
const MIN_INTERVAL_MS = 250; // 5 QPS 限制，留余量

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitWait(): Promise<void> {
  const elapsed = Date.now() - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  lastCallTime = Date.now();
}

/**
 * 调用腾讯云 TextTranslate API
 * @returns 翻译后的中文文本
 */
function callTranslateApi(englishText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      SourceText: englishText,
      Source: "en",
      Target: "zh",
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

/**
 * 带重试的翻译调用
 * @param text 英文原文
 * @param retriesLeft 剩余重试次数
 * @returns 翻译后的中文文本
 */
async function translateText(text: string, retriesLeft = 3): Promise<string> {
  try {
    await rateLimitWait();
    return await callTranslateApi(text);
  } catch (err) {
    if (retriesLeft <= 0) throw err;
    const delayMs = Math.pow(2, 3 - retriesLeft) * 1000; // 1s, 2s, 4s
    console.log(
      `  重试中... (${4 - retriesLeft}/3) 等待 ${delayMs / 1000}s - ${(err as Error).message}`,
    );
    await sleep(delayMs);
    return translateText(text, retriesLeft - 1);
  }
}

// ---- 主流程 ----

interface Stats {
  success: number;
  skipped: number;
  failed: number;
}

async function main(): Promise<void> {
  // 解析参数
  const { limit } = parseArgs();

  // 检查环境变量
  if (!SECRET_ID || !SECRET_KEY) {
    console.error("错误: 请设置环境变量 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY");
    process.exit(1);
  }

  // 查询待翻译记录
  const records = db
    .select()
    .from(subtitles)
    .where(and(isNull(subtitles.chineseText), isNotNull(subtitles.englishText)))
    .all() as SubtitlesRow[];

  if (records.length === 0) {
    console.log("没有需要翻译的字幕记录。");
    return;
  }

  const toProcess = limit !== null ? records.slice(0, limit) : records;

  if (limit !== null) {
    console.log(
      `找到 ${records.length} 条待翻译记录，限制处理 ${toProcess.length} 条，开始处理...\n`,
    );
  } else {
    console.log(`找到 ${records.length} 条待翻译记录，开始处理...\n`);
  }

  const stats: Stats = { success: 0, skipped: 0, failed: 0 };

  for (let i = 0; i < toProcess.length; i++) {
    const record = toProcess[i];
    const englishText = record.englishText?.trim();

    // 跳过空文本
    if (!englishText) {
      stats.skipped++;
      console.log(`[${i + 1}/${toProcess.length}] 跳过 (ID=${record.id}): english_text 为空`);
      continue;
    }

    console.log(
      `[${i + 1}/${toProcess.length}] 翻译中 (ID=${record.id}): ${englishText.slice(0, 50)}${englishText.length > 50 ? "..." : ""}`,
    );

    try {
      const chineseText = await translateText(englishText);

      db.update(subtitles).set({ chineseText }).where(eq(subtitles.id, record.id)).run();

      stats.success++;
      console.log(`  => ${chineseText}`);
    } catch (err) {
      stats.failed++;
      console.log(`  ✗ 失败: ${(err as Error).message}`);
    }
  }

  console.log(`\n翻译完成。成功: ${stats.success}, 跳过: ${stats.skipped}, 失败: ${stats.failed}`);
}

main().catch((err) => {
  console.error("脚本执行失败:", err);
  process.exit(1);
});
