# 单词查询 API 迁移 - 设计文档

## 1. 概述

将单词查询功能的数据源从旧 API（`localhost:3066`）迁移到新有道词典 API（`http://127.0.0.1:5088`），适配新的 JSON 数据结构，并利用新 API 的增强字段（单词发音音频、例句分类、例句音频）。

## 2. 决策记录

| 决策点   | 选择               | 理由                                      |
| -------- | ------------------ | ----------------------------------------- |
| 架构模式 | 服务端代理（Hono） | 保持前端调用方式不变，便于后续加缓存/日志 |
| 数据适配 | 前端适配新格式     | 完整保留新 API 的增强信息                 |
| 音频 URL | 服务端补全         | 前端拿到的就是可直接播放的完整 URL        |
| UI 展示  | 完整利用新数据     | 例句分类展示 + 音频播放                   |

## 3. 新旧 API 对比

| 维度     | 旧 API                                             | 新 API                              |
| -------- | -------------------------------------------------- | ----------------------------------- |
| 端点     | `/api/words/search?q=&offset=&limit=`              | `/api/translate?word=`              |
| phonetic | 字符串 `"həˈloʊ"`                                  | 对象 `{ audio, phonetic }`          |
| 例句     | `sents[]`                                          | `collins_sents[]` + `trans_sents[]` |
| 例句音频 | 无                                                 | `trans_sents[].audio_url`           |
| 旧字段   | `id, frq, base, verify, lemmas, resembles, source` | 不存在                              |
| 分页     | `offset, limit, total`                             | 不存在                              |
| 错误字段 | 无                                                 | `error: string`                     |

### 新 API 响应示例

```json
{
  "success": true,
  "error": "",
  "data": {
    "word": "hello",
    "explains": ["int. 喂，你好", "n. 招呼，问候"],
    "phonetic": {
      "audio": "b89a9b3f9daa05b065640f1a646dce70.mp3",
      "phonetic": "həˈloʊ"
    },
    "phrase": [{ "key": "Hello Kitty", "value": ["凯蒂猫"] }],
    "collins_sents": [
      { "description": "习惯表达", "example": "Hello, Trish.", "translate": "你好，特里什。" }
    ],
    "trans_sents": [
      {
        "audio_url": "2434fb20...mp3",
        "example": "'Hello,' they chorused.",
        "translate": "他们齐声问候道。"
      }
    ]
  }
}
```

## 4. 服务端改动

### 4.1 代理路由改造 (`packages/server/src/routes/words.ts`)

**请求转发**：

- `GET /api/words/search?q=hello` → 转发到 `http://127.0.0.1:5088/api/translate?word=hello`

**音频 URL 补全**：

- `phonetic.audio` → 补全为 `http://127.0.0.1:5088/api/audio/{filename}`
- `trans_sents[].audio_url` → 同上补全
- 仅当字段非空时补全，空值保持原样

**新增音频代理路由**：

- `GET /api/words/audio/:filename` → 转发并 pipe 音频流到前端，避免跨域

**环境变量**：

- `DICT_API_BASE` 默认值改为 `http://127.0.0.1:5088`

### 4.2 错误处理

| 场景              | 状态码 | 响应                                                          |
| ----------------- | ------ | ------------------------------------------------------------- |
| 新 API 不可达     | 502    | `{ success: false, error: 'Dictionary service unavailable' }` |
| 新 API 返回非 200 | 透传   | 透传                                                          |
| 查询参数缺失      | 400    | `{ success: false, error: 'Missing query parameter: q' }`     |

## 5. 前端类型定义 (`packages/client/src/types/word.ts`)

全部重新定义，匹配新 API 结构：

```typescript
export interface WordPhonetic {
  audio: string; // 服务端已补全为完整 URL
  phonetic: string; // 音标字符串，如 "həˈloʊ"
}

export interface WordPhrase {
  key: string;
  value: string[];
}

export interface WordCollinsSent {
  description: string;
  example: string;
  translate: string;
}

export interface WordTransSent {
  audio_url: string; // 服务端已补全为完整 URL
  example: string;
  translate: string;
}

export interface WordData {
  word: string;
  explains: string[];
  phonetic: WordPhonetic;
  phrase: WordPhrase[];
  collins_sents: WordCollinsSent[];
  trans_sents: WordTransSent[];
}

export interface WordSearchResponse {
  success: boolean;
  error: string;
  data: WordData;
}
```

**移除的旧字段**：`id, frq, base, verify, lemmas, resembles, source, offset, limit, total`

## 6. Store 改动 (`packages/client/src/stores/word.ts`)

- 请求 URL 不变（`/api/words/search?q=...`），代理层已适配
- 响应解构适配新 `WordSearchResponse` 类型
- Store 内部前端缓存会在首次查词时自动填充新格式（旧缓存因类型不兼容自然失效）

## 7. UI 组件改动

### 7.1 `WordDetailPanel.vue`（字幕单词详情面板）

**Header 区**：

- 音标显示：`/{{ phonetic }}/` → `/{{ phonetic.phonetic }}/`
- 新增 🔊 发音按钮，点击播放 `phonetic.audio`（`new Audio(url).play()`）

**内容区**：

- Explains / Phrases 区块不变
- Sentences 拆为两个独立 section：
  - **Collins Examples**：显示 `description` + `example` + `translate`
  - **Translation Examples**：显示 `example` + `translate` + 🔊 音频按钮
- **删除** Lemmas（Word Forms）section

### 7.2 `WordDefinitionCard.vue`（词汇页单词释义卡片）

与 WordDetailPanel 完全相同的改动。

### 7.3 `SpellingTab.vue`

仅引用类型，无需额外改动。

## 8. 前后端数据流

```
[前端点击单词]
    ↓
GET /api/words/search?q=hello  →  [Hono 代理层: words.ts]
    ↓
转发 GET http://127.0.0.1:5088/api/translate?word=hello
    ↓
收到响应 → 遍历补全所有音频相对路径为完整 URL
    ↓
返回 { success, error, data } 给前端
    ↓
[前端 WordData 类型] → WordDetailPanel / WordDefinitionCard 渲染
    ↓
[用户点击 🔊] → new Audio(fullUrl).play()
```

## 9. 边界场景

| 场景                           | 前端处理                               |
| ------------------------------ | -------------------------------------- |
| 字段为空数组 (`[]`)            | `v-if` 不渲染对应 section              |
| `phonetic` 对象为 null         | Header 不显示音标行，无发音按钮        |
| `phonetic.audio` 为空字符串    | 不显示发音按钮                         |
| `trans_sents[].audio_url` 为空 | 该例句行不显示发音按钮                 |
| 前端旧缓存                     | 类型不兼容自然失效，重新查词填充新格式 |

## 10. 改动文件清单

| 文件                                                               | 改动类型                      |
| ------------------------------------------------------------------ | ----------------------------- |
| `packages/server/src/routes/words.ts`                              | 重写代理逻辑 + 新增音频子路由 |
| `packages/client/src/types/word.ts`                                | 全新类型定义                  |
| `packages/client/src/stores/word.ts`                               | 适配新响应格式                |
| `packages/client/src/components/word/WordDetailPanel.vue`          | UI 重构（音标+音频+例句分类） |
| `packages/client/src/components/vocabulary/WordDefinitionCard.vue` | UI 重构（同上）               |

---

_文档版本：v1.0_
_最后更新：2026-06-08_
