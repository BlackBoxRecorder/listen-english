# LLM 句子分析流式输出改造设计

## 概述

将句子 AI 分析从「等待完整响应后一次性渲染」改为「SSE 流式输出 + 逐字增量渲染」，同时禁用 DeepSeek 思考模式，将用户感知等待从 ~10 秒降至 ~1-2 秒（首字可见）。

## 决策记录

| 决策点   | 选择                 | 理由                               |
| -------- | -------------------- | ---------------------------------- |
| 改造范围 | 仅当前活跃 provider  | 渐进式改造，后续按需扩展           |
| 传输方式 | SSE 直透             | 后端直接 pipe LLM 流，减少转换开销 |
| 缓存策略 | 后端流结束后自动写库 | 前端无感，与现有缓存逻辑一致       |
| 端点设计 | 同一端点自动判断     | 缓存命中返 JSON，未命中返 SSE      |

## API 设计

### `GET /api/analysis/:subtitleId`（不改路径，行为自动切换）

**缓存命中时** → `200 JSON`

```json
{
  "subtitleId": 1,
  "originalText": "Hello world.",
  "analysisType": "simple",
  "content": "..."
}
```

**缓存未命中时** → `200 text/event-stream`

```
data: {"chunk":"句子"}
data: {"chunk":"结构"}
data: {"chunk":"：主谓宾"}
data: [DONE]
```

- 每个 chunk 为单条 `data:` 行，value 为 JSON 对象 `{"chunk": "文本片段"}`
- 流结束发 `data: [DONE]` 作为终止信号
- Content-Type: `text/event-stream`

## 后端改造

### 文件：`packages/server/src/utils/llm.ts`

**新增 `callLLMStream` 函数：**

```ts
async function* callLLMStream(prompt: string): AsyncGenerator<string>
```

- 在 fetch body 中增加 `stream: true` 和 `thinking: { type: "disabled" }`
- `thinking` 参数为 DeepSeek 特有，OpenAI 兼容规范下未知参数会被忽略，不影响其他 provider
- 保留原 `callLLM` 函数不动，供未来非流式场景使用
- 通过 `response.body` 获取 `ReadableStream<Uint8Array>`
- 逐行解析 SSE `data:` 行，提取 `choices[0].delta.content`
- 每个有内容的 delta 通过 `yield` 产出
- 错误处理：非 200 状态码抛异常
- 超时复用 provider 配置的 `timeout`，通过 `AbortSignal.timeout()` 实现

**解析格式约定：**

- 读到 `data: [DONE]` 时结束迭代
- 空行跳过
- 非 `data:` 开头的行跳过

### 文件：`packages/server/src/routes/analysis.ts`

**`GET /:subtitleId` 改造：**

原流程第 6 步（`const content = await callLLM(prompt)`）改为：

```ts
return stream(c, async (stream) => {
  let fullContent = "";
  const llmStream = callLLMStream(prompt);
  for await (const chunk of llmStream) {
    fullContent += chunk;
    await stream.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  }
  await stream.write("data: [DONE]\n\n");
  // 异步写缓存，不阻塞流关闭
  db.insert(sentenceAnalyses).values({ subtitleId, analysisType, content: fullContent }).run();
});
```

- 用 Hono 的 `stream()` 方法返回 SSE 响应
- 流式过程中实时收集 `fullContent`
- 流结束后异步写入 `sentence_analyses` 表（fire-and-forget，不阻塞）
- 其他逻辑（参数校验、缓存检查、频率限制、字幕查询）不变

## 前端改造

### 文件：`packages/client/src/api/index.ts`

**新增 `fetchSentenceAnalysisStream`：**

```ts
async function fetchSentenceAnalysisStream(
  subtitleId: number,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ subtitleId: number; originalText: string; analysisType: string; content: string }>;
```

- 用 `fetch` 发起 GET，传入 `signal` 支持中断
- 通过 `response.body.getReader()` 读取流
- 逐行解析 SSE `data:` 行
- 遇 `[DONE]` 结束读取
- 每个 chunk 调用 `onChunk` 回调通知 store 更新 UI
- 收集完整 `content`，与 `originalText`、`analysisType` 一同返回
- 缓存命中时 `response.headers.get("content-type")` 为 `application/json`，直接 `res.json()` 返回

### 文件：`packages/client/src/stores/analysis.ts`

**核心变化：**

- 新增 `streamingContent: ref<string>("")` — 流式过程中实时累加
- `analyzeSentence` 改为调用 `fetchSentenceAnalysisStream`
- 传入 `onChunk`：`streamingContent.value += chunk`
- 传入 `AbortSignal`：用 `AbortController`，新请求到来时 abort 前一个
- 流结束后：`currentResult.value = { ...result }`，写入前端缓存 `cache.set()`
- 请求去重逻辑保持不变（`requestId` 递增）
- 新增 `abortController` 管理：发起新请求前 `abortController.abort()` 取消旧连接

### 文件：`packages/client/src/components/analysis/SentenceAnalysisPanel.vue`

**改动最小化：**

- 新增 computed `displayContent`：优先 `streamingContent`，其次 `currentResult?.content`
- `v-html` 绑定改为 `renderedContent`（基于 `displayContent` 实时 markdown 渲染）
- Loading 骨架屏条件：`isLoading && !streamingContent`（一旦有内容就隐藏骨架屏）
- 面板关闭时清空 `streamingContent`

## 错误处理

| 场景                              | 处理方式                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| LLM API 返回非 200                | 后端抛异常，路由层返回 502/504 JSON（不走流式）                                     |
| SSE 流中途断开                    | 前端 `fetch` 抛出网络错误，store 设置 `error`，UI 显示错误提示                      |
| 用户快速切换句子                  | `AbortController.abort()` 取消旧请求，`requestId` 忽略旧响应                        |
| 缓存命中                          | 不走流式，直接返回 JSON，`streamingContent` 为空，`currentResult` 立即赋值          |
| 流式缓存写入失败                  | fire-and-forget，不影响已返回给用户的流式内容（下次点击同一句子会重新触发 AI 调用） |
| 频率限制触发                      | 在发起 LLM 调用前返回 429 JSON，不走流式                                            |
| thinking disabled 对其他 provider | 未知参数被忽略，不影响功能                                                          |

## 涉及文件清单

| 文件                                                                | 改动类型                             |
| ------------------------------------------------------------------- | ------------------------------------ |
| `packages/server/src/utils/llm.ts`                                  | 新增 `callLLMStream` 函数            |
| `packages/server/src/routes/analysis.ts`                            | `GET /:subtitleId` 改为支持 SSE 流式 |
| `packages/client/src/api/index.ts`                                  | 新增 `fetchSentenceAnalysisStream`   |
| `packages/client/src/stores/analysis.ts`                            | 集成流式消费 + AbortController       |
| `packages/client/src/components/analysis/SentenceAnalysisPanel.vue` | 增量渲染 + 骨架屏条件调整            |
