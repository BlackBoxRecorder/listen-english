# Remove Sentence Audio Buttons

## Overview

移除例句发音按钮，保留单词发音按钮。涉及右侧单词详情面板、单词本、查词结果三个场景。

## Scope

| 文件                                                               | 操作                                  | 说明                          |
| ------------------------------------------------------------------ | ------------------------------------- | ----------------------------- |
| `packages/client/src/components/word/WordDetailPanel.vue`          | 删除 trans_sents 区域内的例句播放按钮 | 右侧单词详情面板              |
| `packages/client/src/components/vocabulary/WordDefinitionCard.vue` | 删除 trans_sents 区域内的例句播放按钮 | 单词本 + 查词结果（共用组件） |

## Design

### What to remove

两个文件中 `trans_sents` 循环内的 `<button v-if="s.audio_url" ...>` 整块代码，包含 SVG 图标、"Play" 文字、`@click="playAudio(s.audio_url)"` 事件处理。

### What to keep

- 单词发音按钮（`phonetic.audio`）：两处均保留，不受影响
- `playAudio()` 函数：单词发音仍依赖它
- `trans_sents` 数据展示：例句文本和翻译照常渲染
- 后端 API 及 `audio_url` 数据字段：不修改

### Impact

- 仅前端 UI 变更，零依赖影响
- 无类型定义变更
- 无 API 变更
