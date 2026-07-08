<template>
  <div>
    <h1>Сессии</h1>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else-if="sessions.length === 0" class="empty">
      Нет активных сессий. Выберите курс на странице <NuxtLink to="/courses">Курсы</NuxtLink>.
    </div>

    <div v-else class="session-list">
      <div v-for="s in sessions" :key="s.id" class="session-card">
        <div class="session-info">
          <div class="session-course">{{ s.course?.name }}</div>
          <div class="session-progress">
            <template v-if="s.progress">
              Шаг {{ (s.progress.currentStepIndex ?? 0) + 1 }}
            </template>
            <template v-else>Не начата</template>
          </div>
          <div class="session-date">{{ formatDate(s.updatedAt) }}</div>
        </div>
        <button class="session-continue" title="Продолжить" @click="goToSession(s.id)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const router = useRouter()

const sessions = ref<any[]>([])
const loading = ref(true)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function goToSession(id: string) {
  router.push(`/session/${id}`)
}

async function fetchSessions() {
  loading.value = true
  try {
    const { data } = await $api.get('/sessions')
    sessions.value = data.sessions
  } catch {
    sessions.value = []
  } finally {
    loading.value = false
  }
}

fetchSessions()
</script>

<style scoped>
h1 { margin-bottom: 1rem; }

.loading { color: #6b7280; padding: 2rem 0; font-size: 0.875rem; }

.empty { color: #94a3b8; font-size: 0.875rem; }
.empty a { color: #2563eb; text-decoration: none; }
.empty a:hover { text-decoration: underline; }

.session-list { display: flex; flex-direction: column; gap: 0.5rem; }

.session-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  transition: box-shadow 0.1s;
}

.session-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.session-info { flex: 1; min-width: 0; }

.session-course {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-progress {
  font-size: 0.8125rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.session-date {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.session-continue {
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #2563eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.1s, border-color 0.1s;
}

.session-continue:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}
</style>
