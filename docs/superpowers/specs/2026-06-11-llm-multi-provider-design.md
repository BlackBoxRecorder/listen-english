# LLM 多 Provider 支持设计

## 背景

当前句子 AI 分析功能硬编码使用 DeepSeek API（`deepseek.ts`），endpoint、model 均为固定值。用户希望改为兼容 OpenAI 接口格式的通用方案，支持 DeepSeek、GLM（智谱）、SiliconFlow 等多个 provider，通过本地配置文件切换。

### 目标

- 支持多个 OpenAI 兼容的 LLM provider（DeepSeek、GLM、SiliconFlow 等）
- 通过 JSON 配置文件定义 provider 列表，指定当前活跃的 provider
- 支持自定义 endpoint、model、apiKey
- apiKey 通过环境变量引用（`$ENV_VAR` 格式），不直接暴露在配置文件中
- 零新依赖，保持原生 `fetch` 调用

## 关键决策

| 决策项                   | 选择                                                   |
| ------------------------ | ------------------------------------------------------ |
| Provider 模式            | 多 provider + active 字段切换                          |
| 配置格式                 | JSON 文件                                              |
| API Key 存储             | 配置文件引用环境变量名（`$VAR`），实际值从 `.env` 读取 |
| 调用方式                 | 原生 fetch，零额外依赖                                 |
| DeepSeek `thinking` 参数 | 移除（其他 provider 不兼容）                           |

## 配置文件

### 路径

`packages/server/llm.config.json`

### 结构

```json
{
  "activeProvider": "deepseek",
  "providers": {
    "deepseek": {
      "endpoint": "https://api.deepseek.com/v1/chat/completions",
      "model": "deepseek-v4-flash",
      "apiKey": "$DEEPSEEK_API_KEY"
    },
    "siliconflow": {
      "endpoint": "https://api.siliconflow.cn/v1/chat/completions",
      "model": "deepseek-ai/DeepSeek-V3",
      "apiKey": "$SILICONFLOW_API_KEY"
    },
    "glm": {
      "endpoint": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      "model": "glm-4-flash",
      "apiKey": "$GLM_API_KEY"
    }
  }
}
```

### 字段说明

| 字段                    | 类型   | 必填 | 说明                                             |
| ----------------------- | ------ | ---- | ------------------------------------------------ |
| `activeProvider`        | string | 是   | 当前使用的 provider key，必须在 providers 中存在 |
| `providers`             | object | 是   | provider 列表，key 为自定义名称                  |
| `providers.*.endpoint`  | string | 是   | OpenAI 兼容的 chat completions API 完整 URL      |
| `providers.*.model`     | string | 是   | 模型名称                                         |
| `providers.*.apiKey`    | string | 是   | `$ENV_VAR` 格式引用环境变量                      |
| `providers.*.maxTokens` | number | 否   | 最大输出 token 数，默认 2400                     |
| `providers.*.timeout`   | number | 否   | 请求超时毫秒数，默认 15000                       |

### apiKey 解析规则

- 以 `$` 开头：去掉 `$` 后作为环境变量名从 `process.env` 读取
- 不以 `$` 开头：直接作为 API Key 使用（不推荐，但支持）

### 版本管理

- `llm.config.json` 加入 `.gitignore`（含敏感信息引用）
- 提供 `llm.config.example.json` 作为模板，提交到 Git

## 代码架构变更

### 文件变更清单

| 文件                                      | 操作 | 说明                             |
| ----------------------------------------- | ---- | -------------------------------- |
| `packages/server/llm.config.json`         | 新增 | LLM 配置文件（不提交 Git）       |
| `packages/server/llm.config.example.json` | 新增 | 配置模板（提交 Git）             |
| `packages/server/.gitignore`              | 修改 | 加入 `llm.config.json`           |
| `packages/server/src/utils/deepseek.ts`   | 删除 | 被 llm.ts 替代                   |
| `packages/server/src/utils/llm.ts`        | 新增 | 通用 LLM 调用模块                |
| `packages/server/src/routes/analysis.ts`  | 修改 | import 改为 llm.ts，错误处理更新 |

### llm.ts 核心结构

```ts
// 类型定义
interface ProviderConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  timeout?: number;
}

interface LLMConfig {
  activeProvider: string;
  providers: Record<string, ProviderConfig>;
}

// 启动时加载并校验配置
function loadConfig(): LLMConfig;

// 解析 apiKey 环境变量引用
function resolveApiKey(ref: string): string | undefined;

// 获取当前活跃 provider 的已解析配置
function getActiveProvider(): ResolvedProviderConfig;

// 统一 LLM 调用（替代 callDeepSeek）
export async function callLLM(prompt: string): Promise<string>;

// 保持不变
export function getAnalysisType(text: string): "simple" | "detailed";
export function buildPrompt(text: string, type: "simple" | "detailed"): string;
```

### callLLM() 与 callDeepSeek() 的差异

1. endpoint、model、apiKey 从配置文件读取，非硬编码
2. 移除 DeepSeek 特有的 `thinking: { type: "disabled" }` 参数
3. 错误信息改为通用前缀 `LLM API error` 而非 `DeepSeek API error`
4. 错误标识改为 `LLM_NOT_CONFIGURED` 而非 `DEEPSEEK_API_KEY_NOT_CONFIGURED`

### analysis.ts 变更

```ts
// 之前
import { callDeepSeek, getAnalysisType, buildPrompt } from "../utils/deepseek.js";

// 之后
import { callLLM, getAnalysisType, buildPrompt } from "../utils/llm.js";
```

错误处理中：

- `DEEPSEEK_API_KEY_NOT_CONFIGURED` → `LLM_NOT_CONFIGURED`
- `Analysis service not configured` 错误信息保持 503

## 错误处理

| 场景                               | 处理方式                                                         |
| ---------------------------------- | ---------------------------------------------------------------- |
| `llm.config.json` 不存在           | 启动时 console.warn，API 返回 503                                |
| `llm.config.json` JSON 格式错误    | 启动时 console.error 并抛出，进程终止                            |
| `activeProvider` 不在 providers 中 | 启动时 console.error 并抛出，进程终止                            |
| apiKey 引用的环境变量未设置        | 启动时 console.warn（含 provider 名和 env var 名），API 返回 503 |
| API 超时                           | 返回 504，提示"分析超时"                                         |
| API 返回异常                       | try-catch，返回 502，不写缓存                                    |
| API 响应内容为空                   | 抛出错误，不写缓存                                               |

## 配置加载时机

服务启动时同步读取并校验 `llm.config.json`。配置只加载一次，不支持热重载。修改配置需重启服务。

## 不变的部分

- 前端代码无任何改动
- 数据库 schema 无变化
- 缓存机制（sentence_analyses 表）不变
- 频率限制逻辑不变
- 提示词（buildPrompt）不变
- 复杂度判断（getAnalysisType）不变
