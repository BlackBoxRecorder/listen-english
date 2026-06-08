import { defineStore } from "pinia";
import { ref } from "vue";
import * as api from "../api";

export interface ListeningItem {
  id: number;
  title: string;
  duration: number | null;
  createdAt: string;
}

export interface Subtitle {
  id: number;
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string | null;
  chineseText: string | null;
}

export interface ListeningDetail extends ListeningItem {
  audioFilePath: string;
  subtitles: Subtitle[];
}

export const useListeningStore = defineStore("listening", () => {
  const materials = ref<ListeningItem[]>([]);
  const currentMaterial = ref<ListeningDetail | null>(null);

  async function fetchMaterials() {
    materials.value = await api.fetchListenings();
  }

  async function fetchMaterial(id: number) {
    currentMaterial.value = await api.fetchListening(id);
  }

  return { materials, currentMaterial, fetchMaterials, fetchMaterial };
});
