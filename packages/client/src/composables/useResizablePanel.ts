import { ref, onUnmounted } from "vue";

const STORAGE_KEY = "side-panel-width";
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 300;
const MAX_WIDTH = 640;

// 全局共享宽度，两个面板使用同一个 ref
const sharedWidth = ref(loadSavedWidth());

function loadSavedWidth(): number {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const val = parseInt(saved, 10);
    if (!isNaN(val) && val >= MIN_WIDTH && val <= MAX_WIDTH) return val;
  }
  return DEFAULT_WIDTH;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 侧边面板拖拽调整宽度
 * @author AI
 */
export function useResizablePanel() {
  let startX = 0;
  let startWidth = 0;

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    startX = e.clientX;
    startWidth = sharedWidth.value;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onMouseMove(e: MouseEvent) {
    // 面板在右侧，鼠标左移（deltaX < 0）= 宽度增大
    const deltaX = startX - e.clientX;
    const newWidth = clamp(startWidth + deltaX, MIN_WIDTH, MAX_WIDTH);
    sharedWidth.value = newWidth;
  }

  function cleanup() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function onMouseUp() {
    cleanup();
    localStorage.setItem(STORAGE_KEY, String(sharedWidth.value));
  }

  onUnmounted(cleanup);

  return {
    width: sharedWidth,
    onMouseDown,
  };
}
