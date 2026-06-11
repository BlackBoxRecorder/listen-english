# 英语语法页面设计

## 概述

在现有 Listen English 项目中新增英语语法查阅页面，以精炼摘要形式呈现完整英语语法体系。采用左侧固定目录导航 + 右侧滚动内容卡片的布局方案。

## 路由与导航

- 新增路由 `/grammar`，对应 `GrammarView.vue`
- `AppLayout.vue` 导航栏在 Vocabulary 后添加 "Grammar" router-link
- 纯前端静态内容，无需后端 API

## 页面布局

- **左侧目录栏**（宽 240px，固定定位，可滚动）
  - 5 大章节作为一级目录项（加粗）
  - 子章节作为二级目录项（缩进）
  - 点击跳转对应锚点，`IntersectionObserver` 自动高亮当前章节

- **右侧内容区**（flex-1，可滚动）
  - `max-w-4xl` 居中限宽
  - 章节标题作为分隔锚点
  - 子章节以卡片形式呈现

## 文件结构

```
packages/client/src/
├── data/
│   └── grammar.ts              # 语法内容数据
├── views/
│   └── GrammarView.vue         # 页面主视图
├── components/grammar/
│   ├── GrammarSidebar.vue      # 左侧目录导航
│   └── GrammarCard.vue         # 语法卡片组件
├── router/index.ts             # 新增 /grammar 路由（修改）
└── components/layout/AppLayout.vue  # 新增 Grammar 链接（修改）
```

## 数据结构

```typescript
interface GrammarSection {
  id: string;
  title: string;
  subsections: GrammarSubsection[];
}

interface GrammarSubsection {
  id: string;
  title: string;
  cards: GrammarCard[];
}

interface GrammarCard {
  title: string;
  rule?: string;
  table?: { headers: string[]; rows: string[][] };
  examples?: string[];
  notes?: string;
}
```

## 卡片样式

- 白色圆角卡片 `rounded-lg border shadow-sm`
- 标题 `text-lg font-semibold`
- 核心规则 `bg-blue-50 border-l-4 border-blue-400 p-3` 高亮
- 对照表格 条纹表格 `text-sm`
- 例句 `italic text-gray-600`，关键部分加粗
- 补充说明 `text-sm text-gray-500`

## 内容范围

覆盖 `英语语法全面研究.md` 全部 5 大章节：

1. 语法结构核心体系（句子成分、时态、体态、语态、语气）
2. 词法系统（名词、代词、动词、形容词与副词、介词、连词、感叹词、词素与构词法）
3. 句法系统（句子类型、短语结构、从句系统、特殊句型）
4. 语篇语法（段落结构、衔接手段、话语标记、信息结构）
5. 特定用途的语法（学术写作、商务英语、口语、跨用途对比）

每个子章节提取 2-5 张精炼卡片，总计约 80-100 张。

## 交互

- 目录点击 → `scrollIntoView({ behavior: 'smooth' })`
- 滚动内容 → `IntersectionObserver` 更新目录高亮
- 无搜索功能
