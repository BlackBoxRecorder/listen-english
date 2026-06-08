import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const listeningMaterials = sqliteTable("listening_materials", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  audioFilePath: text("audio_file_path").notNull(),
  duration: integer("duration"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const subtitles = sqliteTable("subtitles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listeningId: integer("listening_id")
    .notNull()
    .references(() => listeningMaterials.id, { onDelete: "cascade" }),
  lineIndex: integer("line_index").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  englishText: text("english_text"),
  chineseText: text("chinese_text"),
});
