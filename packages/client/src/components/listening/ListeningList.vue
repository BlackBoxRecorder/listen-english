<template>
  <!-- Desktop: fixed sidebar -->
  <div
    v-if="!isMobile"
    class="w-[280px] border-r border-gray-200 h-full overflow-y-auto bg-gray-50"
  >
    <div class="p-3">
      <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Materials</h3>
    </div>
    <ul>
      <li
        v-for="item in materials"
        :key="item.id"
        @click="onSelect(item.id)"
        class="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors"
        :class="{ 'bg-blue-100': item.id === selectedId }"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-800 truncate">{{ item.title }}</span>
          <button
            class="shrink-0 text-lg leading-none hover:scale-110 transition-transform"
            :class="
              favoriteIds.has(item.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
            "
            @click.stop="$emit('toggleFavorite', item.id)"
          >
            {{ favoriteIds.has(item.id) ? "★" : "☆" }}
          </button>
        </div>
      </li>
    </ul>
    <div v-if="materials.length === 0" class="p-4 text-sm text-gray-400 text-center">
      No materials available.
    </div>
  </div>

  <!-- Mobile: Drawer overlay -->
  <div
    v-else
    class="fixed left-0 top-0 h-full z-40 w-[80vw] max-w-[320px] bg-gray-50 shadow-xl flex flex-col transition-transform duration-200"
    :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Drawer header -->
    <div class="flex items-center justify-between p-3 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Materials</h3>
      <button
        @click="$emit('close')"
        class="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"
      >
        &times;
      </button>
    </div>
    <!-- Drawer body -->
    <div class="flex-1 overflow-y-auto">
      <ul>
        <li
          v-for="item in materials"
          :key="item.id"
          @click="onSelect(item.id)"
          class="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors"
          :class="{ 'bg-blue-100': item.id === selectedId }"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-gray-800 truncate">{{ item.title }}</span>
            <button
              class="shrink-0 text-lg leading-none hover:scale-110 transition-transform"
              :class="
                favoriteIds.has(item.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
              "
              @click.stop="$emit('toggleFavorite', item.id)"
            >
              {{ favoriteIds.has(item.id) ? "★" : "☆" }}
            </button>
          </div>
        </li>
      </ul>
      <div v-if="materials.length === 0" class="p-4 text-sm text-gray-400 text-center">
        No materials available.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ListeningItem } from "../../stores/listening";

const props = defineProps<{
  materials: ListeningItem[];
  selectedId: number | null;
  favoriteIds: Set<number>;
  isMobile: boolean;
  drawerOpen: boolean;
}>();

const emit = defineEmits<{
  select: [id: number];
  toggleFavorite: [id: number];
  close: [];
}>();

function onSelect(id: number) {
  emit("select", id);
  if (props.isMobile) {
    emit("close");
  }
}
</script>
