# Listen English Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack English listening training web app with audio playback, synchronized subtitles, reading mode, and admin resource management.

**Architecture:** Monorepo with pnpm workspace. Frontend (Vue 3 SPA) communicates with backend (Hono REST API) via JSON. SQLite database via Drizzle ORM. Audio files stored on local filesystem and served via static middleware.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Pinia, Vue Router, Hono, Drizzle ORM, SQLite, pnpm workspace

---

## Phase 1: Project Infrastructure

### Task 1: Initialize Monorepo Structure

**Files:**
- Modify: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `packages/client/package.json`
- Create: `packages/server/package.json`

**Step 1: Update root package.json**

```json
{
  "name": "listen-english",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "db:generate": "pnpm --filter server db:generate",
    "db:migrate": "pnpm --filter server db:migrate",
    "db:studio": "pnpm --filter server db:studio"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.db
.env
uploads/
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize monorepo structure with pnpm workspace"
```

---

### Task 2: Scaffold Server Package

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`

**Step 1: Create packages/server/package.json**

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "drizzle-orm": "^0.36.0",
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.0.0",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  }
}
```

**Step 2: Create packages/server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create minimal server entry**

```typescript
// packages/server/src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use(cors());

app.get('/api/health', (c) => c.json({ status: 'ok' }));

const port = 3001;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
```

**Step 4: Install dependencies and verify server starts**

Run: `cd packages/server && pnpm install && pnpm dev`
Expected: "Server running on http://localhost:3001"

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold server package with Hono"
```

---

### Task 3: Scaffold Client Package

**Files:**
- Create: `packages/client/` (via Vite scaffolding)

**Step 1: Create Vue 3 project with Vite**

Run from project root:
```bash
cd packages && pnpm create vite client --template vue-ts
```

**Step 2: Install additional client dependencies**

```bash
cd packages/client
pnpm add vue-router pinia
pnpm add -D tailwindcss @tailwindcss/vite
```

**Step 3: Configure Tailwind CSS**

Create `packages/client/src/style.css`:
```css
@import "tailwindcss";
```

Add Tailwind Vite plugin to `packages/client/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
```

**Step 4: Verify client starts**

Run: `cd packages/client && pnpm dev`
Expected: Vite dev server starts on http://localhost:5173

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold client package with Vue 3, Tailwind CSS, Pinia"
```

---

### Task 4: Install all workspace dependencies

**Step 1: Run pnpm install from root**

```bash
pnpm install
```

**Step 2: Verify `pnpm dev` launches both client and server**

Run: `pnpm dev`
Expected: Both servers start in parallel

**Step 3: Commit (if any lockfile changes)**

```bash
git add -A
git commit -m "chore: install workspace dependencies"
```

---

## Phase 2: Backend - Database & Core API

### Task 5: Database Schema & Migration

**Files:**
- Create: `packages/server/src/db/schema.ts`
- Create: `packages/server/src/db/index.ts`
- Create: `packages/server/drizzle.config.ts`

**Step 1: Create Drizzle config**

```typescript
// packages/server/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data.db',
  },
});
```

**Step 2: Create database schema**

```typescript
// packages/server/src/db/schema.ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const listeningMaterials = sqliteTable('listening_materials', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  audioFilePath: text('audio_file_path').notNull(),
  originalText: text('original_text'),
  duration: integer('duration'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const subtitles = sqliteTable('subtitles', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  listeningId: integer('listening_id')
    .notNull()
    .references(() => listeningMaterials.id, { onDelete: 'cascade' }),
  lineIndex: integer('line_index').notNull(),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time').notNull(),
  englishText: text('english_text'),
  chineseText: text('chinese_text'),
});
```

**Step 3: Create database connection**

```typescript
// packages/server/src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('./data.db');
export const db = drizzle(sqlite, { schema });
```

**Step 4: Generate and run migration**

```bash
cd packages/server
pnpm db:generate
pnpm db:migrate
```

Expected: `drizzle/` folder created with migration SQL; `data.db` file created with tables.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add database schema with Drizzle ORM (listening_materials + subtitles)"
```

---

### Task 6: Listening CRUD API Routes

**Files:**
- Create: `packages/server/src/routes/listening.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Create listening routes**

