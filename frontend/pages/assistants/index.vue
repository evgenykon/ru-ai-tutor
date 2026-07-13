<template>
  <div>
    <div class="header">
      <h1>Ассистенты</h1>
      <div class="header-actions">
        <span v-if="missingKeys.length" class="warning">Не добавлены: {{ missingKeys.join(', ') }}</span>
        <button :disabled="!!missingKeys.length" @click="openCreate">+ Создать</button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Название</th>
          <th>LLM модель</th>
          <th>TTS модель</th>
          <th>Голос</th>
          <th>Статус</th>
          <th>Создан</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td><NuxtLink :to="`/assistants/${item.id}`" class="name-link">{{ item.name }}</NuxtLink></td>
          <td><code>{{ item.model || '—' }}</code></td>
          <td><code>{{ item.ttsModel || '—' }}</code></td>
          <td>{{ item.ttsVoice || '—' }}</td>
          <td>
            <span :class="['badge', item.active ? 'badge-ok' : 'badge-err']">
              {{ item.active ? 'Активен' : 'Отключён' }}
            </span>
          </td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <NuxtLink :to="`/assistants/${item.id}`" class="icon-btn" title="Редактировать">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </NuxtLink>
            <button class="icon-btn delete" title="Удалить" @click="remove(item.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <Teleport to="body">
      <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
        <div class="modal">
          <h2>{{ editing ? 'Редактировать' : 'Создать' }} ассистента</h2>
          <div class="form">
            <label>Название</label>
            <input v-model="form.name" placeholder="Помощник по математике" />


          </div>

          <div class="modal-actions">
            <button :disabled="saving" @click="save">Сохранить</button>
            <button class="cancel" @click="showForm = false">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()

const items = ref<any[]>([])

const showForm = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const missingKeys = ref<string[]>([])
const form = reactive({
  name: '',
})

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

async function fetchAll() {
  const [{ data }, credsRes] = await Promise.all([
    $api.get('/assistants'),
    $api.get('/credentials').catch(() => null),
  ])
  items.value = data.assistants
  const creds = credsRes?.data?.credentials || []
  const hasYandex = creds.some((c: any) => c.service === 'yandex')
  const hasLlm = creds.some((c: any) => ['yandex-ai', 'proxyapi'].includes(c.service))
  missingKeys.value = []
  if (!hasYandex) missingKeys.value.push('ключ синтеза речи')
  if (!hasLlm) missingKeys.value.push('ключ LLM')
}

async function openCreate() {
  editing.value = null
  form.name = ''
  showForm.value = true
}

async function save() {
  if (!form.name) return

  saving.value = true
  try {
    const payload = { ...form, temperature: 0.7, active: false }
    if (editing.value) {
      await $api.put(`/assistants/${editing.value.id}`, payload)
    } else {
      await $api.post('/assistants', payload)
    }
    showForm.value = false
    await fetchAll()
  } finally {
    saving.value = false
  }
}

async function remove(id: string) {
  await $api.delete(`/assistants/${id}`)
  await fetchAll()
}

fetchAll()
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.header h1 { font-size: 1.25rem; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 0.75rem; }
.header-actions button { padding: 0.375rem 0.75rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
.header-actions button:disabled { opacity: 0.4; cursor: default; }
.warning { font-size: 0.75rem; color: #dc2626; }

table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { text-align: left; padding: 0.625rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; }
th { background: #f9fafb; font-weight: 600; color: #374151; }
td { color: #4b5563; }

code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 2px; font-size: 0.75rem; }

.badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.badge-ok { background: #dcfce7; color: #166534; }
.badge-err { background: #fee2e2; color: #991b1b; }

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #64748b;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
}

.icon-btn:hover { background: #f1f5f9; color: #1e293b; }
.icon-btn.delete:hover { background: #fef2f2; color: #dc2626; }

.name-link { color: #2563eb; text-decoration: none; }
.name-link:hover { text-decoration: underline; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; z-index: 100;
}
.modal {
  background: white; border-radius: 8px; padding: 1.5rem; width: 520px; max-width: 90vw; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
}
.modal h2 { font-size: 1rem; margin: 0 0 1rem; }
.form label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; margin-top: 0.75rem; }
.form input, .form textarea, .form select {
  width: 100%; padding: 0.375rem 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.875rem;
  box-sizing: border-box;
}
.form textarea { font-family: inherit; resize: vertical; }

.row { display: flex; gap: 0.75rem; }
.row > div { flex: 1; }

.modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end; }
.modal-actions button { padding: 0.375rem 0.75rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
.modal-actions button:disabled { opacity: 0.5; }
.modal-actions button.cancel { background: #6b7280; }
</style>
