<template>
  <div class="h-full flex flex-col">
    <!-- Search input - fixed at top -->
    <div class="shrink-0 px-4 pt-8 pb-4">
      <div class="max-w-2xl mx-auto">
        <div class="flex gap-2">
          <input
            v-model="query"
            type="text"
            placeholder="Search for a word..."
            class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keydown.enter="onSearch"
          />
          <button
            @click="onSearch"
            :disabled="!query.trim()"
            class="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </div>

    <!-- Result - scrollable area -->
    <div class="flex-1 min-h-0 px-4 pb-8">
      <div class="max-w-2xl mx-auto h-full">
        <WordDefinitionCard :word="searchedWord" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WordDefinitionCard from "./WordDefinitionCard.vue";
import { useVocabularyStore } from "../../stores/vocabulary";

const vocabularyStore = useVocabularyStore();

const query = ref("");
const searchedWord = ref<string | null>(null);

function onSearch() {
  const word = query.value.trim().toLowerCase();
  if (!word) return;
  // Auto-save to vocabulary (skip if query contains Chinese characters)
  const isChinese = /[\u4e00-\u9fff]/.test(word);
  if (!isChinese) {
    vocabularyStore.addWord(word);
  }
  searchedWord.value = word;
}
</script>
