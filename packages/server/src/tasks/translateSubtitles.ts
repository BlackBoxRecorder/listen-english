/**
 * 字幕翻译脚本
 * 查询 subtitles 表中 chinese_text 为空但 english_text 不为空的记录，
 * 调用腾讯云机器翻译 API (en→zh) 翻译英文文本，写回数据库。
 *
 * 运行方式:
 *   pnpm --filter server exec tsx src/tasks/translateSubtitles.ts -- --limit 10
 *   pnpm --filter server exec tsx src/tasks/translateSubtitles.ts              (无限制)
 * 前置条件: 设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量
 */
import { isNull, isNotNull, eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { subtitles } from "../db/schema.js";
import { translateViaTencentTmt } from "../utils/tencentTmt.js";

// ---- 命令行参数解析 ----

function parseArgs(): { limit: number | null } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && i + 1 < args.length) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val) && val > 0) limit = val;
      i++;
    }
  }
  return { limit };
}

// ---- 类型定义 ----

interface SubtitlesRow {
  id: number;
  listeningId: number;
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string | null;
  chineseText: string | null;
}

// ---- 主流程 ----

interface Stats {
  success: number;
  skipped: number;
  failed: number;
}

async function main(): Promise<void> {
  // 解析参数
  const { limit } = parseArgs();

  // 检查环境变量（translateViaTencentTmt 内部会检查）
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    console.error("错误: 请设置环境变量 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY");
    process.exit(1);
  }

  // 查询待翻译记录
  const records = db
    .select()
    .from(subtitles)
    .where(and(isNull(subtitles.chineseText), isNotNull(subtitles.englishText)))
    .all() as SubtitlesRow[];

  if (records.length === 0) {
    console.log("没有需要翻译的字幕记录。");
    return;
  }

  const toProcess = limit !== null ? records.slice(0, limit) : records;

  if (limit !== null) {
    console.log(
      `找到 ${records.length} 条待翻译记录，限制处理 ${toProcess.length} 条，开始处理...\n`,
    );
  } else {
    console.log(`找到 ${records.length} 条待翻译记录，开始处理...\n`);
  }

  const stats: Stats = { success: 0, skipped: 0, failed: 0 };

  for (let i = 0; i < toProcess.length; i++) {
    const record = toProcess[i];
    const englishText = record.englishText?.trim();

    // 跳过空文本
    if (!englishText) {
      stats.skipped++;
      console.log(`[${i + 1}/${toProcess.length}] 跳过 (ID=${record.id}): english_text 为空`);
      continue;
    }

    console.log(
      `[${i + 1}/${toProcess.length}] 翻译中 (ID=${record.id}): ${englishText.slice(0, 50)}${englishText.length > 50 ? "..." : ""}`,
    );

    try {
      const chineseText = await translateViaTencentTmt(englishText, "en", "zh");

      db.update(subtitles).set({ chineseText }).where(eq(subtitles.id, record.id)).run();

      stats.success++;
      console.log(`  => ${chineseText}`);
    } catch (err) {
      stats.failed++;
      console.log(`  ✗ 失败: ${(err as Error).message}`);
    }
  }

  console.log(`\n翻译完成。成功: ${stats.success}, 跳过: ${stats.skipped}, 失败: ${stats.failed}`);
}

main().catch((err) => {
  console.error("脚本执行失败:", err);
  process.exit(1);
});
