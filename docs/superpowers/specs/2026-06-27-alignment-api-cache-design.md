# alignment.ts API 响应缓存设计

**日期**: 2026-06-27  
**作者**: yinnan

## 概述

为 `alignment.ts` 脚本增加 ElevenLabs Forced Alignment API 响应缓存机制。首次调用 API 后将完整响应保存为 JSON 文件，后续运行时若缓存存在则直接使用，避免重复 API 请求。

## 缓存策略

| 决策点   | 方案                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 缓存文件 | `{name}.alignment.json`，与 `.mp3`/`.txt`/`.srt` 并列存放               |
| 缓存内容 | ElevenLabs API 原始响应的完整 JSON（`JSON.stringify(result, null, 2)`） |
| 失效策略 | 仅检查文件是否存在，不做时间/内容对比。用户手动删除 JSON 文件来强制刷新 |
| 损坏处理 | JSON 解析失败时打印警告、删除损坏文件、自动回退到 API 调用              |

## 架构

### 新增函数：`getAlignmentResult()`

在 `callAlignmentApi` 和 `main` 之间插入，封装"获取对齐数据"职责：

```
getAlignmentResult(
  client: ElevenLabsClient,
  audioBlob: Blob,
  text: string,
  jsonPath: string
): Promise<{ words: WordTiming[]; loss: number }>
```

**执行流程**：

1. 检查 `jsonPath` 是否存在
   - **存在** → `readFile` → `JSON.parse`
     - 成功且包含 `words` 数组 → 提取 `words` 和 `loss`（`loss` 缺失时默认 0），返回
     - 解析失败 → `console.warn` 提示 → `unlink` 删除损坏文件 → 进入步骤 2
   - **不存在** → 进入步骤 2
2. 调用 `callAlignmentApi(client, audioBlob, text)`
3. 将完整 API 响应写入 `jsonPath`（`JSON.stringify(result, null, 2)`）
4. 返回 `{ words, loss }`

### `main()` 函数改动

仅改动步骤 7（API 调用部分）：

- 新增变量：`const jsonPath = join(folderPath, \`${name}.alignment.json\`)`
- 将原来的"创建 client → 构建 audioBlob → 调用 callAlignmentApi"替换为：
  ```ts
  const client = new ElevenLabsClient({ apiKey });
  const audioBlob = new Blob([mp3Buffer], { type: "audio/mpeg" });
  const { words, loss } = await getAlignmentResult(client, audioBlob, fullText, jsonPath);
  ```
- 其余步骤（质量检查、SRT 生成、写入）完全不变

需要新增 `import { unlink } from "fs/promises"` 用于删除损坏的缓存文件。

### 当前文件：`packages/server/src/tasks/alignment.ts`

```
现有结构：
  ┌─ callAlignmentApi()     ← API 调用 + 重试
  └─ main()
       ├─ 解析参数
       ├─ 校验文件
       ├─ .srt 覆盖确认
       ├─ 读取 .txt / .mp3
       ├─ 调用 API             ← 改动点
       ├─ 质量检查
       ├─ 匹配行→时间戳
       └─ 写入 SRT

改动后：
  ┌─ callAlignmentApi()     ← 不变
  ├─ getAlignmentResult()   ← 新增：缓存读取 + API 调用 + 缓存写入
  └─ main()
       ├─ 解析参数
       ├─ 校验文件
       ├─ .srt 覆盖确认
       ├─ 读取 .txt / .mp3
       ├─ getAlignmentResult() ← 替换原 API 调用
       ├─ 质量检查
       ├─ 匹配行→时间戳
       └─ 写入 SRT
```

## 文件变更清单

| 文件                                     | 变更类型 | 说明                                                           |
| ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `packages/server/src/tasks/alignment.ts` | 修改     | 新增 `getAlignmentResult()` 函数，`main()` 中替换 API 调用部分 |

## 输出示例

运行后，VOA 文章目录结构变为：

```
VOA/AI App Helps People with ADHD/
├── AI App Helps People with ADHD.mp3
├── AI App Helps People with ADHD.txt
├── AI App Helps People with ADHD.srt
└── AI App Helps People with ADHD.alignment.json   ← 新增缓存文件
```

## CLI 输出示例

**首次运行（无缓存）**：

```
[align] 开始处理: "AI App Helps People with ADHD"
  读取 15 行句子
  音频文件大小: 3.8 MB
  调用 ElevenLabs Forced Alignment API...
  API 返回 234 个 word, loss=0.1234
  缓存已保存: .../AI App Helps People with ADHD.alignment.json
  生成 15 条 SRT 条目
  已写入: .../AI App Helps People with ADHD.srt
[align] 完成。
```

**再次运行（有缓存）**：

```
[align] 开始处理: "AI App Helps People with ADHD"
  读取 15 行句子
  音频文件大小: 3.8 MB
  使用缓存: .../AI App Helps People with ADHD.alignment.json
  生成 15 条 SRT 条目
  已写入: .../AI App Helps People with ADHD.srt
[align] 完成。
```

**缓存损坏**：

```
[align] 开始处理: "..."
  ...
  [警告] 缓存文件损坏，将重新调用 API: ...
  调用 ElevenLabs Forced Alignment API...
  ...
```
