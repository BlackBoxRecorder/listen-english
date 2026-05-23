# Listen English - 设计文档

## 1. 项目概述

Listen English 是一个专注于英语听力训练的 Web 应用程序。用户可以在浏览器中收听英语音频材料，查看同步字幕，切换多种字幕显示模式，并在阅读模式下浏览完整原文。管理员可通过后台管理界面添加新的音频资源、上传字幕文件和管理原文内容。

## 2. 功能范围（简化版）

### 包含的功能
- **听力播放**：音频播放、暂停、进度控制、变速调节（0.75x / 1.0x / 1.25x / 1.5x / 2.0x）
- **字幕显示**：四种显示模式（隐藏 / 仅英文 / 仅中文 / 中英双语），实时高亮当前播放行
- **原文阅读**：阅读模式切换，完整显示原文内容，支持自由滚动
- **后台管理**：添加/编辑/删除听力资源，上传音频文件，上传并解析字幕文件（SRT/VTT），录入原文内容

### 明确不包含的功能（V1 阶段）
- 单词本管理
- 点击字幕/原文查词并显示单词详情
- 拼写练习
- 用户登录与身份认证（后台直接暴露访问）
- 单词释义数据源

## 3. 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 前端构建 | Vite |
| 前端样式 | Tailwind CSS |
| 前端状态 | Pinia |
| 前端路由 | Vue Router |
| 后端框架 | Hono (Node.js) |
| 后端语言 | TypeScript |
| ORM | Drizzle ORM |
| 数据库 | SQLite |
| 包管理 | pnpm workspace (Monorepo) |

## 4. 项目结构

```
listen-english/
├── packages/
│   ├── client/          # Vue3 前端应用
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/          # AppLayout（侧边栏 + 主内容区）
│   │   │   │   ├── player/          # AudioPlayer（底部播放控制）
│   │   │   │   ├── subtitle/        # SubtitleDisplay（字幕显示 + 高亮）
│   │   │   │   └── listening/       # ListeningList（左侧听力列表）
│   │   │   ├── views/
│   │   │   │   ├── ListeningView.vue   # 听力主页面
│   │   │   │   └── AdminView.vue       # 后台管理页面
│   │   │   ├── stores/
│   │   │   │   ├── player.ts        # 播放状态（当前音频、时间、速度）
│   │   │   │   └── listening.ts     # 听力数据、字幕、原文
│   │   │   ├── composables/
│   │   │   │   └── useSubtitleSync.ts
│   │   │   ├── api/                 # API 客户端
│   │   │   └── router/
│   │   └── package.json
│   └── server/          # Hono 后端服务
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts        # Drizzle 表定义
│       │   │   └── index.ts         # 数据库连接
│       │   ├── routes/
│       │   │   ├── listening.ts     # 听力资源 CRUD
│       │   │   ├── subtitle.ts      # 字幕 CRUD
│       │   │   └── file.ts          # 文件上传 / 下载
│       │   └── index.ts             # Hono 应用入口
│       └── package.json
├── package.json         # workspace root
└── pnpm-workspace.yaml
```

## 5. 前端架构

### 5.1 路由设计

| 路径 | 视图 | 说明 |
|------|------|------|
| `/` | `ListeningView` | 听力主页面（默认重定向） |
| `/listening` | `ListeningView` | 听力主页面 |
| `/admin` | `AdminView` | 后台管理页面 |

### 5.2 页面布局

听力页面采用**两栏式布局**：

- **左侧（280px 固定宽度）**：听力材料列表，显示标题 + 时长，点击切换
- **右侧（剩余宽度）**：
  - 上方：字幕 / 原文显示区，顶部一排 Tab 切换五种视图
  - 下方（固定 ~100px）：音频播放控制栏

**Tab 切换选项：**
1. `隐藏` — 不显示任何文本
2. `英文` — 仅显示英文字幕
3. `中文` — 仅显示中文字幕
4. `双语` — 中英双语对照显示
5. `阅读` — 显示完整原文内容，支持自由滚动

### 5.3 Pinia Store 设计

**`playerStore`**
```typescript
interface PlayerState {
  currentAudioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;        // 秒
  duration: number;           // 秒
  playbackRate: number;       // 默认 1.0
}
```

