# Listen English

英语听力训练应用，提供 VOA 英语新闻听力素材，支持中英文字幕同步显示、单词查词、单词本、拼写练习等功能，帮助用户通过真实语境提升英语听力水平。

## 技术栈

| 层级   | 技术                                                   |
| ------ | ------------------------------------------------------ |
| 前端   | Vue 3 + TypeScript + Pinia + Vue Router + Tailwind CSS |
| 构建   | Vite                                                   |
| 后端   | Hono (Node.js)                                         |
| ORM    | Drizzle ORM                                            |
| 数据库 | SQLite (better-sqlite3)                                |
| 包管理 | pnpm (monorepo)                                        |

## 项目结构

```
listen-english/
├── packages/
│   ├── client/          # 前端应用
│   └── server/          # 后端服务
│       ├── src/
│       │   ├── db/
│       │   │   ├── index.ts      # 数据库连接
│       │   │   └── schema.ts     # 表结构定义 (Drizzle ORM)
│       │   └── index.ts          # 服务入口
│       ├── drizzle/              # 迁移 SQL 文件 (drizzle-kit 自动生成)
│       └── drizzle.config.ts     # Drizzle Kit 配置
├── VOA/                 # VOA 听力素材目录
├── pnpm-workspace.yaml
└── package.json
```

## 数据库

项目使用 SQLite 数据库 (`packages/server/data.db`)，包含两张表：

### listening_materials — 听力素材表

| 字段            | 类型      | 说明           |
| --------------- | --------- | -------------- |
| id              | INTEGER   | 主键，自增     |
| title           | TEXT      | 素材标题       |
| audio_file_path | TEXT      | 音频文件路径   |
| duration        | INTEGER   | 音频时长（秒） |
| created_at      | TIMESTAMP | 创建时间       |
| updated_at      | TIMESTAMP | 更新时间       |

### subtitles — 字幕表

| 字段         | 类型    | 说明              |
| ------------ | ------- | ----------------- |
| id           | INTEGER | 主键，自增        |
| listening_id | INTEGER | 关联素材 ID，外键 |
| line_index   | INTEGER | 字幕行序号        |
| start_time   | INTEGER | 开始时间（毫秒）  |
| end_time     | INTEGER | 结束时间（毫秒）  |
| english_text | TEXT    | 英文字幕文本      |
| chinese_text | TEXT    | 中文字幕文本      |

> `subtitles.listening_id` 关联 `listening_materials.id`，删除听力素材时级联删除对应字幕。

## 数据库操作指南

### 前置条件

```bash
# 1. 安装依赖
pnpm install
```

### 修改表结构后生成迁移文件

当你修改 `packages/server/src/db/schema.ts` 中的表结构后，运行以下命令生成迁移 SQL 文件：

```bash
# 方式一：在项目根目录
pnpm db:generate

# 方式二：直接进入 server 目录
cd packages/server && pnpm db:generate
```

执行后，`packages/server/drizzle/` 目录下会生成新的 `.sql` 迁移文件。

### 执行迁移（创建/更新表）

生成迁移文件后，执行以下命令将表结构应用到 SQLite 数据库：

```bash
# 方式一：在项目根目录
pnpm db:migrate

# 方式二：直接进入 server 目录
cd packages/server && pnpm db:migrate
```

执行成功后，项目根目录会自动创建 `data.db` 文件，表结构即创建完成。

### 使用 Drizzle Studio 可视化管理数据

```bash
# 在项目根目录
pnpm db:studio
```

这会启动一个 Web 界面，可以在浏览器中直接查看和编辑数据库内容。

### 完整流程

```bash
# 1. 安装依赖
pnpm install

# 2. 生成迁移文件（schema.ts 有变更时）
pnpm db:generate

# 3. 执行迁移，创建 SQLite 数据库和表
pnpm db:migrate
```

> **提示**：如果你从未修改过 `schema.ts`，已有的迁移文件已经包含完整的表结构定义，直接执行 `pnpm db:migrate` 即可创建数据库和表。

## 启动项目

```bash
# 同时启动前端和后端开发服务器
pnpm dev
```

- 后端运行在 `http://localhost:3001`
- 前端运行在 `http://localhost:5173`
