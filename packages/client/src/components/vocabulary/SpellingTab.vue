<template>
  <div class="h-full overflow-y-auto py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Empty state -->
      <div v-if="vocabularyStore.words.length === 0" class="text-center py-16 text-gray-400">
        <p class="text-lg mb-2">No words to practice</p>
        <p class="text-sm">Add words to your notebook first to start spelling practice.</p>
      </div>

      <!-- View A: Confirmation -->
      <div v-else-if="!isConfirmed" class="space-y-6">
        <h3 class="text-lg font-semibold text-gray-900 text-center">Spelling Practice</h3>

        <!-- Practice count selector -->
        <div class="flex items-center justify-center gap-3">
          <label class="text-sm text-gray-600">Words per session:</label>
          <select
            v-model.number="vocabularyStore.practiceCount"
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="n in [10, 20, 30, 40, 50]" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <!-- Word preview list -->
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-500 mb-2">{{ words.length }} words ready</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="w in words"
              :key="w"
              class="px-2 py-0.5 rounded text-sm"
              :class="
                vocabularyStore.isWordSelected(w)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-500'
              "
            >
              {{ w
              }}<span v-if="!vocabularyStore.isWordSelected(w)" class="text-xs ml-0.5">(auto)</span>
            </span>
          </div>
        </div>

        <!-- Tips -->
        <div
          v-if="
            vocabularyStore.selectedCount > 0 &&
            vocabularyStore.selectedCount < vocabularyStore.practiceCount
          "
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800"
        >
          You selected {{ vocabularyStore.selectedCount }} words, and
          {{
            Math.min(vocabularyStore.practiceCount, vocabularyStore.words.length) -
            vocabularyStore.selectedCount
          }}
          more will be added from your recent vocabulary.
        </div>
        <div
          v-else-if="vocabularyStore.words.length < vocabularyStore.practiceCount"
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800"
        >
          Only {{ vocabularyStore.words.length }} words in your notebook — all will be practiced.
        </div>
        <div
          v-else-if="words.length < 3"
          class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
        >
          Select at least 3 words to start.
        </div>

        <!-- Start button -->
        <div class="text-center">
          <button
            :disabled="words.length < 3"
            @click="startPractice"
            class="px-6 py-2 rounded-lg font-medium transition-colors"
            :class="
              words.length >= 3
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            "
          >
            Start Practice
          </button>
        </div>
      </div>

      <!-- Session complete -->
      <div v-else-if="isComplete" class="text-center py-16">
        <div class="text-4xl mb-4">🎉</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Practice Complete!</h3>
        <p class="text-gray-600 mb-6">
          You got
          <span class="font-semibold text-green-600">{{ sessionStats.correct }}</span> correct,
          <span class="font-semibold text-red-600">{{ sessionStats.incorrect }}</span> incorrect,
          and <span class="font-semibold text-gray-500">{{ sessionStats.skipped }}</span> skipped
          out of {{ words.length }} words.
        </p>
        <button
          @click="restart"
          class="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Selection
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
              {{ wordDefinition.explains?.[0] || "No definition available" }}
            </p>
            <p v-if="wordDefinition.phonetic" class="text-sm text-gray-500">
              <span class="font-medium">Phonetic:</span> /{{ wordDefinition.phonetic.phonetic }}/
            </p>
          </div>
          <div v-else-if="wordLoading" class="animate-pulse space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div class="h-4 bg-gray-100 rounded w-1/3 mx-auto"></div>
          </div>
          <div v-else class="text-sm text-gray-400">Loading definition...</div>
        </div>

        <!-- Letter input boxes - click to refocus hidden input -->
        <div class="flex justify-center gap-2 mb-6 flex-wrap" @click="inputRef?.focus()">
          <div
            v-for="i in targetWord.length"
            :key="i"
            class="w-10 h-12 flex items-center justify-center rounded-lg border-2 text-lg font-mono font-semibold transition-colors"
            :class="getBoxClass(i)"
          >
            {{ userInput[i - 1] || "" }}
          </div>
        </div>

        <!-- Hidden keyboard capture input -->
        <input
          ref="inputRef"
          v-model="userInput"
          type="text"
          :maxlength="targetWord.length"
          class="absolute opacity-0 w-0 h-0 pointer-events-none"
          @keydown="onKeydown"
          :disabled="feedback === 'correct'"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />

        <!-- Feedback -->
        <div class="text-center min-h-[2rem]">
          <p v-if="feedback === 'correct'" class="text-green-600 font-medium">Correct!</p>
          <p v-else-if="feedback === 'incorrect'" class="text-red-600 font-medium">Try again</p>
          <p v-else class="text-gray-400 text-sm">Type all letters to check</p>
        </div>

        <!-- Skip button -->
        <div v-if="feedback !== 'correct'" class="text-center mt-4">
          <button
            @click="skipWord"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useVocabularyStore } from "../../stores/vocabulary";
