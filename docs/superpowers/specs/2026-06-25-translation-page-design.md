# Translation 翻译页面设计

## 概述

在 Listen English 应用中新增 `/translation` 翻译页面，包含两个 Tab：**文本翻译**（调用腾讯云 TMT 机器翻译）和 **Markdown 查词**（Markdown 渲染 + 单击单词查释义）。

---

## 路由与导航

- **路由**: `/translation`，懒加载 `TranslationView.vue`
- **导航栏**: `AppLayout.vue` 的 `<nav>` 中新增 `Translation` 链接，排在 Grammar 之后

```
Listening | Vocabulary | Grammar | Translation
```

---

## 文件清单

### 新增文件

| 文件                                                            | 说明                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/client/src/views/TranslationView.vue`                 | 翻译页面主视图（含两个 Tab）                                |
| `packages/client/src/components/translation/InlineWordCard.vue` | Markdown Tab 内嵌单词释义卡片                               |
| `packages/server/src/routes/translate.ts`                       | 翻译 API 路由 `POST /api/translate`                         |
| `packages/server/src/utils/tencentTmt.ts`                       | 从 translateSubtitles.ts 抽取的腾讯云 TMT 签名+调用共享模块 |

### 修改文件

| 文件                                                  | 改动                              |
| ----------------------------------------------------- | --------------------------------- |
| `packages/client/src/router/index.ts`                 | 添加 `/translation` 路由          |
| `packages/client/src/components/layout/AppLayout.vue` | 导航栏添加 Translation 入口       |
| `packages/server/src/index.ts`                        | 注册 `/api/translate` 路由        |
| `packages/server/src/tasks/translateSubtitles.ts`     | 改为引用 `tencentTmt.ts` 共享模块 |

---

## 架构概览

```
┌─ TranslationView.vue ─────────────────────────────────────────┐
│  ┌─ Tab Bar ────────────────────────────────────────────────┐ │
│  │  [ 文本翻译 ]  [ Markdown 查词 ]                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Tab 1: 文本翻译                                               │
│  ┌─────────────────────┬─────────────────────┐                │
│  │  Source Text (输入)  │  Translation (只读) │                │
│  │                      │                     │                │
│  │  textarea            │  textarea[readonly] │                │
│  │                      │                     │                │
│  │  500 / 1000          │                     │                │
│  └─────────────────────┴─────────────────────┘                │
│              [ 翻译 Translate ]  ← spinner + "翻译中..."       │
│                                                                │
│  Tab 2: Markdown 查词                                          │
│  ┌─[输入态]──────────────────────────────────────────────────┐ │
│  │           textarea (居中)                                   │ │
│  │           [ Render 渲染 ]                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌─[渲染态]────────────────────────────────────────────────────┐│
│  │  ┌─ Rendered HTML ───────┬── InlineWordCard ────────────┐ │ │
│  │  │  **Title**             │  word                        │ │ │
│  │  │  Click any _word_      │  /fəˈnetɪk/                  │ │ │
│  │  │  to look it up.        │  • definition 1              │ │ │
│  │  │                        │  • definition 2              │ │ │
│  │  └────────────────────────┴─────────────────────────────┘ │ │
│  │              [ ✕ 清空 Clear ]                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 后端设计

### 共享模块 `src/utils/tencentTmt.ts`

从 `src/tasks/translateSubtitles.ts` 抽取 TC3-HMAC-SHA256 签名和 API 调用逻辑，对外暴露：

```ts
/**
 * 调用腾讯云 TextTranslate API
 * @param text 待翻译文本
 * @param sourceLang 源语言 "zh" | "en"
 * @param targetLang 目标语言 "zh" | "en"
 * @returns 翻译结果字符串
 */
export async function translateViaTencentTmt(
  text: string,
  sourceLang: "zh" | "en",
  targetLang: "zh" | "en",
): Promise<string>;
```

内部封装：

- TC3-HMAC-SHA256 v3 签名
- HTTPS POST 到 `tmt.tencentcloudapi.com`
- 超时 15s
- 指数退避重试最多 3 次（1s / 2s / 4s）
- 频率控制 250ms 最小间隔
- Region: `ap-beijing`

### 新路由 `POST /api/translate`

**请求体**:

```json
{
  "text": "要翻译的文本"
}
```

**处理流程**:

1. 文本为空 → 400 `"Text is required"`
2. `text.length > 1000` → 400 `"Text exceeds 1000 characters"`
3. 语言检测：统计中文字符占比，`CJK 占比 > 30%` → `zh→en`，否则 `en→zh`
4. 调用 `translateViaTencentTmt(text, sourceLang, targetLang)`
5. 成功返回 200

**成功响应**:

```json
{
  "sourceLang": "zh",
  "targetLang": "en",
  "translatedText": "...",
  "originalText": "..."
}
```

**错误响应**:

| 状态码 | 场景                                                           |
| ------ | -------------------------------------------------------------- |
| 400    | 文本为空 / 超 1000 字符                                        |
| 502    | 腾讯云 API 不可用                                              |
| 503    | 密钥未配置（`TENCENT_SECRET_ID` 或 `TENCENT_SECRET_KEY` 缺失） |
| 504    | 翻译超时                                                       |

