<template>
  <div class="flex h-full">
    <!-- Left sidebar -->
    <ListeningList
      :materials="listeningStore.materials"
      :selected-id="listeningStore.currentMaterial?.id ?? null"
      @select="onSelect"
    />

    <!-- Center content -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <SubtitleDisplay />
      <ChineseSubtitle />
      <AudioPlayer />
    </div>

    <!-- Word detail panel -->
    <WordDetailPanel v-if="wordStore.panelOpen" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useListeningStore } from "../stores/listening";
import { usePlayerStore } from "../stores/player";
import { useWordStore } from "../stores/word";
import ListeningList from "../components/listening/ListeningList.vue";
import SubtitleDisplay from "../components/subtitle/SubtitleDisplay.vue";
import AudioPlayer from "../components/player/AudioPlayer.vue";
import ChineseSubtitle from "../components/subtitle/ChineseSubtitle.vue";
import WordDetailPanel from "../components/word/WordDetailPanel.vue";

const listeningStore = useListeningStore();
const playerStore = usePlayerStore();
const wordStore = useWordStore();

onMounted(async () => {
  await listeningStore.fetchMaterials();
  if (listeningStore.materials.length > 0) {
    await onSelect(listeningStore.materials[0].id);
  }
});

async function onSelect(id: number) {
  wordStore.closePanel();
  await listeningStore.fetchMaterial(id);
  if (listeningStore.currentMaterial) {
    playerStore.setAudio(listeningStore.currentMaterial.audioFilePath);
  }
}
</script>