```typescript
// packages/server/src/routes/listening.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { listeningMaterials, subtitles } from '../db/schema';

const app = new Hono();

// GET /api/listening - list all
app.get('/', async (c) => {
  const materials = await db.select({
    id: listeningMaterials.id,
    title: listeningMaterials.title,
    description: listeningMaterials.description,
    duration: listeningMaterials.duration,
    createdAt: listeningMaterials.createdAt,
  }).from(listeningMaterials).orderBy(listeningMaterials.createdAt);
  return c.json(materials);
});

// GET /api/listening/:id - get detail with subtitles
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const material = await db.select().from(listeningMaterials)
    .where(eq(listeningMaterials.id, id)).get();
  if (!material) return c.json({ error: 'Not found' }, 404);

  const subs = await db.select().from(subtitles)
    .where(eq(subtitles.listeningId, id))
    .orderBy(subtitles.lineIndex);

  return c.json({ ...material, subtitles: subs });
});

// POST /api/listening - create
app.post('/', async (c) => {
  const body = await c.req.json();
  const { title, description, audioFilePath, originalText, subtitles: subs } = body;

  const result = await db.insert(listeningMaterials).values({
    title,
    description,
    audioFilePath,
    originalText,
  }).returning({ id: listeningMaterials.id });

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
      }))
    );
  }

  return c.json({ id: materialId }, 201);
});

// PUT /api/listening/:id - update
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const { title, description, audioFilePath, originalText, subtitles: subs } = body;

  await db.update(listeningMaterials)
    .set({ title, description, audioFilePath, originalText, updatedAt: new Date() })
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
        }))
      );
    }
  }

  return c.json({ id });
});

// DELETE /api/listening/:id - delete
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(listeningMaterials).where(eq(listeningMaterials.id, id));
  return c.json({ success: true });
});

export default app;
```

**Step 2: Register routes in main app**

Update `packages/server/src/index.ts` to import and mount:
```typescript
import listeningRoutes from './routes/listening';
app.route('/api/listening', listeningRoutes);
```

**Step 3: Verify with curl**

```bash
# Start server, then in another terminal:
curl http://localhost:3001/api/listening
# Expected: []
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add listening CRUD API routes"
```

---

### Task 7: File Upload Routes

**Files:**
- Create: `packages/server/src/routes/file.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Create uploads directory structure**

```bash
mkdir -p packages/server/uploads/audio
```

**Step 2: Create file upload routes**

```typescript
// packages/server/src/routes/file.ts
import { Hono } from 'hono';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const app = new Hono();

const UPLOAD_DIR = './uploads/audio';

// POST /api/upload/audio
app.post('/audio', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Unsupported audio format' }, 400);
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
```

**Step 3: Create subtitle parse route**

```typescript
// packages/server/src/routes/subtitle.ts
import { Hono } from 'hono';

const app = new Hono();

interface ParsedSubtitle {
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string;
  chineseText: string | null;
}

function parseSRT(content: string): ParsedSubtitle[] {
  const blocks = content.trim().split(/\n\s*\n/);
  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    if (lines.length < 3) return null;

    const lineIndex = parseInt(lines[0], 10);
    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) return null;

    const startTime =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);
    const endTime =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    const text = lines.slice(2).join('\n');

    return { lineIndex, startTime, endTime, englishText: text, chineseText: null };
  }).filter(Boolean) as ParsedSubtitle[];
}

function parseVTT(content: string): ParsedSubtitle[] {
  // Remove WEBVTT header
  const body = content.replace(/^WEBVTT.*?\n\n/s, '');
  // VTT uses '.' for milliseconds, reuse SRT parser logic
  return parseSRT(body);
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
```

**Step 4: Mount routes and static serving in main app**

Update `packages/server/src/index.ts`:
```typescript
import { serveStatic } from '@hono/node-server/serve-static';
import fileRoutes from './routes/file';
import subtitleRoutes from './routes/subtitle';

app.use('/uploads/*', serveStatic({ root: './' }));
app.route('/api/upload', fileRoutes);
app.route('/api/upload', subtitleRoutes);
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add file upload and subtitle parsing routes"
```

---

## Phase 3: Frontend - Core Structure

### Task 8: Vue Router & Layout Setup

**Files:**
- Create: `packages/client/src/router/index.ts`
- Create: `packages/client/src/views/ListeningView.vue`
- Create: `packages/client/src/views/AdminView.vue`
- Create: `packages/client/src/components/layout/AppLayout.vue`
- Modify: `packages/client/src/main.ts`
- Modify: `packages/client/src/App.vue`

**Step 1: Create router**

```typescript
// packages/client/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/listening' },
    { path: '/listening', name: 'listening', component: () => import('../views/ListeningView.vue') },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue') },
  ],
});

