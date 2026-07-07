<template>
  <div>
    <h1>API ключи</h1>

    <div class="card">
      <div class="card-header">Yandex Speech API</div>
      <div class="card-body">
        <div v-if="yandex">
          <div class="field">
            <label>API ключ</label>
            <div class="value">
              <code>{{ masked(yandex.keyValue) }}</code>
              <button class="small" @click="editing = 'yandex'">Изменить</button>
            </div>
          </div>
          <div class="meta">Обновлён: {{ formatDate(yandex.updatedAt) }}</div>
        </div>
        <div v-else>
          <button class="small" @click="editing = 'yandex'">Добавить ключ</button>
        </div>

        <div v-if="editing === 'yandex'" class="edit-form">
          <input v-model="yandexValue" placeholder="API ключ Yandex SpeechKit" />
          <button @click="save('yandex')">Сохранить</button>
          <button class="cancel" @click="editing = ''">Отмена</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Open Router API</div>
      <div class="card-body">
        <div v-if="openRouter">
          <div class="field">
            <label>API ключ</label>
            <div class="value">
              <code>{{ masked(openRouter.keyValue) }}</code>
              <button class="small" @click="editing = 'open-router'">Изменить</button>
            </div>
          </div>
          <div class="meta">Обновлён: {{ formatDate(openRouter.updatedAt) }}</div>
        </div>
        <div v-else>
          <button class="small" @click="editing = 'open-router'">Добавить ключ</button>
        </div>

        <div v-if="editing === 'open-router'" class="edit-form">
          <input v-model="openRouterValue" placeholder="API ключ Open Router" />
          <button @click="save('open-router')">Сохранить</button>
          <button class="cancel" @click="editing = ''">Отмена</button>
        </div>
      </div>
    </div>

    <h2 style="margin-top: 2rem;">Системные ключи</h2>
    <p class="hint">Ключи для внутренней аутентификации между сервисами.</p>

    <table v-if="apiKeys.length">
      <thead>
        <tr>
          <th>Название</th>
          <th>Префикс</th>
          <th>Статус</th>
          <th>Последнее использование</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="key in apiKeys" :key="key.id">
          <td>{{ key.name }}</td>
          <td><code>{{ key.prefix }}...</code></td>
          <td>{{ key.active ? 'Активен' : 'Отключён' }}</td>
          <td>{{ key.lastUsedAt ? formatDate(key.lastUsedAt) : '—' }}</td>
          <td><button class="delete" @click="removeKey(key.id)">Удалить</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()

const yandex = ref<any>(null)
const openRouter = ref<any>(null)
const apiKeys = ref<any[]>([])
const editing = ref('')
const yandexValue = ref('')
const openRouterValue = ref('')

function masked(val: string) {
  if (!val) return ''
  if (val.length <= 8) return '*'.repeat(val.length)
  return val.slice(0, 4) + '*'.repeat(val.length - 8) + val.slice(-4)
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

async function fetchAll() {
  const [credRes, keyRes] = await Promise.all([
    $api.get('/credentials'),
    $api.get('/api-keys'),
  ])
  yandex.value = credRes.data.credentials.find((c: any) => c.service === 'yandex') || null
  openRouter.value = credRes.data.credentials.find((c: any) => c.service === 'open-router') || null
  apiKeys.value = keyRes.data.keys
}

async function save(service: string) {
  const value = service === 'yandex' ? yandexValue.value : openRouterValue.value
  if (!value) return

  await $api.put('/credentials', { service, keyValue: value })

  if (service === 'yandex') {
    yandex.value = { service, keyValue: value, updatedAt: new Date().toISOString() }
    yandexValue.value = ''
  } else {
    openRouter.value = { service, keyValue: value, updatedAt: new Date().toISOString() }
    openRouterValue.value = ''
  }
  editing.value = ''
}

async function removeKey(id: string) {
  await $api.delete(`/api-keys/${id}`)
  await fetchAll()
}

fetchAll()
</script>

<style scoped>
h1 { font-size: 1.25rem; margin: 0 0 1rem; }
h2 { font-size: 1.1rem; margin: 2rem 0 0.25rem; }

.hint { font-size: 0.8rem; color: #6b7280; margin: 0 0 1rem; }

.card {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
  overflow: hidden;
}

.card-header {
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.card-body {
  padding: 1rem;
}

.field { margin-bottom: 0.5rem; }
.field label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }
.field .value { display: flex; align-items: center; gap: 0.5rem; }

.meta { font-size: 0.75rem; color: #9ca3af; }

.edit-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

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
button.delete { background: #dc2626; }
button.cancel { background: #6b7280; }

code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 2px; font-size: 0.75rem; }

table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { text-align: left; padding: 0.625rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; }
th { background: #f9fafb; font-weight: 600; color: #374151; }
td { color: #4b5563; }
</style>
