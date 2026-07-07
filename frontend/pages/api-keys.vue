<template>
  <div>
    <div class="header">
      <h1>API ключи</h1>
      <button @click="showForm = true" v-if="!showForm">Создать ключ</button>
    </div>

    <div v-if="showForm" class="form">
      <input v-model="newName" placeholder="Название ключа" @keyup.enter="create" />
      <button @click="create">Создать</button>
      <button class="cancel" @click="cancel">Отмена</button>
    </div>

    <div v-if="newToken" class="token-reveal">
      <strong>Ключ создан:</strong>
      <code>{{ newToken }}</code>
      <p class="warning">Сохраните его — после закрытия он будет недоступен.</p>
    </div>

    <table v-if="keys.length">
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
        <tr v-for="key in keys" :key="key.id">
          <td>{{ key.name }}</td>
          <td><code>{{ key.prefix }}...</code></td>
          <td>{{ key.active ? 'Активен' : 'Отключён' }}</td>
          <td>{{ key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—' }}</td>
          <td><button class="delete" @click="remove(key.id)">Удалить</button></td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!showForm && !newToken">Нет ключей</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const keys = ref<any[]>([])
const showForm = ref(false)
const newName = ref('')
const newToken = ref('')

async function fetchKeys() {
  const { data } = await $api.get('/api-keys')
  keys.value = data.keys
}

async function create() {
  if (!newName.value) return
  const { data } = await $api.post('/api-keys', { name: newName.value })
  newToken.value = data.token
  newName.value = ''
  showForm.value = false
  await fetchKeys()
}

async function remove(id: string) {
  await $api.delete(`/api-keys/${id}`)
  await fetchKeys()
}

function cancel() {
  showForm.value = false
  newName.value = ''
}

fetchKeys()
</script>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.header h1 { font-size: 1.25rem; margin: 0; }
button { padding: 0.375rem 0.75rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
button.delete { background: #dc2626; }
button.cancel { background: #6b7280; }
.form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.form input { flex: 1; padding: 0.375rem 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.875rem; }
.token-reveal { background: #fef3c7; border: 1px solid #f59e0b; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
.token-reveal code { display: block; margin: 0.5rem 0; word-break: break-all; background: #fff; padding: 0.5rem; border-radius: 2px; }
.token-reveal .warning { color: #92400e; font-size: 0.75rem; margin: 0; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { text-align: left; padding: 0.625rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; }
th { background: #f9fafb; font-weight: 600; color: #374151; }
td { color: #4b5563; }
code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 2px; font-size: 0.75rem; }
</style>
