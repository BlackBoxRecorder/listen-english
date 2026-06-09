import { ref } from "vue";

/**
 * 侧边面板互斥协调器
 * 解除 word store 与 analysis store 之间的循环依赖
 * @author yinnan
 */

type PanelId = "word" | "analysis";

/** 当前打开的面板 ID */
const activePanel = ref<PanelId | null>(null);

/** 各面板的关闭回调注册表 */
const closeCallbacks = new Map<PanelId, () => void>();

/**
 * 注册面板的关闭回调（由 store 在初始化时调用）
 * @param panel 面板标识
 * @param onClose 关闭面板的回调函数
 */
export function registerPanel(panel: PanelId, onClose: () => void) {
  closeCallbacks.set(panel, onClose);
}

/**
 * 激活指定面板，自动关闭其他已打开的面板
 * @param panel 要激活的面板标识
 */
export function activatePanel(panel: PanelId) {
  // 关闭当前非目标面板
  if (activePanel.value && activePanel.value !== panel) {
    const closeOther = closeCallbacks.get(activePanel.value);
    if (closeOther) closeOther();
  }
  activePanel.value = panel;
}

/**
 * 获取当前激活的面板
 */
export function getActivePanel() {
  return activePanel;
}
