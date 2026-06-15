<template>
  <div class="flex h-full">
    <!-- Left sidebar -->
    <ListeningList
      :materials="sortedMaterials"
      :selected-id="listeningStore.currentMaterial?.id ?? null"
      :favorite-ids="favoritesStore.favoriteIds"
      @select="onSelect"
      @toggle-favorite="favoritesStore.toggleFavorite"
    />

    <!-- Center content -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <SubtitleDisplay />
      <ChineseSubtitle />
      <AudioPlayer />
    </div>

    <!-- AI analysis panel (mutually exclusive with word panel) -->
    <SentenceAnalysisPanel v-if="analysisStore.panelOpen" />
    <!-- Word detail panel -->
    <WordDetailPanel v-else-if="wordStore.panelOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useListeningStore } from "../stores/listening";
import { usePlayerStore } from "../stores/player";
import { useWordStore } from "../stores/word";
import { useAnalysisStore } from "../stores/analysis";
import { useFavoritesStore } from "../stores/favorites";
import ListeningList from "../components/listening/ListeningList.vue";
import SubtitleDisplay from "../components/subtitle/SubtitleDisplay.vue";
import AudioPlayer from "../components/player/AudioPlayer.vue";
import ChineseSubtitle from "../components/subtitle/ChineseSubtitle.vue";
import WordDetailPanel from "../components/word/WordDetailPanel.vue";
import SentenceAnalysisPanel from "../components/analysis/SentenceAnalysisPanel.vue";

const listeningStore = useListeningStore();
const playerStore = usePlayerStore();
const wordStore = useWordStore();
const analysisStore = useAnalysisStore();
const favoritesStore = useFavoritesStore();

const sortedMaterials = computed(() => {
  const materials = listeningStore.materials;
  const favs = materials.filter((m) => favoritesStore.isFavorite(m.id));
  const rest = materials.filter((m) => !favoritesStore.isFavorite(m.id));
  return [...favs, ...rest];
});

onMounted(async () => {
  await listeningStore.fetchMaterials();
  if (sortedMaterials.value.length > 0) {
    await onSelect(sortedMaterials.value[0].id);
  }
});

async function onSelect(id: number) {
  wordStore.closePanel();
  analysisStore.closePanel();
  await listeningStore.fetchMaterial(id);
  if (listeningStore.currentMaterial) {
    playerStore.setAudio(listeningStore.currentMaterial.audioFilePath);
  }
}
</script>
