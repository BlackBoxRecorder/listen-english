# VOA 自动同步 & Admin 下线设计文档

## 背景

项目已完成开发，准备部署为服务。当前存在以下问题：

1. **Admin 页面无认证授权保护**——任何能访问网站的人都可以增删改听力数据
2. **VOA 数据手动上传繁琐**——每次新增 VOA 素材需通过 admin 页面手动上传音频和字幕

### 目标

- 移除 Admin 页面及所有写操作 API 路由
- 新增每日 0 点自动扫描 VOA 目录的定时任务
- 检测到新 `.srt` 字幕文件时自动同步到数据库

## 关键决策

| 决策项          | 结论                                                                |
| --------------- | ------------------------------------------------------------------- |
| 同名判断        | 子目录名称 === `listening_materials.title`                          |
| 保留的 API 路由 | 仅 `GET /api/listening` 和 `GET /api/listening/:id`，其余写路由删除 |
| 音频文件处理    | 复制 mp3 到 `uploads/audio/` 目录，沿用现有静态服务路径             |
| VOA 目录路径    | 默认 `./VOA`（相对于服务端工作目录），可通过 `VOA_DIR` 环境变量覆盖 |
| 定时任务方式    | 方案 A：服务内直接操作 DB + 文件系统，零新增依赖                    |
| 调度实现        | 原生 `setTimeout` + `setInterval`，启动时立即执行首次扫描           |
| srt 解析        | 从 `subtitle.ts` 路由文件中提取 `parseSRT` 为共享工具模块           |

## 架构变更

### 文件变更清单

```
packages/server/src/
├── index.ts                  # 修改：移除 upload/write 路由注册；注册定时任务
├── utils/
│   └── subtitleParser.ts     # 新增：从 subtitle.ts 提取 parseSRT/parseVTT/parseTimeToMs
├── routes/
│   ├── listening.ts          # 修改：仅保留 GET / 和 GET /:id
│   ├── subtitle.ts           # 删除（解析逻辑已提取到 utils/subtitleParser.ts）
│   ├── file.ts               # 删除（upload 功能不再需要）
│   └── words.ts              # 不变
└── tasks/
    └── syncVoa.ts            # 新增：VOA 目录扫描 + DB 同步

packages/client/src/
├── router/index.ts           # 修改：移除 /admin 路由
├── api/index.ts              # 修改：移除 create/update/delete/upload 函数
├── views/AdminView.vue       # 删除
└── components/layout/
    └── AppLayout.vue         # 修改：移除导航栏 Admin 链接
```

### 服务端路由变更（index.ts）

**变更前：**

```ts
app.route("/api/listening", listeningRoutes); // CRUD 全有
app.route("/api/upload", fileRoutes); // audio upload
app.route("/api/upload", subtitleRoutes); // subtitle upload
app.route("/api/words", wordsRoutes);
```

**变更后：**

```ts
app.route("/api/listening", listeningRoutes); // 仅 GET /
app.route("/api/words", wordsRoutes);
// 定时任务在启动时注册
```

### listening.ts 路由变更

保留：

- `GET /api/listening` —— 列表（带 duration 字段）
- `GET /api/listening/:id` —— 详情 + 字幕

移除：

- `POST /api/listening`
- `PUT /api/listening/:id`
- `DELETE /api/listening/:id`

注意：当前 `GET /` 返回的 `audioFilePath` 字段未包含在 select 中，但前端 `ListeningItem` 接口不需要该字段（音频路径仅在 `GET /:id` 详情接口中返回），因此无需修改。

### api/index.ts 保留函数

仅保留：

- `fetchListenings()` —— GET /api/listening
- `fetchListening(id)` —— GET /api/listening/:id

移除：

- `createListening()`, `updateListening()`, `deleteListening()`
- `uploadAudio()`, `uploadSubtitle()`

## 核心模块设计

### utils/subtitleParser.ts（新增）

从当前 `routes/subtitle.ts` 中提取三个函数，保持不变：

```ts
export interface ParsedSubtitle {
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string;
  chineseText: string | null;
}

export function parseTimeToMs(timeStr: string): number { ... }
export function parseSRT(content: string): ParsedSubtitle[] { ... }
export function parseVTT(content: string): ParsedSubtitle[] { ... }
```

