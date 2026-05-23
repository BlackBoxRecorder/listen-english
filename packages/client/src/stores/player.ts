import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePlayerStore = defineStore('player', () => {
  const currentAudioUrl = ref<string | null>(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const playbackRate = ref(1.0);

  function setAudio(url: string) {
    currentAudioUrl.value = url;
    isPlaying.value = false;
    currentTime.value = 0;
  }

  function setPlaybackRate(rate: number) {
    playbackRate.value = rate;
  }

  return { currentAudioUrl, isPlaying, currentTime, duration, playbackRate, setAudio, setPlaybackRate };
});
