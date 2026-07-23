# ListeningView 手机端响应式适配设计

## 概述

为 `ListeningView.vue` 页面添加手机端（<768px）响应式适配。桌面端（≥768px）现有三栏布局完全不变。手机端核心改动：左侧材料列表改为 Drawer 滑出，右侧单词/句子面板改为 Bottom Sheet 底部弹出，两个浮层互斥。

## 设计目标

1. 手机端可通过按钮展开/隐藏听力材料列表
2. 手机端单词详情/句子分析从底部弹出
3. 浮层互斥：同一时间只有一个浮层可见
4. 桌面端零改动，完全向后兼容

## 核心决策

| 决策点       | 方案                                                            |
| ------------ | --------------------------------------------------------------- |
| 响应式断点   | `md:`（768px），与 Tailwind 默认一致                            |
| 移动端检测   | `window.matchMedia('(min-width: 768px)')` + `resize` 事件       |
| 左侧列表     | 手机端 Drawer Overlay 从左侧滑出，宽度 `w-[80vw] max-w-[320px]` |
| 右侧面板     | 手机端 Bottom Sheet 底部弹出，高度 `h-[60vh]`，桌面端右侧栏不变 |
| 浮层互斥     | Drawer 与 Bottom Sheet 互斥，打开一个自动关闭另一个             |
| 底部面板高度 | 默认 60vh，上限 85vh（通过拖拽手柄调节，预留能力非首版必做）    |
| 遮罩层       | 全局单一遮罩，Drawer 和 Bottom Sheet 共用                       |
| 关闭方式     | 遮罩点击关闭 / 关闭按钮 / 选完材料自动关闭（仅 Drawer）         |

## 交互流程

### 手机端布局（默认状态）

```
┌──────────────────────────┐
│ ☰ 材料标题               │  ← 左上角汉堡按钮 + 当前材料名
├──────────────────────────┤
│                          │
│  SubtitleDisplay         │  ← 字幕正文区
│                          │
├──────────────────────────┤
│  ChineseSubtitle (60px)  │
├──────────────────────────┤
│  AudioPlayer (100px)     │
└──────────────────────────┘
```

### 打开材料列表 Drawer

```
┌──────────┬───────────────┐
│ 材料列表  │               │
│ ~80vw    │    遮罩层      │
│ (可滚动)  │  (半透明黑色)  │
│          │               │
│ × 关闭   │               │
└──────────┴───────────────┘
```

### 打开单词/句子 Bottom Sheet

```
┌──────────────────────────┐
│                          │
│     遮罩层 (半透明)       │
│                          │
├──────────────────────────┤
│ × Word Definition        │
│                          │
│  ...details...           │
│  60vh, 可滚动            │
│                          │
└──────────────────────────┘
```

## 组件变更清单

需要改动 **4 个文件**，新建 **1 个文件**：

### 1. `packages/client/src/views/ListeningView.vue` — 核心改动

- 新增 `isMobile` 响应式计算（基于 `matchMedia`）
- 新增两个浮层状态：`drawerOpen` / `bottomSheetOpen`（`ref<boolean>`）
- 实现浮层互斥逻辑：打开 Drawer 时关闭 BottomSheet，反之亦然
- 统一遮罩层：`v-if="drawerOpen || bottomSheetOpen"` 时显示，点击关闭所有浮层
- 监听 `resize` 事件，md 断点以上时强制关闭所有浮层
- 将 `isMobile`、开闭状态、控制方法传递给子组件

### 2. `packages/client/src/components/listening/ListeningList.vue` — 拆分手机端布局

- 新增 props：`isMobile: boolean`、`drawerOpen: boolean`
- 新增 emit：`close`
- 桌面端（`!isMobile`）：保持现有 `w-[280px]` 侧边栏，不做任何改动
- 手机端（`isMobile`）：渲染为 `fixed` 定位 Drawer
  - 位置：`left-0 top-0 h-full z-40`
  - 宽度：`w-[80vw] max-w-[320px]`
  - 动画：`transition-transform`，关闭时 `-translate-x-full`，打开时 `translate-x-0`
  - 顶部增加关闭按钮（×），点击 emit `close`
  - 选择材料后自动 emit `close`

