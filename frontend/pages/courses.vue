<template>
  <div>
    <div class="header">
      <h1>Курсы</h1>
      <button @click="openCreate">+ Создать</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Название</th>
          <th>Описание</th>
          <th>Статус</th>
          <th>Создан</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.description || '—' }}</td>
          <td>
            <span :class="['badge', item.active ? 'badge-ok' : 'badge-err']">
              {{ item.active ? 'Опубликован' : 'Черновик' }}
            </span>
          </td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <NuxtLink :to="`/courses/${item.id}`" class="small">Ред.</NuxtLink>
            <button class="small delete" @click="remove(item.id)">Удал.</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const router = useRouter()

const items = ref<any[]>([])

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

async function fetchAll() {
  const { data } = await $api.get('/courses')
  items.value = data.courses
}

async function openCreate() {
  const name = prompt('Название курса:')
  if (!name) return
  const { data } = await $api.post('/courses', { name })
  router.push(`/courses/${data.course.id}`)
}

async function remove(id: string) {
  await $api.delete(`/courses/${id}`)
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

.badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.badge-ok { background: #dcfce7; color: #166534; }
.badge-err { background: #fee2e2; color: #991b1b; }

a.small { background: transparent; color: #2563eb; padding: 0; font-size: 0.75rem; cursor: pointer; border: none; margin-right: 0.5rem; text-decoration: none; }
button.small { background: transparent; color: #2563eb; padding: 0; font-size: 0.75rem; cursor: pointer; border: none; margin-right: 0.5rem; }
button.small.delete { color: #dc2626; }
</style>
