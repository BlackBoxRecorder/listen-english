import { Hono } from "hono";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const app = new Hono();

const UPLOAD_DIR = "./uploads/audio";

// POST /api/upload/audio
app.post("/audio", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return c.json({ error: "No file provided" }, 400);

  const allowedTypes = [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
    "audio/webm",
    "audio/x-m4a",
  ];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Unsupported audio format" }, 400);
  }

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const storedName = `${Date.now()}-${file.name}`;
  const filePath = join(UPLOAD_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return c.json({ url: `/uploads/audio/${storedName}`, storedName });
});

export default app;
