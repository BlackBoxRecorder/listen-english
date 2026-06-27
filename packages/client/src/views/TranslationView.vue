<template>
  <div class="flex flex-col h-full">
    <!-- Tab Bar -->
    <div class="flex justify-center border-b border-gray-200 shrink-0">
      <div class="flex gap-1 px-4">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="
            activeTab === tab.value
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          "
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab 1: Text Translation -->
    <div
      v-show="activeTab === 'translate'"
      class="flex-1 flex flex-col p-4 overflow-hidden max-w-5xl mx-auto w-full"
    >
      <div class="flex gap-4 flex-1 min-h-0">
        <!-- Left: Source -->
        <div class="flex-1 flex flex-col min-w-0">
          <label class="text-xs text-gray-500 mb-1.5 font-medium">Source Text</label>
          <textarea
            v-model="sourceText"
            placeholder="Enter text to translate..."
            class="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent break-words overflow-x-hidden"
            :disabled="isTranslating"
          ></textarea>
          <div class="flex justify-between items-center mt-1.5">
            <span v-if="translateError" class="text-xs text-red-500">{{ translateError }}</span>
            <span v-else class="text-xs text-gray-400">Auto-detect &amp; translate</span>
            <span
              class="text-xs font-mono"
              :class="
                sourceText.length > MAX_CHARS ? 'text-red-500 font-semibold' : 'text-gray-400'
              "
            >
              {{ sourceText.length }} / {{ MAX_CHARS }}
            </span>
          </div>
        </div>

        <!-- Right: Translation -->
        <div class="flex-1 flex flex-col min-w-0">
          <label class="text-xs text-gray-500 mb-1.5 font-medium">Translation</label>
          <textarea
            :value="translatedText"
            readonly
            placeholder="Translation will appear here..."
            class="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm resize-none bg-gray-50 text-gray-700 break-words overflow-x-hidden"
          ></textarea>
        </div>
      </div>

      <!-- Translate Button -->
      <div class="flex justify-center mt-4 shrink-0">
        <button
          @click="doTranslate"
          :disabled="!canTranslate || isTranslating"
          class="px-8 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          :class="
            canTranslate && !isTranslating
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          "
        >
          <svg
            v-if="isTranslating"
            class="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          {{ isTranslating ? "Translating..." : "Translate" }}
        </button>
      </div>
    </div>

    <!-- Tab 2: Markdown Reading -->
    <div v-show="activeTab === 'markdown'" class="flex-1 flex overflow-hidden">
      <!-- Input state -->
      <div v-if="!rendered" class="flex-1 flex flex-col items-center justify-center p-8">
        <p class="text-sm text-gray-600 mb-4">
          Enter or paste Markdown or plain text, click any word to look it up after rendering
        </p>
        <textarea
          v-model="mdInput"
          placeholder="Enter Markdown or plain text..."
          class="w-full max-w-2xl h-48 border border-gray-300 rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent break-words overflow-x-hidden"
        ></textarea>
        <button
          @click="renderMarkdown"
          :disabled="!mdInput.trim()"
          class="mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-all"
          :class="
            mdInput.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          "
        >
          Reading
        </button>
      </div>

      <!-- Rendered state -->
      <div v-else class="flex flex-1 min-w-0 max-w-6xl mx-auto w-full">
        <!-- Left: Rendered HTML -->
        <div class="flex-1 flex flex-col min-w-0 border-r border-gray-200">
          <div
            ref="mdContentRef"
            class="flex-1 overflow-y-auto p-6 markdown-body"
            v-html="renderedHtml"
            @click="onMdClick"
          ></div>
          <div class="flex justify-center py-3 border-t border-gray-100 bg-gray-50 shrink-0">
            <button
              @click="clearMarkdown"
              class="px-5 py-1.5 rounded-lg text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              ✕ Clear
            </button>
          </div>
        </div>

        <!-- Right: Word Card -->
        <div class="w-80 shrink-0 overflow-y-auto bg-gray-50">
          <InlineWordCard
            :word-name="selectedWord"
            :word-data="wordData"
            :loading="isLookingUp"
            :error-msg="lookupError"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import InlineWordCard from "../components/translation/InlineWordCard.vue";
import type { WordData } from "../types/word";
import { splitIntoSegments } from "../utils/wordSplitter";

type TabValue = "translate" | "markdown";

const tabs = [
  { value: "translate" as const, label: "Text Translation" },
  { value: "markdown" as const, label: "Markdown Reading" },
];

// ---- Tab 状态 ----
const activeTab = ref<TabValue>("translate");

// ---- Tab 1: Text Translation ----
const MAX_CHARS = 1000;
const sourceText = ref("");
const translatedText = ref("");
const isTranslating = ref(false);
const translateError = ref("");

