<template>
  <div class="h-full overflow-y-auto py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Empty state -->
      <div v-if="words.length === 0" class="text-center py-16 text-gray-400">
        <p class="text-lg mb-2">No words to practice</p>
        <p class="text-sm">Add words to your notebook first to start spelling practice.</p>
      </div>

      <!-- Session complete -->
      <div v-else-if="isComplete" class="text-center py-16">
        <div class="text-4xl mb-4">🎉</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Practice Complete!</h3>
        <p class="text-gray-600 mb-6">
          You got <span class="font-semibold text-green-600">{{ sessionStats.correct }}</span> correct
          and <span class="font-semibold text-red-600">{{ sessionStats.incorrect }}</span> incorrect
          out of {{ words.length }} words.
        </p>
        <button
          @click="restart"
          class="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Practice Again
        </button>
      </div>

      <!-- Active practice -->
      <div v-else>
        <!-- Progress -->
        <div class="text-center text-sm text-gray-500 mb-6">
          Progress: {{ currentIndex + 1 }} / {{ words.length }}
        </div>

        <!-- Word hint section -->
        <div class="mb-8 text-center">
          <div v-if="wordDefinition" class="space-y-1">
            <p class="text-sm text-gray-600">
              <span class="font-medium">Definition:</span>
              {{ wordDefinition.explains?.[0] || 'No definition available' }}
            </p>
            <p v-if="wordDefinition.phonetic" class="text-sm text-gray-500">
              <span class="font-medium">Phonetic:</span> /{{ wordDefinition.phonetic }}/
            </p>
          </div>
          <div v-else-if="wordLoading" class="animate-pulse space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div class="h-4 bg-gray-100 rounded w-1/3 mx-auto"></div>
          </div>
          <div v-else class="text-sm text-gray-400">Loading definition...</div>
        </div>

        <!-- Letter input boxes -->
        <div class="flex justify-center gap-2 mb-6 flex-wrap">
          <div
            v-for="i in targetWord.length"
            :key="i"
            class="w-10 h-12 flex items-center justify-center rounded-lg border-2 text-lg font-mono font-semibold transition-colors"
            :class="getBoxClass(i)"
          >
            {{ userInput[i - 1] || '' }}
          </div>
        </div>

        <!-- Input field -->
        <div class="flex justify-center mb-4">
          <input
            ref="inputRef"
            v-model="userInput"
            type="text"
            :maxlength="targetWord.length"
            class="px-4 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
            :placeholder="targetWord.length + ' letters'"
            @keydown.enter="checkSpelling"
            :disabled="feedback === 'correct'"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>

        <!-- Feedback -->
        <div class="text-center min-h-[2rem]">
          <p v-if="feedback === 'correct'" class="text-green-600 font-medium">
            Correct!
          </p>
          <p v-else-if="feedback === 'incorrect'" class="text-red-600 font-medium">
            Try again
          </p>
          <p v-else class="text-gray-400 text-sm">
            Press Enter to check
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useVocabularyStore } from '../../stores/vocabulary';
import type { WordData, WordSearchResponse } from '../../types/word';

const vocabularyStore = useVocabularyStore();

const inputRef = ref<HTMLInputElement | null>(null);
const currentIndex = ref(0);
const userInput = ref('');
const feedback = ref<'idle' | 'correct' | 'incorrect'>('idle');
const sessionStats = ref({ correct: 0, incorrect: 0 });
const wordDefinition = ref<WordData | null>(null);
const wordLoading = ref(false);

const words = computed(() => vocabularyStore.recentWords(20));
const targetWord = computed(() => words.value[currentIndex.value] || '');
const isComplete = computed(() => currentIndex.value >= words.value.length);

function getBoxClass(index: number): string {
  if (feedback.value === 'correct') {
    return 'border-green-500 bg-green-50 text-green-700';
  }
  if (feedback.value === 'incorrect' && index <= userInput.value.length) {
    const isCorrectLetter = userInput.value[index - 1]?.toLowerCase() === targetWord.value[index - 1]?.toLowerCase();
    return isCorrectLetter
      ? 'border-green-500 bg-green-50 text-green-700'
      : 'border-red-500 bg-red-50 text-red-700';
  }
  if (index <= userInput.value.length) {
    return 'border-blue-500 bg-blue-50 text-gray-900';
  }
  return 'border-gray-300 bg-white text-gray-900';
}

async function fetchWordDefinition(word: string) {
  wordLoading.value = true;
  wordDefinition.value = null;
  try {
    const res = await fetch(
      `/api/words/search?q=${encodeURIComponent(word)}&offset=0&limit=1`
    );
    if (!res.ok) return;
    const json: WordSearchResponse = await res.json();
    if (json.success && json.data) {
      wordDefinition.value = json.data;
    }
  } catch {
    // Ignore errors for definition fetch
  } finally {
    wordLoading.value = false;
  }
}

function checkSpelling() {
  if (feedback.value === 'correct') return;
  if (userInput.value.length === 0) return;

  if (userInput.value.toLowerCase() === targetWord.value.toLowerCase()) {
    feedback.value = 'correct';
    sessionStats.value.correct++;

    // Auto-advance after 1 second
    setTimeout(() => {
      currentIndex.value++;
      userInput.value = '';
      feedback.value = 'idle';
      if (!isComplete.value) {
        fetchWordDefinition(words.value[currentIndex.value]);
        nextTick(() => inputRef.value?.focus());
      }
    }, 1000);
  } else {
    feedback.value = 'incorrect';
    sessionStats.value.incorrect++;

    // Reset to allow retry after a short delay
    setTimeout(() => {
      feedback.value = 'idle';
    }, 800);
  }
}

function restart() {
  currentIndex.value = 0;
  userInput.value = '';
  feedback.value = 'idle';
  sessionStats.value = { correct: 0, incorrect: 0 };
  if (words.value.length > 0) {
    fetchWordDefinition(words.value[0]);
  }
  nextTick(() => inputRef.value?.focus());
}

// Watch for input changes to auto-update feedback display
watch(userInput, (val) => {
  userInput.value = val.toLowerCase().replace(/[^a-z]/g, '').slice(0, targetWord.value.length);
});

onMounted(() => {
  if (words.value.length > 0) {
    fetchWordDefinition(words.value[0]);
  }
  nextTick(() => inputRef.value?.focus());
});
</script>