### tasks/syncVoa.ts（新增）

**职责：** 扫描 VOA 目录，对含有 `.srt` 文件且数据库无记录的目录执行自动同步。

**常量配置：**

```ts
const VOA_DIR = process.env.VOA_DIR || "./VOA";
const UPLOAD_DIR = "./uploads/audio";
```

**核心函数：**

```ts
// scanVoaDir - 主扫描逻辑
async function scanVoaDir(): Promise<void> {
  // 1. 读取 VOA_DIR 下所有子目录
  // 2. 对每个子目录：
  //    a. 排除以 . 开头的隐藏目录和非目录文件
  //    b. 查找 *.srt 文件，无则跳过
  //    c. title = 子目录名
  //    d. 查询 DB：db.select().from(listeningMaterials).where(eq(listeningMaterials.title, title))
  //    e. 已存在 → 跳过
  //    f. 查找 *.mp3 文件
  //    g. 有 mp3：复制到 uploads/audio/，audioFilePath = "/uploads/audio/" + 文件名
  //    h. 读 srt 内容，调用 parseSRT 解析
  //    i. DB 事务：
  //       - insert listeningMaterials ({ title, audioFilePath })
  //       - insert subtitles (多条，关联新插入的 listeningId)
  //    j. console.log 插入成功
  // 3. 单个目录失败用 try-catch 包裹，console.error 输出
}

// scheduleDaily - 启动定时调度
export function startSyncScheduler(): void {
  scanVoaDir(); // 启动时立即执行一次
  scheduleAtMidnight(scanVoaDir); // 每天 0 点执行
}
```

**调度实现（零依赖）：**

```ts
function scheduleAtMidnight(fn: () => void): void {
  const msUntilMidnight = (): number => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  };
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, msUntilMidnight());
}
```

**路径安全：** VOA_DIR 使用 `path.resolve` 解析为绝对路径；读取子目录时使用 `path.join(VOA_DIR, dirName)` 防止路径遍历。

**事务保证：** 插入 `listeningMaterials` 和对应 `subtitles` 在同一事务中，避免部分写入。

## 前端变更

### AppLayout.vue

移除导航栏中的：

```html
<router-link to="/admin" class="hover:text-blue-300 transition-colors">Admin</router-link>
```

### router/index.ts

移除：

```ts
{ path: "/admin", name: "admin", component: () => import("../views/AdminView.vue") }
```

### views/AdminView.vue

删除整个文件。

### ListeningList.vue

更新空状态提示文案（移除 Admin 引用）：

```
- No materials available. Add some in Admin.
+ No materials available.
```

### api/index.ts

移除 `createListening`, `updateListening`, `deleteListening`, `uploadAudio`, `uploadSubtitle` 函数。

## 边界场景与错误处理

| 场景                     | 处理                                                                          |
| ------------------------ | ----------------------------------------------------------------------------- |
| VOA 子目录无 `.srt` 文件 | 跳过（含 `.txt` 或 `.md` 但不含 `.srt` 的目录不同步）                         |
| VOA 子目录无 `.mp3` 文件 | 仍需处理（`audioFilePath` 置为空字符串，插入 `listeningMaterials` + 字幕）    |
| srt 解析失败             | try-catch，console.error，跳过该目录                                          |
| mp3 复制失败             | try-catch，console.error，但**继续处理**（仍插入材料 + 字幕，只是缺音频路径） |
| DB 插入失败              | try-catch，console.error，跳过该目录                                          |
| 子目录名包含特殊字符     | Node.js fs 原生支持，无影响                                                   |
| VOA_DIR 路径不存在       | 启动时检查，若不存在则 console.warn 并在后续每次扫描时重新检查                |
| 服务重启                 | 启动时立即触发一次全量扫描，确保最新数据                                      |
| 大目录（大量 srt 文件）  | 逐个同步，单目录失败不阻塞其他                                                |

## 未涉及

- 已有数据的更新/覆盖逻辑——仅处理新增，不检测 srt 内容变更
- 删除孤儿数据——数据库中已存在但 VOA 目录已删除的记录不做清理
- `.vtt` 文件同步——仅处理 `.srt` 文件
- Admin 历史上传的 `uploads/audio/` 中旧文件的清理
