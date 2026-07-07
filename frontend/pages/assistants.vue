<template>
  <div>
    <div class="header">
      <h1>Ассистенты</h1>
      <button @click="openCreate">+ Создать</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Название</th>
          <th>Модель</th>
          <th>Сервис</th>
          <th>Температура</th>
          <th>Статус</th>
          <th>Создан</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.name }}</td>
          <td><code>{{ item.model }}</code></td>
          <td>{{ item.service === 'yandex' ? 'Yandex' : 'Open Router' }}</td>
          <td>{{ item.temperature }}</td>
          <td>
            <span :class="['badge', item.active ? 'badge-ok' : 'badge-err']">
              {{ item.active ? 'Активен' : 'Отключён' }}
            </span>
          </td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <button class="small" @click="openEdit(item)">Ред.</button>
            <button class="small delete" @click="remove(item.id)">Удал.</button>
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

            <label>System prompt</label>
            <textarea v-model="form.prompt" rows="4" placeholder="Ты — полезный ассистент..." />

            <label>Модель</label>
            <input v-model="form.model" placeholder="gpt-4o" />

            <div class="row">
              <div>
                <label>Сервис</label>
                <select v-model="form.service">
                  <option value="open-router">Open Router</option>
                  <option value="yandex">Yandex</option>
                </select>
              </div>
              <div>
                <label>Температура</label>
                <input v-model.number="form.temperature" type="number" step="0.1" min="0" max="2" />
              </div>
              <div>
                <label>Статус</label>
                <select v-model="form.active">
                  <option :value="true">Активен</option>
                  <option :value="false">Отключён</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="save">Сохранить</button>
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
const form = reactive({
  name: '',
  prompt: '',
  model: '',
  service: 'open-router',
  temperature: 0.7,
  active: true,
})

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

async function fetchAll() {
  const { data } = await $api.get('/assistants')
  items.value = data.assistants
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.prompt = ''
  form.model = ''
  form.service = 'open-router'
  form.temperature = 0.7
  form.active = true
  showForm.value = true
}

function openEdit(item: any) {
  editing.value = item
  form.name = item.name
  form.prompt = item.prompt
  form.model = item.model
  form.service = item.service
  form.temperature = item.temperature
  form.active = item.active
  showForm.value = true
}

async function save() {
  if (!form.name || !form.prompt || !form.model) return

  if (editing.value) {
    await $api.put(`/assistants/${editing.value.id}`, form)
  } else {
    await $api.post('/assistants', form)
  }

  showForm.value = false
  await fetchAll()
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
.header button { padding: 0.375rem 0.75rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }

table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { text-align: left; padding: 0.625rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; }
th { background: #f9fafb; font-weight: 600; color: #374151; }
td { color: #4b5563; }

code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 2px; font-size: 0.75rem; }

.badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.badge-ok { background: #dcfce7; color: #166534; }
.badge-err { background: #fee2e2; color: #991b1b; }

button.small { background: transparent; color: #2563eb; padding: 0; font-size: 0.75rem; cursor: pointer; border: none; margin-right: 0.5rem; }
button.small.delete { color: #dc2626; }

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
.modal-actions button.cancel { background: #6b7280; }
</style>
