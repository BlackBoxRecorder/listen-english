# ElevenLabs Forced Alignment 字幕对齐脚本设计

## 概述

在 `packages/server/src/tasks/alignment.ts` 中实现一个 CLI 脚本，调用 ElevenLabs Forced Alignment API，将 VOA 音频（`.mp3`）与预处理好的文本（`.txt`，按句子分行）对齐，生成带精确时间戳的 `.srt` 字幕文件。

## 运行方式

```bash
# 安装 SDK 依赖
pnpm --filter server add @elevenlabs/elevenlabs-js

# 运行对齐（需先设置 ELEVENLABS_API_KEY 环境变量）
pnpm align --name "At Venezuela's Hospital for Soft Toys, Old Toys Find New Life"
```

`pnpm align` 快捷命令需添加到根 `package.json` 的 scripts 中：

```json
"align": "pnpm --filter server exec tsx src/tasks/alignment.ts"
```

## 核心流程

```
命令行参数 --name "文件夹名"
    ↓
验证 VOA/{name}/{name}.txt 和 .mp3 存在
    ↓
若 .srt 已存在 → readline 交互确认 → 用户拒绝则退出
    ↓
读取 .txt（句子按行）→ 拼接为完整文本，记录每行字符偏移
读取 .mp3 音频文件
    ↓
调用 ElevenLabs Forced Alignment API
POST /v1/forced-alignment (multipart/form-data)
  file: mp3 音频 Blob
  text: 完整文本
    ↓
返回 { words: [{text, start, end, loss}, ...], loss }
    ↓
归一化字符位置映射：将 words 映射为归一化字符串中的字符位置
将 .txt 行偏移映射到对应 word 范围
    ↓
逐行生成 SRT 条目，写入 VOA/{name}/{name}.srt
```

## 单词→句子对齐算法

### 归一化函数

```typescript
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // 去标点，保留字母数字空格
    .replace(/\s+/g, ""); // 去空格 → 纯字母数字串
}
```

### 算法步骤

1. **拼接全文本，记录行偏移**：将 `.txt` 所有行用空格拼接成 `fullText`，计算每行在 `fullText` 中的字符偏移 `[{start, end}, ...]`
2. **调用 API**：将 `fullText` 和音频一起发给 ElevenLabs，获取 `words` 数组
3. **构建 word→字符位置映射**：逐 word 归一化后累加字符长度，每个 word 获得在归一化字符串中的 `[wordStart, wordEnd]` 加上 API 返回的 `[timeStart, timeEnd]`
4. **行偏移→word 索引映射**：对每行，归一化后在 word 字符位置数组中二分查找首尾 word：
   - `firstWord` = 首个 `wordStart <= lineStart` 且 `wordEnd > lineStart` 的 word
   - `lastWord` = 首个 `wordStart < lineEnd` 且 `wordEnd >= lineEnd` 的 word
5. **生成 SRT 条目**：每行用 `words[first].start` 作为条目开始时间，`words[last].end` 作为结束时间

### 容错

- 某行匹配字符偏移偏差 > 5 个字符 → 输出 warning，仍使用最接近的 word 范围
- API 返回 `loss > 0.5` → 输出 warning，标记对齐质量可能不佳
- words 数量明显少于预期（差 > 30%）→ 输出 warning，标记低置信度

## SRT 格式

标准 SRT 格式，时间戳转换函数 `secToSrtTime(seconds: number): string` → `HH:MM:SS,mmm`。

示例输出：

```
1
00:00:00,520 --> 00:00:06,810
Popeye the Sailor and the Belgian boy reporter Tintin lead the class of characters and works of art to enter public domain in 2025.

2
00:00:07,200 --> 00:00:11,500
On January 1, 2025, the U.S. copyright ends on creations from 1929.
```

## 错误处理

| 场景                               | 处理                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| 文件夹不存在                       | 输出错误信息，exit(1)                                      |
| 缺少 `.txt` 或 `.mp3`              | 明确提示缺少哪个文件，exit(1)                              |
| `.txt` 为空                        | exit(1)，提示文件无内容                                    |
| 缺少 `ELEVENLABS_API_KEY` 环境变量 | exit(1)，提示设置环境变量                                  |
| `.srt` 已存在                      | readline 交互确认，用户拒绝则 exit(0)                      |
| API 返回错误（4xx/5xx）            | 打印错误详情 + 重试 2 次（间隔 2s/4s），全部失败后 exit(1) |
| API 返回 loss 过高（> 0.5）        | 输出 warning，继续生成 SRT                                 |
| 某行匹配偏差超过阈值               | 输出 warning 标注行号和偏差量，继续处理                    |
| words 数量明显偏少                 | 输出 warning，标记低置信度                                 |

## 文件结构

单文件 `packages/server/src/tasks/alignment.ts`，参照 `translateSubtitles.ts` 风格：

```
├── 文件头注释（用途、运行方式、前置条件）
├── 命令行参数解析（parseArgs）
├── normalize() 文本归一化工具
├── secToSrtTime() 秒→HH:MM:SS,mmm 格式化
├── buildSrtContent() 根据映射结果生成 SRT 文本
├── matchLinesToWords() 核心对齐算法
├── main() 主流程串联
└── main().catch() 执行入口
```

## VOA 目录路径

沿用 `syncVoa.ts` 的方式，通过环境变量 `VOA_DIR` 或相对路径定位：

```typescript
const VOA_DIR = resolve(process.env.VOA_DIR || join(__dirname, "../../../../VOA"));
// 目标文件夹: join(VOA_DIR, name)
// .txt 路径:   join(VOA_DIR, name, `${name}.txt`)
// .mp3 路径:   join(VOA_DIR, name, `${name}.mp3`)
// .srt 路径:   join(VOA_DIR, name, `${name}.srt`)
```

## 依赖

- 新增 `@elevenlabs/elevenlabs-js`（ElevenLabs 官方 TypeScript SDK）
- 环境变量 `ELEVENLABS_API_KEY`
- Node.js 内置 `fs/promises`、`readline`、`path`
