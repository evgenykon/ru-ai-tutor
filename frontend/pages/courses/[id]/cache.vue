<template>
  <div>
    <div class="topbar">
      <h2 class="page-title">Кэш TTS</h2>
    </div>

    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!items.length" class="empty">Кэш пуст</div>
    <div v-else class="cache-table-wrap">
      <table class="cache-table">
        <thead>
          <tr>
            <th>Файл</th>
            <th>Модель</th>
            <th>Голос</th>
            <th>Скорость</th>
            <th>Текст</th>
            <th>Размер</th>
            <th>Хиты</th>
            <th>Последнее обращение</th>
            <th>Защита</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="mono">{{ item.hash.slice(0, 12) }}...</td>
            <td>{{ item.model }}</td>
            <td>{{ item.voice }}</td>
            <td>{{ item.speed }}</td>
            <td class="text-preview">{{ textPreview(item.text) }}</td>
            <td>{{ formatSize(item.fileSize) }}</td>
            <td>{{ item.hitCount }}</td>
            <td>{{ formatDate(item.lastHitAt) }}</td>
            <td>
              <input
                type="checkbox"
                :checked="item.protected"
                @change="toggleProtected(item, $event)"
              />
            </td>
            <td>
              <button
                class="play-btn"
                :class="{ playing: playingId === item.id }"
                @click="togglePlay(item)"
              >
                {{ playingId === item.id ? '⏹' : '▶' }}
              </button>
            </td>
            <td>
              <button class="delete-btn" :disabled="item.protected" @click="deleteItem(item)">
                Удалить
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()
const route = useRoute()
const config = useRuntimeConfig()

definePageMeta({ middleware: 'auth', layout: 'default' })

interface CacheItem {
  id: string
  hash: string
  model: string
  voice: string
  speed: number
  text: string
  fileSize: number
  hitCount: number
  protected: boolean
  lastHitAt: string
}

const items = ref<CacheItem[]>([])
const loading = ref(true)
const error = ref('')
const playingId = ref<string | null>(null)
let currentAudio: HTMLAudioElement | null = null

function audioUrl(item: CacheItem): string {
  return `${config.public.baseUrl}/api/courses/${route.params.id}/tts-cache/${item.id}/file`
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  playingId.value = null
}

function togglePlay(item: CacheItem) {
  if (playingId.value === item.id) {
    stopAudio()
    return
  }
  stopAudio()
  const audio = new Audio(audioUrl(item))
  audio.onended = () => {
    if (playingId.value === item.id) {
      playingId.value = null
      currentAudio = null
    }
  }
  audio.onerror = () => {
    playingId.value = null
    currentAudio = null
  }
  currentAudio = audio
  playingId.value = item.id
  audio.play().catch(() => {
    playingId.value = null
    currentAudio = null
  })
}

function textPreview(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 80 ? clean.slice(0, 80) + '...' : clean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU')
}

async function fetchCache() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await $api.get(`/courses/${route.params.id}/tts-cache`)
    items.value = data.items
  } catch {
    error.value = 'Ошибка загрузки кэша'
  } finally {
    loading.value = false
  }
}

async function toggleProtected(item: CacheItem, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.checked
  try {
    await $api.patch(`/courses/${route.params.id}/tts-cache/${item.id}/protected`, { protected: value })
    item.protected = value
  } catch {
    target.checked = !value
  }
}

async function deleteItem(item: CacheItem) {
  if (item.protected) return
  try {
    await $api.delete(`/courses/${route.params.id}/tts-cache/${item.id}`)
    items.value = items.value.filter(i => i.id !== item.id)
  } catch {
    error.value = 'Ошибка удаления'
  }
}

fetchCache()
</script>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.loading, .error, .empty {
  padding: 1rem;
  font-size: 0.875rem;
}

.error { color: #dc2626; }
.empty { color: #64748b; }

.cache-table-wrap {
  overflow-x: auto;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.cache-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.cache-table th, .cache-table td {
  padding: 0.625rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.cache-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

.cache-table tr:hover {
  background: #f8fafc;
}

.mono {
  font-family: monospace;
  color: #64748b;
}

.text-preview {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #475569;
}

.play-btn {
  padding: 0.25rem 0.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  min-width: 2rem;
}

.play-btn:hover {
  background: #1d4ed8;
}

.play-btn.playing {
  background: #dc2626;
}

.delete-btn {
  padding: 0.25rem 0.5rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.delete-btn:disabled {
  background: #fca5a5;
  cursor: not-allowed;
}

input[type="checkbox"] {
  cursor: pointer;
}
</style>
