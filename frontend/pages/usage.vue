<template>
  <div>
    <h1>Использование</h1>

    <div class="filters">
      <select v-model="filterService" @change="fetchData(1)">
        <option value="">Все сервисы</option>
        <option value="yandex">Yandex Speech API</option>
        <option value="open-router">Open Router API</option>
      </select>
    </div>

    <div class="summary">
      <div class="stat">
        <span class="stat-label">Всего запросов</span>
        <span class="stat-value">{{ total }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Всего токенов</span>
        <span class="stat-value">{{ totalTokens.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Общая стоимость</span>
        <span class="stat-value">${{ totalCost.toFixed(4) }}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Сервис</th>
          <th>Модель</th>
          <th>Токены</th>
          <th>Стоимость</th>
          <th>Статус</th>
          <th>Дата</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.service === 'yandex' ? 'Yandex' : 'Open Router' }}</td>
          <td>{{ item.model || '—' }}</td>
          <td>{{ item.tokens?.toLocaleString() || '—' }}</td>
          <td>{{ item.cost != null ? '$' + item.cost.toFixed(6) : '—' }}</td>
          <td>
            <span :class="['badge', item.status === 200 || item.status === 201 ? 'badge-ok' : 'badge-err']">{{ item.status }}</span>
          </td>
          <td>{{ formatDate(item.createdAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="fetchData(page - 1)">← Назад</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="fetchData(page + 1)">Вперёд →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const filterService = ref('')

const totalPages = computed(() => Math.ceil(total.value / limit.value))

const totalTokens = computed(() => items.value.reduce((s: number, i: any) => s + (i.tokens || 0), 0))
const totalCost = computed(() => items.value.reduce((s: number, i: any) => s + (i.cost || 0), 0))

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

async function fetchData(p: number) {
  page.value = p
  const params: any = { page: p, limit: limit.value }
  if (filterService.value) params.service = filterService.value

  const { data } = await $api.get('/usage', { params })
  items.value = data.items
  total.value = data.total
}

fetchData(1)
</script>

<style scoped>
h1 { font-size: 1.25rem; margin: 0 0 1rem; }

.filters { margin-bottom: 1rem; }
.filters select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  flex: 1;
  background: white;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { text-align: left; padding: 0.625rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; }
th { background: #f9fafb; font-weight: 600; color: #374151; }
td { color: #4b5563; }

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-ok { background: #dcfce7; color: #166534; }
.badge-err { background: #fee2e2; color: #991b1b; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.pagination button {
  padding: 0.375rem 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.pagination button:disabled { opacity: 0.5; cursor: default; }
</style>