**`listeningStore`**
```typescript
interface ListeningState {
  materials: ListeningItem[];     // 听力列表
  currentMaterial: ListeningItem | null;
  subtitles: Subtitle[];
  originalText: string;
  subtitleMode: 'hidden' | 'english' | 'chinese' | 'bilingual' | 'reading';
}
```

### 5.4 字幕同步逻辑

```
audio timeupdate 事件
  → playerStore.currentTime 更新
  → computed activeSubtitle = subtitles.find(
      s => currentTime * 1000 >= s.startTime && currentTime * 1000 <= s.endTime
    )
  → SubtitleDisplay 组件 scrollIntoView(activeRow)
```

## 6. 后端架构

### 6.1 Hono 应用结构

```typescript
// packages/server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/serve-static';

const app = new Hono();
app.use(cors());
app.use('/uploads/*', serveStatic({ root: './uploads' }));

app.route('/api/listening', listeningRoutes);
app.route('/api/upload', uploadRoutes);

export default app;
```

### 6.2 文件存储

- 音频文件：`server/uploads/audio/{storedName}`
- 通过 Hono `serveStatic` 中间件提供访问
- 文件名使用 UUID 或时间戳 + 原始文件名，避免冲突

## 7. 数据库 Schema

```typescript
// packages/server/src/db/schema.ts

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const listeningMaterials = sqliteTable('listening_materials', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  audioFilePath: text('audio_file_path').notNull(),
  originalText: text('original_text'),
  duration: integer('duration'),              // 音频时长（秒）
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const subtitles = sqliteTable('subtitles', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  listeningId: integer('listening_id')
    .notNull()
    .references(() => listeningMaterials.id, { onDelete: 'cascade' }),
  lineIndex: integer('line_index').notNull(),
  startTime: integer('start_time').notNull(),    // 毫秒
  endTime: integer('end_time').notNull(),        // 毫秒
  englishText: text('english_text'),
  chineseText: text('chinese_text'),
});
```

## 8. API 设计

### 8.1 听力资源

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| `GET` | `/api/listening` | 获取听力列表 | — | `{ id, title, description, duration, createdAt }[]` |
| `GET` | `/api/listening/:id` | 获取听力详情（含字幕） | — | `{ id, title, description, audioFilePath, originalText, duration, subtitles: [...] }` |
| `POST` | `/api/listening` | 创建听力资源 | `{ title, description, audioFilePath, originalText, subtitles?: [...] }` | `{ id }` |
| `PUT` | `/api/listening/:id` | 更新听力资源 | `{ title?, description?, audioFilePath?, originalText?, subtitles?: [...] }` | `{ id }` |
| `DELETE` | `/api/listening/:id` | 删除听力资源 | — | `{ success: true }` |

### 8.2 文件上传

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| `POST` | `/api/upload/audio` | 上传音频文件 | `multipart/form-data` | `{ url, storedName }` |
| `POST` | `/api/upload/subtitle` | 上传字幕文件并解析 | `multipart/form-data` | `{ subtitles: [...] }` |

### 8.3 静态文件

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/uploads/audio/:filename` | 音频文件流 |

## 9. 字幕文件格式与解析

### 9.1 支持的格式

- **SRT** — SubRip Text 格式
- **VTT** — WebVTT 格式

### 9.2 SRT 解析逻辑

SRT 格式示例：
```
1
00:00:01,000 --> 00:00:05,000
Hello and welcome to the program.

