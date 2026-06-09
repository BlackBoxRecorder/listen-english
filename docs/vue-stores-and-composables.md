# Vue Stores 与 Composables 用法指南

本文档结合本项目实际代码，介绍 Vue 3 中 **Pinia Store** 和 **Composable** 的核心概念与用法。

---

## 一、Pinia Store（状态仓库）

### 1.1 什么是 Store

Store 是一个**全局共享的状态容器**。当多个组件需要读写同一份数据时（如播放器状态、单词本列表），把数据放进 Store 比在组件之间传递 props 更清晰、更方便。

### 1.2 初始化 Pinia

在应用入口 `main.ts` 中注册：

```ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

const app = createApp(App);
app.use(createPinia()); // 注册 Pinia 插件
app.mount("#app");
```

### 1.3 定义 Store — Composition API 风格

本项目统一使用 **Composition API 风格**（即 setup 函数写法），而非 Options API 风格。

基本结构：

```ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useXxxStore = defineStore("xxx", () => {
  // ① 状态（用 ref）
  const someValue = ref<string>("hello");

  // ② 计算属性（用 computed）
  const valueLength = computed(() => someValue.value.length);

  // ③ 方法（普通函数）
  function doSomething() {
    someValue.value = "world";
  }

  // ④ 必须 return 暴露出去
  return { someValue, valueLength, doSomething };
});
```

关键点：

- `defineStore` 第一个参数 `"xxx"` 是 store 的唯一 ID，用于 DevTools 调试。
- 第二个参数是一个 setup 函数，内部写法和 Vue 组件的 `<script setup>` 几乎一样。
- **所有需要对外暴露的 ref、computed、函数都必须 return**。

### 1.4 实际示例 — 播放器 Store

以 `stores/player.ts` 为例：

```ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const usePlayerStore = defineStore("player", () => {
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

  return {
    currentAudioUrl,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    setAudio,
    setPlaybackRate,
  };
});
```

这个 store 管理了音频播放的所有状态。任何组件都可以读取 `currentTime` 或调用 `setAudio()`。

### 1.5 在组件中使用 Store

```vue
<script setup lang="ts">
import { usePlayerStore } from "@/stores/player";

const playerStore = usePlayerStore();
</script>

<template>
  <div>
    <p>当前播放时间：{{ playerStore.currentTime }}</p>
    <button @click="playerStore.setAudio('/audio/test.mp3')">加载音频</button>
  </div>
</template>
```

注意事项：

- 调用 `usePlayerStore()` 即可获得 store 实例，Pinia 内部会自动保证单例（整个应用共享同一份状态）。
- 模板中直接访问 `playerStore.currentTime`，**不需要**写 `.value`（模板会自动解包 ref）。
- 在 `<script>` 中访问时需要 `.value`：`playerStore.currentTime.value`。

### 1.6 Store 之间互相调用

Store 可以在另一个 Store 内部被调用。以 `stores/word.ts` 为例：

```ts
import { useVocabularyStore } from "./vocabulary";

export const useWordStore = defineStore("word", () => {
  async function selectWord(word: string) {
    // 在 store 内部调用另一个 store
    const vocabularyStore = useVocabularyStore();
    vocabularyStore.addWord(word);
    // ...
  }

  return { selectWord };
});
```

### 1.7 异步操作

Store 中的方法可以是 `async` 函数，直接在里面发请求即可：

```ts
import { defineStore } from "pinia";
import { ref } from "vue";
import * as api from "../api";

export const useListeningStore = defineStore("listening", () => {
  const materials = ref<ListeningItem[]>([]);

  async function fetchMaterials() {
    materials.value = await api.fetchListenings();
  }

  return { materials, fetchMaterials };
});
```

### 1.8 常用模式速查

| 模式         | 写法                                                |
| ------------ | --------------------------------------------------- |
| 声明状态     | `const count = ref(0)`                              |
| 计算属性     | `const double = computed(() => count.value * 2)`    |
| 普通方法     | `function increment() { count.value++ }`            |
| 异步方法     | `async function fetchData() { ... }`                |
| 创建时初始化 | 在 setup 函数末尾直接调用初始化函数                 |
| 前端缓存     | 在 `defineStore` 外部声明 `const cache = new Map()` |

---

## 二、Composable（组合式函数）

### 2.1 什么是 Composable

Composable 是一个**可复用的逻辑函数**，通常以 `use` 开头命名。它可以封装响应式状态、计算属性、副作用等，然后在多个组件或 store 中调用。

与 Store 的区别：

|          | Store                | Composable                                     |
| -------- | -------------------- | ---------------------------------------------- |
| 定位     | 全局共享数据仓库     | 可复用逻辑片段                                 |
| 实例     | 全局单例             | 每次调用产生新实例（除非内部引用了模块级变量） |
| 适合场景 | 多组件共享同一份状态 | 封装通用逻辑（如面板协调、字幕同步）           |

### 2.2 基本写法

```ts
// composables/useXxx.ts
import { ref, onMounted, onUnmounted } from "vue";

export function useXxx() {
  const state = ref(someInitialValue);

  function doSomething() {
    // ...
  }

  onMounted(() => {
    // 组件挂载时的副作用
  });

  onUnmounted(() => {
    // 清理
  });

  return { state, doSomething };
}
```

