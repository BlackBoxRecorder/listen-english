/**
 * 字幕解析工具模块
 * 支持 .srt 格式的字幕文件解析
 */

export interface ParsedSubtitle {
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string;
  chineseText: string | null;
}

export function parseTimeToMs(timeStr: string): number {
  const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) throw new Error(`Invalid timestamp format: "${timeStr}"`);
  return (
    parseInt(match[1]) * 3600000 +
    parseInt(match[2]) * 60000 +
    parseInt(match[3]) * 1000 +
    parseInt(match[4])
  );
}

export function parseSRT(content: string): ParsedSubtitle[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.trim().split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.trim().split("\n");
      if (lines.length < 3) return null;

      const lineIndex = parseInt(lines[0], 10);
      if (isNaN(lineIndex)) return null;

      const timeLine = lines[1];
      const timeMatch = timeLine.match(
        /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/,
      );
      if (!timeMatch) return null;

      const startTime = parseTimeToMs(timeMatch[1]);
      const endTime = parseTimeToMs(timeMatch[2]);
      const text = lines.slice(2).join("\n");

      return { lineIndex, startTime, endTime, englishText: text, chineseText: null };
    })
    .filter(Boolean) as ParsedSubtitle[];
}
