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
    <!-- Fixed header -->
    <div
      class="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10"
    >
      <h2 class="text-base font-semibold text-gray-700">Word Definition</h2>
      <button
        @click="wordStore.closePanel()"
        class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
      >
        &times;
      </button>
    </div>

    <!-- Body (scrollable) -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <!-- Word header: word + phonetic + audio button -->
      <div v-if="wordStore.currentResult || wordStore.selectedWord" class="mb-4">
        <h2 class="text-xl font-bold text-gray-900 break-words">
          {{ wordStore.currentResult?.word ?? wordStore.selectedWord ?? "" }}
        </h2>
        <div v-if="wordStore.currentResult?.phonetic" class="flex items-center gap-1.5 mt-0.5">
          <span class="text-sm text-gray-500"
            >/{{ wordStore.currentResult.phonetic.phonetic }}/</span
          >
          <button
            v-if="wordStore.currentResult.phonetic.audio"
            @click="playAudio(wordStore.currentResult!.phonetic.audio)"
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
      </div>
      <!-- Loading -->
      <div v-if="wordStore.isLoading" class="space-y-3 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        <div class="h-4 bg-gray-100 rounded w-full mt-4"></div>
        <div class="h-4 bg-gray-100 rounded w-5/6"></div>
      </div>

      <!-- Error -->
      <div v-else-if="wordStore.error" class="bg-red-50 text-red-600 rounded p-3 text-sm">
        {{ wordStore.error }}
      </div>

      <!-- No result -->
      <div v-else-if="!wordStore.currentResult" class="text-gray-400 text-sm text-center mt-8">
        No definition found for "{{ wordStore.selectedWord }}"
      </div>

      <!-- Content -->
      <div v-else class="space-y-4">
        <!-- Explains -->
        <section v-if="wordStore.currentResult.explains?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Definitions
          </h3>
          <ul class="space-y-1.5">
            <li
              v-for="(explain, i) in wordStore.currentResult.explains"
              :key="i"
              class="text-sm text-gray-700 leading-relaxed"
            >
              {{ explain }}
            </li>
          </ul>
        </section>

        <!-- Phrases -->
        <section v-if="wordStore.currentResult.phrase?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Phrases</h3>
          <ul class="space-y-2">
            <li v-for="(p, i) in wordStore.currentResult.phrase" :key="i" class="text-sm">
              <span class="font-medium text-gray-800">{{ p.key }}</span>
              <span class="text-gray-500 ml-2">{{ p.value.join("; ") }}</span>
            </li>
          </ul>
        </section>

        <!-- Collins Examples -->
        <section v-if="wordStore.currentResult.collins_sents?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Collins Examples
          </h3>
          <ul class="space-y-3">
            <li v-for="(s, i) in wordStore.currentResult.collins_sents" :key="i">
              <p v-if="s.description" class="text-xs text-gray-400 mb-0.5">{{ s.description }}</p>
              <p class="text-sm font-medium text-gray-800">{{ s.example }}</p>
              <p class="text-sm text-gray-500">{{ s.translate }}</p>
            </li>
          </ul>
        </section>

        <!-- Translation Examples -->
        <section v-if="wordStore.currentResult.trans_sents?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Examples</h3>
          <ul class="space-y-3">
            <li v-for="(s, i) in wordStore.currentResult.trans_sents" :key="i">
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
import { onMounted, onUnmounted, watch } from "vue";
import { useWordStore } from "../../stores/word";
import { useResizablePanel } from "../../composables/useResizablePanel";

const wordStore = useWordStore();
const { width, onMouseDown } = useResizablePanel();

/** 播放音频 */
function playAudio(url: string) {
  const audio = new window.Audio(url);
  audio.play();
}

// 查词结果加载完成后自动播放单词发音
watch(
  () => wordStore.currentResult,
  (result) => {
    if (result?.phonetic?.audio) {
      playAudio(result.phonetic.audio);
    }
  },
);

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") wordStore.closePanel();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>
