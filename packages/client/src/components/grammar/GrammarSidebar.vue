<template>
  <!-- Desktop: fixed sidebar -->
  <aside
    v-if="!isMobile"
    class="w-60 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto h-full"
  >
    <SidebarNav :sections="sections" :active-id="activeId" @navigate="onNavigate" />
  </aside>

  <!-- Mobile: drawer overlay -->
  <Teleport to="body">
    <div
      v-if="isMobile"
      class="fixed left-0 top-0 h-full z-40 transition-transform duration-200 ease-out"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
      @click.self="onClose"
    >
      <aside
        class="w-[80vw] max-w-[300px] border-r border-gray-200 bg-gray-50 overflow-y-auto h-full shadow-xl"
      >
        <SidebarNav :sections="sections" :active-id="activeId" @navigate="onNavigate" />
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { GrammarSection } from "../../data/grammar";

const props = defineProps<{
  sections: GrammarSection[];
  activeId: string;
  isMobile: boolean;
  drawerOpen: boolean;
}>();

const emit = defineEmits<{
  navigate: [id: string];
  close: [];
}>();

function onNavigate(id: string) {
  emit("navigate", id);
  if (props.isMobile) {
    emit("close");
  }
}

function onClose() {
  emit("close");
}
</script>

<script lang="ts">
import { defineComponent, h } from "vue";

/** Internal shared nav content, used by both desktop and mobile versions */
const SidebarNav = defineComponent({
  props: {
    sections: { type: Array, required: true },
    activeId: { type: String, required: true },
  },
  emits: ["navigate"],
  setup(props, { emit }) {
    return () =>
      h("nav", { class: "py-4 px-2" }, [
        h(
          "h2",
          { class: "text-sm font-bold text-gray-400 uppercase tracking-wider px-3 mb-3" },
          "目录导航",
        ),
        ...(props.sections as GrammarSection[]).map((section) =>
          h("div", { key: section.id, class: "mb-2" }, [
            h(
              "button",
              {
                onClick: () => emit("navigate", section.id),
                class: [
                  "w-full text-left px-3 py-1.5 text-sm font-semibold rounded transition-colors",
                  props.activeId === section.id
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-100",
                ],
              },
              section.title,
            ),
            h(
              "div",
              { class: "ml-3 mt-0.5 space-y-0.5" },
              section.subsections.map((sub: any) =>
                h(
                  "button",
                  {
                    key: sub.id,
                    onClick: () => emit("navigate", sub.id),
                    class: [
                      "w-full text-left px-3 py-1 text-xs rounded transition-colors",
                      props.activeId === sub.id
                        ? "text-blue-600 bg-blue-50 font-medium"
                        : "text-gray-500 hover:text-blue-600 hover:bg-gray-100",
                    ],
                  },
                  sub.title,
                ),
              ),
            ),
          ]),
        ),
      ]);
  },
});
</script>
