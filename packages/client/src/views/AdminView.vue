<template>
  <div class="flex h-full">
    <!-- Left: Resource list -->
    <div class="w-[300px] border-r border-gray-200 h-full overflow-y-auto bg-gray-50">
      <div class="p-3 flex justify-between items-center">
        <h3 class="text-sm font-semibold text-gray-600">Resources</h3>
        <button @click="createNew" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
          + Add New
        </button>
      </div>
      <ul>
        <li
          v-for="item in materials"
          :key="item.id"
          @click="selectItem(item.id)"
          class="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50"
          :class="{ 'bg-blue-100': editingId === item.id }"
        >
          <div class="text-sm font-medium truncate">{{ item.title }}</div>
        </li>
      </ul>
    </div>

    <!-- Right: Edit form -->
    <div class="flex-1 p-6 overflow-y-auto">
      <div v-if="isEditing" class="max-w-2xl space-y-4">
        <h2 class="text-lg font-bold">{{ editingId ? 'Edit' : 'New' }} Listening Material</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input v-model="form.title" class="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input v-model="form.description" class="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Audio File</label>
          <div class="flex gap-2 items-center">
            <input type="file" accept="audio/*" @change="onAudioSelect" />
            <button
              @click="handleUploadAudio"
              :disabled="!selectedAudioFile"
              class="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-green-700"
            >
              Upload
            </button>
          </div>
          <p v-if="form.audioFilePath" class="text-xs text-green-600 mt-1">{{ form.audioFilePath }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Subtitle File (.srt / .vtt)</label>
          <div class="flex gap-2 items-center">
            <input type="file" accept=".srt,.vtt" @change="onSubtitleSelect" />
            <button
              @click="handleUploadSubtitle"
              :disabled="!selectedSubtitleFile"
              class="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-green-700"
            >
              Upload &amp; Parse
            </button>
          </div>
          <div v-if="form.subtitles.length" class="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-xs bg-gray-50">
            <div v-for="s in form.subtitles" :key="s.lineIndex" class="py-0.5">
              {{ s.lineIndex }}. [{{ formatMs(s.startTime) }} - {{ formatMs(s.endTime) }}] {{ s.englishText }}
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Original Text</label>
          <textarea v-model="form.originalText" rows="6" class="w-full border rounded px-3 py-2" />
        </div>

        <div class="flex gap-3 pt-4">
          <button @click="handleSave" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Save
          </button>
          <button @click="cancelEdit" class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button
            v-if="editingId"
            @click="handleDelete"
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-auto"
          >
            Delete
          </button>
        </div>
      </div>

      <div v-else class="text-gray-400 text-center mt-20">
        Select a resource to edit or click "+ Add New"
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import * as api from '../api';

interface SubtitleItem {
  lineIndex: number;
  startTime: number;
  endTime: number;
  englishText: string;
  chineseText: string | null;
}

const materials = ref<any[]>([]);
const editingId = ref<number | null>(null);
const isEditing = ref(false);
const selectedAudioFile = ref<File | null>(null);
const selectedSubtitleFile = ref<File | null>(null);

const form = reactive({
  title: '',
  description: '',
  audioFilePath: '',
  originalText: '',
  subtitles: [] as SubtitleItem[],
});

onMounted(loadMaterials);

async function loadMaterials() {
  materials.value = await api.fetchListenings();
}

function createNew() {
  editingId.value = null;
  isEditing.value = true;
  resetForm();
}

function resetForm() {
  form.title = '';
  form.description = '';
  form.audioFilePath = '';
  form.originalText = '';
  form.subtitles = [];
  selectedAudioFile.value = null;
  selectedSubtitleFile.value = null;
}

async function selectItem(id: number) {
  editingId.value = id;
  isEditing.value = true;
  const data = await api.fetchListening(id);
  form.title = data.title;
  form.description = data.description || '';
  form.audioFilePath = data.audioFilePath;
  form.originalText = data.originalText || '';
  form.subtitles = data.subtitles || [];
}

function onAudioSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  selectedAudioFile.value = file ?? null;
}

function onSubtitleSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  selectedSubtitleFile.value = file ?? null;
}

async function handleUploadAudio() {
  if (!selectedAudioFile.value) return;
  const result = await api.uploadAudio(selectedAudioFile.value);
  form.audioFilePath = result.url;
}

async function handleUploadSubtitle() {
  if (!selectedSubtitleFile.value) return;
  const result = await api.uploadSubtitle(selectedSubtitleFile.value);
  form.subtitles = result.subtitles;
}

async function handleSave() {
  const payload = {
    title: form.title,
    description: form.description,
    audioFilePath: form.audioFilePath,
    originalText: form.originalText,
    subtitles: form.subtitles,
  };

  if (editingId.value) {
    await api.updateListening(editingId.value, payload);
  } else {
    await api.createListening(payload);
  }

  await loadMaterials();
  isEditing.value = false;
  editingId.value = null;
}

function cancelEdit() {
  isEditing.value = false;
  editingId.value = null;
  resetForm();
}

async function handleDelete() {
  if (!editingId.value) return;
  if (!confirm('Are you sure you want to delete this?')) return;
  await api.deleteListening(editingId.value);
  await loadMaterials();
  isEditing.value = false;
  editingId.value = null;
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
</script>
