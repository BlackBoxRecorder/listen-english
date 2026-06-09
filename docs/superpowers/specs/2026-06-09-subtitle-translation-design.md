# 字幕翻译脚本设计

## 概述

编写一个 TypeScript 脚本 `translateSubtitles.ts`，读取 `data.db` 中 `subtitles` 表里 `chinese_text` 为空且 `english_text` 不为空的记录，调用腾讯云 TMT 机器翻译 API（en→zh）翻译英文文本，将结果写回数据库。

---

## 文件位置与运行方式

- **文件**: `packages/server/src/tasks/translateSubtitles.ts`
- **运行**: `pnpm --filter server exec tsx src/tasks/translateSubtitles.ts`
- **前置条件**: 设置环境变量 `TENCENTCLOUD_SECRET_ID` 和 `TENCENTCLOUD_SECRET_KEY`
- **执行模式**: 手动按需执行（非定时调度）

---

## 核心流程

1. 查询 `subtitles` 表：`chinese_text IS NULL AND english_text IS NOT NULL`
2. 若无记录，打印提示并退出
3. 逐条处理：
   - 若 `english_text` 移除空白后为空字符串，跳过
   - 调用翻译 API，将 `english_text` 从 `en` 翻译到 `zh`
   - 成功后用 `UPDATE` 将 `chinese_text` 写回数据库
   - 失败时进行指数退避重试（最多 3 次，间隔 1s/2s/4s），仍失败则记录日志并跳过
4. 全部处理完后打印统计：`翻译完成。成功: N, 跳过: N, 失败: N`

### 幂等性

脚本只处理 `chinese_text IS NULL` 的记录，可以安全地多次执行，不会重复翻译已翻译的记录。

---

## API 调用方案

**方案**: 手写 HTTP + TC3-HMAC-SHA256 签名（方案 B），零额外依赖。

### 接口信息

| 项目     | 值                                      |
| -------- | --------------------------------------- |
| Endpoint | `POST https://tmt.tencentcloudapi.com/` |
| Action   | `TextTranslate`                         |
| Version  | `2018-03-21`                            |
| 限制     | 5 次/秒，单次 ≤ 6000 字符               |

### 请求 Payload

```json
{
  "SourceText": "<english_text>",
  "Source": "en",
  "Target": "zh",
  "ProjectId": 0
}
```

### 响应解析

从 `Response.TargetText` 字段获取翻译结果。

### 签名实现

参照 `docs/translation/sample.js` 中的 TC3-HMAC-SHA256 v3 签名逻辑，用 Node.js 原生 `crypto` 和 `https` 模块实现。

### 函数签名

```ts
async function translateText(text: string, retries?: number): Promise<string>;
```

---

## 频率控制

每次 API 调用前检查距上次请求的时间间隔，不足 250ms 则 `await sleep()` 补足。不进行批量合并（单条字幕远低于 6000 字符上限）。

---

## 错误处理

| 场景                    | 策略                                                  |
| ----------------------- | ----------------------------------------------------- |
| API 调用失败            | 指数退避重试，最多 3 次（1s → 2s → 4s），仍失败则跳过 |
| `english_text` 为空白   | 直接跳过                                              |
| `chinese_text` 已有值   | 不在查询范围内，自然跳过                              |
| 环境变量缺失            | 脚本启动时检查，缺失则立即报错退出                    |
| API 返回空 `TargetText` | 视为失败，进入重试逻辑                                |

---

## 依赖

- `crypto`（Node.js 原生）
- `https`（Node.js 原生）
- `drizzle-orm`（已有）
- `../db/index.js`（复用现有 `db` 模块）
- `../db/schema.js`（复用现有 `subtitles` 表定义）

**不引入新依赖。**

---

## 边界条件

- 翻译结果可能是空字符串（API 返回空），需检查并重试
- `english_text` 可能包含特殊字符、数字、符号，直接传给 API 不做预处理
- 脚本中途中断后重新执行，已翻译的记录不会受影响（`chinese_text IS NULL` 条件）
