/**
 * VOA 目录自动同步定时任务
 * 每天 0 点扫描 VOA 目录，对有 .srt 且不在数据库中的子目录自动同步
 */
import { readdir, readFile, copyFile, stat, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { listeningMaterials, subtitles } from "../db/schema.js";
import { parseSRT } from "../utils/subtitleParser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOA_DIR = resolve(process.env.VOA_DIR || join(__dirname, "../../../../VOA"));
const UPLOAD_DIR = resolve("./uploads/audio");

let scanning = false;

async function scanVoaDir(): Promise<void> {
  if (scanning) {
    console.log("[syncVoa] Previous scan still in progress, skipping");
    return;
  }
  scanning = true;

  try {
    console.log(`[syncVoa] Starting scan of ${VOA_DIR}`);

    if (!existsSync(VOA_DIR)) {
      console.warn(`[syncVoa] VOA directory not found: ${VOA_DIR}`);
      return;
    }

    let entries: string[];
    try {
      entries = await readdir(VOA_DIR);
    } catch (err) {
      console.error(`[syncVoa] Failed to read VOA directory:`, err);
      return;
    }

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const entry of entries) {
      const dirPath = join(VOA_DIR, entry);

      // 跳过非目录及隐藏文件
      let dirStat;
      try {
        dirStat = await stat(dirPath);
      } catch {
        continue;
      }
      if (!dirStat.isDirectory() || entry.startsWith(".")) continue;

      try {
        // 查找 .srt 文件
        const dirEntries = await readdir(dirPath);
        const srtFiles = dirEntries.filter((f) => extname(f).toLowerCase() === ".srt");
        if (srtFiles.length === 0) continue;

        const title = entry;

        // 检查数据库是否已存在
        const existing = await db
          .select({ id: listeningMaterials.id })
          .from(listeningMaterials)
          .where(eq(listeningMaterials.title, title))
          .get();

        if (existing) {
          skippedCount++;
          continue;
        }

        // 查找 mp3 文件
        const mp3Files = dirEntries.filter((f) => extname(f).toLowerCase() === ".mp3");
        let audioFilePath = "";

        if (mp3Files.length > 0) {
          const mp3File = mp3Files[0];
          const mp3Path = join(dirPath, mp3File);
          const safeName = mp3File.replace(/\s+/g, "_");
          const destName = `${Date.now()}-${safeName}`;
          const destPath = join(UPLOAD_DIR, destName);

          try {
            if (!existsSync(UPLOAD_DIR)) {
              await mkdir(UPLOAD_DIR, { recursive: true });
            }
            await copyFile(mp3Path, destPath);
            audioFilePath = `/uploads/audio/${destName}`;
          } catch (err) {
            console.error(`[syncVoa] Failed to copy audio for "${title}":`, err);
            // 继续处理，只是缺少音频路径
          }
        }

        // 解析 srt
        const srtPath = join(dirPath, srtFiles[0]);
        const srtContent = await readFile(srtPath, "utf-8");
        const parsedSubs = parseSRT(srtContent);

        if (parsedSubs.length === 0) {
          console.warn(`[syncVoa] No subtitles parsed from "${title}"`);
          skippedCount++;
          continue;
        }

        // 计算时长（秒），取最后一条字幕的 endTime 向上取整
        const duration = Math.ceil(parsedSubs[parsedSubs.length - 1].endTime / 1000);

        // 事务写入
        await db.transaction(async (tx) => {
          const result = await tx
            .insert(listeningMaterials)
            .values({ title, audioFilePath, duration })
            .returning({ id: listeningMaterials.id });

          const materialId = result[0].id;

          await tx.insert(subtitles).values(
            parsedSubs.map((s, i) => ({
              listeningId: materialId,
              lineIndex: s.lineIndex ?? i,
              startTime: s.startTime,
              endTime: s.endTime,
              englishText: s.englishText ?? null,
              chineseText: s.chineseText ?? null,
            })),
          );
        });

        console.log(`[syncVoa] Synced: "${title}" (${parsedSubs.length} subtitles)`);
        syncedCount++;
      } catch (err) {
        console.error(`[syncVoa] Error processing "${entry}":`, err);
        errorCount++;
      }
    }

    console.log(
      `[syncVoa] Scan complete. Synced: ${syncedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    );
  } finally {
    scanning = false;
  }
}

/**
 * 计算到下一个 0 点的毫秒数
 */
function msUntilNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * 启动定时同步调度
 * 启动时立即执行一次，然后每天 0 点执行
 * 返回 cleanup 函数用于取消定时器（优雅关闭）
 */
export function startSyncScheduler(): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // 启动时立即执行一次
  scanVoaDir().catch((err) => console.error("[syncVoa] Initial scan failed:", err));

  // 调度每天 0 点
  const delay = msUntilNextMidnight();
  console.log(`[syncVoa] Next sync scheduled in ${Math.round(delay / 1000 / 60)} minutes`);

  const timeoutId = setTimeout(() => {
    scanVoaDir().catch((err) => console.error("[syncVoa] Midnight scan failed:", err));
    intervalId = setInterval(
      () => {
        scanVoaDir().catch((err) => console.error("[syncVoa] Daily scan failed:", err));
      },
      24 * 60 * 60 * 1000,
    );
  }, delay);

  return () => {
    clearTimeout(timeoutId);
    if (intervalId !== null) clearInterval(intervalId);
  };
}
