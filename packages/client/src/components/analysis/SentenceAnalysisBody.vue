<template>
  <!-- 英文句子原文（固定不滚动） -->
  <div
    v-if="analysisStore.currentResult?.originalText"
    class="shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50"
  >
    <p class="text-sm text-gray-700 leading-relaxed">
      {{ analysisStore.currentResult.originalText }}
    </p>
  </div>

  <!-- AI 分析结果（可滚动） -->
  <div class="flex-1 overflow-y-auto px-4 py-3">
    <!-- Loading -->
    <div
      v-if="analysisStore.isLoading && !analysisStore.streamingContent"
      class="space-y-3 animate-pulse"
    >
      <div class="h-4 bg-gray-200 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 rounded w-full"></div>
      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
      <div class="h-4 bg-gray-100 rounded w-full mt-4"></div>
      <div class="h-4 bg-gray-100 rounded w-5/6"></div>
    </div>

    <!-- Error -->
    <div v-else-if="analysisStore.error" class="bg-red-50 text-red-600 rounded p-3 text-sm">
      {{ analysisStore.error }}
    </div>

    <!-- No result -->
    <div v-else-if="!analysisStore.currentResult" class="text-gray-400 text-sm text-center mt-8">
      No analysis available.
    </div>

    <!-- Content -->
    <div v-else class="markdown-body" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useAnalysisStore } from "../../stores/analysis";
import "../../styles/github-markdown.css";

const analysisStore = useAnalysisStore();

const renderedContent = ref("");
let rafId = 0;

watch(
  () => analysisStore.streamingContent || analysisStore.currentResult?.content || "",
  (content) => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (!content) {
        renderedContent.value = "";
        return;
      }
      const rawHtml = marked.parse(content, { async: false }) as string;
      renderedContent.value = DOMPurify.sanitize(rawHtml);
    });
  },
  { immediate: true },
);
</script>
