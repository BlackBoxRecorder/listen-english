<template>
  <aside class="w-60 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto h-full">
    <nav class="py-4 px-2">
      <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">目录导航</h2>
      <div v-for="section in sections" :key="section.id" class="mb-2">
        <!-- 一级目录 -->
        <button
          @click="$emit('navigate', section.id)"
          class="w-full text-left px-3 py-1.5 text-sm font-semibold rounded transition-colors"
          :class="
            activeId === section.id
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
          "
        >
          {{ section.title }}
        </button>
        <!-- 二级目录 -->
        <div class="ml-3 mt-0.5 space-y-0.5">
          <button
            v-for="sub in section.subsections"
            :key="sub.id"
            @click="$emit('navigate', sub.id)"
            class="w-full text-left px-3 py-1 text-xs rounded transition-colors"
            :class="
              activeId === sub.id
                ? 'text-blue-600 bg-blue-50 font-medium'
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
            "
          >
            {{ sub.title }}
          </button>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { GrammarSection } from "../../data/grammar";

defineProps<{
  sections: GrammarSection[];
  activeId: string;
}>();

defineEmits<{ navigate: [id: string] }>();
</script>
