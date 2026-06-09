/**
 * VOA .md 文本清洗脚本
 * 去掉标题、子标题、词汇表等无用内容，将段落按句子拆分，每句一行。
 *
 * 运行方式:
 *   pnpm --filter server exec tsx src/tasks/cleanVoaMd.ts
 *
 * 输入: VOA/<article>/*.md
 * 输出: VOA/<article>/*.txt
 * @author nanyin
 */
import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOA_DIR = resolve(process.env.VOA_DIR || join(__dirname, "../../../../VOA"));

// 问句式小标题最大长度阈值
const SUBHEADING_MAX_LENGTH = 80;

// 已知缩写白名单（按长度降序，优先匹配长的）
const ABBREVIATIONS = [
  "U.S.",
  "a.m.",
  "p.m.",
  "e.g.",
  "i.e.",
  "Mrs.",
  "Mr.",
  "Dr.",
  "Ms.",
  "Jr.",
  "Sr.",
  "St.",
  "v.",
  "n.",
  "adj.",
  "adv.",
].sort((a, b) => b.length - a.length);

// ---- 工具函数 ----

/** 判断字符是否为句子结束标点 */
function isSentenceEndingChar(ch: string): boolean {
  return ch === "." || ch === "!" || ch === "?";
}

/** 判断行尾是否有有效标点（.!?:） */
function hasSentenceEnding(line: string): boolean {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0) return false;
  const last = trimmed.charAt(trimmed.length - 1);
  return last === "." || last === "!" || last === "?" || last === ":";
}

/** 判断行是否为独立行（前后均为空行或边界） */
function isStandaloneLine(lines: string[], index: number): boolean {
  const prevEmpty = index === 0 || lines[index - 1].trim() === "";
  const nextEmpty = index === lines.length - 1 || lines[index + 1].trim() === "";
  return prevEmpty && nextEmpty;
}

// ---- Phase 1 保护函数 ----

/** 用占位符替换已知缩写中的 . */
function protectAbbreviations(text: string): { text: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let result = text;
  let counter = 0;

  for (const abbr of ABBREVIATIONS) {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 匹配：缩写前是空白或行首，缩写后是空白或标点或行尾
    const regex = new RegExp(`(?<=^|\\s)${escaped}(?=\\s|$|[!"',;:?\\-)\\]}])`, "gi");

    result = result.replace(regex, (match) => {
      const placeholder = `__ABBR_${counter}__`;
      map.set(placeholder, match);
      counter++;
      return placeholder;
    });
  }

  return { text: result, map };
}

/** 用占位符替换省略号 (. . . 或 ...) */
function protectEllipsis(text: string): { text: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let result = text;
  let counter = 0;

  result = result.replace(/(\.\s*\.\s*\.|\.{3,})/g, (match) => {
    const placeholder = `__ELLIPSIS_${counter}__`;
    map.set(placeholder, match);
    counter++;
    return placeholder;
  });

  return { text: result, map };
}

/** 用占位符替换数字中的小数点 (数字.数字) */
function protectDecimals(text: string): { text: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let result = text;
  let counter = 0;

  result = result.replace(/(\d)\.(\d)/g, (_match, before, after) => {
    const placeholder = `__DECIMAL_${counter}__`;
    map.set(placeholder, `.`);
    counter++;
    return `${before}${placeholder}${after}`;
  });

  return { text: result, map };
}

// ---- Phase 2 句子拆分 ----

/**
 * 将文本按句子拆分
 * 策略：
 *   1. 保护缩写、省略号、小数中的 .
 *   2. 字符级扫描，跟踪引号配对状态
 *   3. 在引号外遇到 . ! ? 且后跟大写字母或文本末尾时 → 句子边界
 *   4. 还原所有占位符
 */
