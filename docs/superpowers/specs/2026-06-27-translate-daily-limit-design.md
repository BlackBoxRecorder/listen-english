# Translation API 每日字符数限制

## 概述

为 `POST /api/translate` 文本翻译接口增加每日 10 万字符数限制。超过限制后返回错误提示，次日自动重置。内存变量实现，无需持久化。

---

## 改动范围

- **后端**: `packages/server/src/routes/translate.ts` — 新增每日计数器逻辑
- **前端**: 无需改动

---

## 后端设计

### 计数器

```ts
const DAILY_LIMIT = 100_000;

let dailyDate = ""; // "2026-06-27"
let dailyCharCount = 0; // 当日已用字符数

function checkDailyLimit(textLength: number): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyDate !== today) {
    dailyDate = today;
    dailyCharCount = 0;
  }
  if (dailyCharCount + textLength > DAILY_LIMIT) {
    return `Daily translation limit (${DAILY_LIMIT.toLocaleString()} characters) reached. Please try again tomorrow.`;
  }
  dailyCharCount += textLength;
  return null; // 通过
}
```

### 请求处理流程

```
1. 解析 JSON body
2. text 为空 → 400 "Text is required"
3. text.length > 1000 → 400 "Text exceeds 1000 characters"  (已有)
4. checkDailyLimit(text.length) → 429 (新增)
5. detectLanguage(text)
6. translateViaTencentTmt(...)
```

### 错误响应

状态码 `429 Too Many Requests`：

```json
{
  "error": "Daily translation limit (100,000 characters) reached. Please try again tomorrow."
}
```

---

## 前端表现

前端 `TranslationView.vue` 已有通用错误处理，后端返回 429 时自动在按钮下方显示红色错误提示，无需额外改动。

---

## 边界情况

| 场景                           | 行为                           |
| ------------------------------ | ------------------------------ |
| 单次请求刚好使计数达到 100,000 | 允许通过，之后请求被拒         |
| 跨天自动重置                   | `dailyDate !== today` 触发清零 |
| 服务重启                       | 计数归零                       |
| 并发请求                       | JS 单线程事件循环，无竞态问题  |
