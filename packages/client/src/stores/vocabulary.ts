import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";

const STORAGE_KEY = "listen-english-vocabulary";
const SPELLING_CONFIG_KEY = "listen-english-spelling-config";

export interface VocabEntry {
  word: string;
  subtitleId: number;
}

export const useVocabularyStore = defineStore("vocabulary", () => {
  const words = ref<VocabEntry[]>([]);
  const selectedWordSet = ref<Set<string>>(new Set());
  const practiceCount = ref<number>(20);

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

  function loadSpellingConfig() {
    try {
      const raw = localStorage.getItem(SPELLING_CONFIG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.selectedWords && Array.isArray(parsed.selectedWords)) {
        selectedWordSet.value = new Set(
          (parsed.selectedWords as unknown[]).filter((v): v is string => typeof v === "string"),
        );
      }
      if (
        typeof parsed.practiceCount === "number" &&
        [10, 20, 30, 40, 50].includes(parsed.practiceCount)
      ) {
        practiceCount.value = parsed.practiceCount;
      }
    } catch {
      // 回退默认值
    }
  }

  function persistSpellingConfig() {
    localStorage.setItem(
      SPELLING_CONFIG_KEY,
      JSON.stringify({
        selectedWords: [...selectedWordSet.value],
        practiceCount: practiceCount.value,
      }),
    );
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
    selectedWordSet.value.delete(word.trim().toLowerCase());
    persist();
    persistSpellingConfig();
  }

  function clearAll() {
    words.value = [];
    selectedWordSet.value.clear();
    persist();
    persistSpellingConfig();
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

  function toggleWord(word: string) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;
    if (selectedWordSet.value.has(normalized)) {
      selectedWordSet.value.delete(normalized);
    } else {
      selectedWordSet.value.add(normalized);
    }
    // 触发响应式更新
    selectedWordSet.value = new Set(selectedWordSet.value);
    persistSpellingConfig();
  }

  function isWordSelected(word: string): boolean {
    return selectedWordSet.value.has(word.trim().toLowerCase());
  }

  function selectAll() {
    for (const entry of words.value) {
      selectedWordSet.value.add(entry.word);
    }
    selectedWordSet.value = new Set(selectedWordSet.value);
    persistSpellingConfig();
  }

  function deselectAll() {
    selectedWordSet.value.clear();
    selectedWordSet.value = new Set(selectedWordSet.value);
    persistSpellingConfig();
  }

  const selectedCount = computed(() => selectedWordSet.value.size);

  function getPracticeWords(): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    // 1. 取勾选的词（按 words 顺序）
    for (const entry of words.value) {
      if (selectedWordSet.value.has(entry.word)) {
        result.push(entry.word);
        seen.add(entry.word);
      }
    }

    // 2. 不足时补足未勾选的最近词
    if (result.length < practiceCount.value) {
      for (const entry of words.value) {
        if (result.length >= practiceCount.value) break;
        if (!seen.has(entry.word)) {
          result.push(entry.word);
          seen.add(entry.word);
        }
      }
    }

    return result;
  }

  // Initialize on store creation
  loadFromStorage();
  loadSpellingConfig();

  // 持久化 practiceCount 变更
  watch(practiceCount, () => {
    persistSpellingConfig();
  });

  return {
    words,
    wordCount,
    addWord,
    removeWord,
    clearAll,
    hasWord,
    recentWords,
    getSubtitleId,
    selectedWordSet,
    practiceCount,
    toggleWord,
    isWordSelected,
    selectAll,
    deselectAll,
    selectedCount,
    getPracticeWords,
  };
});
