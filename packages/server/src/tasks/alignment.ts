/**
 * ElevenLabs Forced Alignment 字幕对齐脚本
 * 将 VOA 音频（.mp3）与预处理好的文本（.txt，按句子分行）对齐，
 * 生成带精确时间戳的 .srt 字幕文件。
 *
 * 运行方式:
 *   pnpm align --name "folder name"
 * 前置条件: 设置 ELEVENLABS_API_KEY 环境变量
 * 输入要求: .txt 文件需按句子分行
 *
 * @author yinnan
 */

import { readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// ---- 路径与常量 ----

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOA_DIR = resolve(process.env.VOA_DIR || join(__dirname, "../../../../VOA"));

// ---- 类型定义 ----

interface WordTiming {
  text: string;
  start: number;
  end: number;
  loss: number;
}

interface WordCharMapping {
  wordStart: number; // 归一化字符串中的起始字符位置
  wordEnd: number; // 归一化字符串中的结束字符位置
  timeStart: number; // API 返回的开始时间（秒）
  timeEnd: number; // API 返回的结束时间（秒）
}

interface SrtEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

// ---- 命令行参数解析 ----

function parseArgs(): { name: string } {
  const args = process.argv.slice(2);
  let name = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && i + 1 < args.length) {
      name = args[i + 1];
      i++;
    }
  }
  if (!name) {
    console.error("错误: 请通过 --name 参数指定文件夹名称");
    console.error('示例: pnpm align --name "folder name"');
    process.exit(1);
  }
  return { name };
}

// ---- 工具函数 ----

/**
 * 文本归一化：lowercase + 去标点 + 去空格
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");
}

/**
 * 秒数 → SRT 时间格式 HH:MM:SS,mmm
 */
function secToSrtTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

// ---- 核心对齐算法 ----

const CHAR_DEVIATION_THRESHOLD = 10;

/**
 * 将 ElevenLabs word 时间戳映射到 .txt 行（句子），生成 SRT 条目
 * @param lines .txt 中的句子行
 * @param words ElevenLabs API 返回的 word 数组
 * @returns SRT 条目数组
 */
function matchLinesToWords(lines: string[], words: WordTiming[]): SrtEntry[] {
  // 步骤 1：计算每行在完整文本中的字符偏移
  const fullText = lines.join(" ");
  const fullNormalized = normalize(fullText);

  const lineRanges: { start: number; end: number }[] = [];
  let charPos = 0;
  for (const line of lines) {
    const normed = normalize(line);
    lineRanges.push({ start: charPos, end: charPos + normed.length });
    charPos += normed.length;
  }

  // 步骤 2：构建 word→字符位置映射
  const wordChars: WordCharMapping[] = [];
  let wCharPos = 0;
  for (const w of words) {
    const normed = normalize(w.text);
    if (normed.length === 0) continue; // 跳过归一化后为空的词（纯标点等）
    wordChars.push({
      wordStart: wCharPos,
      wordEnd: wCharPos + normed.length,
      timeStart: w.start,
      timeEnd: w.end,
    });
    wCharPos += normed.length;
  }

  // 步骤 3：逐行映射字符偏移 → word 索引范围
  const entries: SrtEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const range = lineRanges[i];
    const lineText = lines[i].trim();
    if (!lineText) continue; // 跳过空行

    // 查找到该行起始字符位置最近的 word
    let firstIdx = findClosestWordIdx(wordChars, range.start);
    let lastIdx = findClosestWordIdx(wordChars, range.end);

    // 边界修正：确保 lastIdx >= firstIdx
    if (lastIdx < firstIdx) {
      lastIdx = firstIdx;
    }

    const firstCharDeviation = Math.abs(wordChars[firstIdx].wordStart - range.start);
    const lastCharDeviation = Math.abs(wordChars[lastIdx].wordEnd - range.end);

    if (
      firstCharDeviation > CHAR_DEVIATION_THRESHOLD ||
      lastCharDeviation > CHAR_DEVIATION_THRESHOLD
    ) {
      console.warn(
        `  [警告] 第 ${i + 1} 行匹配偏差较大 (起始偏差: ${firstCharDeviation} 字符, 结束偏差: ${lastCharDeviation} 字符): "${lineText.slice(0, 60)}${lineText.length > 60 ? "..." : ""}"`,
      );
    }

    entries.push({
      index: entries.length + 1,
      startTime: wordChars[firstIdx].timeStart,
      endTime: wordChars[lastIdx].timeEnd,
      text: lineText,
    });
  }

  return entries;
}

/**
 * 在 word 字符位置数组中二分查找最接近目标字符位置的 word 索引
 */
