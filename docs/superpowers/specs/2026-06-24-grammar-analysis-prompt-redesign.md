# 语法分析提示词重构

## 概述

将句子 AI 分析的提示词从「simple/detailed 双层结构描述式」改为「统一的语法成分标注式」，聚焦句子成分拆解和时态语态判断，输出控制在 500 字以内。

## 背景

当前 `llm.ts` 中 `buildPrompt` 按词数分两档：

- simple（≤10 词）：句子结构 + 关键短语，300 字
- detailed（>10 词）：句子结构 + 从句类型 + 逐层拆解 + 特殊用法，1000 字

用户希望分析结果更聚焦于语法教学场景：逐词标注句子成分 + 判断时态语态，且输出不宜过长。

## 设计决策

- **统一提示词**：不再区分 simple/detailed，所有句子走同一个提示词
- **结构化标注式**：用【句子成分】和【时态语态】标签，成分间斜杠分隔
- **字数上限 500 字**
- **分析维度**：主谓宾定状补（逐词标注）+ 时态 + 语态
- **不包含**：从句类型归类、逐层语法拆解、句子类型分类（简单句/复合句等）

## 新提示词

```
你是一个英语语法助手。请分析以下英文句子的语法，用中文回复，控制在500字以内，严格按以下格式输出：

【句子成分】
主语：xxx / 谓语：xxx / 宾语：xxx / 定语：xxx / 状语：xxx / 补语：xxx
（逐词标注每个词的成分归属，无对应成分可省略该行）

【时态语态】
时态：xxx / 语态：xxx

原句：${text}
```

## 代码改动

### 1. `packages/server/src/utils/llm.ts`

- `buildPrompt(text)`：去掉 `type` 参数，返回上述统一提示词
- `getAnalysisType()`：删除（不再需要区分 simple/detailed）

### 2. `packages/server/src/routes/analysis.ts`

- 移除 `getAnalysisType` 的 import 和调用
- `analysisType` 变量改为固定字符串 `"grammar"`
- 其余 SSE 流式逻辑、缓存逻辑、频率限制不变

### 3. `packages/client/src/api/index.ts` + `packages/client/src/stores/analysis.ts`

- `analysisType` 类型从 `"simple" | "detailed"` 改为 `"grammar"`

### 不需要改动

- DB schema：`analysis_type` 字段为 `text` 类型，存 `"grammar"` 完全兼容，无需迁移
- `callLLM` / `callLLMStream`：接口不变
- 前端 `SentenceAnalysisPanel` 展示逻辑不变
