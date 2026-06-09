import { defineStore } from "pinia";
import { ref, computed } from "vue";

const STORAGE_KEY = "listen-english-vocabulary";

export interface VocabEntry {
  word: string;
  subtitleId: number;
}

export const useVocabularyStore = defineStore("vocabulary", () => {
  const words = ref<VocabEntry[]>([]);

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        words.value = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        words.value = [];
        return;
      }
      // 兼容旧格式 string[] → 自动迁移为 VocabEntry[]
      if (parsed.length > 0 && typeof parsed[0] === "string") {
        words.value = (parsed as string[]).map((w) => ({ word: w, subtitleId: 0 }));
        persist(); // 持久化新格式
        return;
      }
      words.value = parsed as VocabEntry[];
    } catch {
      words.value = [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words.value));
  }

  function addWord(word: string, subtitleId: number = 0) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    const index = words.value.findIndex((e) => e.word === normalized);
    if (index !== -1) {
      // 已存在：移到最前，更新 subtitleId
      words.value.splice(index, 1);
    }
    words.value.unshift({ word: normalized, subtitleId });
    persist();
  }

  function removeWord(word: string) {
    words.value = words.value.filter((e) => e.word !== word);
    persist();
  }

  function clearAll() {
    words.value = [];
    persist();
  }

  const wordCount = computed(() => words.value.length);

  function hasWord(word: string) {
    return words.value.some((e) => e.word === word.trim().toLowerCase());
  }

  function recentWords(n: number): VocabEntry[] {
    return words.value.slice(0, n);
  }

  /** 根据 word 获取 subtitleId，未找到返回 0 */
  function getSubtitleId(word: string): number {
    const entry = words.value.find((e) => e.word === word.trim().toLowerCase());
    return entry?.subtitleId ?? 0;
  }

  // Initialize on store creation
  loadFromStorage();

  return { words, wordCount, addWord, removeWord, clearAll, hasWord, recentWords, getSubtitleId };
});
