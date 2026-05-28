<template>
  <div class="flex-1 overflow-y-auto p-4">
    <!-- Tab bar -->
    <div class="flex gap-1 mb-4 border-b pb-2">
      <button
        v-for="mode in modes"
        :key="mode.value"
        @click="listeningStore.subtitleMode = mode.value"
        class="px-3 py-1 text-sm rounded-t transition-colors"
        :class="listeningStore.subtitleMode === mode.value
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Hidden mode -->
    <div v-if="listeningStore.subtitleMode === 'hidden'" class="text-center text-gray-400 mt-20">
      Subtitles hidden
    </div>

    <!-- Reading mode -->
    <div v-else-if="listeningStore.subtitleMode === 'reading'" class="max-w-none">
      <div v-if="readingSegments.length" class="whitespace-pre-wrap text-gray-800 leading-relaxed">
        <template v-for="(seg, i) in readingSegments" :key="i">
          <span
            v-if="seg.isWord"
            @click="wordStore.selectWord(seg.text)"
            class="cursor-pointer rounded-sm px-0.5 transition-colors hover:bg-blue-100"
            :class="isSelected(seg.text) ? 'bg-blue-200 hover:bg-blue-200' : ''"
          >{{ seg.text }}</span>
          <span v-else>{{ seg.text }}</span>
        </template>
      </div>
      <div v-else class="text-gray-400">No original text available.</div>
    </div>

    <!-- Subtitle list modes -->
    <div v-else class="space-y-2">
      <div
        v-for="(sub, idx) in subtitles"
        :key="sub.lineIndex"
        :ref="(el) => setActiveRef(el as HTMLElement | null, idx)"
        class="p-2 rounded transition-colors"
        :class="idx === activeIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''"
      >
        <p v-if="showEnglish" class="text-gray-800">
          <template v-for="(seg, i) in splitIntoSegments(sub.englishText || '')" :key="i">
            <span
              v-if="seg.isWord"
              @click="wordStore.selectWord(seg.text)"
              class="cursor-pointer rounded-sm px-0.5 transition-colors hover:bg-blue-100"
              :class="isSelected(seg.text) ? 'bg-blue-200 hover:bg-blue-200' : ''"
            >{{ seg.text }}</span>
            <span v-else>{{ seg.text }}</span>
          </template>
        </p>
        <p v-if="showChinese" class="text-gray-500 text-sm mt-1">{{ sub.chineseText || '' }}</p>
      </div>
      <div v-if="subtitles.length === 0" class="text-center text-gray-400 mt-20">
        No subtitles available.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useListeningStore } from '../../stores/listening';
import { useWordStore } from '../../stores/word';
import { useSubtitleSync } from '../../composables/useSubtitleSync';
import { splitIntoSegments } from '../../utils/wordSplitter';

const listeningStore = useListeningStore();
const wordStore = useWordStore();
const activeEl = ref<HTMLElement | null>(null);

const subtitles = computed(() => listeningStore.currentMaterial?.subtitles ?? []);
const { activeIndex } = useSubtitleSync(() => subtitles.value);

const modes = [
  { value: 'hidden' as const, label: 'Hidden' },
  { value: 'english' as const, label: 'English' },
  { value: 'chinese' as const, label: 'Chinese' },
  { value: 'bilingual' as const, label: 'Bilingual' },
  { value: 'reading' as const, label: 'Reading' },
];

const showEnglish = computed(() =>
  ['english', 'bilingual'].includes(listeningStore.subtitleMode)
);
const showChinese = computed(() =>
  ['chinese', 'bilingual'].includes(listeningStore.subtitleMode)
);

const readingSegments = computed(() => {
  const text = listeningStore.currentMaterial?.originalText;
  return text ? splitIntoSegments(text) : [];
});

function isSelected(word: string) {
  return wordStore.selectedWord?.toLowerCase() === word.toLowerCase();
}

function setActiveRef(el: HTMLElement | null, idx: number) {
  if (idx === activeIndex.value) {
    activeEl.value = el;
  }
}

watch(activeIndex, async () => {
  await nextTick();
  if (activeEl.value) {
    activeEl.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
</script>
