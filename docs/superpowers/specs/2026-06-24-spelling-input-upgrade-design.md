# 拼写练习输入交互升级

## 目标

升级拼写练习的单词输入交互：移除下方可见文本框，用户直接逐字母输入到字母格中，填满后自动校验。

## 决策记录

| 决策点       | 选择                                                                                |
| ------------ | ----------------------------------------------------------------------------------- |
| 错误反馈     | 保持现有逻辑：标红提示 "Try again"，800ms 后 feedback 重置为 idle，不清空已输入内容 |
| 跳过方式     | 双通道：右箭头键 + 可见 "Skip →" 按钮                                               |
| 键盘操作     | 仅接受 a-z 字母键输入，Backspace 删除，不支持鼠标点击格定位，不接受其他字符         |
| 正确跳转延迟 | 450ms（原 1000ms）                                                                  |
| 键盘捕获机制 | 方案 A：保留隐藏 `<input>`（opacity:0）作为事件捕获器，字母格纯展示                 |
| 焦点防丢失   | 字母格容器绑定 `@click` 将焦点还给隐藏 input，防止误点网页其他区域后无法继续输入    |

## 涉及文件

- `packages/client/src/components/vocabulary/SpellingTab.vue`（唯一修改文件）

## 模板变更

### 隐藏 input

当前第 146-161 行的可见输入框改为隐藏态：

```html
<!-- 隐藏的键盘捕获器 -->
<input
  ref="inputRef"
  v-model="userInput"
  type="text"
  :maxlength="targetWord.length"
  class="absolute opacity-0 w-0 h-0 pointer-events-none"
  @keydown="onKeydown"
  :disabled="feedback === 'correct'"
  autocomplete="off"
  autocapitalize="off"
  spellcheck="false"
/>
```

移除外层 `<div class="flex justify-center mb-4">` 包裹和 `placeholder` 属性。

### 跳过按钮

当前第 171-173 行 skip hint 从纯文本 `<span>` 改为可点击按钮：

```html
<div v-if="feedback !== 'correct'" class="text-center mt-4">
  <button @click="skipWord" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
    Skip →
  </button>
</div>
```

### 焦点恢复

字母格容器绑定点击事件，用户误点网页其他区域后点击字母格即可恢复输入：

```html
<div class="flex justify-center gap-2 mb-6 flex-wrap" @click="inputRef?.focus()">
  <div v-for="i in targetWord.length" ...>{{ userInput[i - 1] || "" }}</div>
</div>
```

### 提示文字

反馈区 idle 状态文字从 `"Press Enter to check"` 改为 `"Type all letters to check"`。

## 脚本变更

### 自动校验触发

修改现有 `watch(userInput, ...)`，在字母填满时自动调用 `checkSpelling()`：

```typescript
watch(userInput, (val) => {
  const sanitized = val
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, targetWord.value.length);
  if (sanitized !== val) {
    userInput.value = sanitized;
    return; // 被过滤/截断时不触发校验，等待下次合法输入
  }
  // 所有格子填满 → 自动校验
  if (sanitized.length === targetWord.value.length && feedback.value !== "correct") {
    checkSpelling();
  }
});
```

关键点：仅在 sanitized 值无变化（即输入已是合法字母且未被截断）时才触发校验，避免过滤非字母字符时误触发。

### 移除 Enter 键处理

`onKeydown` 中删除 Enter 分支，只保留 ArrowRight 跳过：

```typescript
function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    skipWord();
  }
}
```

### 缩短正确跳转延迟

`checkSpelling()` 正确分支的 `setTimeout` 从 `1000` 改为 `450`：

```typescript
// 正确 → 450ms 后跳转
setTimeout(() => {
  currentIndex.value++;
  userInput.value = "";
  feedback.value = "idle";
  if (!isComplete.value) {
    fetchWordDefinition(words.value[currentIndex.value]);
    nextTick(() => inputRef.value?.focus());
  }
}, 450);
```

### 保持不变的部分

- `getBoxClass()` 逐字母标绿/标红逻辑不变
- `checkSpelling()` 错误分支（800ms 重置 feedback，不清空 input）不变
- `skipWord()` 逻辑不变
- `startPractice()` / `restart()` 不变
- 单词定义自动发音逻辑不变

## 用户交互流程

```
开始练习
  → 自动聚焦隐藏 input
  → 用户逐字母输入，字母格实时显示
  → 所有格子填满 → 自动校验
    ├─ 正确：字母格全绿 → 450ms → 自动跳到下一词
    └─ 错误：字母格标红/绿 → 800ms → feedback 恢复 idle
         → 用户按 Backspace 删除 → 重新输入 → 再次自动校验
  → 按 → 或点击 "Skip →" 跳过当前词
  → 全部完成 → 显示成绩统计
```
