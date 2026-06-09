# 字幕 AI 分析功能设计文档

## 背景

当前应用已支持听力播放、字幕显示、单词查词等功能。用户希望在听材料时，能够对字幕中的句子进行语法分析，帮助理解长难句结构。

### 目标

- 每条字幕行尾添加低调的 "AI" 按钮，点击后弹出右侧面板展示语法分析
- 使用 DeepSeek 官方 API（deepseek-chat 模型）生成分析内容
- 分析结果缓存到数据库，二次点击直接返回
- 前端仅传递 subtitleId，不允许直接传递原文，确保安全性
- 无需用户授权，任何人可使用

## 关键决策

| 决策项      | 结论                                                              |
| ----------- | ----------------------------------------------------------------- |
| 架构模式    | 按需懒加载：用户点击才调用大模型，结果写入 DB 缓存                |
| AI 按钮范围 | 每条字幕都显示（englishText 为空或纯标点/括号内容则隐藏）         |
| 面板互斥    | AI 面板与单词释义面板互斥，打开一个关闭另一个                     |
| 分析层级    | ≤10 词 → 简约版（主谓宾 + 关键短语）；>10 词 → 详细版（完整拆解） |
| API 服务    | DeepSeek 官方 API (api.deepseek.com)                              |
| 频率限制    | 基于 IP 的内存 Map，每 IP 每分钟最多 5 次                         |
| 前端缓存    | Map<subtitleId, result>，当前会话内不重复请求                     |

## 架构变更

### 整体数据流

```
SubtitleDisplay.vue "AI" 按钮 onClick
  → analysisStore.analyzeSentence(subtitleId)
  → GET /api/analysis/:subtitleId
  → server/routes/analysis.ts:
      1. 频率检查（IP 限流）
      2. 查 sentence_analyses 缓存
      3. 未命中 → 查 subtitles 表取 englishText
      4. 判断复杂度（≤10 词 → simple，>10 词 → detailed）
      5. 调用 DeepSeek API
      6. 结果写入 sentence_analyses
      7. 返回前端
  → SentenceAnalysisPanel.vue 右侧面板展示
```

### 文件变更清单

```
packages/server/src/
├── db/schema.ts                  # 修改：新增 sentenceAnalyses 表
├── routes/analysis.ts            # 新增：GET /api/analysis/:subtitleId
├── utils/deepseek.ts             # 新增：DeepSeek API 调用 + 提示词 + 复杂度判断
└── index.ts                      # 修改：注册 analysisRoutes

packages/client/src/
├── api/index.ts                          # 修改：新增 fetchSentenceAnalysis
├── stores/analysis.ts                    # 新增：AI 分析 Pinia store
├── components/subtitle/SubtitleDisplay.vue  # 修改：每条字幕行尾加 AI 按钮
├── components/analysis/
│   └── SentenceAnalysisPanel.vue         # 新增：右侧分析面板
└── views/ListeningView.vue              # 修改：面板互斥逻辑
```

## 核心模块设计

### 数据库 Schema

```ts
// packages/server/src/db/schema.ts 新增
export const sentenceAnalyses = sqliteTable("sentence_analyses", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  subtitleId: integer("subtitle_id")
    .notNull()
    .references(() => subtitles.id, { onDelete: "cascade" }),
  analysisType: text("analysis_type").notNull(), // "simple" | "detailed"
  content: text("content").notNull(), // AI 返回的讲解内容（JSON 字符串）
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
```

### API 设计

| 方法  | 路径                        | 说明                            |
| ----- | --------------------------- | ------------------------------- |
| `GET` | `/api/analysis/:subtitleId` | 获取/生成句子分析（按需懒加载） |

**请求**：无请求体，subtitleId 在 URL 路径中

**响应**：

```json
{
  "subtitleId": 42,
  "originalText": "Although the project faced many challenges, the team managed to deliver it on time.",
  "analysisType": "detailed",
  "content": "<AI 返回的分析内容>"
}
```

### routes/analysis.ts（新增）

**职责**：接收 subtitleId，返回分析结果（缓存命中直接返回，否则调用 DeepSeek 生成并缓存）。

**核心逻辑**：

```ts
app.get("/:subtitleId", async (c) => {
  const subtitleId = Number(c.req.param("subtitleId"));

  // 1. 频率检查
  const ip = c.req.header("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) return c.json({ error: "Too many requests" }, 429);

  // 2. 查缓存
  const cached = await db
    .select()
    .from(sentenceAnalyses)
    .where(eq(sentenceAnalyses.subtitleId, subtitleId))
    .get();
  if (cached)
    return c.json({ subtitleId, content: cached.content, analysisType: cached.analysisType });

  // 3. 查字幕原文
  const sub = await db.select().from(subtitles).where(eq(subtitles.id, subtitleId)).get();
  if (!sub?.englishText) return c.json({ error: "No text to analyze" }, 404);

  // 4. 判断复杂度 + 生成提示词
  const analysisType = getAnalysisType(sub.englishText);
  const prompt = buildPrompt(sub.englishText, analysisType);

  // 5. 调用 DeepSeek
  const content = await callDeepSeek(prompt);

  // 6. 写入缓存
  await db.insert(sentenceAnalyses).values({ subtitleId, analysisType, content }).run();

  return c.json({ subtitleId, originalText: sub.englishText, analysisType, content });
});
```

### utils/deepseek.ts（新增）

**环境变量**：

```bash
DEEPSEEK_API_KEY=sk-xxxxxxxx  # DeepSeek API 密钥
```

**复杂度判断**：

