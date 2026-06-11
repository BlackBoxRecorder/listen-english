<template>
  <div class="h-full flex">
    <!-- 左侧目录 -->
    <GrammarSidebar :sections="grammarSections" :active-id="activeId" @navigate="scrollToSection" />

    <!-- 右侧内容区 -->
    <div ref="contentRef" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-8 py-8">
        <template v-for="section in grammarSections" :key="section.id">
          <!-- 章节标题 -->
          <h2 :id="section.id" class="text-2xl font-bold text-gray-800 mb-6 pt-2 scroll-mt-4">
            {{ section.title }}
          </h2>

          <template v-for="sub in section.subsections" :key="sub.id">
            <!-- 子章节标题 -->
            <h3 :id="sub.id" class="text-xl font-semibold text-gray-700 mb-4 mt-8 scroll-mt-4">
              {{ sub.title }}
            </h3>

            <!-- 卡片列表 -->
            <GrammarCard v-for="(card, i) in sub.cards" :key="i" :card="card" />
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { grammarSections } from "../data/grammar";
import GrammarSidebar from "../components/grammar/GrammarSidebar.vue";
import GrammarCard from "../components/grammar/GrammarCard.vue";

const contentRef = ref<HTMLElement | null>(null);
const activeId = ref("");

let observer: IntersectionObserver | null = null;

/** 收集所有可观察的锚点 id */
function getAllIds(): string[] {
  const ids: string[] = [];
  for (const section of grammarSections) {
    ids.push(section.id);
    for (const sub of section.subsections) {
      ids.push(sub.id);
    }
  }
  return ids;
}

/** 滚动到指定章节 */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

/** 初始化 IntersectionObserver */
function setupObserver() {
  const ids = getAllIds();
  // 默认高亮第一个章节
  if (ids.length > 0 && !activeId.value) {
    activeId.value = ids[0];
  }

  observer = new IntersectionObserver(
    (entries) => {
      // 找到最上方可见的 entry
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) {
        activeId.value = visible[0].target.id;
      }
    },
    {
      root: contentRef.value,
      rootMargin: "0px 0px -60% 0px",
      threshold: 0,
    },
  );

  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
}

onMounted(() => {
  setupObserver();
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>
