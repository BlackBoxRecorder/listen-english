<template>
  <div class="h-full overflow-y-auto py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Search input -->
      <div class="mb-8">
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

      <!-- Result -->
      <WordDefinitionCard :word="searchedWord" />
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
  // 自动保存到单词本
  vocabularyStore.addWord(word);
  searchedWord.value = word;
}
</script>