2
00:00:05,000 --> 00:00:10,000
Today we are going to discuss climate change.
```

解析后转换为内部数据结构：
```typescript
interface Subtitle {
  lineIndex: number;
  startTime: number;     // 毫秒，如 1000
  endTime: number;       // 毫秒，如 5000
  englishText: string;
  chineseText?: string;
}
```

**解析规则：**
1. 按空行分割块
2. 每块第一行为序号（lineIndex）
3. 第二行为时间轴 `start --> end`
4. 后续行为文本内容（合并为多行）
5. 时间格式 `HH:MM:SS,mmm` 转换为毫秒整数

**双语字幕识别：**
- 单文件双语：假设奇数行是英文，偶数行是中文（或反之），通过 `zh-cn` 字符占比自动识别
- 更可靠的方式：分别上传英文字幕文件和中文字幕文件，后台合并

**V1 阶段简化：** 上传单个字幕文件时，整段文本存入 `englishText`，`chineseText` 可为空。后续支持分别上传中英字幕文件进行合并。

## 10. 后台管理页面

### 10.1 访问方式

- URL：`/admin`
- 无需登录认证，本地开发阶段直接暴露访问

### 10.2 页面布局

- **左侧（~300px）**：听力资源列表，显示标题 + 时长，点击选中
- **右侧**：编辑表单
  - 标题（文本输入）
  - 描述（文本输入）
  - 音频文件（文件选择 + 上传按钮，上传后显示文件名）
  - 字幕文件（文件选择 + 上传并解析按钮，解析后显示预览列表）
  - 原文内容（多行文本框）
  - 操作按钮：`保存` / `取消`

### 10.3 操作流程

1. 点击 `[+ 添加新听力]` → 右侧表单清空
2. 填写标题、描述、原文
3. 选择音频文件 → 点击上传 → 获得 `audioFilePath`
4. 选择字幕文件（SRT/VTT）→ 点击上传并解析 → 显示字幕预览
5. 点击保存 → `POST /api/listening`（新建）或 `PUT /api/listening/:id`（更新）
6. 点击已有资源 → 加载数据到表单进行编辑
7. 点击删除按钮 → `DELETE /api/listening/:id` → 刷新列表

## 11. 关键数据流

### 11.1 用户收听流程

```
[用户打开首页]
    ↓
GET /api/listening → 渲染左侧列表
    ↓
默认选中第一项（或 localStorage 记录的上次选择）
    ↓
GET /api/listening/:id → 加载音频 URL + 字幕 + 原文
    ↓
<audio> 元素加载音频，字幕组件渲染列表
    ↓
用户点击播放
    ↓
audio timeupdate → 计算当前字幕索引 → 高亮对应行 + 自动滚动
    ↓
用户切换字幕模式 → 组件重新渲染对应视图
    ↓
用户切换到阅读模式 → 显示 originalText，隐藏字幕列表
```

### 11.2 后台添加资源流程

```
[管理员打开 /admin]
    ↓
GET /api/listening → 渲染左侧资源列表
    ↓
填写表单信息
    ↓
上传音频 → POST /api/upload/audio → 返回 audioFilePath
    ↓
上传字幕 → POST /api/upload/subtitle → 解析并预览字幕
    ↓
点击保存 → POST /api/listening → 创建资源
    ↓
刷新列表，新资源出现在左侧
```

## 12. 开发环境配置

### 12.1 根目录 package.json

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
  },
  "devDependencies": {
    "pnpm": "^9.0.0"
  }
}
```

### 12.2 开发命令

```bash
# 根目录运行，同时启动前后端
pnpm dev

# 前端单独启动
cd packages/client && pnpm dev

# 后端单独启动
cd packages/server && pnpm dev
```

## 13. 边界情况与错误处理

| 场景 | 处理方式 |
|------|----------|
| 音频文件格式不支持 | 上传时后端校验 MIME type，返回 400 |
| 字幕文件解析失败 | 返回 400 + 错误信息，前端提示"字幕格式不正确" |
| 当前时间无对应字幕 | 不高亮任何行，保持上一行或清除高亮 |
| 字幕时间轴有重叠 | 按 lineIndex 排序，取第一个匹配的区间 |
| 浏览器不支持 `<audio>` | 极罕见，不做额外处理 |
| 音频加载失败 | 播放器显示错误状态，可重试 |
| 空列表（无任何听力资源） | 左侧显示"暂无听力材料，请前往后台添加" |

## 14. 未来扩展方向

以下功能在当前 V1 阶段被明确裁剪，但架构预留了扩展空间：

1. **单词本系统**：在右侧增加单词详情面板，点击字幕/原文中的单词可查询释义并加入单词本（需要 IndexedDB）
2. **拼写练习**：基于单词本的拼写测试功能
3. **用户认证**：后台管理增加管理员登录
4. **单词释义**：接入本地词典或外部 API
5. **播放历史**：记录用户收听进度
6. **字幕在线编辑**：后台支持直接修改字幕时间轴和文本

---

*文档版本：v1.0*  
*最后更新：2026-05-23*