export default router;
```

**Step 2: Create AppLayout component**

```vue
<!-- packages/client/src/components/layout/AppLayout.vue -->
<template>
  <div class="h-screen flex flex-col">
    <header class="h-12 bg-gray-800 text-white flex items-center px-4 shrink-0">
      <h1 class="text-lg font-semibold">Listen English</h1>
      <nav class="ml-8 flex gap-4">
        <router-link to="/listening" class="hover:text-blue-300">Listening</router-link>
        <router-link to="/admin" class="hover:text-blue-300">Admin</router-link>
      </nav>
    </header>
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
```

**Step 3: Create placeholder views**

```vue
<!-- packages/client/src/views/ListeningView.vue -->
<template>
  <div class="p-4">
    <h2 class="text-xl font-bold">Listening</h2>
    <p class="text-gray-500 mt-2">Listening page content here</p>
  </div>
</template>
```

```vue
<!-- packages/client/src/views/AdminView.vue -->
<template>
  <div class="p-4">
    <h2 class="text-xl font-bold">Admin</h2>
    <p class="text-gray-500 mt-2">Admin page content here</p>
  </div>
</template>
```

**Step 4: Update main.ts to register router and pinia**

```typescript
// packages/client/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

**Step 5: Update App.vue**

```vue
<!-- packages/client/src/App.vue -->
<template>
  <AppLayout>
    <router-view />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue';
</script>
```

**Step 6: Verify app renders with routing**

Run: `pnpm dev` from root, open http://localhost:5173
Expected: Header with nav links, clicking toggles between views.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Vue Router, AppLayout, and placeholder views"
```

---

### Task 9: Pinia Stores

**Files:**
- Create: `packages/client/src/stores/player.ts`
- Create: `packages/client/src/stores/listening.ts`

**Step 1: Create player store**

```typescript
// packages/client/src/stores/player.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePlayerStore = defineStore('player', () => {
  const currentAudioUrl = ref<string | null>(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const playbackRate = ref(1.0);

  function setAudio(url: string) {
    currentAudioUrl.value = url;
    isPlaying.value = false;
    currentTime.value = 0;
  }

  function setPlaybackRate(rate: number) {
    playbackRate.value = rate;
  }

  return { currentAudioUrl, isPlaying, currentTime, duration, playbackRate, setAudio, setPlaybackRate };
});
```

**Step 2: Create listening store**

```typescript
// packages/client/src/stores/listening.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ListeningItem {
  id: number;
  title: string;
  description: string | null;
  duration: number | null;
  createdAt: string;
}

export interface Subtitle {
  id: number;
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string | null;
  chineseText: string | null;
}

export type SubtitleMode = 'hidden' | 'english' | 'chinese' | 'bilingual' | 'reading';

export const useListeningStore = defineStore('listening', () => {
  const materials = ref<ListeningItem[]>([]);
  const currentMaterial = ref<(ListeningItem & { audioFilePath: string; originalText: string | null; subtitles: Subtitle[] }) | null>(null);
  const subtitleMode = ref<SubtitleMode>('english');

  async function fetchMaterials() {
    const res = await fetch('/api/listening');
    materials.value = await res.json();
  }

  async function fetchMaterial(id: number) {
    const res = await fetch(`/api/listening/${id}`);
    currentMaterial.value = await res.json();
  }

  return { materials, currentMaterial, subtitleMode, fetchMaterials, fetchMaterial };
});
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Pinia stores for player and listening state"
```

---

### Task 10: API Client Helpers

**Files:**
- Create: `packages/client/src/api/index.ts`

**Step 1: Create API client**

```typescript
// packages/client/src/api/index.ts
const BASE = '/api';

export async function fetchListenings() {
  const res = await fetch(`${BASE}/listening`);
  return res.json();
}

export async function fetchListening(id: number) {
  const res = await fetch(`${BASE}/listening/${id}`);
  return res.json();
}