### 2.3 实际示例 — 字幕同步

`composables/useSubtitleSync.ts` 根据播放器当前时间，计算应该高亮哪一行字幕：

```ts
import { computed } from "vue";
import { usePlayerStore } from "../stores/player";
import type { Subtitle } from "../stores/listening";

export function useSubtitleSync(subtitles: () => Subtitle[]) {
  const playerStore = usePlayerStore();

  const activeIndex = computed(() => {
    const timeMs = playerStore.currentTime * 1000;
    const subs = subtitles();
    return subs.findIndex((s) => timeMs >= s.startTime && timeMs <= s.endTime);
  });

  return { activeIndex };
}
```

在组件中使用：

```vue
<script setup lang="ts">
import { useSubtitleSync } from "@/composables/useSubtitleSync";

const props = defineProps<{ subtitles: Subtitle[] }>();
const { activeIndex } = useSubtitleSync(() => props.subtitles);
</script>
```

这里 `subtitles` 参数是一个 getter 函数 `() => Subtitle[]`，而非直接传数组值。这样可以保证 computed 内部始终能读到最新的字幕列表。

### 2.4 实际示例 — 面板互斥协调器

`composables/usePanelCoordinator.ts` 使用了**模块级变量**来实现全局单例效果：

```ts
import { ref } from "vue";

type PanelId = "word" | "analysis";

// 模块级变量 —— 所有调用者共享同一份状态
const activePanel = ref<PanelId | null>(null);
const closeCallbacks = new Map<PanelId, () => void>();

export function registerPanel(panel: PanelId, onClose: () => void) {
  closeCallbacks.set(panel, onClose);
}

export function activatePanel(panel: PanelId) {
  if (activePanel.value && activePanel.value !== panel) {
    const closeOther = closeCallbacks.get(activePanel.value);
    if (closeOther) closeOther();
  }
  activePanel.value = panel;
}
```

这个 composable 不是通过 `useXxx()` 函数返回实例，而是直接导出多个独立函数。因为 `activePanel` 和 `closeCallbacks` 定义在模块顶层，所有 import 这个模块的地方都共享同一份数据。

这种模式适用于：不需要在组件中创建多个独立实例，而是需要全局唯一的协调逻辑。

---

## 三、核心概念补充

### 3.1 ref — 响应式引用

`ref` 是 Vue 最基础的响应式 API。用 `ref` 包裹的值，当它变化时，所有依赖它的模板和 computed 会自动更新。

```ts
import { ref } from "vue";

const count = ref(0); // 声明，初始值 0
count.value = 1; // 赋值必须用 .value
console.log(count.value); // 读取也用 .value
```

在模板中不需要 `.value`：

```vue
<template>
  <p>{{ count }}</p>
  <!-- 自动解包 -->
</template>
```

### 3.2 computed — 计算属性

`computed` 基于其他响应式数据派生出新值，具有缓存特性（依赖不变则不重新计算）：

```ts
import { ref, computed } from "vue";

const words = ref<string[]>(["hello", "world"]);
const wordCount = computed(() => words.value.length); // 自动追踪 words 变化
```

### 3.3 响应式丢失问题

从 store 解构出 ref 值时，响应式不会丢失（Pinia 已处理）。但从普通 composable 解构时要注意：

```ts
// 安全 — store 的解构
const { currentTime, isPlaying } = usePlayerStore();

// 需注意 — 如果 composable 返回的是普通对象包裹 ref，解构是安全的
const { activeIndex } = useSubtitleSync(() => subtitles);
```

---

## 四、文件组织规范

本项目的目录结构：

```
src/
├── stores/            # Pinia Store 文件
│   ├── player.ts      # 播放器状态
│   ├── listening.ts   # 听力材料数据
│   ├── vocabulary.ts  # 单词本
│   ├── analysis.ts    # 句子 AI 分析
│   └── word.ts        # 查词功能
├── composables/       # 组合式函数
│   ├── usePanelCoordinator.ts  # 面板互斥协调
│   └── useSubtitleSync.ts      # 字幕同步逻辑
```

命名约定：

- Store 文件：`xxx.ts`，导出函数名为 `useXxxStore`
- Composable 文件：`useXxx.ts`，导出函数名为 `useXxx`（或导出独立函数）

---

## 五、快速上手模板

如果你要新增一个 Store：

```ts
// stores/myFeature.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useMyFeatureStore = defineStore("myFeature", () => {
  const data = ref<string[]>([]);
  const count = computed(() => data.value.length);

  async function loadData() {
    const res = await fetch("/api/my-feature");
    data.value = await res.json();
  }

  return { data, count, loadData };
});
```

如果你要新增一个 Composable：

```ts
// composables/useMyLogic.ts
import { ref, onMounted, onUnmounted } from "vue";

export function useMyLogic() {
  const result = ref<string>("");

  function handleEvent(e: Event) {
    result.value = (e.target as HTMLInputElement).value;
  }

  onMounted(() => window.addEventListener("custom-event", handleEvent));
  onUnmounted(() => window.removeEventListener("custom-event", handleEvent));

  return { result, handleEvent };
}
```