function findClosestWordIdx(wordChars: WordCharMapping[], targetPos: number): number {
  let left = 0;
  let right = wordChars.length - 1;
  let best = 0;
  let bestDist = Infinity;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const wm = wordChars[mid];
    // 计算 word 的中心位置与目标的距离
    const midPos = (wm.wordStart + wm.wordEnd) / 2;
    const dist = Math.abs(midPos - targetPos);
    if (dist < bestDist) {
      bestDist = dist;
      best = mid;
    }
    if (midPos < targetPos) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return best;
}

// ---- SRT 生成 ----

function buildSrtContent(entries: SrtEntry[]): string {
  const lines: string[] = [];
  for (const entry of entries) {
    lines.push(String(entry.index));
    lines.push(`${secToSrtTime(entry.startTime)} --> ${secToSrtTime(entry.endTime)}`);
    lines.push(entry.text);
    lines.push(""); // SRT 条目间空行
  }
  return lines.join("\n");
}

// ---- API 调用与重试 ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAlignmentApi(
  client: ElevenLabsClient,
  audioBlob: Blob,
  text: string,
  retriesLeft = 2,
): Promise<{ words: WordTiming[]; loss: number }> {
  try {
    const result = await client.forcedAlignment.create({
      file: audioBlob,
      text,
    });
    return {
      words: result.words as WordTiming[],
      loss: result.loss,
    };
  } catch (err) {
    if (retriesLeft <= 0) throw err;
    const delayMs = (3 - retriesLeft) * 2000; // 2s, 4s
    console.log(
      `  重试中... (${3 - retriesLeft}/2) 等待 ${delayMs / 1000}s - ${(err as Error).message}`,
    );
    await sleep(delayMs);
    return callAlignmentApi(client, audioBlob, text, retriesLeft - 1);
  }
}

// ---- readline 交互确认 ----

function confirmOverwrite(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${filePath} 已存在，是否覆盖？(y/n): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ---- 主流程 ----

async function main(): Promise<void> {
  // 1. 解析参数
  const { name } = parseArgs();

  // 2. 校验环境变量
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("错误: 请设置环境变量 ELEVENLABS_API_KEY");
    process.exit(1);
  }

  // 3. 定位文件
  const folderPath = join(VOA_DIR, name);
  const txtPath = join(folderPath, `${name}.txt`);
  const mp3Path = join(folderPath, `${name}.mp3`);
  const srtPath = join(folderPath, `${name}.srt`);

  // 4. 校验文件存在
  if (!existsSync(folderPath)) {
    console.error(`错误: 文件夹不存在 "${folderPath}"`);
    process.exit(1);
  }
  if (!existsSync(txtPath)) {
    console.error(`错误: .txt 文件不存在 "${txtPath}"`);
    process.exit(1);
  }
  if (!existsSync(mp3Path)) {
    console.error(`错误: .mp3 文件不存在 "${mp3Path}"`);
    process.exit(1);
  }

  // 5. .srt 已存在 → 交互确认
  if (existsSync(srtPath)) {
    const confirmed = await confirmOverwrite(srtPath);
    if (!confirmed) {
      console.log("已取消，退出。");
      process.exit(0);
    }
  }

  console.log(`[align] 开始处理: "${name}"`);

  // 6. 读取文件
  const txtContent = await readFile(txtPath, "utf-8");
  const lines = txtContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    console.error("错误: .txt 文件内容为空");
    process.exit(1);
  }
  console.log(`  读取 ${lines.length} 行句子`);

  const mp3Buffer = await readFile(mp3Path);
  const statInfo = await stat(mp3Path);
  console.log(`  音频文件大小: ${(statInfo.size / 1024 / 1024).toFixed(1)} MB`);

  // 7. 调用 API
  console.log("  调用 ElevenLabs Forced Alignment API...");
  const client = new ElevenLabsClient({ apiKey });
  const fullText = lines.join(" ");
  const audioBlob = new Blob([mp3Buffer], { type: "audio/mpeg" });

  const { words, loss } = await callAlignmentApi(client, audioBlob, fullText);

  console.log(`  API 返回 ${words.length} 个 word, loss=${loss.toFixed(4)}`);

  // 8. 检查对齐质量
  if (loss > 0.5) {
    console.warn(`  [警告] 整体 loss 值偏高 (${loss.toFixed(4)})，对齐质量可能不佳`);
  }
  const expectedWordCount = fullText.split(/\s+/).length;
  if (words.length < expectedWordCount * 0.9) {
    console.warn(
      `  [警告] API 返回 word 数量 (${words.length}) 明显少于原文估计 (${expectedWordCount})，结果可能不完整`,
    );
  }

  // 9. 匹配行→时间戳
  const entries = matchLinesToWords(lines, words);
  console.log(`  生成 ${entries.length} 条 SRT 条目`);

  // 10. 写入 SRT
  const srtContent = buildSrtContent(entries);
  await writeFile(srtPath, srtContent, "utf-8");
  console.log(`  已写入: ${srtPath}`);

  console.log("[align] 完成。");
}

main().catch((err) => {
  console.error("脚本执行失败:", err);
  process.exit(1);
});
