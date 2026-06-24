import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchSentenceAnalysisStream, type AnalysisStreamResult } from "../api";
import { registerPanel, activatePanel } from "../composables/usePanelCoordinator";

export interface AnalysisResult {
  subtitleId: number;
  originalText: string;
  analysisType: "grammar";
  content: string;
}

// 当前会话内的前端缓存
const cache = new Map<number, AnalysisResult>();

export const useAnalysisStore = defineStore("analysis", () => {
  const panelOpen = ref(false);
  const currentSubtitleId = ref<number | null>(null);
  const currentResult = ref<AnalysisResult | null>(null);
  const isLoading = ref(false);
  const streamingContent = ref<string>("");
  const error = ref<string | null>(null);

  let requestId = 0;
  let abortController: AbortController | null = null;

  /**
   * 请求句子分析，带缓存、请求去重和流式消费
   * @param subtitleId 字幕 ID
   */
  async function analyzeSentence(subtitleId: number) {
    // 互斥：通过协调器关闭单词面板
    activatePanel("analysis");

    // 取消上一个正在进行的流式请求
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // ★ 提前递增 requestId，让旧请求的所有 chunk 在缓存命中路径也被过滤
    const thisRequestId = ++requestId;

    panelOpen.value = true;
    currentSubtitleId.value = subtitleId;
    error.value = null;
    streamingContent.value = "";

    // 命中前端缓存
    if (cache.has(subtitleId)) {
      currentResult.value = cache.get(subtitleId)!;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    currentResult.value = null;

    abortController = new AbortController();
    const signal = abortController.signal;

    try {
      const data: AnalysisStreamResult = await fetchSentenceAnalysisStream(
        subtitleId,
        (chunk) => {
          // 忽略过期请求的 chunk
          if (thisRequestId === requestId) {
            streamingContent.value += chunk;
          }
        },
        signal,
        (meta) => {
          // 收到元数据时，立即设置部分 currentResult 以显示原文
          if (thisRequestId === requestId) {
            currentResult.value = {
              subtitleId: meta.subtitleId,
              originalText: meta.originalText,
              analysisType: meta.analysisType,
              content: "",
            };
          }
        },
      );

      // 忽略过期响应
      if (thisRequestId !== requestId) return;

      const result: AnalysisResult = {
        subtitleId: data.subtitleId,
        originalText: data.originalText,
        analysisType: data.analysisType,
        content: data.content,
      };
      currentResult.value = result;
      cache.set(subtitleId, result);
      streamingContent.value = ""; // 流式完成后清理
    } catch (e) {
      if (thisRequestId !== requestId) return;
      // AbortError 不视为错误（用户主动切换句子）
      if (e instanceof DOMException && e.name === "AbortError") return;
      error.value = e instanceof Error ? e.message : "Analysis failed";
      currentResult.value = null;
    } finally {
      if (thisRequestId === requestId) {
        isLoading.value = false;
        abortController = null;
      }
    }
  }

  function closePanel() {
    // 取消正在进行的流式请求
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    panelOpen.value = false;
    currentSubtitleId.value = null;
    currentResult.value = null;
    streamingContent.value = "";
    error.value = null;
  }

  // 注册面板关闭回调到协调器
  registerPanel("analysis", closePanel);

  return {
    panelOpen,
    currentSubtitleId,
    currentResult,
    streamingContent,
    isLoading,
    error,
    analyzeSentence,
    closePanel,
  };
});
