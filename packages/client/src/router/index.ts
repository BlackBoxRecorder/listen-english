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
  ],
});

export default router;
