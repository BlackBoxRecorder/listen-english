<template>
  <div class="flex h-full">
    <!-- Left sidebar -->
    <ListeningList
      :materials="listeningStore.materials"
      :selected-id="listeningStore.currentMaterial?.id ?? null"
      @select="onSelect"
    />

    <!-- Right content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <SubtitleDisplay />
      <AudioPlayer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useListeningStore } from '../stores/listening';
import { usePlayerStore } from '../stores/player';
import ListeningList from '../components/listening/ListeningList.vue';
import SubtitleDisplay from '../components/subtitle/SubtitleDisplay.vue';
import AudioPlayer from '../components/player/AudioPlayer.vue';

const listeningStore = useListeningStore();
const playerStore = usePlayerStore();

onMounted(async () => {
  await listeningStore.fetchMaterials();
  if (listeningStore.materials.length > 0) {
    await onSelect(listeningStore.materials[0].id);
  }
});

async function onSelect(id: number) {
  await listeningStore.fetchMaterial(id);
  if (listeningStore.currentMaterial) {
    playerStore.setAudio(listeningStore.currentMaterial.audioFilePath);
  }
}
</script>