function splitSentences(text: string): string[] {
  // Step 1: 保护特殊 . 符号
  const { text: t1, map: abbrMap } = protectAbbreviations(text);
  const { text: t2, map: ellipsisMap } = protectEllipsis(t1);
  const { text: processed, map: decimalMap } = protectDecimals(t2);

  // Step 2: 字符级扫描拆分
  const sentences: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteCloseChar = "";

  for (let i = 0; i < processed.length; i++) {
    const ch = processed[i];
    current += ch;

    // 跟踪引号状态
    if (!inQuote) {
      if (ch === '"') {
        inQuote = true;
        quoteCloseChar = '"';
      } else if (ch === "\u201C") {
        inQuote = true;
        quoteCloseChar = "\u201D";
      }
    } else if (ch === quoteCloseChar) {
      inQuote = false;
      quoteCloseChar = "";
    }

    // 仅在引号外检查句子边界
    if (!inQuote && isSentenceEndingChar(ch)) {
      // 向前看：跳过空白，检查下一个非空字符
      let j = i + 1;
      while (j < processed.length && processed[j] === " ") j++;

      const isEnd = j >= processed.length;
      let startsWithUpper = false;

      if (!isEnd) {
        const nextChar = processed[j];
        if (nextChar === '"' || nextChar === "\u201C") {
          // 后面是引号，检查引号内容是否大写开头
          startsWithUpper = j + 1 < processed.length && /[A-Z]/.test(processed[j + 1]);
        } else {
          startsWithUpper = /[A-Z]/.test(nextChar);
        }
      }

      if (isEnd || startsWithUpper) {
        sentences.push(current.trim());
        current = "";
        i = j - 1; // 跳过已扫描的空白（循环末尾 i++ 会前进一位）
      }
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  // Step 3: 还原所有占位符
  const restoreAll = (s: string): string => {
    for (const [placeholder, original] of decimalMap) {
      s = s.replaceAll(placeholder, original);
    }
    for (const [placeholder, original] of ellipsisMap) {
      s = s.replaceAll(placeholder, original);
    }
    for (const [placeholder, original] of abbrMap) {
      s = s.replaceAll(placeholder, original);
    }
    return s;
  };

  return sentences.map(restoreAll);
}

// ---- 行级预处理 ----

/**
 * 对 .md 文件的所有行进行预处理：
 *   删除标题、子标题、词汇表区域，保留正文行
 */
function filterLines(lines: string[]): string[] {
  const result: string[] = [];
  let nonEmptyCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行原样保留（用于段落分隔）
    if (line === "") {
      result.push("");
      continue;
    }

    nonEmptyCount++;

    // 规则 1: # 开头的标题行 → 删除
    if (nonEmptyCount === 1 && line.startsWith("#")) {
      continue;
    }

    // 规则 2: 第二个非空行无标点结尾 → 小标题删除 (No media source currently available)
    if (nonEmptyCount === 2 && !hasSentenceEnding(line)) {
      continue;
    }

    // 规则 3: --- 及之后 → 词汇表，全部删除
    if (line === "---") {
      break;
    }

    // 规则 4 & 5: 独立行子标题判断
    if (isStandaloneLine(lines, i)) {
      if (!hasSentenceEnding(line)) {
        // 无有效标点结尾 → 子标题，删除
        continue;
      }
      if (line.endsWith("?") && line.length <= SUBHEADING_MAX_LENGTH) {
        // 短问句式 → 子标题，删除
        continue;
      }
    }

    result.push(line);
  }

  return result;
}

// ---- 主处理 ----

async function processMdFile(mdPath: string): Promise<number> {
  const content = await readFile(mdPath, "utf-8");
  const lines = content.split(/\r?\n/);

  // Phase 1: 行级预处理
  const filteredLines = filterLines(lines);

  // 将保留行合并为段落块（空行分隔段落）
  const paragraphs: string[] = [];
  let currentParagraph = "";

  for (const line of filteredLines) {
    if (line === "") {
      if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
    } else {
      currentParagraph += (currentParagraph ? " " : "") + line;
    }
  }
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }

  // Phase 2: 段落拆句
  const allSentences: string[] = [];
  for (const para of paragraphs) {
    const sentences = splitSentences(para);
    allSentences.push(...sentences);
  }

  // Phase 3: 写入 .txt
  const output = allSentences.join("\n\n") + "\n";
  const txtPath = mdPath.replace(/\.md$/, ".txt");
  await writeFile(txtPath, output, "utf-8");

  return allSentences.length;
}

async function main(): Promise<void> {
  console.log(`[cleanVoaMd] Scanning ${VOA_DIR}...\n`);

  if (!existsSync(VOA_DIR)) {
    console.error(`Error: VOA directory not found: ${VOA_DIR}`);
    process.exit(1);
  }

  const entries = await readdir(VOA_DIR);
  let totalFiles = 0;
  let totalSentences = 0;

  for (const entry of entries) {
    const dirPath = join(VOA_DIR, entry);
    let dirStat;
    try {
      dirStat = await stat(dirPath);
    } catch {
      continue;
    }
    if (!dirStat.isDirectory() || entry.startsWith(".")) continue;

    const dirEntries = await readdir(dirPath);
    const mdFiles = dirEntries.filter((f) => extname(f).toLowerCase() === ".md");

    for (const mdFile of mdFiles) {
      const mdPath = join(dirPath, mdFile);
      try {
        const sentenceCount = await processMdFile(mdPath);
        console.log(`  ✓ ${entry} (${sentenceCount} sentences)`);
        totalFiles++;
        totalSentences += sentenceCount;
      } catch (err) {
        console.error(`  ✗ Error in ${entry}:`, (err as Error).message);
      }
    }
  }

  console.log(`\n[cleanVoaMd] Done. ${totalFiles} files, ${totalSentences} total sentences.`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
