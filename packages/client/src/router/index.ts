import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/listening" },
    {
      path: "/listening",
      name: "listening",
      component: () => import("../views/ListeningView.vue"),
    },
    {
      path: "/vocabulary",
      name: "vocabulary",
      component: () => import("../views/VocabularyView.vue"),
    },
    {
      path: "/grammar",
      name: "grammar",
      component: () => import("../views/GrammarView.vue"),
    },
    {
      path: "/translation",
      name: "translation",
      component: () => import("../views/TranslationView.vue"),
    },
  ],
});

export default router;
