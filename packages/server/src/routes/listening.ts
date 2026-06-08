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
      description: listeningMaterials.description,
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
  const material = await db
    .select()
    .from(listeningMaterials)
    .where(eq(listeningMaterials.id, id))
    .get();
  if (!material) return c.json({ error: "Not found" }, 404);

  const subs = await db
    .select()
    .from(subtitles)
    .where(eq(subtitles.listeningId, id))
    .orderBy(subtitles.lineIndex);

  return c.json({ ...material, subtitles: subs });
});

// POST /api/listening - create
app.post("/", async (c) => {
  const body = await c.req.json();
  const { title, description, audioFilePath, subtitles: subs } = body;

  const result = await db
    .insert(listeningMaterials)
    .values({
      title,
      description,
      audioFilePath,
    })
    .returning({ id: listeningMaterials.id });

  const materialId = result[0].id;

  if (subs && subs.length > 0) {
    await db.insert(subtitles).values(
      subs.map((s: any, index: number) => ({
        listeningId: materialId,
        lineIndex: s.lineIndex ?? index,
        startTime: s.startTime,
        endTime: s.endTime,
        englishText: s.englishText ?? null,
        chineseText: s.chineseText ?? null,
      })),
    );
  }

  return c.json({ id: materialId }, 201);
});

// PUT /api/listening/:id - update
app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const { title, description, audioFilePath, subtitles: subs } = body;

  await db
    .update(listeningMaterials)
    .set({ title, description, audioFilePath, updatedAt: new Date() })
    .where(eq(listeningMaterials.id, id));

  if (subs !== undefined) {
    await db.delete(subtitles).where(eq(subtitles.listeningId, id));
    if (subs.length > 0) {
      await db.insert(subtitles).values(
        subs.map((s: any, index: number) => ({
          listeningId: id,
          lineIndex: s.lineIndex ?? index,
          startTime: s.startTime,
          endTime: s.endTime,
          englishText: s.englishText ?? null,
          chineseText: s.chineseText ?? null,
        })),
      );
    }
  }

  return c.json({ id });
});

// DELETE /api/listening/:id - delete
app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(listeningMaterials).where(eq(listeningMaterials.id, id));
  return c.json({ success: true });
});

export default app;
