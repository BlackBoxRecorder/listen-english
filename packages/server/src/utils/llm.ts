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
  /** 是否禁用思考模式（DeepSeek 专有参数，其他 provider 忽略） */
  disableThinking?: boolean;
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
  disableThinking: boolean;
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
    disableThinking: provider.disableThinking ?? false,
  };
}

// 启动时加载配置，只加载一次
const activeProvider = loadActiveProvider();

if (activeProvider) {
  console.log(`[llm] 活跃 provider: ${activeProvider.name} (model: ${activeProvider.model})`);
}

// ── 公共导出 ──

/**
 * 构建英语句子语法分析提示词（结构化标注式）
 * @param text 英文句子原文
 * @returns 完整的提示词字符串
 */
export function buildPrompt(text: string): string {
  return `你是一个英语语法助手。请分析以下英文句子的语法，用中文回复，控制在500字以内，严格按以下格式输出。

示例——
输入：She reads books quietly in the library.
输出：
【句子成分】
主语：She / 谓语：reads / 宾语：books / 状语：quietly in the library
【时态语态】
时态：一般现在时 / 语态：主动语态

现在分析——
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

/**
 * 流式调用 LLM API 生成句子分析（OpenAI 兼容 SSE 格式），逐 chunk 产出
 * 相比 callLLM 额外传入 stream:true 和 thinking:{type:"disabled"} 以加速首字响应
 * @param prompt 提示词
 * @yields 逐段文本内容
 * @throws LLM_NOT_CONFIGURED 配置文件缺失或 apiKey 未设置
 */
export async function* callLLMStream(prompt: string): AsyncGenerator<string> {
  if (!activeProvider) {
    throw new Error("LLM_NOT_CONFIGURED");
  }

  const body: Record<string, unknown> = {
    model: activeProvider.model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: activeProvider.maxTokens,
    temperature: 0.3,
    stream: true,
  };
  if (activeProvider.disableThinking) {
    body.thinking = { type: "disabled" };
  }

  const res = await fetch(activeProvider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeProvider.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(activeProvider.timeout),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${errBody}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("LLM API returned empty response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行解析
      const lines = buffer.split("\n");
      // 最后一行可能不完整，保留到下次
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(dataStr) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // 跳过无法解析的行（如注释）
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
