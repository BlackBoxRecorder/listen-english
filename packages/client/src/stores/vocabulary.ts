import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const STORAGE_KEY = 'listen-english-vocabulary';

export const useVocabularyStore = defineStore('vocabulary', () => {
  const words = ref<string[]>([]);

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          words.value = parsed;
        }
      }
    } catch {
      words.value = [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words.value));
  }

  function addWord(word: string) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    const index = words.value.indexOf(normalized);
    if (index !== -1) {
      // Already exists, move to front
      words.value.splice(index, 1);
    }
    words.value.unshift(normalized);
    persist();
  }

  function removeWord(word: string) {
    words.value = words.value.filter(w => w !== word);
    persist();
  }

  function clearAll() {
    words.value = [];
    persist();
  }

  const wordCount = computed(() => words.value.length);

  function hasWord(word: string) {
    return words.value.includes(word.trim().toLowerCase());
  }

  function recentWords(n: number) {
    return words.value.slice(0, n);
  }

  // Initialize on store creation
  loadFromStorage();

  return { words, wordCount, addWord, removeWord, clearAll, hasWord, recentWords };
});
