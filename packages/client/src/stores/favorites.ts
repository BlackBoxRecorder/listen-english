import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "listen-english-favorites";

function loadFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is number => typeof v === "number"));
  } catch {
    return new Set();
  }
}

function saveToStorage(ids: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // 静默忽略（隐私模式 / 配额满等）
  }
}

export const useFavoritesStore = defineStore("favorites", () => {
  const favoriteIds = ref<Set<number>>(loadFromStorage());

  function isFavorite(id: number): boolean {
    return favoriteIds.value.has(id);
  }

  function toggleFavorite(id: number): void {
    const next = new Set(favoriteIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    favoriteIds.value = next;
    saveToStorage(next);
  }

  return { favoriteIds, isFavorite, toggleFavorite };
});
