<template>
  <div
    class="h-[60px] shrink-0 bg-gray-50 border-t border-b border-gray-200 flex items-center justify-center px-4"
  >
    <p v-if="chineseText" class="text-base text-gray-700 text-center line-clamp-2">
      {{ chineseText }}
    </p>
    <p v-else class="text-sm text-gray-400 text-center">......</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useListeningStore } from "../../stores/listening";
import { useSubtitleSync } from "../../composables/useSubtitleSync";

const listeningStore = useListeningStore();
const subtitles = computed(() => listeningStore.currentMaterial?.subtitles ?? []);
const { activeIndex } = useSubtitleSync(() => subtitles.value);

const chineseText = computed(() => {
  if (activeIndex.value < 0) return null;
  return subtitles.value[activeIndex.value]?.chineseText ?? null;
});
</script>
