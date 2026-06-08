import { Hono } from "hono";

const app = new Hono();

// 有道词典 API 基础地址
const DICT_API_BASE = process.env.DICT_API_BASE || "http://127.0.0.1:5088";

/**
 * 将音频相对路径补全为完整 URL
 * @param filename 音频文件名，如 "abc123.mp3"
 * @returns 完整音频 URL，filename 为空时返回空字符串
 */
function resolveAudioUrl(filename: string | null | undefined): string {
  if (!filename) return "";
  return `${DICT_API_BASE}/api/audio/${filename}`;
}

// GET /api/words/search?q=hello — 查词代理
app.get("/search", async (c) => {
  const q = c.req.query("q");

  if (!q) {
    return c.json({ success: false, error: "Missing query parameter: q" }, 400);
  }

  try {
    const url = new URL("/api/translate", DICT_API_BASE);
    url.searchParams.set("word", q);

    const res = await fetch(url.toString());
    const json = await res.json();

    // 补全响应中的音频相对路径为完整 URL
    if (json.data?.phonetic?.audio) {
      json.data.phonetic.audio = resolveAudioUrl(json.data.phonetic.audio);
    }
    if (json.data?.trans_sents) {
      for (const s of json.data.trans_sents) {
        if (s.audio_url && !s.audio_url.startsWith("http")) {
          s.audio_url = resolveAudioUrl(s.audio_url);
        } else {
          s.audio_url = "";
        }
      }
    }

    return c.json(json);
  } catch {
    return c.json({ success: false, error: "Dictionary service unavailable" }, 502);
  }
});

// GET /api/words/audio/:filename — 音频流代理（避免前端跨域）
app.get("/audio/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!filename) return c.body(null, 400);

  try {
    const res = await fetch(`${DICT_API_BASE}/api/audio/${filename}`);
    if (!res.ok) return c.body(null, 404);

    const contentType = res.headers.get("content-type") || "audio/mpeg";
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return c.body(null, 502);
  }
});

export default app;
