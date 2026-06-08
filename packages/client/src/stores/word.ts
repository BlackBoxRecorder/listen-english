import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WordData, WordSearchResponse } from '../types/word';
import { useVocabularyStore } from './vocabulary';

const cache = new Map<string, WordData | null>();

export const useWordStore = defineStore('word', () => {
  const selectedWord = ref<string | null>(null);
  const panelOpen = ref(false);
  const currentResult = ref<WordData | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  let requestId = 0;

  async function selectWord(word: string) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    // Auto-save to vocabulary notebook
    const vocabularyStore = useVocabularyStore();
    vocabularyStore.addWord(normalized);

    selectedWord.value = normalized;
    panelOpen.value = true;
    error.value = null;

    if (cache.has(normalized)) {
      currentResult.value = cache.get(normalized) ?? null;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    currentResult.value = null;

    const thisRequestId = ++requestId;

    try {
      const res = await fetch(
        `/api/words/search?q=${encodeURIComponent(normalized)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: WordSearchResponse = await res.json();

      // Ignore stale responses
      if (thisRequestId !== requestId) return;

      if (json.success && json.data) {
        currentResult.value = json.data;
        cache.set(normalized, json.data);
      } else {
        currentResult.value = null;
        error.value = 'No definition found';
        cache.set(normalized, null);
      }
    } catch (e) {
      if (thisRequestId !== requestId) return;
      error.value = e instanceof Error ? e.message : 'Lookup failed';
      currentResult.value = null;
    } finally {
      if (thisRequestId === requestId) {
        isLoading.value = false;
      }
    }
  }

  function closePanel() {
    panelOpen.value = false;
    selectedWord.value = null;
    currentResult.value = null;
    error.value = null;
  }

  return { selectedWord, panelOpen, currentResult, isLoading, error, selectWord, closePanel };
});
