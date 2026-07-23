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
      <SentenceAnalysisBody />
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
    <div class="px-4 py-2 flex items-start justify-between border-b border-gray-100">
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-gray-800">Sentence Analyze</h2>
      </div>
      <button
        @click="closeMobile"
        class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0 ml-2"
      >
        &times;
      </button>
    </div>
    <!-- Body -->
    <div class="flex-1 flex flex-col min-h-0">
      <SentenceAnalysisBody />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { useAnalysisStore } from "../../stores/analysis";
import { useResizablePanel } from "../../composables/useResizablePanel";
import SentenceAnalysisBody from "./SentenceAnalysisBody.vue";

const props = defineProps<{
  isMobile: boolean;
  bottomSheetOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const analysisStore = useAnalysisStore();
const { width, onMouseDown } = useResizablePanel();

function closeMobile() {
  analysisStore.closePanel();
  emit("close");
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") analysisStore.closePanel();
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