### 3. `packages/client/src/components/word/WordDetailPanel.vue` — 拆分手机端布局

- 新增 props：`isMobile: boolean`、`bottomSheetOpen: boolean`
- 新增 emit：`close`
- 桌面端（`!isMobile`）：保持现有右侧栏布局 + 拖拽手柄，不做任何改动
- 手机端（`isMobile`）：渲染为 Bottom Sheet
  - 位置：`fixed bottom-0 left-0 right-0 z-40 rounded-t-xl`
  - 高度：`h-[60vh]`
  - 动画：`transition-transform`，关闭时 `translate-y-full`，打开时 `translate-y-0`
  - 拖拽手柄替换为顶部横条指示器（视觉示意可下拉，首版不实现拖拽关闭）
  - 关闭按钮（×）保留在标题行

### 4. `packages/client/src/components/analysis/SentenceAnalysisPanel.vue`

同 `WordDetailPanel`，一模一样的手机端 Bottom Sheet 适配逻辑。

### 5. 新建 `packages/client/src/components/listening/MobileMenuButton.vue`

- Props：`visible: boolean`、`title: string`
- Emit：`toggle`
- 仅当 `visible` 为 true 时渲染
- 布局：绝对定位在页面左上角，`fixed top-[calc(3rem+8px)] left-2 z-30`
- 样式：汉堡按钮 ☰ + 当前材料标题，白色半透明背景，带圆角和阴影

## 状态管理

不新增 Pinia store，所有状态保持在 `ListeningView.vue` 的 `ref` 中通过 props/emit 传递。

```
ListeningView (refs)
├── isMobile: boolean  (computed, matchMedia)
├── drawerOpen: ref(false)
├── bottomSheetOpen: ref(false)
│
├── MobileMenuButton     props: visible, title   emit: toggle → drawerOpen
├── ListeningList         props: isMobile, drawerOpen   emit: close → drawerOpen=false
├── ChineseSubtitle       (无变化)
├── AudioPlayer           (无变化)
├── WordDetailPanel       props: isMobile, bottomSheetOpen   emit: close → bottomSheetOpen=false
└── SentenceAnalysisPanel props: isMobile, bottomSheetOpen   emit: close → bottomSheetOpen=false
```

## 不涉及的部分

- `AppLayout.vue` / Header — 不动
- `AudioPlayer.vue` — 桌面端/手机端共用一套，无改动
- `SubtitleDisplay.vue` — 布局自适应（已有 `min-w-0`），无改动
- `ChineseSubtitle.vue` — 无改动
- 单词面板的 Pinia store（`wordStore`）、查词逻辑 — 不动
- 拖拽缩放功能（`useResizablePanel`） — 桌面端保留，手机端不启用

## 边界场景

| 场景                          | 处理方式                                                               |
| ----------------------------- | ---------------------------------------------------------------------- |
| 手机横屏切换到竖屏            | `matchMedia` 自动响应，浮层自动关闭                                    |
| 手机端选择材料                | Drawer 关闭，`bottomSheetOpen` 不变（互斥已处理）                      |
| 手机端打开 Drawer 时点击单词  | Drawer 关闭，BottomSheet 打开                                          |
| 桌面端缩小浏览器窗口到 <768px | 浮层自动关闭，切换为手机布局                                           |
| 遮罩层覆盖 AudioPlayer        | 遮罩 `fixed inset-0` 会覆盖底部播放条，不影响空格键全局快捷键播放/暂停 |

## 技术要点

- 使用 `window.matchMedia` 而非纯 `window.innerWidth` 比较，Vue 响应式配合 `onMounted`/`onUnmounted` 管理 listener
- Drawer 和 Bottom Sheet 使用 `transform` 动画（`translateX` / `translateY`），利用 GPU 加速，避免 `left`/`top` 引起的 layout 重排
- 遮罩层使用 `fixed inset-0 bg-black/50 z-35`，Drawer 和 Bottom Sheet 的 z-index 为 40
- 手机端禁用 `WordDetailPanel` 和 `SentenceAnalysisPanel` 的拖拽手柄（`useResizablePanel` 在 `isMobile` 时不挂载 mousedown 事件）