export async function createListening(data: any) {
  const res = await fetch(`${BASE}/listening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateListening(id: number, data: any) {
  const res = await fetch(`${BASE}/listening/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteListening(id: number) {
  const res = await fetch(`${BASE}/listening/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function uploadAudio(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/upload/audio`, { method: 'POST', body: formData });
  return res.json();
}

export async function uploadSubtitle(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/upload/subtitle`, { method: 'POST', body: formData });
  return res.json();
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add API client helpers"
```

---

## Phase 4: Frontend - Listening Page

### Task 11: Listening List Sidebar Component

**Files:**
- Create: `packages/client/src/components/listening/ListeningList.vue`

**Step 1: Create ListeningList component**

```vue
<!-- packages/client/src/components/listening/ListeningList.vue -->
<template>
  <div class="w-[280px] border-r border-gray-200 h-full overflow-y-auto bg-gray-50">
    <div class="p-3">
      <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Materials</h3>
    </div>
    <ul>
      <li
        v-for="item in materials"
        :key="item.id"
        @click="$emit('select', item.id)"
        class="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors"
        :class="{ 'bg-blue-100': item.id === selectedId }"
      >
        <div class="text-sm font-medium text-gray-800 truncate">{{ item.title }}</div>
        <div class="text-xs text-gray-500 mt-1" v-if="item.duration">
          {{ formatDuration(item.duration) }}
        </div>
      </li>
    </ul>
    <div v-if="materials.length === 0" class="p-4 text-sm text-gray-400 text-center">
      No materials available. Add some in Admin.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ListeningItem } from '../../stores/listening';

defineProps<{
  materials: ListeningItem[];
  selectedId: number | null;
}>();

defineEmits<{
  select: [id: number];
}>();

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
</script>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add ListeningList sidebar component"
```

---

### Task 12: Audio Player Component

**Files:**
- Create: `packages/client/src/components/player/AudioPlayer.vue`

**Step 1: Create AudioPlayer component**

```vue
<!-- packages/client/src/components/player/AudioPlayer.vue -->
<template>
  <div class="h-[100px] border-t border-gray-200 bg-white px-6 flex items-center gap-4">
    <audio
      ref="audioEl"
      :src="playerStore.currentAudioUrl ?? undefined"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="playerStore.isPlaying = false"
    />

    <!-- Play/Pause -->
    <button
      @click="togglePlay"
      class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
    >
      <span v-if="playerStore.isPlaying">⏸</span>
      <span v-else>▶</span>
    </button>

    <!-- Time -->
    <span class="text-xs text-gray-500 w-12 text-right">{{ formatTime(playerStore.currentTime) }}</span>

    <!-- Progress bar -->
    <input
      type="range"
      min="0"
      :max="playerStore.duration"
      :value="playerStore.currentTime"
      @input="onSeek"
      class="flex-1 h-2 cursor-pointer"
    />

    <span class="text-xs text-gray-500 w-12">{{ formatTime(playerStore.duration) }}</span>

    <!-- Speed -->
    <select
      :value="playerStore.playbackRate"
      @change="onRateChange"
      class="text-xs border rounded px-1 py-0.5"
    >
      <option :value="0.75">0.75x</option>
      <option :value="1.0">1.0x</option>
      <option :value="1.25">1.25x</option>
      <option :value="1.5">1.5x</option>
      <option :value="2.0">2.0x</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePlayerStore } from '../../stores/player';

const playerStore = usePlayerStore();
const audioEl = ref<HTMLAudioElement | null>(null);

function togglePlay() {
  if (!audioEl.value) return;
  if (playerStore.isPlaying) {
    audioEl.value.pause();
  } else {
    audioEl.value.play();
  }
  playerStore.isPlaying = !playerStore.isPlaying;
}

function onTimeUpdate() {
  if (audioEl.value) {
    playerStore.currentTime = audioEl.value.currentTime;
  }
}

function onLoaded() {
  if (audioEl.value) {
    playerStore.duration = audioEl.value.duration;
  }
}

function onSeek(e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  if (audioEl.value) {
    audioEl.value.currentTime = value;
    playerStore.currentTime = value;
  }
}

function onRateChange(e: Event) {
  const rate = Number((e.target as HTMLSelectElement).value);
  playerStore.setPlaybackRate(rate);
  if (audioEl.value) {
    audioEl.value.playbackRate = rate;
  }
}

watch(() => playerStore.playbackRate, (rate) => {
  if (audioEl.value) audioEl.value.playbackRate = rate;
});

watch(() => playerStore.currentAudioUrl, () => {
  playerStore.isPlaying = false;
  playerStore.currentTime = 0;
});

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
</script>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add AudioPlayer component with playback controls"
```

---

### Task 13: Subtitle Display Component

**Files:**
- Create: `packages/client/src/components/subtitle/SubtitleDisplay.vue`
- Create: `packages/client/src/composables/useSubtitleSync.ts`

**Step 1: Create subtitle sync composable**

```typescript
// packages/client/src/composables/useSubtitleSync.ts
import { computed } from 'vue';
import { usePlayerStore } from '../stores/player';
import type { Subtitle } from '../stores/listening';

export function useSubtitleSync(subtitles: () => Subtitle[]) {
  const playerStore = usePlayerStore();

  const activeIndex = computed(() => {
    const timeMs = playerStore.currentTime * 1000;
    const subs = subtitles();
    const idx = subs.findIndex(
      (s) => timeMs >= s.startTime && timeMs <= s.endTime
    );
    return idx;
  });

  return { activeIndex };
}
```

**Step 2: Create SubtitleDisplay component**

```vue
<!-- packages/client/src/components/subtitle/SubtitleDisplay.vue -->
<template>
  <div class="flex-1 overflow-y-auto p-4" ref="containerEl">
    <!-- Tab bar -->
    <div class="flex gap-1 mb-4 border-b pb-2">
      <button
        v-for="mode in modes"
        :key="mode.value"
        @click="listeningStore.subtitleMode = mode.value"
        class="px-3 py-1 text-sm rounded-t"
        :class="listeningStore.subtitleMode === mode.value
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Hidden mode -->
    <div v-if="listeningStore.subtitleMode === 'hidden'" class="text-center text-gray-400 mt-20">
      Subtitles hidden
    </div>

    <!-- Reading mode -->
    <div v-else-if="listeningStore.subtitleMode === 'reading'" class="prose max-w-none">
      <div class="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {{ listeningStore.currentMaterial?.originalText || 'No original text available.' }}
      </div>
    </div>

    <!-- Subtitle list modes -->
    <div v-else class="space-y-2">
      <div
        v-for="(sub, idx) in subtitles"
        :key="sub.lineIndex"
        :ref="(el) => { if (idx === activeIndex) activeEl = el as HTMLElement }"
        class="p-2 rounded transition-colors"
        :class="idx === activeIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''"
      >
        <p v-if="showEnglish" class="text-gray-800">{{ sub.englishText }}</p>
        <p v-if="showChinese" class="text-gray-500 text-sm mt-1">{{ sub.chineseText || '' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useListeningStore } from '../../stores/listening';
import { useSubtitleSync } from '../../composables/useSubtitleSync';

const listeningStore = useListeningStore();
const containerEl = ref<HTMLElement | null>(null);
const activeEl = ref<HTMLElement | null>(null);

const subtitles = computed(() => listeningStore.currentMaterial?.subtitles ?? []);
const { activeIndex } = useSubtitleSync(() => subtitles.value);

const modes = [
  { value: 'hidden' as const, label: 'Hidden' },
  { value: 'english' as const, label: 'English' },
  { value: 'chinese' as const, label: 'Chinese' },
  { value: 'bilingual' as const, label: 'Bilingual' },
  { value: 'reading' as const, label: 'Reading' },
];

const showEnglish = computed(() =>
  ['english', 'bilingual'].includes(listeningStore.subtitleMode)
);
const showChinese = computed(() =>
  ['chinese', 'bilingual'].includes(listeningStore.subtitleMode)
);

watch(activeIndex, async () => {
  await nextTick();
  if (activeEl.value) {
    activeEl.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
</script>
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add SubtitleDisplay component with sync and mode switching"
```

---

### Task 14: Assemble Listening View

**Files:**
- Modify: `packages/client/src/views/ListeningView.vue`

**Step 1: Integrate all components into ListeningView**

```vue
<!-- packages/client/src/views/ListeningView.vue -->
<template>
  <div class="flex h-full">
    <!-- Left sidebar -->
    <ListeningList
      :materials="listeningStore.materials"
      :selected-id="listeningStore.currentMaterial?.id ?? null"
      @select="onSelect"
    />

    <!-- Right content -->
    <div class="flex-1 flex flex-col">
      <SubtitleDisplay />
      <AudioPlayer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useListeningStore } from '../stores/listening';
import { usePlayerStore } from '../stores/player';
import ListeningList from '../components/listening/ListeningList.vue';
import SubtitleDisplay from '../components/subtitle/SubtitleDisplay.vue';
import AudioPlayer from '../components/player/AudioPlayer.vue';

const listeningStore = useListeningStore();
const playerStore = usePlayerStore();

onMounted(async () => {
  await listeningStore.fetchMaterials();
  if (listeningStore.materials.length > 0) {
    await onSelect(listeningStore.materials[0].id);
  }
});

async function onSelect(id: number) {
  await listeningStore.fetchMaterial(id);
  if (listeningStore.currentMaterial) {
    playerStore.setAudio(listeningStore.currentMaterial.audioFilePath);
  }
}
</script>
```

**Step 2: Verify the listening page renders correctly**

Run: `pnpm dev`, navigate to http://localhost:5173/listening
Expected: Two-column layout with empty state message on left, player bar at bottom.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: assemble ListeningView with sidebar, subtitle display, and player"
```

---

## Phase 5: Frontend - Admin Page

### Task 15: Admin View Implementation

**Files:**
- Modify: `packages/client/src/views/AdminView.vue`

**Step 1: Implement full admin page**

```vue
<!-- packages/client/src/views/AdminView.vue -->
<template>
  <div class="flex h-full">
    <!-- Left: Resource list -->
    <div class="w-[300px] border-r border-gray-200 h-full overflow-y-auto bg-gray-50">
      <div class="p-3 flex justify-between items-center">
        <h3 class="text-sm font-semibold text-gray-600">Resources</h3>
        <button @click="createNew" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
          + Add New
        </button>
      </div>
      <ul>
        <li
          v-for="item in materials"
          :key="item.id"
          @click="selectItem(item.id)"
          class="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50"
          :class="{ 'bg-blue-100': editingId === item.id }"
        >
          <div class="text-sm font-medium truncate">{{ item.title }}</div>
        </li>
      </ul>
    </div>

    <!-- Right: Edit form -->
    <div class="flex-1 p-6 overflow-y-auto">
      <div v-if="isEditing" class="max-w-2xl space-y-4">
        <h2 class="text-lg font-bold">{{ editingId ? 'Edit' : 'New' }} Listening Material</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input v-model="form.title" class="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input v-model="form.description" class="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Audio File</label>
          <div class="flex gap-2 items-center">
            <input type="file" accept="audio/*" @change="onAudioSelect" ref="audioInput" />
            <button
              @click="handleUploadAudio"
              :disabled="!selectedAudioFile"
              class="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              Upload
            </button>
          </div>
          <p v-if="form.audioFilePath" class="text-xs text-green-600 mt-1">{{ form.audioFilePath }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Subtitle File (.srt / .vtt)</label>
          <div class="flex gap-2 items-center">
            <input type="file" accept=".srt,.vtt" @change="onSubtitleSelect" ref="subtitleInput" />
            <button
              @click="handleUploadSubtitle"
              :disabled="!selectedSubtitleFile"
              class="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              Upload & Parse
            </button>
          </div>
          <div v-if="form.subtitles.length" class="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-xs">
            <div v-for="s in form.subtitles" :key="s.lineIndex" class="py-0.5">
              {{ s.lineIndex }}. [{{ s.startTime }}ms - {{ s.endTime }}ms] {{ s.englishText }}
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Original Text</label>
          <textarea v-model="form.originalText" rows="6" class="w-full border rounded px-3 py-2" />
        </div>

        <div class="flex gap-3 pt-4">
          <button @click="handleSave" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Save
          </button>
          <button @click="cancelEdit" class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button
            v-if="editingId"
            @click="handleDelete"
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-auto"
          >
            Delete
          </button>
        </div>
      </div>

      <div v-else class="text-gray-400 text-center mt-20">
        Select a resource to edit or click "+ Add New"
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import * as api from '../api';

interface SubtitleItem {
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string;
  chineseText: string | null;
}

const materials = ref<any[]>([]);
const editingId = ref<number | null>(null);
const isEditing = ref(false);
const selectedAudioFile = ref<File | null>(null);
const selectedSubtitleFile = ref<File | null>(null);

const form = reactive({
  title: '',
  description: '',
  audioFilePath: '',
  originalText: '',
  subtitles: [] as SubtitleItem[],
});

onMounted(loadMaterials);

async function loadMaterials() {
  materials.value = await api.fetchListenings();
}

function createNew() {
  editingId.value = null;
  isEditing.value = true;
  resetForm();
}

function resetForm() {
  form.title = '';
  form.description = '';
  form.audioFilePath = '';
  form.originalText = '';
  form.subtitles = [];
  selectedAudioFile.value = null;
  selectedSubtitleFile.value = null;
}

async function selectItem(id: number) {
  editingId.value = id;
  isEditing.value = true;
  const data = await api.fetchListening(id);
  form.title = data.title;
  form.description = data.description || '';
  form.audioFilePath = data.audioFilePath;
  form.originalText = data.originalText || '';
  form.subtitles = data.subtitles || [];
}

function onAudioSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  selectedAudioFile.value = file ?? null;
}

function onSubtitleSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  selectedSubtitleFile.value = file ?? null;
}

async function handleUploadAudio() {
  if (!selectedAudioFile.value) return;
  const result = await api.uploadAudio(selectedAudioFile.value);
  form.audioFilePath = result.url;
}

async function handleUploadSubtitle() {
  if (!selectedSubtitleFile.value) return;
  const result = await api.uploadSubtitle(selectedSubtitleFile.value);
  form.subtitles = result.subtitles;
}

async function handleSave() {
  const payload = {
    title: form.title,
    description: form.description,
    audioFilePath: form.audioFilePath,
    originalText: form.originalText,
    subtitles: form.subtitles,
  };

  if (editingId.value) {
    await api.updateListening(editingId.value, payload);
  } else {
    await api.createListening(payload);
  }

  await loadMaterials();
  isEditing.value = false;
  editingId.value = null;
}

function cancelEdit() {
  isEditing.value = false;
  editingId.value = null;
  resetForm();
}

async function handleDelete() {
  if (!editingId.value) return;
  if (!confirm('Are you sure you want to delete this?')) return;
  await api.deleteListening(editingId.value);
  await loadMaterials();
  isEditing.value = false;
  editingId.value = null;
}
</script>
```

**Step 2: Verify admin page works**

Run: `pnpm dev`, navigate to http://localhost:5173/admin
Expected: Two-column layout with resource list on left and form on right.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement admin page with CRUD operations"
```

---

## Phase 6: Integration & Polish

### Task 16: End-to-End Smoke Test

**Step 1: Start both servers**

```bash
pnpm dev
```

**Step 2: Create a test resource via Admin**

1. Navigate to http://localhost:5173/admin
2. Click "+ Add New"
3. Fill title: "Test Lesson 1"
4. Upload a test audio file (any .mp3)
5. Upload a test .srt subtitle file
6. Add some original text
7. Click Save

**Step 3: Verify on Listening page**

1. Navigate to http://localhost:5173/listening
2. Verify "Test Lesson 1" appears in sidebar
3. Click it, verify audio loads
4. Play audio, verify subtitle highlighting works
5. Switch between subtitle modes

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: complete v1 integration"
```

---

## Summary of Tasks

| # | Task | Phase |
|---|------|-------|
| 1 | Initialize Monorepo Structure | Infrastructure |
| 2 | Scaffold Server Package | Infrastructure |
| 3 | Scaffold Client Package | Infrastructure |
| 4 | Install Workspace Dependencies | Infrastructure |
| 5 | Database Schema & Migration | Backend |
| 6 | Listening CRUD API Routes | Backend |
| 7 | File Upload & Subtitle Parsing Routes | Backend |
| 8 | Vue Router & Layout Setup | Frontend Core |
| 9 | Pinia Stores | Frontend Core |
| 10 | API Client Helpers | Frontend Core |
| 11 | Listening List Sidebar Component | Listening Page |
| 12 | Audio Player Component | Listening Page |
| 13 | Subtitle Display Component | Listening Page |
| 14 | Assemble Listening View | Listening Page |
| 15 | Admin View Implementation | Admin Page |
| 16 | End-to-End Smoke Test | Integration |
