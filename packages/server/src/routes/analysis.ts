import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { subtitles, sentenceAnalyses } from "../db/schema.js";
import { getAnalysisType, buildPrompt, callLLMStream } from "../utils/llm.js";
import { stream } from "hono/streaming";

const app = new Hono();

// 基于 IP 的内存频率限制
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000;
/** 触发惰性清理的 Map 大小阈值 */
const RATE_LIMIT_CLEANUP_THRESHOLD = 1000;

/**
 * 检查 IP 是否在频率限制内
 * @returns true 表示允许请求
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // 惰性清理：Map 过大时清除过期条目，防止内存泄漏
  if (rateLimitMap.size > RATE_LIMIT_CLEANUP_THRESHOLD) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// GET /api/analysis/:subtitleId — 获取/生成句子分析
app.get("/:subtitleId", async (c) => {
  const subtitleId = Number(c.req.param("subtitleId"));
  if (Number.isNaN(subtitleId)) {
    return c.json({ error: "Invalid subtitleId" }, 400);
  }

  try {
    // 1. 先查缓存（缓存命中不消耗频率配额）
    const cached = db
      .select()
      .from(sentenceAnalyses)
      .where(eq(sentenceAnalyses.subtitleId, subtitleId))
      .get();

    if (cached) {
      // 查原句用于统一响应结构
      const sub = db
        .select({ englishText: subtitles.englishText })
        .from(subtitles)
        .where(eq(subtitles.id, subtitleId))
        .get();
      return c.json({
        subtitleId,
        originalText: sub?.englishText ?? "",
        analysisType: cached.analysisType,
        content: cached.content,
      });
    }

    // 2. 频率检查（仅在实际需要 AI 调用前检查）
    const ip = (c.req.header("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Too many requests, please try again later" }, 429);
    }

    // 3. 查字幕原文
    const sub = db
      .select({ englishText: subtitles.englishText })
      .from(subtitles)
      .where(eq(subtitles.id, subtitleId))
      .get();
    if (!sub?.englishText) {
      return c.json({ error: "Subtitle not found or has no text" }, 404);
    }

    // 4. 判断复杂度 + 流式调用 AI
    const analysisType = getAnalysisType(sub.englishText);
    const prompt = buildPrompt(sub.englishText, analysisType);

    return stream(c, async (writer) => {
      try {
        // 先发送元数据，让前端在流式过程中即可显示原文
        await writer.write(
          `data: ${JSON.stringify({ meta: { subtitleId, originalText: sub.englishText, analysisType } })}\n\n`,
        );

        let fullContent = "";
        const llmStream = callLLMStream(prompt);
        for await (const chunk of llmStream) {
          fullContent += chunk;
          await writer.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        await writer.write("data: [DONE]\n\n");

        // 5. 缓存结果（写入失败不影响已返回的流式内容）
        try {
          db.insert(sentenceAnalyses)
            .values({ subtitleId, analysisType, content: fullContent })
            .run();
        } catch (cacheErr) {
          console.error(`[analysis] 缓存写入失败 subtitleId=${subtitleId}:`, cacheErr);
        }
      } catch (streamErr) {
        const msg = streamErr instanceof Error ? streamErr.message : "Analysis failed";
        console.error("Sentence analysis stream error:", msg);
        await writer.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";

    // LLM 未配置 → 503
    if (message === "LLM_NOT_CONFIGURED") {
      return c.json({ error: "Analysis service not configured" }, 503);
    }

    // 区分超时与其他错误
    if (message.includes("AbortError") || message.includes("timeout")) {
      return c.json({ error: "Analysis timed out, please try again" }, 504);
    }

    console.error("Sentence analysis error:", message);
    return c.json({ error: "Analysis service unavailable" }, 502);
  }
});

export default app;
