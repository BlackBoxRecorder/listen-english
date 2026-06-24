<template>
  <div
    class="relative border-l border-gray-200 bg-white flex flex-col shrink-0"
    :style="{ width: width + 'px' }"
  >
    <!-- 拖拽手柄 -->
    <div
      @mousedown="onMouseDown"
      class="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 group"
    >
      <div
        class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors"
      ></div>
    </div>
    <!-- Sticky header -->
    <div
      class="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-start justify-between z-10"
    >
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-gray-800">Sentence Analyze</h2>
      </div>
      <button
        @click="analysisStore.closePanel()"
        class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0 ml-2"
      >
        &times;
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col min-h-0">
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
        <div
          v-else-if="!analysisStore.currentResult"
          class="text-gray-400 text-sm text-center mt-8"
        >
          No analysis available.
        </div>

        <!-- Content -->
        <div v-else class="markdown-body" v-html="renderedContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useAnalysisStore } from "../../stores/analysis";
import { useResizablePanel } from "../../composables/useResizablePanel";
import "../../styles/github-markdown.css";

const analysisStore = useAnalysisStore();
const { width, onMouseDown } = useResizablePanel();

// 使用 rAF 防抖的 markdown 渲染 ref，避免每 chunk 都触发完整解析
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") analysisStore.closePanel();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>
