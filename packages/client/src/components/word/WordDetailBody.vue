<template>
  <!-- Word header: word + phonetic + audio button -->
  <div v-if="wordStore.currentResult || wordStore.selectedWord" class="mb-4">
    <h2 class="text-xl font-bold text-gray-900 break-words">
      {{ wordStore.currentResult?.word ?? wordStore.selectedWord ?? "" }}
    </h2>
    <div v-if="wordStore.currentResult?.phonetic" class="flex items-center gap-1.5 mt-0.5">
      <span class="text-sm text-gray-500">/{{ wordStore.currentResult.phonetic.phonetic }}/</span>
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
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Definitions</h3>
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
    <section v-if="showExamples && wordStore.currentResult.collins_sents?.length">
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
    <section v-if="showExamples && wordStore.currentResult.trans_sents?.length">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Examples</h3>
      <ul class="space-y-3">
        <li v-for="(s, i) in wordStore.currentResult.trans_sents" :key="i">
          <p class="text-sm font-medium text-gray-800">{{ s.example }}</p>
          <p class="text-sm text-gray-500">{{ s.translate }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useWordStore } from "../../stores/word";

withDefaults(
  defineProps<{
    showExamples?: boolean;
  }>(),
  {
    showExamples: true,
  },
);

const wordStore = useWordStore();

function playAudio(url: string) {
  const audio = new window.Audio(url);
  audio.play();
}
</script>
