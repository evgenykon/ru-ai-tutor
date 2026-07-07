<template>
  <div>
    <h1>API ключи</h1>

    <div class="card">
      <div class="card-header">Синтез речи</div>
      <div class="card-body">
        <div class="llm-selector">
          <label>Провайдер</label>
          <select v-model="selectedSpeech">
            <option value="yandex">Yandex AI Studio</option>
          </select>
        </div>

        <div v-if="yandex" style="margin-top: 0.75rem;">
          <div class="field">
            <label>API ключ</label>
            <div class="value">
              <code>{{ masked(yandex.keyValue) }}</code>
              <button class="small" @click="editYandex">Изменить</button>
              <button class="small delete" @click="removeYandex">Удалить</button>
            </div>
          </div>
          <div v-if="yandex.folderId" class="meta">Folder: {{ yandex.folderId }}</div>
          <div class="meta">Обновлён: {{ formatDate(yandex.updatedAt) }}</div>
        </div>
        <div v-else style="margin-top: 0.75rem;">
          <button class="small" @click="editingSpeech = true">Добавить ключ</button>
        </div>

        <div v-if="editingSpeech" class="edit-form">
          <input v-model="speechValue" placeholder="API ключ Yandex AI Studio" />
          <input v-model="speechFolderId" placeholder="Folder ID" class="folder-input" />
          <span class="hint"><a href="https://aistudio.yandex.ru" target="_blank">?</a> ID каталога в AI Studio (нажать на название каталога сверху)</span>
          <button @click="saveYandex">Сохранить</button>
          <button class="cancel" @click="editingSpeech = false">Отмена</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">LLM</div>
      <div class="card-body">
        <div class="llm-selector">
          <label>Провайдер</label>
          <select v-model="selectedLlm" @change="onLlmChange">
            <option v-for="p in llmProviders" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div v-if="currentLlm" class="field" style="margin-top: 0.75rem;">
          <label>API ключ</label>
          <div class="value">
            <code>{{ masked(currentLlm.keyValue) }}</code>
            <button class="small" @click="editLlm">Изменить</button>
            <button class="small delete" @click="removeLlm">Удалить</button>
          </div>
          <div v-if="currentLlm.folderId" class="meta" style="margin-top: 0.25rem;">Folder: {{ currentLlm.folderId }}</div>
        </div>
        <div v-else style="margin-top: 0.75rem;">
          <button class="small" @click="editLlm">Добавить ключ</button>
        </div>

        <div v-if="editingLlm" class="edit-form">
          <input v-model="llmValue" :placeholder="'API ключ ' + llmProviders.find(p => p.id === selectedLlm)?.name" />
          <input v-if="selectedLlm === 'yandex-ai'" v-model="llmFolderId" placeholder="Folder ID" class="folder-input" />
          <span v-if="selectedLlm === 'yandex-ai'" class="hint"><a href="https://aistudio.yandex.ru" target="_blank">?</a> ID каталога в AI Studio</span>
          <button @click="saveLlm">Сохранить</button>
          <button class="cancel" @click="editingLlm = false">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()

const yandex = ref<any>(null)
const llmKeys = ref<Record<string, any>>({})
const editingSpeech = ref(false)
const editingLlm = ref(false)
const speechValue = ref('')
const speechFolderId = ref('')
const llmValue = ref('')
const llmFolderId = ref('')
const selectedSpeech = ref('yandex')
const selectedLlm = ref('yandex-ai')

const llmProviders = [
  { id: 'yandex-ai', name: 'Yandex AI Studio', service: 'yandex-ai' },
  { id: 'proxyapi', name: 'ProxyAPI', service: 'proxyapi' },
]

const currentLlm = computed(() => {
  if (selectedLlm.value === 'yandex-ai') return llmKeys.value['yandex-ai'] || null
  return llmKeys.value[selectedLlm.value] || null
})

function masked(val: string) {
  if (!val) return ''
  if (val.length <= 8) return '*'.repeat(val.length)
  return val.slice(0, 4) + '*'.repeat(val.length - 8) + val.slice(-4)
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

function onLlmChange() {
  editingLlm.value = false
  llmValue.value = ''
}

async function fetchAll() {
  const { data } = await $api.get('/credentials')
  yandex.value = data.credentials.find((c: any) => c.service === 'yandex') || null
  for (const p of llmProviders) {
    llmKeys.value[p.id] = data.credentials.find((c: any) => c.service === p.service) || null
  }
}

function editYandex() {
  editingSpeech.value = true
  speechValue.value = yandex.value?.keyValue || ''
  speechFolderId.value = yandex.value?.folderId || ''
}

function editLlm() {
  editingLlm.value = true
  const cred = llmKeys.value[selectedLlm.value]
  llmValue.value = cred?.keyValue || ''
  llmFolderId.value = cred?.folderId || ''
}

async function saveYandex() {
  if (!speechValue.value) return
  const { data } = await $api.put('/credentials', { service: 'yandex', keyValue: speechValue.value, folderId: speechFolderId.value || null })
  yandex.value = data.credential
  speechValue.value = ''
  speechFolderId.value = ''
  editingSpeech.value = false
}

async function saveLlm() {
  if (!llmValue.value) return
  const provider = llmProviders.find(p => p.id === selectedLlm.value)
  if (!provider) return
  const body: any = { service: provider.service, keyValue: llmValue.value }
  if (selectedLlm.value === 'yandex-ai') body.folderId = llmFolderId.value || null
  const { data } = await $api.put('/credentials', body)
  if (selectedLlm.value === 'yandex-ai') {
    llmKeys.value['yandex-ai'] = data.credential
  } else {
    llmKeys.value[selectedLlm.value] = data.credential
  }
  llmValue.value = ''
  llmFolderId.value = ''
  editingLlm.value = false
}

async function removeYandex() {
  await $api.delete('/credentials/yandex')
  yandex.value = null
}

async function removeLlm() {
  const provider = llmProviders.find(p => p.id === selectedLlm.value)
  if (!provider) return
  await $api.delete(`/credentials/${provider.service}`)
  llmKeys.value[selectedLlm.value] = null
}

fetchAll()
</script>

<style scoped>
h1 { font-size: 1.25rem; margin: 0 0 1rem; }

.card {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
  overflow: hidden;
  max-width: 500px;
}

.card-header {
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.card-body { padding: 1rem; }

.field { margin-bottom: 0.5rem; }
.field label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }
.field .value { display: flex; align-items: center; gap: 0.5rem; }

.meta { font-size: 0.75rem; color: #9ca3af; }

button.delete { color: #dc2626; }

.edit-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.edit-form { flex-wrap: wrap; }
.folder-input { min-width: 200px; }
.hint { font-size: 0.7rem; color: #94a3b8; width: 100%; }
.hint a { color: #60a5fa; text-decoration: none; }
.edit-form input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.375rem 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

button.small { background: transparent; color: #2563eb; padding: 0; font-size: 0.75rem; }
button.small.delete { background: transparent; color: #dc2626; }
button.cancel { background: #6b7280; }

code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 2px; font-size: 0.75rem; }

.llm-selector { display: flex; align-items: center; gap: 0.5rem; }
.llm-selector label { font-size: 0.75rem; color: #6b7280; white-space: nowrap; }
.llm-selector select {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}
</style>
