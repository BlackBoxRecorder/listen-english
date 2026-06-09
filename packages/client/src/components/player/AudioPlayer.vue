<template>
  <div class="h-[100px] border-t border-gray-200 bg-white px-6 flex items-center gap-4 shrink-0">
    <audio
      ref="audioEl"
      :src="playerStore.currentAudioUrl ?? undefined"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="playerStore.isPlaying = false"
    />

    <!-- Play/Pause -->
    <button
      @click="togglePlay"
      class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shrink-0"
      :disabled="!playerStore.currentAudioUrl"
    >
      <span v-if="playerStore.isPlaying">⏸</span>
      <span v-else>▶</span>
    </button>

    <!-- Time -->
    <span class="text-xs text-gray-500 w-12 text-right shrink-0">{{
      formatTime(playerStore.currentTime)
    }}</span>

    <!-- Progress bar -->
    <input
      type="range"
      min="0"
      :max="playerStore.duration || 0"
      :value="playerStore.currentTime"
      @input="onSeek"
      class="flex-1 h-2 cursor-pointer"
      step="0.1"
    />

    <span class="text-xs text-gray-500 w-12 shrink-0">{{ formatTime(playerStore.duration) }}</span>

    <!-- Speed -->
    <select
      :value="playerStore.playbackRate"
      @change="onRateChange"
      class="text-xs border rounded px-2 py-1 shrink-0"
    >
      <option :value="0.75">0.75x</option>
      <option :value="1.0">1.0x</option>
      <option :value="1.25">1.25x</option>
      <option :value="1.5">1.5x</option>
      <option :value="2.0">2.0x</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { usePlayerStore } from "../../stores/player";

const playerStore = usePlayerStore();
const audioEl = ref<HTMLAudioElement | null>(null);

function togglePlay() {
  if (!audioEl.value) return;
  if (playerStore.isPlaying) {
    audioEl.value.pause();
  } else {
    audioEl.value.play();
  }
  playerStore.isPlaying = !playerStore.isPlaying;
}

/** 空格键全局快捷键：切换播放/暂停 */
function handleGlobalSpace(e: KeyboardEvent) {
  if (e.code !== "Space") return;

  // 当用户在表单控件中输入时不拦截空格
  const target = e.target as HTMLElement;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

  // 未加载音频时不响应
  if (!playerStore.currentAudioUrl) return;

  e.preventDefault();
  togglePlay();
}

onMounted(() => document.addEventListener("keydown", handleGlobalSpace));
onUnmounted(() => document.removeEventListener("keydown", handleGlobalSpace));

function onTimeUpdate() {
  if (audioEl.value) {
    playerStore.currentTime = audioEl.value.currentTime;
  }
}

function onLoaded() {
  if (audioEl.value) {
    playerStore.duration = audioEl.value.duration;
  }
}

function onSeek(e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  if (audioEl.value) {
    audioEl.value.currentTime = value;
    playerStore.currentTime = value;
  }
}

function onRateChange(e: Event) {
  const rate = Number((e.target as HTMLSelectElement).value);
  playerStore.setPlaybackRate(rate);
  if (audioEl.value) {
    audioEl.value.playbackRate = rate;
  }
}

watch(
  () => playerStore.playbackRate,
  (rate) => {
    if (audioEl.value) audioEl.value.playbackRate = rate;
  },
);

watch(
  () => playerStore.currentAudioUrl,
  () => {
    playerStore.isPlaying = false;
    playerStore.currentTime = 0;
  },
);

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>
