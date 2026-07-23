<template>
  <div
    v-if="visible"
    class="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer shrink-0"
    @click="$emit('toggle')"
  >
    <span class="text-lg leading-none text-gray-700">☰</span>
    <span class="text-xs font-medium text-gray-600 truncate">{{ title }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
}>();

defineEmits<{
  toggle: [];
}>();
</script>
