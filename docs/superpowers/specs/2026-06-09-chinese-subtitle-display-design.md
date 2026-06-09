# 中文字幕显示功能设计

## 概述

在音频播放器上方增加一个固定区域，实时显示当前英文字幕对应的中文翻译。有翻译时显示，无翻译时隐藏。翻译文字居中显示，高度适中。

## 数据基础

- 数据库 `subtitles` 表已有 `chinese_text` 字段（由 `translateSubtitles.ts` 脚本通过腾讯云翻译 API 填充）
- 服务端 API `GET /api/listening/:id` 已返回完整字幕数据（含 `chineseText`）
- 前端 `Subtitle` 接口已定义 `chineseText: string | null`
- `useSubtitleSync` composable 已实时计算当前播放位置对应的 `activeIndex`

## 方案选择

选择方案 1：新建独立组件 `ChineseSubtitle.vue`。

- 职责独立，不修改现有组件
- `ListeningView.vue` 布局中仅增加一行组件引用

## 组件设计

### ChineseSubtitle.vue

**文件位置**：`packages/client/src/components/subtitle/ChineseSubtitle.vue`

**模板**：

- 根元素 `v-if` 控制显隐：当 `activeIndex >= 0` 且字幕的 `chineseText` 非空时渲染，否则整个元素不存在
- 高度固定 `h-[60px]`，`shrink-0` 防止被弹性容器压缩
- 内容垂直居中、水平居中
- 文字超出时 `line-clamp-2` 截断（最多两行）

**脚本**：

- 使用 `useListeningStore` 获取 `currentMaterial.subtitles`
- 使用 `useSubtitleSync(() => subtitles)` 获取 `activeIndex`
- 计算属性 `currentChinese`：从 `subtitles[activeIndex].chineseText` 取值

**样式**：

- 背景 `bg-gray-50`，与英文字幕区域形成轻微区分
- 上边框 `border-t border-gray-200` 分隔英文字幕和中文区域
- 下边框 `border-b border-gray-200` 分隔中文区域和播放器
- 文字 `text-base text-gray-700`，居中显示

### ListeningView.vue 布局变化

```
┌────────────────────────────────────┐
│  ListeningList  │  中心区域        │
│  (左侧栏)        │  ┌────────────┐ │
│                  │  │ Subtitle   │ │  ← flex-1，滚动列表
│                  │  │ Display    │ │
│                  │  ├────────────┤ │
│                  │  │ Chinese    │ │  ← 新增，h-60px, shrink-0
│                  │  │ Subtitle   │ │
│                  │  ├────────────┤ │
│                  │  │ Audio      │ │  ← h-100px, shrink-0
│                  │  │ Player     │ │
│                  │  └────────────┘ │
│                  │                 │  WordDetailPanel
└────────────────────────────────────┘
```

## 数据流

```
playerStore.currentTime
        │
        ▼
useSubtitleSync(subtitles)  →  activeIndex (computed)
        │
        ▼
subtitles[activeIndex].chineseText
        │
        ▼
  ChineseSubtitle.vue
  v-if="chineseText 非空"  →  显示/隐藏
  {{ chineseText }}        →  居中渲染
```

## 边界情况

| 情况                       | 行为                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| 无材料选中                 | `subtitles` 为空数组，`activeIndex` 为 -1，`v-if` 为 false，区域不存在 |
| 当前字幕无中文翻译         | `chineseText` 为 null，`v-if` 为 false，区域不存在                     |
| 用户拖动进度条到无字幕区间 | `activeIndex` 为 -1，区域隐藏                                          |
| 切换材料                   | `listeningStore` 更新，新字幕加载后按新数据显示                        |
| 中文翻译超过两行           | `line-clamp-2` 截断，末尾显示省略号                                    |

## 涉及文件

| 文件                                                          | 操作 | 说明                           |
| ------------------------------------------------------------- | ---- | ------------------------------ |
| `packages/client/src/components/subtitle/ChineseSubtitle.vue` | 新建 | 中文字幕显示组件               |
| `packages/client/src/views/ListeningView.vue`                 | 修改 | 引入 ChineseSubtitle，插入布局 |
