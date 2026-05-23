import { Hono } from 'hono';

const app = new Hono();

interface ParsedSubtitle {
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string;
  chineseText: string | null;
}

function parseTimeToMs(timeStr: string): number {
  const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  return (
    parseInt(match[1]) * 3600000 +
    parseInt(match[2]) * 60000 +
    parseInt(match[3]) * 1000 +
    parseInt(match[4])
  );
}

function parseSRT(content: string): ParsedSubtitle[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    if (lines.length < 3) return null;

    const lineIndex = parseInt(lines[0], 10);
    if (isNaN(lineIndex)) return null;

    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) return null;

    const startTime = parseTimeToMs(timeMatch[1]);
    const endTime = parseTimeToMs(timeMatch[2]);
    const text = lines.slice(2).join('\n');

    return { lineIndex, startTime, endTime, englishText: text, chineseText: null };
  }).filter(Boolean) as ParsedSubtitle[];
}

function parseVTT(content: string): ParsedSubtitle[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove WEBVTT header and any metadata
  const body = normalized.replace(/^WEBVTT[^\n]*\n(\n|[^\n]+\n)*?\n/, '');
  const blocks = body.trim().split(/\n\s*\n/);
  let index = 0;

  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return null;

    // VTT cues may or may not have an index line
    let timeLine: string;
    let textLines: string[];

    if (lines[0].includes('-->')) {
      timeLine = lines[0];
      textLines = lines.slice(1);
    } else {
      timeLine = lines[1];
      textLines = lines.slice(2);
    }

    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) return null;

    index++;
    const startTime = parseTimeToMs(timeMatch[1]);
    const endTime = parseTimeToMs(timeMatch[2]);
    const text = textLines.join('\n');

    return { lineIndex: index, startTime, endTime, englishText: text, chineseText: null };
  }).filter(Boolean) as ParsedSubtitle[];
}

// POST /api/upload/subtitle
app.post('/subtitle', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  const content = await file.text();
  const fileName = file.name.toLowerCase();

  let subtitles: ParsedSubtitle[];
  try {
    if (fileName.endsWith('.vtt')) {
      subtitles = parseVTT(content);
    } else if (fileName.endsWith('.srt')) {
      subtitles = parseSRT(content);
    } else {
      return c.json({ error: 'Unsupported subtitle format. Use .srt or .vtt' }, 400);
    }
  } catch {
    return c.json({ error: 'Failed to parse subtitle file' }, 400);
  }

  if (subtitles.length === 0) {
    return c.json({ error: 'No subtitles found in file' }, 400);
  }

  return c.json({ subtitles });
});

export default app;
