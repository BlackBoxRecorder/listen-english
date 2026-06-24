# 语法分析 Prompt 升级：完整句子成分与从句分析

## 概述

将 `buildPrompt` 从仅覆盖主谓宾状的简化版，升级为覆盖定语、补语、从句分析、主谓宾/主系表判别的完整版。采用统一单一 prompt（不区分 simple/detailed），输出采用两层标签 + 竖向排列，适配右侧窄栏阅读场景。

## 背景

当前 prompt（llm.ts L122-L135）仅分析主语、谓语、宾语、状语四个成分，不含：

- 定语 / 补语
- 从句类型识别与逐层展开（定语从句、状语从句、名词性从句等）
- 句型结构判断（主谓宾 / 主系表 / 主谓双宾 / There be 等）

用户需要更完整、详细的语法分析以帮助英语学习。

## 设计决策

| 维度          | 旧           | 新                                   |
| ------------- | ------------ | ------------------------------------ |
| 字数上限      | 500          | 1000                                 |
| Prompt 策略   | 单一         | 单一（不变）                         |
| 标签层级      | 两层         | 两层（不变）                         |
| 排版方向      | 水平斜杠分隔 | 竖向换行排列                         |
| 从句分析      | 无           | 缩进展开，标注从句类型与内部成分     |
| 句型判断      | 无           | 标注主谓宾/主系表/主谓双宾等         |
| 定语/补语     | 无           | 标注定语、补语                       |
| Few-shot 示例 | 1 个简单句   | 3 个（简单句、定语从句、多从句嵌套） |

### 关键约束

- **两层标签不变**：【句子成分】统一承载所有成分、句型、从句信息；【时态语态】仅含时态和语态
- **竖向排列**：每行独立一个成分/信息，避免长行，适配右侧栏 ~300px 宽度
- **缩进表示层级**：从句内部的成分用两个空格缩进，清晰展示嵌套关系（不使用 ├ └ 等树形符号，避免 LLM 输出不稳定）
- **统一 prompt**：所有句子走同一套 prompt，由 LLM 根据句子复杂度自行调整输出详略

## 新 Prompt

```
你是一个英语语法助手。请分析以下英文句子的语法，用中文回复，控制在1000字以内，严格按以下格式输出。

示例1——
输入：She reads books quietly in the library.
输出：
【句子成分】
句型：主谓宾结构

主语：She
谓语：reads
宾语：books
状语：quietly in the library

【时态语态】
时态：一般现在时
语态：主动语态

示例2——
输入：The girl who sits next to me is from Canada.
输出：
【句子成分】
句型：主系表结构

主语：The girl
  定语从句（修饰主语）：who sits next to me
    关系代词：who（作从句主语）
    谓语：sits
    状语：next to me
系动词：is
表语：from Canada

【时态语态】
主句时态：一般现在时
从句时态：一般现在时
语态：主动语态

示例3——
输入：The teacher told us that the exam would be difficult if we didn't study hard.
输出：
【句子成分】
句型：主谓双宾结构

主语：The teacher
谓语：told
间接宾语：us
直接宾语（宾语从句）：that the exam would be difficult if we didn't study hard
  引导词：that
  主语：the exam
  系动词：would be
  表语：difficult
  条件状语从句：if we didn't study hard
    引导词：if
    主语：we
    谓语：didn't study
    状语：hard

【时态语态】
主句时态：一般过去时
宾语从句时态：过去将来时
条件状语从句时态：一般过去时
语态：主动语态

现在分析——
原句：${text}
```

### Prompt 设计要点

1. **Few-shot 梯度**：简单句（仅主干）→ 单从句（定语从句）→ 多从句嵌套（宾语从句 + 条件状语从句），覆盖三种典型复杂度
2. **从句标注方式**：`<从句类型>：<从句原文>`，另起一行缩进展开内部成分。嵌套从句继续缩进
3. **无对应成分时省略**：如句子没有定语/补语/从句，对应行不出现
4. **原句放在末尾**：`${text}` 插入在 few-shot 之后，让 LLM 先看到格式规范再看到待分析句子

## 代码改动

### 文件：`packages/server/src/utils/llm.ts`

**`buildPrompt(text)` — 重写**

- 替换 L122-L135 的旧 prompt 为上述新 prompt
- 函数签名不变：`(text: string) => string`
- JSDoc 注释更新

**其他函数无改动**

- `callLLM()` — 不变
- `callLLMStream()` — 不变
- `loadActiveProvider()` — 不变

### 文件：`packages/server/src/routes/analysis.ts` — 无改动

当前路由已使用 `buildPrompt(sub.englishText)` 生成 prompt，函数签名不变，无需任何修改。旧缓存兼容逻辑（`analysisType !== "grammar"` 时删除重分析）也无需调整。

### 文件：前端 — 无改动

`SentenceAnalysisPanel.vue` 通过 `marked` 渲染 markdown。竖向文本 + 空行 + 缩进会被正确渲染为段落和换行，无需前端修改。

## 旧数据迁移

`analysis.ts` 第 58 行已有逻辑：`analysisType !== "grammar"` 的旧缓存自动删除并重新分析。升级后用户重新点击 AI 分析按钮时，旧缓存自然淘汰，无需额外迁移脚本。

## 不变项

| 模块        | 内容                                                  |
| ----------- | ----------------------------------------------------- |
| DB schema   | `sentenceAnalyses.analysis_type` 存 `"grammar"`，不变 |
| 频率限制    | IP 级别，每 60 秒 5 次，不变                          |
| 流式响应    | SSE 直透方案，不变                                    |
| 多 provider | OpenAI 兼容格式调用，不变                             |
| 前端面板    | markdown 渲染 + 可滚动区域，不变                      |
