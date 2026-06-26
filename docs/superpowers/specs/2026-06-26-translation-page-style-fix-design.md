# Translation 页面样式优化

> 2026-06-26 | 影响文件：`packages/client/src/views/TranslationView.vue`

## 概述

五项零风险的前端样式调整，统一修改 `TranslationView.vue`：

1. 文本框禁用横向滚动条，启用自动换行
2. 页面左右留白（对齐 Vocabulary 页面风格）
3. Tab 按钮居中 + 去掉 emoji 图标（对齐 Vocabulary 页面风格）
4. 全界面文案英文化（对齐除 grammar 外全站的英文界面规范）

## 修改项

### 1. 文本框禁用横向滚动条 + 自动换行

**影响范围：** 三个 `<textarea>` 元素

**修改方式：**

- 每个 textarea 的 `class` 追加 `break-words overflow-x-hidden`
- `<style scoped>` 中追加兜底规则：

```css
textarea {
  overflow-x: hidden;
  word-wrap: break-word;
}
```

**涉及 textarea：**

- 翻译输入框（`:model="sourceText"`）
- 翻译结果框（`:value="translatedText"`）
- Markdown 输入框（`v-model="mdInput"`）

### 2. 页面左右留白

翻译 tab 与 markdown tab 分别约束宽度，避免全宽撑满：

| 区域                        | 新增 class                       | 说明             |
| --------------------------- | -------------------------------- | ---------------- |
| 翻译 tab 容器（双栏并排）   | `max-w-5xl mx-auto`              | max-width 1024px |
| Markdown 输入态容器         | `mx-auto` + 保留现有 `max-w-2xl` | 居中即可         |
| Markdown 渲染态（分栏视图） | `max-w-6xl mx-auto`              | max-width 1152px |

### 3. Tab 按钮居中 + 去掉 emoji 图标

参考 VocabularyView 的 tab bar 写法：

- 外层 `div` 添加 `flex justify-center` 使 tab 按钮居中
- 去掉 📝 和 📖 emoji，仅保留纯文字
- Tab 样式从圆角卡片式（`rounded-t-lg`）改为下划线式（`border-b-2 -mb-px`），与 vocabulary/grammar 页面统一

### 4. 界面文案英文化

| 位置               | 当前                                       | 改为                             |
| ------------------ | ------------------------------------------ | -------------------------------- |
| Tab 1 标题行       | `📝 文本翻译` → `📝 Text Translation`      | `Text Translation`（去掉 emoji） |
| Tab 2 标题行       | `📖 Markdown 查词` → `📖 Markdown Reading` | `Markdown Reading`（去掉 emoji） |
| 翻译提示           | `自动检测中/英文并翻译`                    | `Auto-detect & translate`        |
| 输入框 label       | `Source Text（输入原文）`                  | `Source Text`                    |
| 结果框 label       | `Translation（翻译结果）`                  | `Translation`                    |
| 翻译按钮（空闲）   | `翻译 Translate`                           | `Translate`                      |
| 翻译按钮（进行中） | `翻译中...`                                | `Translating...`                 |
| 渲染按钮           | `Render 渲染`                              | `Reading`                        |
| 清空按钮           | `✕ 清空 Clear`                             | `✕ Clear`                        |
| Markdown 提示文字  | `输入或粘贴 Markdown 文本…`                | `Enter or paste Markdown text…`  |

## 不变项

- 功能逻辑完全不变
- 翻译 API 调用不变
- Markdown 渲染 / 单词点击查词不变
- 无新增依赖，无删除代码
