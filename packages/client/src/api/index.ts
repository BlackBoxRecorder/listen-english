const BASE = "/api";

export async function fetchListenings() {
  const res = await fetch(`${BASE}/listening`);
  return res.json();
}

export async function fetchListening(id: number) {
  const res = await fetch(`${BASE}/listening/${id}`);
  return res.json();
}

export interface AnalysisStreamResult {
  subtitleId: number;
  originalText: string;
  analysisType: "simple" | "detailed";
  content: string;
}

/**
 * 流式获取句子分析，逐 chunk 回调渲染，支持 AbortController 中断
 * @param subtitleId 字幕 ID
 * @param onChunk 每收到一个文本片段时调用
 * @param signal 用于取消请求的 AbortSignal
 * @returns 完整分析结果
 */
export async function fetchSentenceAnalysisStream(
  subtitleId: number,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  onMeta?: (meta: {
    subtitleId: number;
    originalText: string;
    analysisType: "simple" | "detailed";
  }) => void,
): Promise<AnalysisStreamResult> {
  const res = await fetch(`${BASE}/analysis/${subtitleId}`, { signal });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  // 缓存命中：后端返回 JSON
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as AnalysisStreamResult;
    onChunk(data.content);
    return data;
  }

  // 流式响应：后端返回 text/event-stream
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Empty response body");
  }

  // abort 时取消 reader 停止消费流
  const onAbort = () => reader.cancel();
  signal?.addEventListener("abort", onAbort, { once: true });

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let receivedDone = false;
  let meta: {
    subtitleId: number;
    originalText: string;
    analysisType: "simple" | "detailed";
  } | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") {
          receivedDone = true;
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr) as {
            meta?: {
              subtitleId: number;
              originalText: string;
              analysisType: "simple" | "detailed";
            };
            chunk?: string;
            error?: string;
          };
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.meta) {
            meta = parsed.meta;
            onMeta?.(parsed.meta);
          }
          if (parsed.chunk) {
            fullContent += parsed.chunk;
            onChunk(parsed.chunk);
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }

  // 未收到 [DONE] 即结束 = 流异常中断
  if (!receivedDone) {
    throw new Error("Stream ended unexpectedly");
  }

  return {
    subtitleId: meta?.subtitleId ?? subtitleId,
    originalText: meta?.originalText ?? "",
    analysisType: meta?.analysisType ?? "simple",
    content: fullContent,
  };
}

export async function fetchSubtitle(id: number) {
  const res = await fetch(`${BASE}/subtitles/${id}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<{
    id: number;
    englishText: string | null;
    chineseText: string | null;
    listeningId: number;
  }>;
}
