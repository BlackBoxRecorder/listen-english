import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { listeningMaterials, subtitles } from "../db/schema.js";

const app = new Hono();

// GET /api/listening - list all
app.get("/", async (c) => {
  const materials = await db
    .select({
      id: listeningMaterials.id,
      title: listeningMaterials.title,
      duration: listeningMaterials.duration,
      createdAt: listeningMaterials.createdAt,
    })
    .from(listeningMaterials)
    .orderBy(listeningMaterials.createdAt);
  return c.json(materials);
});

// GET /api/listening/:id - get detail with subtitles
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const rows = await db.select().from(listeningMaterials).where(eq(listeningMaterials.id, id));
  if (!rows.length) return c.json({ error: "Not found" }, 404);

  const subs = await db
    .select()
    .from(subtitles)
    .where(eq(subtitles.listeningId, id))
    .orderBy(subtitles.lineIndex);

  return c.json({ ...rows[0], subtitles: subs });
});

export default app;
