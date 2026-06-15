# 听力材料收藏功能设计

## 概述

在左侧听力材料列表栏中增加用户收藏功能。每个材料项右侧显示收藏星标按钮（⭐），点击收藏/取消收藏。收藏数据存储在 `localStorage`，收藏材料始终置顶显示。收藏操作不触发材料切换。

## 需求确认

| 决策点           | 结论                                |
| ---------------- | ----------------------------------- |
| 收藏列表展示方式 | 收藏材料置顶，无需筛选标签切换      |
| 收藏按钮点击行为 | 仅收藏/取消收藏，不触发材料切换播放 |
| 存储方式         | localStorage                        |
| 状态管理方案     | Pinia Store（与项目现有架构一致）   |

## 架构

### 数据流

```
localStorage  ←→  favoritesStore (Set<number>)
                        ↓  computed sortedMaterials
                   ListeningView
                        ↓  props: materials, favoriteIds
                   ListeningList
                        ↑  emit: toggle-favorite(id)
                   ListeningView  →  favoritesStore.toggleFavorite(id)
```

### 改动文件

| 文件                                     | 操作     | 说明                                                    |
| ---------------------------------------- | -------- | ------------------------------------------------------- |
| `stores/favorites.ts`                    | **新增** | Pinia store，管理收藏 ID + localStorage 持久化          |
| `components/listening/ListeningList.vue` | **修改** | 新增星标按钮、favoriteIds prop、toggle-favorite emit    |
| `views/ListeningView.vue`                | **修改** | 引入 favoritesStore，计算 sortedMaterials，处理收藏事件 |

## Store 设计

### `stores/favorites.ts`

```ts
// 状态
favoriteIds: Set<number>    // 从 localStorage 加载

// Getters
isFavorite(id: number): boolean

// Actions
toggleFavorite(id: number): void   // 添加/移除，同步写 localStorage
```

**localStorage 键名**：`listen-english-favorites`

**存储格式**：JSON 数组 `[1, 5, 12]`

**持久化策略**：Store 初始化时从 localStorage 读取到 `Set`。每次 `toggleFavorite` 后立即同步写回 localStorage（操作不频繁，无需防抖）。

## 组件改动

### `ListeningList.vue`

**新增 Props**：

- `favoriteIds: Set<number>` — 收藏 ID 集合

**新增 Emits**：

- `toggle-favorite: [id: number]` — 点击星标向上传递

**模板改动**：每行从单 `<div>` 改为 flex 横向布局：

- 左侧：材料标题（保持 truncate）
- 右侧：星标按钮，`@click.stop` 阻止冒泡
- 已收藏：`★`（text-yellow-500），未收藏：`☆`（text-gray-300）
- 按钮 hover 时颜色加深

### `ListeningView.vue`

**新增**：

- 引入 `useFavoritesStore`
- 新增 computed `sortedMaterials`：

```ts
const sortedMaterials = computed(() => {
  const materials = listeningStore.materials;
  const favs = materials.filter((m) => favoritesStore.isFavorite(m.id));
  const rest = materials.filter((m) => !favoritesStore.isFavorite(m.id));
  return [...favs, ...rest];
});
```

- 处理 `@toggle-favorite` 事件 → `favoritesStore.toggleFavorite(id)`

### 不改动的文件

- `stores/listening.ts` — 材料数据不涉及收藏
- `api/index.ts` — 收藏是纯前端功能

## 边界情况

| 场景                              | 处理                                                                    |
| --------------------------------- | ----------------------------------------------------------------------- |
| localStorage 不可用（隐私模式等） | `try-catch` 包裹写入操作，静默忽略。内存状态正常，本次会话内收藏可用    |
| localStorage 数据格式异常         | 解析 JSON 后过滤非 number 项                                            |
| 空材料列表                        | 已有 "No materials" 提示，自然不显示星标                                |
| 材料被删除后收藏 ID 仍存在        | `sortedMaterials` 仅置顶当前 materials 中实际存在的项，失效 ID 自然忽略 |
| 性能                              | 材料数量几十到几百条，`Set.has()` 和数组过滤均为 O(n)，无性能问题       |

## 实现要点

1. 纯前端功能，无需服务端改动
2. 与现有 Pinia store 风格保持一致（`defineStore` + setup 语法）
3. 星标使用 emoji 字符（`★` `☆`），与播放器按钮风格一致
4. `@click.stop` 确保星标点击不冒泡到行级 `@click` 的 select 事件
