// 通用 LLM 调用工具模块，支持 OpenAI 兼容的多个 provider
// @author listen-english

import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/utils → packages/server
const SERVER_ROOT = resolve(__dirname, "../../");
const CONFIG_PATH = join(SERVER_ROOT, "llm.config.json");

// ── 类型定义 ──

interface ProviderConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  timeout?: number;
}

interface LLMConfig {
  activeProvider: string;
  providers: Record<string, ProviderConfig>;
}

interface ResolvedProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  timeout: number;
}

// ── 配置加载 ──

const DEFAULT_MAX_TOKENS = 3000;
const DEFAULT_TIMEOUT = 30000;

/**
 * 解析 apiKey 字段：以 $ 开头表示引用环境变量，否则视为直接值
 * @param ref apiKey 原始值
 * @returns 解析后的 API Key，若环境变量不存在则返回 undefined
 */
function resolveApiKey(ref: string): string | undefined {
  if (ref.startsWith("$")) {
    return process.env[ref.slice(1)];
  }
  return ref;
}

/**
 * 读取并校验 llm.config.json，返回已解析的活跃 provider 配置
 * @returns 已解析的 provider 配置，配置无效时返回 null
 */
function loadActiveProvider(): ResolvedProviderConfig | null {
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf-8");
  } catch {
    console.warn(`[llm] 配置文件不存在: ${CONFIG_PATH} — AI 分析 API 将返回 503`);
    return null;
  }

  let config: LLMConfig;
  try {
    config = JSON.parse(raw) as LLMConfig;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[llm] 配置文件 JSON 格式错误: ${msg}`);
    throw new Error(`LLM config JSON parse error: ${msg}`);
  }

  if (!config.activeProvider || !config.providers?.[config.activeProvider]) {
    const available = Object.keys(config.providers ?? {}).join(", ") || "(空)";
    console.error(
      `[llm] activeProvider "${config.activeProvider}" 不在 providers 中，可用: ${available}`,
    );
    throw new Error(`LLM config: activeProvider "${config.activeProvider}" not found`);
  }

  const provider = config.providers[config.activeProvider];
  const apiKey = resolveApiKey(provider.apiKey);
  if (!apiKey) {
    const envName = provider.apiKey.startsWith("$") ? provider.apiKey.slice(1) : provider.apiKey;
    console.warn(
      `[llm] provider "${config.activeProvider}" 的 apiKey 引用的环境变量 ${envName} 未设置 — AI 分析 API 将返回 503`,
    );
    return null;
  }

  return {
    name: config.activeProvider,
    endpoint: provider.endpoint,
    model: provider.model,
    apiKey,
    maxTokens: provider.maxTokens ?? DEFAULT_MAX_TOKENS,
    timeout: provider.timeout ?? DEFAULT_TIMEOUT,
  };
}

// 启动时加载配置，只加载一次
const activeProvider = loadActiveProvider();

if (activeProvider) {
  console.log(`[llm] 活跃 provider: ${activeProvider.name} (model: ${activeProvider.model})`);
}

// ── 公共导出 ──

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
    return `你是一个英语语法助手。请简洁分析以下英文句子，用中文回复，控制在300字以内，包含：
1. 句子结构（主谓宾/主系表等）
2. 关键短语标注

原句：${text}`;
  }

  return `你是一个英语语法助手。请详细分析以下英文长难句，用中文回复，控制在1000字以内，包含：
1. 整体句子结构（主谓宾/主系表等）
2. 从句类型标注（定语从句、状语从句等）
3. 逐层语法拆解
4. 关键短语和特殊用法说明

原句：${text}`;
}

/**
 * 调用 LLM API 生成句子分析（OpenAI 兼容格式）
 * @param prompt 提示词
 * @returns AI 返回的分析文本
 * @throws LLM_NOT_CONFIGURED 配置文件缺失或 apiKey 未设置
 */
export async function callLLM(prompt: string): Promise<string> {
  if (!activeProvider) {
    throw new Error("LLM_NOT_CONFIGURED");
  }

  const res = await fetch(activeProvider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeProvider.apiKey}`,
    },
    body: JSON.stringify({
      model: activeProvider.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: activeProvider.maxTokens,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(activeProvider.timeout),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${errBody}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM API returned empty response");
  }
  return content;
}
