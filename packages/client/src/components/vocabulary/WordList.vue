<template>
  <div class="flex flex-col h-full">
    <!-- Word count header -->
    <div class="px-4 py-2 border-b border-gray-200 text-sm text-gray-500">
      {{ vocabularyStore.wordCount }} words
    </div>

    <!-- Word list -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="vocabularyStore.words.length === 0" class="text-center text-gray-400 mt-12 px-4">
        No words yet. Click on words while listening to save them here.
      </div>
      <ul v-else>
        <li
          v-for="word in vocabularyStore.words"
          :key="word"
          class="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
          :class="selectedWord === word ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''"
          @click="emit('select', word)"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm text-gray-800 block">{{ word }}</span>
            <span v-if="briefDefs[word]" class="text-xs text-gray-400 block mt-0.5 truncate">
              {{ briefDefs[word] }}
            </span>
          </div>
          <button
            @click.stop="vocabularyStore.removeWord(word)"
            class="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs shrink-0 ml-2"
          >
            &times;
          </button>
        </li>
      </ul>
    </div>

    <!-- Clear all button -->
    <div v-if="vocabularyStore.words.length > 0" class="px-4 py-2 border-t border-gray-200">
      <button
        @click="onClearAll"
        class="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        Clear All
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { useVocabularyStore } from "../../stores/vocabulary";
import type { WordSearchResponse } from "../../types/word";

defineProps<{
  selectedWord: string | null;
}>();

const emit = defineEmits<{
  select: [word: string];
}>();

const vocabularyStore = useVocabularyStore();

// 缓存单词简要释义
const briefDefs = reactive<Record<string, string>>({});

async function fetchBriefDef(word: string) {
  if (briefDefs[word]) return;
  try {
    const res = await fetch(`/api/words/search?q=${encodeURIComponent(word)}&offset=0&limit=1`);
    if (!res.ok) return;
    const json: WordSearchResponse = await res.json();
    if (json.success && json.data?.explains?.length) {
      briefDefs[word] = json.data.explains[0];
    }
  } catch {
    // 忽略错误，不显示释义
  }
}

// 监听单词列表变化，自动获取新增单词的释义
watch(
  () => vocabularyStore.words.slice(),
  (words) => {
    for (const word of words) {
      fetchBriefDef(word);
    }
  },
  { immediate: true },
);

function onClearAll() {
  if (confirm("Are you sure you want to clear all words?")) {
    vocabularyStore.clearAll();
  }
}
</script>