### 语言检测逻辑

```
function detectLanguage(text: string): "zh" | "en" {
  let cjkCount = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified
        (code >= 0x3400 && code <= 0x4DBF) ||    // CJK Extension A
        (code >= 0xF900 && code <= 0xFAFF)) {    // CJK Compatibility
      cjkCount++;
    }
  }
  return cjkCount / text.length > 0.3 ? "zh" : "en";
}
```

### 环境变量

复用现有 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`，region 沿用 `ap-beijing`。不新增环境变量。

---

## 前端设计

### TranslationView.vue

使用 Vue 3 `<script setup lang="ts">` + Tailwind CSS，局部状态管理（**不创建 Pinia Store**）。

**局部状态**:

```ts
// Tab 1: 文本翻译
const sourceText = ref("");
const translatedText = ref("");
const isTranslating = ref(false);
const translateError = ref("");

// Tab 2: Markdown 查词
const mdInput = ref("");
const renderedHtml = ref(""); // 空字符串 = 输入态
const selectedWord = ref("");
const wordData = ref<WordData | null>(null);
const isLookingUp = ref(false);
```

**Tab 切换**: 使用 `v-show` 保持各自状态不丢失。

### Tab 1: 文本翻译

| 规则       | 实现                                                       |
| ---------- | ---------------------------------------------------------- |
| 字符限制   | `sourceText.length > 1000` 时按钮 `disabled`，字数统计变红 |
| 空文本     | `sourceText.trim() === ""` 时按钮 `disabled`               |
| 翻译触发   | 点击按钮 → `POST /api/translate`                           |
| Loading 态 | 按钮 `disabled`、文字变 "翻译中..."、显示 CSS spinner      |
| 错误处理   | 在按钮下方显示红色错误提示                                 |
| 右侧只读   | textarea 设 `readonly` + 灰色背景                          |

### Tab 2: Markdown 查词

**输入态**: 居中显示 textarea + Render 按钮

**渲染流程**:

```
marked.parse(mdInput) → HTML 字符串
       ↓
DOMPurify.sanitize(html) → 安全净化（防 XSS）
       ↓
DOMParser 解析 → 遍历文本节点
       ↓
splitIntoSegments() 拆分单词（复用现有 wordSplitter.ts）
       ↓
每个英文单词包裹 <span class="clickable-word" data-word="xxx">
       ↓
v-html 渲染 + 事件委托监听 span.clickable-word 点击
```

**单词点击**: `GET /api/words/search?q=word` → 结果显示在右侧 `InlineWordCard`

**清空**: 重置 `mdInput` / `renderedHtml` / `selectedWord` 回到输入态

**空 Markdown**: Render 按钮 `disabled`

### InlineWordCard.vue

轻量级单词释义卡片，不复用 `WordDetailPanel`。

复用类型 `WordData`，展示：

- 单词 + 音标 + 发音按钮（`<audio>` 播放）
- 释义列表（explains）
- Loading 骨架屏
- Error 提示
- Empty 状态

---

## 边界场景与错误处理

| 场景                | 处理                                                 |
| ------------------- | ---------------------------------------------------- |
| 翻译输入为空/纯空格 | 前端按钮禁用                                         |
| 超 1000 字符        | 前端禁用 + 红字提示；后端返回 400                    |
| 腾讯云 API 不可用   | 后端 502，前端 "翻译服务暂不可用，请稍后重试"        |
| 密钥未配置          | 后端 503 "Translation service not configured"        |
| 翻译超时            | 后端 15s 超时 → 504                                  |
| Markdown 为空       | Render 按钮 disabled                                 |
| Markdown 无英文单词 | 正常渲染，点击无效果                                 |
| 查词 API 不可用     | InlineWordCard 显示 "Dictionary service unavailable" |
| Tab 切换            | `v-show` 保持各自状态                                |
| 翻译接口被频繁调用  | 前端在请求未完成时禁用按钮（天然互斥）               |

---

## 依赖

### 复用已有依赖

- `marked` — Markdown → HTML（已安装）
- `dompurify` — HTML 安全净化（已安装）
- `@types/dompurify` — 类型定义（已安装）
- `crypto` / `https` — Node.js 原生模块
- `splitIntoSegments` — 单词拆分工具（已有）

### 不引入新依赖

---

## 方案决策记录

| 决策              | 选择                   | 原因                                 |
| ----------------- | ---------------------- | ------------------------------------ |
| 语言检测位置      | 后端                   | 统一职责，前端无需关心               |
| Markdown 查词面板 | InlineWordCard（独立） | 内嵌布局不干扰全局 WordDetailPanel   |
| 状态管理          | 局部 ref（无 Pinia）   | 页面状态简单，无需跨组件共享         |
| 腾讯云 API 模块   | 抽取 `tencentTmt.ts`   | translateSubtitles.ts 复用，避免重复 |
| Tab 切换          | `v-show`               | 保持状态不丢失                       |
