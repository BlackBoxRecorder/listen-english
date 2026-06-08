<template>
  <div class="h-full flex flex-col">
    <!-- Tab buttons -->
    <div class="flex justify-center border-b border-gray-200 shrink-0">
      <div class="flex gap-1 px-4">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="
            activeTab === tab.value
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          "
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-hidden">
      <div class="w-[800px] max-w-full mx-auto h-full px-4">
        <NotebookTab v-if="activeTab === 'notebook'" />
        <LookupTab v-else-if="activeTab === 'lookup'" />
        <SpellingTab v-else-if="activeTab === 'spelling'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import NotebookTab from "../components/vocabulary/NotebookTab.vue";
import LookupTab from "../components/vocabulary/LookupTab.vue";
import SpellingTab from "../components/vocabulary/SpellingTab.vue";

type TabValue = "notebook" | "lookup" | "spelling";

const activeTab = ref<TabValue>("notebook");

const tabs = [
  { value: "notebook" as const, label: "单词本" },
  { value: "lookup" as const, label: "查单词" },
  { value: "spelling" as const, label: "拼写练习" },
];
</script>
