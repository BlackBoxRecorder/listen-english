<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-4">
    <!-- 卡片标题 -->
    <h4 class="text-lg font-semibold text-gray-800 mb-3">{{ card.title }}</h4>

    <!-- 核心规则 -->
    <div
      v-if="card.rule"
      class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3 text-sm text-gray-700 leading-relaxed"
    >
      {{ card.rule }}
    </div>

    <!-- 对照表格 -->
    <div v-if="card.table" class="overflow-x-auto mb-3">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th
              v-for="header in card.table.headers"
              :key="header"
              class="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700"
            >
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in card.table.rows" :key="i" :class="i % 2 === 1 ? 'bg-gray-50' : ''">
            <td
              v-for="(cell, j) in row"
              :key="j"
              class="px-3 py-2 border border-gray-200 text-gray-600"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 例句 -->
    <div v-if="card.examples?.length" class="mb-3 space-y-1">
      <p v-for="(ex, i) in card.examples" :key="i" class="italic text-gray-600 text-sm">
        {{ ex }}
      </p>
    </div>

    <!-- 补充说明 -->
    <p v-if="card.notes" class="text-sm text-gray-500">{{ card.notes }}</p>
  </div>
</template>

<script setup lang="ts">
import type { GrammarCard } from "../../data/grammar";

defineProps<{ card: GrammarCard }>();
</script>
