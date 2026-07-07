<template>
  <div v-if="user">
    <h1>{{ user.name || user.email }}</h1>

    <div class="card">
      <div class="row"><span class="label">Email</span><span>{{ user.email }}</span></div>
      <div class="row"><span class="label">Имя</span><span>{{ user.name || '—' }}</span></div>
      <div class="row"><span class="label">Статус</span><span>{{ user.active ? 'Активен' : 'Отключён' }}</span></div>
      <div class="row"><span class="label">Создан</span><span>{{ new Date(user.createdAt).toLocaleString() }}</span></div>
    </div>

    <div class="actions">
      <button @click="deleteAccount" class="delete-btn">Удалить аккаунт</button>
    </div>
  </div>
  <div v-else-if="error" class="error">{{ error }}</div>
  <div v-else class="loading">Загрузка...</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const store = useAuthStore()

const user = ref<any>(null)
const error = ref('')

async function fetchUser() {
  try {
    const { data } = await $api.get(`/users/${route.params.id}`)
    user.value = data.user
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Пользователь не найден'
  }
}

async function deleteAccount() {
  if (!confirm('Вы уверены? Это действие необратимо.')) return
  try {
    await $api.delete(`/users/${route.params.id}`)
    store.user = null
    router.push('/login')
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Ошибка удаления'
  }
}

fetchUser()
</script>

<style scoped>
h1 { font-size: 1.25rem; margin-bottom: 1rem; }

.card {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 1rem;
  max-width: 480px;
}

.row {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid #f1f5f9;
}

.row:last-child { border-bottom: none; }

.label { color: #6b7280; min-width: 80px; }

.actions { margin-top: 1.5rem; }

.delete-btn {
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
}

.delete-btn:hover { background: #b91c1c; }

.error { color: #dc2626; }
.loading { color: #6b7280; }
</style>
