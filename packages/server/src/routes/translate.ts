/**
 * 翻译 API 路由
 * POST /api/translate — 自动检测中/英文，调用腾讯云 TMT 翻译
 * @author yinnan
 */
import { Hono } from "hono";
import { translateViaTencentTmt } from "../utils/tencentTmt.js";

const app = new Hono();

/** 最大输入字符数 */
const MAX_CHARS = 1000;

// ---- 每日字符数限制 ----

/** 每日翻译字符数上限 */
const DAILY_LIMIT = 100_000;

/** 当前计数日期 */
let dailyDate = "";
/** 当日已用字符数 */
let dailyCharCount = 0;

/**
 * 检查每日字符限制，未超限则累加计数
 * @returns 错误消息（超限时），否则 null
 * @author yinnan
 */
function checkDailyLimit(textLength: number): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyDate !== today) {
    dailyDate = today;
    dailyCharCount = 0;
  }
  if (dailyCharCount + textLength > DAILY_LIMIT) {
    return `Daily translation limit (${DAILY_LIMIT.toLocaleString()} characters) reached. Please try again tomorrow.`;
  }
  dailyCharCount += textLength;
  return null;
}

/**
 * 检测文本主要语言
 * CJK 字符占比 > 30% 视为中文，否则英文
 * @author yinnan
 */
function detectLanguage(text: string): "zh" | "en" {
  let cjkCount = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
      (code >= 0xf900 && code <= 0xfaff) // CJK Compatibility Ideographs
    ) {
      cjkCount++;
    }
  }
  return cjkCount / text.length > 0.3 ? "zh" : "en";
}

// POST /api/translate
app.post("/", async (c) => {
  let body: { text?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const text = body.text?.trim();

  // 校验
  if (!text) {
    return c.json({ error: "Text is required" }, 400);
  }
  if (text.length > MAX_CHARS) {
    return c.json({ error: `Text exceeds ${MAX_CHARS} characters` }, 400);
  }

  // 每日字符限制检查
  const limitError = checkDailyLimit(text.length);
  if (limitError) {
    return c.json({ error: limitError }, 429);
  }

  // 语言检测
  const sourceLang = detectLanguage(text);
  const targetLang = sourceLang === "zh" ? "en" : "zh";

  try {
    const translatedText = await translateViaTencentTmt(text, sourceLang, targetLang);
    return c.json({
      sourceLang,
      targetLang,
      originalText: text,
      translatedText,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";

    // TMT 未配置
    if (message === "TMT_NOT_CONFIGURED") {
      return c.json({ error: "Translation service not configured" }, 503);
    }

    // 超时
    if (message.includes("timeout")) {
      return c.json({ error: "Translation timed out, please try again" }, 504);
    }

    console.error("Translation error:", message);
    return c.json({ error: "Translation service unavailable" }, 502);
  }
});

export default app;
