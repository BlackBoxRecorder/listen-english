<template>
  <!-- Desktop: right-side resizable panel -->
  <div
    v-if="!isMobile"
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
      <WordBody :show-examples="showExamples !== false" />
    </div>
  </div>

  <!-- Mobile: Bottom Sheet -->
  <div
    v-if="isMobile"
    class="fixed bottom-0 left-0 right-0 z-40 rounded-t-xl bg-white flex flex-col transition-transform duration-200 shadow-xl"
    :class="bottomSheetOpen ? 'translate-y-0' : 'translate-y-full'"
    :style="{ maxHeight: '85vh' }"
  >
    <!-- Drag indicator -->
    <div class="flex justify-center pt-2 pb-1">
      <div class="w-10 h-1 rounded-full bg-gray-300"></div>
    </div>
    <!-- Header -->
    <div class="px-4 py-2 flex items-center justify-between border-b border-gray-100">
      <h2 class="text-base font-semibold text-gray-700">Word Definition</h2>
      <button
        @click="closeMobile"
        class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
      >
        &times;
      </button>
    </div>
    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <WordBody :show-examples="showExamples !== false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { useWordStore } from "../../stores/word";
import { useResizablePanel } from "../../composables/useResizablePanel";
import WordBody from "./WordDetailBody.vue";

const props = defineProps<{
  isMobile: boolean;
  bottomSheetOpen: boolean;
  showExamples?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const wordStore = useWordStore();
const { width, onMouseDown } = useResizablePanel();

/** 播放音频 */
function playAudio(url: string) {
  const audio = new window.Audio(url);
  audio.play();
}

/** 移动端关闭 Bottom Sheet */
function closeMobile() {
  wordStore.closePanel();
  emit("close");
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

// Desktop: always listen (only in DOM when panelOpen). Mobile: only when bottom sheet is open.
watch(
  () => !props.isMobile || props.bottomSheetOpen,
  (shouldListen) => {
    if (shouldListen) {
      document.addEventListener("keydown", onKeydown);
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  },
  { immediate: true },
);

onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>
