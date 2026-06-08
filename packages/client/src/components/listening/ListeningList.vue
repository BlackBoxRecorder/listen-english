<template>
  <div class="w-[280px] border-r border-gray-200 h-full overflow-y-auto bg-gray-50">
    <div class="p-3">
      <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Materials</h3>
    </div>
    <ul>
      <li
        v-for="item in materials"
        :key="item.id"
        @click="$emit('select', item.id)"
        class="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors"
        :class="{ 'bg-blue-100': item.id === selectedId }"
      >
        <div class="text-sm font-medium text-gray-800 truncate">{{ item.title }}</div>
        <div class="text-xs text-gray-500 mt-1" v-if="item.duration">
          {{ formatDuration(item.duration) }}
        </div>
      </li>
    </ul>
    <div v-if="materials.length === 0" class="p-4 text-sm text-gray-400 text-center">
      No materials available. Add some in Admin.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ListeningItem } from "../../stores/listening";

defineProps<{
  materials: ListeningItem[];
  selectedId: number | null;
}>();

defineEmits<{
  select: [id: number];
}>();

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>
