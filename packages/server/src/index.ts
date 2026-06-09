import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import listeningRoutes from "./routes/listening.js";
import wordsRoutes from "./routes/words.js";
import analysisRoutes from "./routes/analysis.js";
import { startSyncScheduler } from "./tasks/syncVoa.js";

const app = new Hono();
app.use(cors());
app.use("/uploads/*", serveStatic({ root: "./" }));

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/listening", listeningRoutes);
app.route("/api/words", wordsRoutes);
app.route("/api/analysis", analysisRoutes);

startSyncScheduler();

const port = 3001;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
