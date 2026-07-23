<template>
  <div class="flex h-full">
    <!-- Left sidebar / drawer -->
    <ListeningList
      :materials="sortedMaterials"
      :selected-id="listeningStore.currentMaterial?.id ?? null"
      :favorite-ids="favoritesStore.favoriteIds"
      :is-mobile="isMobile"
      :drawer-open="drawerOpen"
      @select="onSelect"
      @toggle-favorite="favoritesStore.toggleFavorite"
      @close="drawerOpen = false"
    />

    <!-- Center content -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Mobile: menu button + material title bar -->
      <MobileMenuButton
        :visible="isMobile && !drawerOpen"
        :title="listeningStore.currentMaterial?.title ?? 'Materials'"
        @toggle="openDrawer"
      />
      <SubtitleDisplay />
      <ChineseSubtitle />
      <AudioPlayer />
    </div>

    <!-- Desktop: side panels -->
    <template v-if="!isMobile">
      <SentenceAnalysisPanel
        v-if="analysisStore.panelOpen"
        :is-mobile="false"
        :bottom-sheet-open="false"
      />
      <WordDetailPanel
        v-else-if="wordStore.panelOpen"
        :is-mobile="false"
        :bottom-sheet-open="false"
      />
    </template>

    <!-- Mobile: bottom sheet panels (always rendered for transform animation) -->
    <SentenceAnalysisPanel
      v-if="isMobile"
      :is-mobile="true"
      :bottom-sheet-open="bottomSheetOpen && analysisStore.panelOpen"
      @close="closeBottomSheet"
    />
    <WordDetailPanel
      v-if="isMobile"
      :is-mobile="true"
      :bottom-sheet-open="bottomSheetOpen && wordStore.panelOpen"
      :show-examples="false"
      @close="closeBottomSheet"
    />

    <!-- Mobile overlay mask -->
    <div
      v-if="isMobile && (drawerOpen || bottomSheetOpen)"
      class="fixed inset-0 bg-black/50 z-35"
      @click="closeAllOverlays"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
import MobileMenuButton from "../components/listening/MobileMenuButton.vue";

const listeningStore = useListeningStore();
const playerStore = usePlayerStore();
const wordStore = useWordStore();
const analysisStore = useAnalysisStore();
const favoritesStore = useFavoritesStore();

// --- Responsive state ---
const mediaQuery = window.matchMedia("(min-width: 768px)");
const isMobile = ref(!mediaQuery.matches);
const drawerOpen = ref(false);
const bottomSheetOpen = ref(false);

function onMediaChange(e: MediaQueryListEvent) {
  isMobile.value = !e.matches;
  // Close all overlays when switching to desktop
  if (e.matches) {
    drawerOpen.value = false;
    bottomSheetOpen.value = false;
  }
}

onMounted(() => mediaQuery.addEventListener("change", onMediaChange));
onUnmounted(() => mediaQuery.removeEventListener("change", onMediaChange));

// --- Overlay control ---
function openDrawer() {
  drawerOpen.value = true;
  bottomSheetOpen.value = false;
}

function closeBottomSheet() {
  bottomSheetOpen.value = false;
}

function closeAllOverlays() {
  drawerOpen.value = false;
  bottomSheetOpen.value = false;
  wordStore.closePanel();
  analysisStore.closePanel();
}

// --- Materials ---
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

// --- Mobile: sync bottomSheetOpen with panel states ---
watch(
  () => wordStore.panelOpen,
  (open) => {
    if (open && isMobile.value) {
      bottomSheetOpen.value = true;
      drawerOpen.value = false;
    }
  },
);

watch(
  () => analysisStore.panelOpen,
  (open) => {
    if (open && isMobile.value) {
      bottomSheetOpen.value = true;
      drawerOpen.value = false;
    }
  },
);
</script>
