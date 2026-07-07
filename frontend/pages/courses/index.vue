<template>
  <div>
    <div class="header">
      <h1>Курсы</h1>
      <button @click="openCreate">+ Создать</button>
    </div>

    <input v-model="search" placeholder="Поиск по названию..." class="search-input" />

    <div class="filters">
      <button v-for="f in filterOptions" :key="f.key" :class="['filter-btn', { active: activeFilter === f.key }]" @click="setFilter(f.key)">{{ f.label }}</button>
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
            <span v-if="item.archived" class="badge badge-archived">Архив</span>
            <span v-else :class="['badge', item.active ? 'badge-ok' : 'badge-err']">
              {{ item.active ? 'Опубликован' : 'Черновик' }}
            </span>
          </td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td class="actions">
            <button v-if="item.archived" class="icon-btn restore" title="Восстановить" @click="restore(item.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <NuxtLink v-else :to="`/courses/${item.id}`" class="icon-btn" title="Редактировать">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </NuxtLink>
          </td>
        </tr>
        <tr v-if="!items.length">
          <td colspan="5" class="empty">Нет курсов</td>
        </tr>
      </tbody>
    </table>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="goPage(page - 1)">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">→</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const router = useRouter()

const items = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const limit = 20
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))
const search = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchAll() }, 300)
})

const filterOptions = [
  { key: 'all', label: 'Все' },
  { key: 'draft', label: 'Черновики' },
  { key: 'published', label: 'Опубликованные' },
  { key: 'archived', label: 'Архивные' },
]
const activeFilter = ref('all')

function setFilter(key: string) {
  activeFilter.value = key
  page.value = 1
  fetchAll()
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

async function fetchAll() {
  const params: Record<string, string> = { page: String(page.value), limit: String(limit) }
  if (search.value) params.q = search.value
  if (activeFilter.value === 'archived') params.archived = 'true'
  else if (activeFilter.value === 'draft') params.status = 'draft'
  else if (activeFilter.value === 'published') params.status = 'published'
  else params.archived = 'false'
  const { data } = await $api.get('/courses', { params })
  items.value = data.courses
  total.value = data.total
}

async function restore(id: string) {
  await $api.put(`/courses/${id}`, { archived: false, active: false })
  fetchAll()
}

async function openCreate() {
  const name = prompt('Название курса:')
  if (!name) return
  const { data } = await $api.post('/courses', { name })
  router.push(`/courses/${data.course.id}`)
}

function goPage(n: number) {
  page.value = n
  fetchAll()
}

fetchAll()
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.header h1 { font-size: 1.25rem; margin: 0; }
.header button { padding: 0.375rem 0.75rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }

.search-input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  box-sizing: border-box;
  margin-bottom: 0.75rem;
}

.filters { display: flex; gap: 0.25rem; margin-bottom: 1rem; }

.filter-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  color: #64748b;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.filter-btn:hover { background: #f1f5f9; }
.filter-btn.active { background: #2563eb; color: white; border-color: #2563eb; }

table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { text-align: left; padding: 0.625rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; }
th { background: #f9fafb; font-weight: 600; color: #374151; }
td { color: #4b5563; }
td.actions { white-space: nowrap; }

.empty { text-align: center; color: #9ca3af; padding: 2rem !important; }

.badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.badge-ok { background: #dcfce7; color: #166534; }
.badge-err { background: #fee2e2; color: #991b1b; }
.badge-archived { background: #f1f5f9; color: #64748b; }

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
.icon-btn.restore:hover { background: #f0fdf4; color: #16a34a; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1rem; }

.pagination button {
  padding: 0.375rem 0.75rem;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.pagination button:disabled { opacity: 0.4; cursor: default; }
.pagination button:not(:disabled):hover { background: #f1f5f9; }

.page-info { font-size: 0.8125rem; color: #6b7280; }
</style>
