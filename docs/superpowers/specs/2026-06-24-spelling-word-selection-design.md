# 拼写练习选词逻辑升级 — 设计文档

> 日期: 2026-06-24 | 状态: 待实现

## 概述

将拼写练习的单词来源从"固定取最近 20 个"升级为"用户手动勾选 + 练习数量下拉框 + 自动补足 fallback"的灵活方案。用户可在单词本中勾选想要练习的单词，同时在拼写练习页通过下拉框设定每轮练习数量。若勾选词数不足，自动用最近加入的单词补足；若单词本总量不足，全部纳入练习。

---

## 一、数据模型与存储

### 1.1 存储设计

在现有 `vocabularyStore` 的基础上新增一个独立的 localStorage key：

**`listen-english-spelling-config`**

```json
{
  "selectedWords": ["word1", "word2"],
  "practiceCount": 20
}
```

- `selectedWords`: 用户勾选的单词字符串数组（小写）
- `practiceCount`: 练习数量，可选 10/20/30/40/50，默认 20

与现有 `listen-english-vocabulary` key 分离，互不影响。

### 1.2 Store 新增项

位置: `packages/client/src/stores/vocabulary.ts`

| 新增项                    | 类型               | 说明                                                  |
| ------------------------- | ------------------ | ----------------------------------------------------- |
| `selectedWordSet`         | `ref<Set<string>>` | 内存中勾选集合                                        |
| `practiceCount`           | `ref<number>`      | 练习数量，默认 20                                     |
| `toggleWord(word)`        | 方法               | 切换某词的勾选，加入/移除 selectedWordSet，立即持久化 |
| `isWordSelected(word)`    | 方法               | 判断某词是否被勾选                                    |
| `selectAll()`             | 方法               | 全选单词本中所有词                                    |
| `deselectAll()`           | 方法               | 取消全选                                              |
| `selectedCount`           | `computed`         | 已勾选数量                                            |
| `getPracticeWords()`      | 方法               | 返回最终练习词列表（含 fallback 逻辑，见下）          |
| `loadSpellingConfig()`    | 私有方法           | 从 localStorage 加载配置                              |
| `persistSpellingConfig()` | 私有方法           | 持久化配置到 localStorage                             |

### 1.3 `getPracticeWords()` 核心逻辑

```
practiceWords = []
1. 取 selectedWordSet 中仍在 words 列表里的词（按 words 顺序） → practiceWords
2. 若 practiceWords.length < practiceCount:
   从 words 中按顺序取未被勾选的词补足，直到长度 = practiceCount
3. 若 words.length < practiceCount:
   全部返回（不去重）
4. 返回 practiceWords
```

---

## 二、UI 变更

### 2.1 WordList.vue（单词本列表）— 修改

文件: `packages/client/src/components/vocabulary/WordList.vue`

**改项:**

- 每行 `<li>` 最左侧新增 `<input type="checkbox">`，勾选状态绑定 `vocabularyStore.isWordSelected(entry.word)`
- 复选框点击事件: 调用 `vocabularyStore.toggleWord(entry.word)`，不触发单词选中（`@click.stop`）
- 列表顶部（单词计数旁）新增"全选"/"取消全选"两个小按钮:
  - 全选: 调用 `vocabularyStore.selectAll()`
  - 取消全选: 调用 `vocabularyStore.deselectAll()`
  - 仅在 `vocabularyStore.wordCount > 0` 时显示
- 复选框使用蓝色主题色（text-blue-600），与项目现有配色一致

### 2.2 SpellingTab.vue（拼写练习页）— 修改

文件: `packages/client/src/components/vocabulary/SpellingTab.vue`

改为两种视图状态，用组件内 `ref<boolean> isConfirmed` 控制。

#### 视图 A — 确认界面（isConfirmed = false）

**练习数量下拉框:**

- `<select>` 原生下拉框，选项 [10, 20, 30, 40, 50]，v-model 绑定 `vocabularyStore.practiceCount`
- 变更时自动持久化

**已选单词预览区:**

- 显示 `getPracticeWords()` 返回的词列表
- 用户勾选的词: 普通黑色文字
- 自动补充的词: 灰色文字 + 后缀标记"(auto)"
- 顶部显示总计数

**提示信息:**

- 勾选数 < 练习数 → 黄色背景提示: "You selected X words, Y more will be added from your recent vocabulary."
- 单词本总量 < 练习数 → 黄色背景提示: "Only X words available in your notebook — all will be practiced."
- 正常情况 → 灰色文字: "X words ready"
- 单词本为空 → 灰色文字: "No words in your notebook. Add words first."
- 选词数 < 3 → 红色文字: "Select at least 3 words to start."

**"开始练习"按钮:**

- 可用词数 ≥ 3 → 蓝色按钮，点击设置 `isConfirmed = true`
- 可用词数 < 3 → 灰色禁用按钮

#### 视图 B — 练习界面（isConfirmed = true）

与现有 SpellingTab 完全一致，仅数据源变更:

- `words` computed 改为从 `vocabularyStore.getPracticeWords()` 获取（仅取 word 字符串）
- 练习完成后，"Practice Again" 按钮点击时设置 `isConfirmed = false`，回到视图 A

---

## 三、文件变更范围

| 文件                                                        | 操作                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/client/src/stores/vocabulary.ts`                  | 修改 — 新增选词状态、练习数量、相关方法和持久化             |
| `packages/client/src/components/vocabulary/WordList.vue`    | 修改 — 每行加复选框，列表顶加全选/取消全选按钮              |
| `packages/client/src/components/vocabulary/SpellingTab.vue` | 修改 — 拆为确认/练习两种视图，数据源改为 getPracticeWords() |

**不改的文件:**

- `NotebookTab.vue` — WordList 的父组件，无需改动
- `VocabularyView.vue` — tab 切换逻辑不变
- 其他组件 — 无影响

---

## 四、边界情况与异常处理

| 场景                                 | 处理                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| 单词本为空                           | WordList 不显示复选框/全选按钮；SpellingTab 显示"单词本为空"提示                        |
| 用户勾选了词但后来从单词本删除了该词 | `removeWord` 时同步从 `selectedWordSet` 中移除；`getPracticeWords()` 自动跳过不存在的词 |
| 用户全删单词本（Clear All）          | 同时清空 `selectedWordSet` 并持久化                                                     |
| localStorage 数据损坏                | loadSpellingConfig 内 try-catch，损坏时回退默认值（空集合，practiceCount=20）           |
| 从旧版升级（无 spelling-config key） | 首次加载自动创建默认配置                                                                |
| 切换 tab 后回到拼写练习              | `isConfirmed` 是组件内 `ref`，组件卸载时销毁，再次进入即回到确认视图                    |

## 五、提示文案（英文）

| 场景                             | 文案                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Fallback 补充（勾选数 < 练习数） | "You selected X words, and Y more will be added from your recent vocabulary." |
| 单词本不足（总量 < 练习数）      | "Only X words in your notebook — all will be practiced."                      |
| 正常                             | "X words ready"                                                               |
| 单词本为空                       | "No words in your notebook. Add words first."                                 |
| 最少 3 个词                      | "Select at least 3 words to start."                                           |
