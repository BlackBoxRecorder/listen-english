<template>
  <div class="flex flex-col h-full">
    <!-- Placeholder when no word selected -->
    <div v-if="!word" class="flex items-center justify-center h-full text-gray-400 text-sm">
      Select or search a word to see its definition
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="px-4 py-3 space-y-3 animate-pulse">
      <div class="h-6 bg-gray-200 rounded w-1/3"></div>
      <div class="h-4 bg-gray-100 rounded w-1/4"></div>
      <div class="h-4 bg-gray-200 rounded w-3/4 mt-4"></div>
      <div class="h-4 bg-gray-200 rounded w-full"></div>
      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="px-4 py-3">
      <div class="bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</div>
    </div>

    <!-- Content -->
    <div v-else-if="result" class="flex flex-col h-full">
      <!-- Sticky header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <h2 class="text-xl font-bold text-gray-900">{{ result.word }}</h2>
        <div v-if="result.phonetic" class="flex items-center gap-1.5 mt-0.5">
          <span class="text-sm text-gray-500">/{{ result.phonetic.phonetic }}/</span>
          <button
            v-if="result.phonetic.audio"
            @click="playAudio(result.phonetic.audio)"
            class="text-gray-400 hover:text-blue-500 text-sm leading-none"
            title="播放发音"
          >
            <svg class="w-4 h-4" viewBox="0 0 1024 1024" fill="currentColor">
              <path
                d="M852.864 831.52l-35.488-53.248a320 320 0 0 0 0-532.544l35.488-53.248a384 384 0 0 1 0 639.04z m-106.464-159.808l-35.456-53.216a128 128 0 0 0 0-212.992l35.456-53.216a191.808 191.808 0 0 1 0 319.424zM560 1024H512v-2.624L232.416 800H64a64 64 0 0 1-64-64V288a64 64 0 0 1 64-64h168.448L512 2.912V0h48a16 16 0 0 1 16 16v992a16 16 0 0 1-16 16zM256 288H64v448h192l256 203.424V84.576z"
              />
            </svg>
          </button>
        </div>
        <!-- 字幕上下文 -->
        <div
          v-if="subtitleText"
          class="mt-2 px-3 py-1.5 bg-blue-50 border-l-4 border-blue-300 rounded-r text-sm text-gray-600 italic"
        >
          {{ subtitleText }}
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <!-- Explains -->
        <section v-if="result.explains?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Definitions
          </h3>
          <ul class="space-y-1.5">
            <li
              v-for="(explain, i) in result.explains"
              :key="i"
              class="text-sm text-gray-700 leading-relaxed"
            >
              {{ explain }}
            </li>
          </ul>
        </section>

        <!-- Phrases -->
        <section v-if="result.phrase?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Phrases</h3>
          <ul class="space-y-2">
            <li v-for="(p, i) in result.phrase" :key="i" class="text-sm">
              <span class="font-medium text-gray-800">{{ p.key }}</span>
              <span class="text-gray-500 ml-2">{{ p.value.join("; ") }}</span>
            </li>
          </ul>
        </section>

        <!-- Translation Examples -->
        <section v-if="result.trans_sents?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Examples</h3>
          <ul class="space-y-3">
            <li v-for="(s, i) in result.trans_sents" :key="i">
              <p class="text-sm font-medium text-gray-800">{{ s.example }}</p>
              <p class="text-sm text-gray-500">{{ s.translate }}</p>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { WordData, WordSearchResponse } from "../../types/word";
import { fetchSubtitle } from "../../api";

const props = defineProps<{
  word: string | null;
  subtitleId?: number;
}>();

const isLoading = ref(false);
const error = ref<string | null>(null);
const result = ref<WordData | null>(null);
const subtitleText = ref<string | null>(null);

/** 播放音频 */
function playAudio(url: string) {
  const audio = new window.Audio(url);
  audio.play();
}

watch(
  () => props.word,
  async (newWord) => {
    if (!newWord) {
      result.value = null;
      error.value = null;
      return;
    }

    isLoading.value = true;
    error.value = null;
    result.value = null;

    try {
      const res = await fetch(`/api/words/search?q=${encodeURIComponent(newWord)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: WordSearchResponse = await res.json();

      if (json.success && json.data) {
        result.value = json.data;
      } else {
        error.value = `No definition found for "${newWord}"`;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Lookup failed";
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true },
);

// 监听 subtitleId 变化，获取字幕文本
let subtitleRequestId = 0;

watch(
  () => props.subtitleId,
  async (id) => {
    if (!id || id === 0) {
      subtitleText.value = null;
      return;
    }
    const thisRequestId = ++subtitleRequestId;
    try {
      const sub = await fetchSubtitle(id);
      if (thisRequestId !== subtitleRequestId) return; // 忽略过期请求
      subtitleText.value = sub?.englishText ?? null;
    } catch {
      if (thisRequestId !== subtitleRequestId) return;
      subtitleText.value = null;
    }
  },
  { immediate: true },
);
</script>
