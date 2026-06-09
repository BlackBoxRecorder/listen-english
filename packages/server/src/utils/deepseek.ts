// DeepSeek API 调用工具模块，用于生成字幕句子的语法分析

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 15000;

if (!DEEPSEEK_API_KEY) {
  console.warn("[deepseek] DEEPSEEK_API_KEY is not set — AI analysis API will return 503");
}

/**
 * 根据英文句子词数判断分析的复杂度等级
 * @param text 英文句子原文
 * @returns "simple"（≤10词）或 "detailed"（>10词）
 */
export function getAnalysisType(text: string): "simple" | "detailed" {
  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return wordCount <= 10 ? "simple" : "detailed";
}

/**
 * 根据复杂度类型构建对应的中文提示词
 * @param text 英文句子原文
 * @param type 复杂度类型
 * @returns 完整的提示词字符串
 */
export function buildPrompt(text: string, type: "simple" | "detailed"): string {
  if (type === "simple") {
    return `你是一个英语语法助手。请简洁分析以下英文句子，用中文回复，包含：
1. 句子结构（主谓宾/主系表等）
2. 关键短语标注

原句：${text}`;
  }

  return `你是一个英语语法助手。请详细分析以下英文长难句，用中文回复，包含：
1. 整体句子结构（主谓宾/主系表等）
2. 从句类型标注（定语从句、状语从句等）
3. 逐层语法拆解
4. 关键短语和特殊用法说明

原句：${text}`;
}

/**
 * 调用 DeepSeek API 生成句子分析
 * @param prompt 提示词
 * @returns AI 返回的分析文本
 * @throws DEEPSEEK_API_KEY_NOT_CONFIGURED 环境变量未配置
 */
export async function callDeepSeek(prompt: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY_NOT_CONFIGURED");
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`DeepSeek API error ${res.status}: ${errBody}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API returned empty response");
  }
  return content;
}
