import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { subtitles } from "../db/schema.js";

const app = new Hono();

// GET /api/subtitles/:id - 获取单条字幕
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const rows = await db
    .select({
      id: subtitles.id,
      englishText: subtitles.englishText,
      chineseText: subtitles.chineseText,
      listeningId: subtitles.listeningId,
    })
    .from(subtitles)
    .where(eq(subtitles.id, id));

  if (!rows.length) return c.json({ error: "Not found" }, 404);

  return c.json(rows[0]);
});

export default app;
