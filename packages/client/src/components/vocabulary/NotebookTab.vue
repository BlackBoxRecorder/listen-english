<template>
  <div class="flex h-full overflow-hidden">
    <!-- Left column: Word list (always visible) -->
    <div class="w-80 shrink-0 border-r border-gray-200 overflow-hidden flex flex-col">
      <WordList :selected-word="activeWord" @select="onSelectWord" />
    </div>

    <!-- Right column: Definition card -->
    <div class="flex-1 overflow-hidden">
      <WordDefinitionCard :word="activeWord" :subtitle-id="activeSubtitleId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WordList from "./WordList.vue";
import WordDefinitionCard from "./WordDefinitionCard.vue";

const activeWord = ref<string | null>(null);
const activeSubtitleId = ref<number>(0);

function onSelectWord(word: string, subtitleId: number) {
  activeWord.value = word;
  activeSubtitleId.value = subtitleId;
}
</script>
