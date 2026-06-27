# InlineWordCard 移除例句区块

## 概述

在 translation 页面 Markdown Reading 右侧的单词详情卡片（`InlineWordCard.vue`）中，移除 **Collins Examples** 和 **Examples** 两个例句展示区块，仅保留 Definitions 和 Phrases。

## 修改文件

| 文件                                                            | 说明                                  |
| --------------------------------------------------------------- | ------------------------------------- |
| `packages/client/src/components/translation/InlineWordCard.vue` | 删除两个例句 section 的 template 代码 |

## 改动详情

### 删除 Collins Examples section（当前 L72-L84）

```html
<!-- Collins Examples -->
<section v-if="wordData.collins_sents?.length">
  <h3 ...>Collins Examples</h3>
  ...
</section>
```

### 删除 Examples section（当前 L86-L95）

```html
<!-- Translation Examples -->
<section v-if="wordData.trans_sents?.length">
  <h3 ...>Examples</h3>
  ...
</section>
```

## 保留内容

- 单词名 + 音标 + 发音按钮
- Definitions（释义列表）
- Phrases（短语列表）
- Loading / Error / Empty 状态展示

## 受影响范围

- **仅影响** translation 页面 Markdown Reading tab 的 InlineWordCard
- 不影响 vocabulary 页面的 `WordDetailPanel.vue`（该组件保持独立，例句显示逻辑不变）
- 不影响 API 数据返回（后端仍会返回 `collins_sents` 和 `trans_sents` 字段，前端只是不再渲染）
- 无样式调整、无其他文件改动

## 验证

- 在 Markdown Reading tab 中渲染一段英文文本，点击单词查看释义，确认右侧卡片不显示例句区域
- 确认 Definitions 和 Phrases 正常显示
