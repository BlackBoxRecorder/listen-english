<template>
  <div class="flex flex-col h-full">
    <!-- Placeholder when no word selected -->
    <div v-if="!word" class="flex items-center justify-center h-full text-gray-400 text-sm">
      Select or search a word to see its definition
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="px-4 py-3 space-y-3 animate-pulse">
      <div class="h-6 bg-gray-200 rounded w-1/3"></div>
      <div class="h-4 bg-gray-100 rounded w-1/4"></div>
      <div class="h-4 bg-gray-200 rounded w-3/4 mt-4"></div>
      <div class="h-4 bg-gray-200 rounded w-full"></div>
      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="px-4 py-3">
      <div class="bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</div>
    </div>

    <!-- Content -->
    <div v-else-if="result" class="flex flex-col h-full">
      <!-- Sticky header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <h2 class="text-xl font-bold text-gray-900">{{ result.word }}</h2>
        <p v-if="result.phonetic" class="text-sm text-gray-500 mt-0.5">/{{ result.phonetic }}/</p>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <!-- Explains -->
        <section v-if="result.explains?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Definitions</h3>
          <ul class="space-y-1.5">
            <li
              v-for="(explain, i) in result.explains"
              :key="i"
              class="text-sm text-gray-700 leading-relaxed"
            >
              {{ explain }}
            </li>
          </ul>
        </section>

        <!-- Phrases -->
        <section v-if="result.phrase?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Phrases</h3>
          <ul class="space-y-2">
            <li
              v-for="(p, i) in result.phrase"
              :key="i"
              class="text-sm"
            >
              <span class="font-medium text-gray-800">{{ p.key }}</span>
              <span class="text-gray-500 ml-2">{{ p.value.join('; ') }}</span>
            </li>
          </ul>
        </section>

        <!-- Sentences -->
        <section v-if="result.sents?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Examples</h3>
          <ul class="space-y-3">
            <li
              v-for="(s, i) in result.sents"
              :key="i"
            >
              <p v-if="s.description" class="text-xs text-gray-400 mb-0.5">{{ s.description }}</p>
              <p class="text-sm font-medium text-gray-800">{{ s.example }}</p>
              <p class="text-sm text-gray-500">{{ s.translate }}</p>
            </li>
          </ul>
        </section>

        <!-- Lemmas -->
        <section v-if="result.lemmas?.length">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Word Forms</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(l, i) in result.lemmas"
              :key="i"
              class="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
            >
              {{ l.variant }}
            </span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { WordData, WordSearchResponse } from '../../types/word';

const props = defineProps<{
  word: string | null
}>();

const isLoading = ref(false);
const error = ref<string | null>(null);
const result = ref<WordData | null>(null);

watch(() => props.word, async (newWord) => {
  if (!newWord) {
    result.value = null;
    error.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;
  result.value = null;

  try {
    const res = await fetch(
      `/api/words/search?q=${encodeURIComponent(newWord)}&offset=0&limit=1`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json: WordSearchResponse = await res.json();

    if (json.success && json.data) {
      result.value = json.data;
    } else {
      error.value = `No definition found for "${newWord}"`;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Lookup failed';
  } finally {
    isLoading.value = false;
  }
}, { immediate: true });
</script>