import type { WordData, WordSearchResponse } from "../../types/word";

const vocabularyStore = useVocabularyStore();

const inputRef = ref<HTMLInputElement | null>(null);
const currentIndex = ref(0);
const userInput = ref("");
const feedback = ref<"idle" | "correct" | "incorrect">("idle");
const sessionStats = ref({ correct: 0, incorrect: 0, skipped: 0 });
const wordDefinition = ref<WordData | null>(null);
const wordLoading = ref(false);
const isConfirmed = ref(false);

let incorrectTimer: ReturnType<typeof setTimeout> | null = null;
const lastCheckedInput = ref("");

const words = computed(() => vocabularyStore.getPracticeWords());
const targetWord = computed(() => words.value[currentIndex.value] || "");
const isComplete = computed(() => currentIndex.value >= words.value.length);

function getBoxClass(index: number): string {
  if (feedback.value === "correct") {
    return "border-green-500 bg-green-50 text-green-700";
  }
  if (feedback.value === "incorrect" && index <= userInput.value.length) {
    const isCorrectLetter =
      userInput.value[index - 1]?.toLowerCase() === targetWord.value[index - 1]?.toLowerCase();
    return isCorrectLetter
      ? "border-green-500 bg-green-50 text-green-700"
      : "border-red-500 bg-red-50 text-red-700";
  }
  if (index <= userInput.value.length) {
    return "border-blue-500 bg-blue-50 text-gray-900";
  }
  return "border-gray-300 bg-white text-gray-900";
}

async function fetchWordDefinition(word: string) {
  wordLoading.value = true;
  wordDefinition.value = null;
  try {
    const res = await fetch(`/api/words/search?q=${encodeURIComponent(word)}&offset=0&limit=1`);
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    skipWord();
  }
}

function checkSpelling() {
  // Clear any pending incorrect-reset timer to prevent race condition
  if (incorrectTimer) {
    clearTimeout(incorrectTimer);
    incorrectTimer = null;
  }
  if (feedback.value === "correct") return;
  if (userInput.value.length === 0) return;

  if (userInput.value.toLowerCase() === targetWord.value.toLowerCase()) {
    feedback.value = "correct";
    sessionStats.value.correct++;

    // Auto-advance after short delay
    setTimeout(() => {
      currentIndex.value++;
      userInput.value = "";
      feedback.value = "idle";
      lastCheckedInput.value = "";
      if (!isComplete.value) {
        fetchWordDefinition(words.value[currentIndex.value]);
        nextTick(() => inputRef.value?.focus());
      }
    }, 450);
  } else {
    feedback.value = "incorrect";
    sessionStats.value.incorrect++;

    // Reset to allow retry after a short delay
    incorrectTimer = setTimeout(() => {
      feedback.value = "idle";
      incorrectTimer = null;
    }, 800);
  }
}

function skipWord() {
  if (feedback.value === "correct") return;
  sessionStats.value.skipped++;
  currentIndex.value++;
  userInput.value = "";
  feedback.value = "idle";
  lastCheckedInput.value = "";
  if (!isComplete.value) {
    fetchWordDefinition(words.value[currentIndex.value]);
    nextTick(() => inputRef.value?.focus());
  }
}

function startPractice() {
  isConfirmed.value = true;
  currentIndex.value = 0;
  userInput.value = "";
  feedback.value = "idle";
  lastCheckedInput.value = "";
  sessionStats.value = { correct: 0, incorrect: 0, skipped: 0 };
  if (words.value.length > 0) {
    fetchWordDefinition(words.value[0]);
  }
  nextTick(() => inputRef.value?.focus());
}

function restart() {
  isConfirmed.value = false;
}

// Watch for input changes: sanitize + auto-check when full (from idle only)
watch(userInput, (val) => {
  const sanitized = val
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, targetWord.value.length);
  if (sanitized !== val) {
    userInput.value = sanitized;
    return;
  }
  if (
    sanitized.length === targetWord.value.length &&
    feedback.value === "idle" &&
    sanitized !== lastCheckedInput.value
  ) {
    lastCheckedInput.value = sanitized;
    checkSpelling();
  }
});

// Auto-play audio when word definition loads
watch(wordDefinition, (def) => {
  if (def?.phonetic?.audio) {
    playAudio(def.phonetic.audio);
  }
});

/** 播放音频 */
function playAudio(url: string) {
  const audio = new window.Audio(url);
  audio.play().catch(() => {
    // Browser blocks autoplay, silently ignore
  });
}

onMounted(() => {
  // No auto-start; user must confirm first
});
</script>
