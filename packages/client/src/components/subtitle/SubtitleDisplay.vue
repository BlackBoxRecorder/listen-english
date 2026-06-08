<template>
  <div class="flex-1 overflow-y-auto p-4">
    <!-- 材料标题 -->
    <h2 v-if="title" class="font-bold text-lg text-gray-900 mb-4 pb-2 border-b border-gray-200">
      {{ title }}
    </h2>
    <div v-else class="text-center text-gray-400 mb-4 pb-2 border-b border-gray-200">
      No material selected.
    </div>

    <div class="space-y-2">
      <div
        v-for="(sub, idx) in subtitles"
        :key="sub.lineIndex"
        :ref="(el) => setActiveRef(el as HTMLElement | null, idx)"
        class="p-2 rounded transition-colors"
        :class="idx === activeIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''"
      >
        <p class="text-gray-800">
          <template v-for="(seg, i) in splitIntoSegments(sub.englishText || '')" :key="i">
            <span
              v-if="seg.isWord"
              @click="wordStore.selectWord(seg.text)"
              class="cursor-pointer rounded-sm px-0.5 transition-colors hover:bg-blue-100"
              :class="isSelected(seg.text) ? 'bg-blue-200 hover:bg-blue-200' : ''"
              >{{ seg.text }}</span
            >
            <span v-else>{{ seg.text }}</span>
          </template>
        </p>
      </div>
      <div v-if="subtitles.length === 0" class="text-center text-gray-400 mt-20">
        No subtitles available.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useListeningStore } from "../../stores/listening";
import { useWordStore } from "../../stores/word";
import { useSubtitleSync } from "../../composables/useSubtitleSync";
import { splitIntoSegments } from "../../utils/wordSplitter";

const listeningStore = useListeningStore();
const wordStore = useWordStore();
const activeEl = ref<HTMLElement | null>(null);

const subtitles = computed(() => listeningStore.currentMaterial?.subtitles ?? []);
const title = computed(() => listeningStore.currentMaterial?.title ?? "");
const { activeIndex } = useSubtitleSync(() => subtitles.value);

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
    activeEl.value.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
</script>