const canTranslate = computed(() => {
  const trimmed = sourceText.value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_CHARS;
});

async function doTranslate() {
  if (!canTranslate.value || isTranslating.value) return;

  isTranslating.value = true;
  translateError.value = "";
  translatedText.value = "";

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sourceText.value }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    translatedText.value = data.translatedText;
  } catch (e) {
    translateError.value = e instanceof Error ? e.message : "Translation failed";
  } finally {
    isTranslating.value = false;
  }
}

// ---- Tab 2: Markdown Reading ----
const mdInput = ref("");
const rendered = ref(false);
const renderedHtml = ref("");
const selectedWord = ref("");
const wordData = ref<WordData | null>(null);
const isLookingUp = ref(false);
const lookupError = ref("");
let lookupRequestId = 0;

async function renderMarkdown() {
  if (!mdInput.value.trim()) return;

  try {
    // 动态导入 marked
    const { marked } = await import("marked");

    // 解析 Markdown → HTML
    const rawHtml = await marked.parse(mdInput.value);

    // 安全净化（保留 id/data-word 属性，避免静默删除合法内容）
    const { default: DOMPurify } = await import("dompurify");
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_ATTR: ["class", "id", "href", "target"],
    });

    // DOM 解析 → 单词拆分 → 包裹 clickable span
    const wrappedHtml = wrapWordsInHtml(cleanHtml);

    renderedHtml.value = wrappedHtml;
    rendered.value = true;
  } catch (e) {
    console.error("Markdown render failed:", e);
    lookupError.value = `Render failed: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

/**
 * 遍历 HTML 文本节点，为英文单词包裹可点击 span
 * 复⽤ wordSplitter.ts 的 splitIntoSegments 做单词拆分
 * @author yinnan
 */
function wrapWordsInHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 防御：DOMParser 解析失败时降级返回原始 HTML
  if (!doc.body) {
    console.error("wrapWordsInHtml: DOMParser failed to create body element");
    return html;
  }

  // 使用 doc 自身的 DOM API，避免跨文档 WrongDocumentError
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || "";
    const parent = textNode.parentNode;
    if (!parent) continue;

    const segments = splitIntoSegments(text);
    const fragment = doc.createDocumentFragment();

    for (const seg of segments) {
      if (seg.isWord) {
        const span = doc.createElement("span");
        span.className = "clickable-word";
        span.setAttribute("data-word", seg.text);
        span.textContent = seg.text;
        fragment.appendChild(span);
      } else {
        fragment.appendChild(doc.createTextNode(seg.text));
      }
    }

    parent.replaceChild(fragment, textNode);
  }

  return doc.body.innerHTML;
}

/** 事件委托：点击单词触发查词 */
async function onMdClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.classList.contains("clickable-word")) return;
  const word = target.getAttribute("data-word");
  if (!word) return;

  selectedWord.value = word;
  lookupWord(word);
}

/** 查词 API 调用 */
async function lookupWord(word: string) {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return;

  isLookingUp.value = true;
  lookupError.value = "";
  // 不清空 wordData，避免快速连续点击时卡片状态抖动

  const thisId = ++lookupRequestId;

  try {
    const res = await fetch(`/api/words/search?q=${encodeURIComponent(normalized)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (thisId !== lookupRequestId) return;

    if (json.success && json.data) {
      wordData.value = json.data;
      // 自动播放单词发音
      const audio = json.data?.phonetic?.audio;
      if (audio) {
        new window.Audio(audio).play();
      }
    } else {
      lookupError.value = "No definition found";
    }
  } catch (e) {
    if (thisId !== lookupRequestId) return;
    lookupError.value = e instanceof Error ? e.message : "Lookup failed";
  } finally {
    if (thisId === lookupRequestId) {
      isLookingUp.value = false;
    }
  }
}

function clearMarkdown() {
  rendered.value = false;
  renderedHtml.value = "";
  selectedWord.value = "";
  wordData.value = null;
  lookupError.value = "";
  mdInput.value = "";
}
</script>

<style scoped>
/* Textarea word-wrap */
textarea {
  overflow-x: hidden;
  word-wrap: break-word;
}

/* Markdown 渲染样式 */
.markdown-body {
  color: #24292e;
  line-height: 1.7;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin-bottom: 0.8em;
}

.markdown-body :deep(code) {
  background: #f6f8fa;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background: #f6f8fa;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #d0d7de;
  padding-left: 1em;
  color: #656d76;
  margin-bottom: 0.8em;
}

/* Clickable word */
.markdown-body :deep(.clickable-word) {
  cursor: pointer;
  padding: 1px 3px;
  border-radius: 3px;
  transition: background-color 0.15s;
}

.markdown-body :deep(.clickable-word:hover) {
  background-color: #dbeafe;
}
</style>
