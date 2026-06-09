import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchSentenceAnalysis } from "../api";
import { registerPanel, activatePanel } from "../composables/usePanelCoordinator";

export interface AnalysisResult {
  subtitleId: number;
  originalText: string;
  analysisType: "simple" | "detailed";
  content: string;
}

// 当前会话内的前端缓存
const cache = new Map<number, AnalysisResult>();

export const useAnalysisStore = defineStore("analysis", () => {
  const panelOpen = ref(false);
  const currentSubtitleId = ref<number | null>(null);
  const currentResult = ref<AnalysisResult | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  let requestId = 0;

  /**
   * 请求句子分析，带缓存和请求去重
   * @param subtitleId 字幕 ID
   */
  async function analyzeSentence(subtitleId: number) {
    // 互斥：通过协调器关闭单词面板
    activatePanel("analysis");

    panelOpen.value = true;
    currentSubtitleId.value = subtitleId;
    error.value = null;

    // 命中前端缓存
    if (cache.has(subtitleId)) {
      currentResult.value = cache.get(subtitleId)!;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    currentResult.value = null;

    const thisRequestId = ++requestId;

    try {
      const data: AnalysisResult = await fetchSentenceAnalysis(subtitleId);

      // 忽略过期响应
      if (thisRequestId !== requestId) return;

      currentResult.value = data;
      cache.set(subtitleId, data);
    } catch (e) {
      if (thisRequestId !== requestId) return;
      error.value = e instanceof Error ? e.message : "Analysis failed";
      currentResult.value = null;
    } finally {
      if (thisRequestId === requestId) {
        isLoading.value = false;
      }
    }
  }

  function closePanel() {
    panelOpen.value = false;
    currentSubtitleId.value = null;
    currentResult.value = null;
    error.value = null;
  }

  // 注册面板关闭回调到协调器
  registerPanel("analysis", closePanel);

  return {
    panelOpen,
    currentSubtitleId,
    currentResult,
    isLoading,
    error,
    analyzeSentence,
    closePanel,
  };
});