```ts
function getAnalysisType(text: string): "simple" | "detailed" {
  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return wordCount <= 10 ? "simple" : "detailed";
}
```

**提示词**：

_简约版（simple）_：

```text
你是一个英语语法助手。请简洁分析以下英文句子，用中文回复，包含：
1. 句子结构（主谓宾/主系表等）
2. 关键短语标注

原句：{englishText}
```

_详细版（detailed）_：

```text
你是一个英语语法助手。请详细分析以下英文长难句，用中文回复，包含：
1. 整体句子结构（主谓宾/主系表等）
2. 从句类型标注（定语从句、状语从句等）
3. 逐层语法拆解
4. 关键短语和特殊用法说明

原句：{englishText}
```

**API 调用**：

```ts
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 15000;

async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json();
  return json.choices[0].message.content;
}
```

**频率限制**（routes/analysis.ts 内）：

```ts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5; // 每分钟最多 5 次
const RATE_LIMIT_WINDOW = 60000; // 60 秒窗口

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}
```

## 前端设计

### Pinia Store（stores/analysis.ts）

```ts
interface AnalysisResult {
  subtitleId: number;
  originalText: string;
  analysisType: "simple" | "detailed";
  content: string;
}

export const useAnalysisStore = defineStore("analysis", () => {
  const panelOpen = ref(false);
  const currentSubtitleId = ref<number | null>(null);
  const currentResult = ref<AnalysisResult | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const cache = new Map<number, AnalysisResult>();
  let requestId = 0;

  async function analyzeSentence(subtitleId: number) {
    useWordStore().closePanel(); // 互斥：关闭单词面板
    panelOpen.value = true;
    currentSubtitleId.value = subtitleId;
    error.value = null;

    if (cache.has(subtitleId)) {
      currentResult.value = cache.get(subtitleId)!;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    const thisId = ++requestId;
    try {
      const res = await fetch(`/api/analysis/${subtitleId}`);
      if (thisId !== requestId) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        error.value = err.error || `HTTP ${res.status}`;
        return;
      }
      const data: AnalysisResult = await res.json();
      currentResult.value = data;
      cache.set(subtitleId, data);
    } catch (e) {
      if (thisId !== requestId) return;
      error.value = e instanceof Error ? e.message : "Analysis failed";
    } finally {
      if (thisId === requestId) isLoading.value = false;
    }
  }

  function closePanel() {
    panelOpen.value = false;
    currentSubtitleId.value = null;
    currentResult.value = null;
    error.value = null;
  }

  return {
    panelOpen,
    currentSubtitleId,
    currentResult,
    isLoading,
    error,
    analyzeSentence,
    closePanel,
  };
});
```

### AI 按钮（SubtitleDisplay.vue 修改）

每条字幕段落末尾增加 AI 按钮：

```html
<button
  v-if="hasText(sub.englishText)"
  @click.stop="onClickAi(sub.id)"
  class="inline text-[10px] text-gray-300 hover:text-blue-400 ml-1 align-top leading-none"
  title="AI 分析句子"
>
  AI
</button>
```

`hasText` 判断：`englishText` 非空且去除标点/括号内容后仍有实际单词才显示按钮。

### 分析面板（SentenceAnalysisPanel.vue 新增）

参照 `WordDetailPanel.vue`：

- 宽度 `w-[360px]`，右边界框 `border-l`
- 顶部 sticky header：显示原句 + 关闭按钮
- Body：
  - 加载态：骨架占位动画
  - 错误态：红色提示框
  - 内容态：`whitespace-pre-wrap` 渲染 AI 返回文本
- Esc 关闭：监听 keydown Escape

### 面板互斥（ListeningView.vue 修改）

```html
<SentenceAnalysisPanel v-if="analysisStore.panelOpen" />
<WordDetailPanel v-else-if="wordStore.panelOpen" />
```

`analyzeSentence()` 方法中自动调用 `useWordStore().closePanel()`，确保互斥。

### 切换材料时关闭

在现有 `ListeningView.vue` 的 `onSelect()` 方法中增加 `analysisStore.closePanel()`，与单词面板关闭逻辑保持一致。

## 边界场景与错误处理

| 场景                          | 处理                                            |
| ----------------------------- | ----------------------------------------------- |
| 字幕 englishText 为空         | API 返回 404，前端隐藏 AI 按钮                  |
| subtitleId 不存在             | API 返回 404，前端面板显示错误信息              |
| DeepSeek API 超时（15s）      | 返回 504，前端提示"分析超时"                    |
| DeepSeek API 返回异常         | try-catch，返回 502，**不写缓存**（下次可重试） |
| 频率限制触发                  | API 返回 429，前端面板显示"请求过于频繁"        |
| DEEPSEEK_API_KEY 未设置       | 启动时 console.warn，API 返回 503               |
| 同一字幕快速连点              | store 内 requestId 去重 + isLoading 阻止        |
| 纯标点/括号字幕（如 (music)） | 前端 `hasText()` 过滤，不渲染按钮               |
| 分析内容过长                  | 面板 body `overflow-y-auto` 可滚动              |
| 面板打开时切换听力材料        | `onSelect` 中调用 `analysisStore.closePanel()`  |
| Esc 关闭面板                  | 复用 keydown Escape 监听                        |

## 环境变量

```bash
# packages/server/.env
DEEPSEEK_API_KEY=sk-xxxxxxxx
```

## 未涉及

- 用户登录与授权
- 批量预分析
- 分析内容的编辑或重新生成功能
- 对已缓存内容的更新/覆盖机制

---

_文档版本：v1.0_  
_最后更新：2026-06-09_
