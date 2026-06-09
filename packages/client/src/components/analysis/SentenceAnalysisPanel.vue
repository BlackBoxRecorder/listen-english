<template>
  <div class="w-[360px] border-l border-gray-200 bg-white flex flex-col shrink-0">
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

    <!-- Body (scrollable) -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <!-- Loading -->
      <div v-if="analysisStore.isLoading" class="space-y-3 animate-pulse">
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useAnalysisStore } from "../../stores/analysis";
import "../../styles/github-markdown.css";

const analysisStore = useAnalysisStore();

const renderedContent = computed(() => {
  const content = analysisStore.currentResult?.content;
  if (!content) return "";
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") analysisStore.closePanel();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>
