import { computed } from 'vue';
import { usePlayerStore } from '../stores/player';
import type { Subtitle } from '../stores/listening';

export function useSubtitleSync(subtitles: () => Subtitle[]) {
  const playerStore = usePlayerStore();

  const activeIndex = computed(() => {
    const timeMs = playerStore.currentTime * 1000;
    const subs = subtitles();
    const idx = subs.findIndex(
      (s) => timeMs >= s.startTime && timeMs <= s.endTime
    );
    return idx;
  });

  return { activeIndex };
}
