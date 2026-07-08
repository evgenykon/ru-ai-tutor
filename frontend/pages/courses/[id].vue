<template>
  <div v-if="course" class="course-layout">
    <aside class="course-sidebar">
      <div class="course-title">{{ course.name }}</div>
      <nav>
        <div v-for="m in course.modules" :key="m.id">
          <div class="nav-item" :class="{ active: $route.params.moduleId === m.id }">
            <span class="nav-item-name">
              <span class="expand-icon" @click.stop="toggleModule(m.id)">{{ expanded[m.id] ? '▾' : '▸' }}</span>
              <NuxtLink :to="`/courses/${course.id}/modules/${m.id}`" class="nav-item-link">{{ m.name }}</NuxtLink>
            </span>
            <button class="nav-btn" @click.stop="removeModule(m.id)">&#10005;</button>
          </div>
          <div v-if="expanded[m.id]" class="lesson-list">
            <NuxtLink
              v-for="(l, li) in m.lessons"
              :key="l.id"
              :to="`/courses/${course.id}/modules/${m.id}/lessons/${l.id}`"
              class="lesson-item"
              :class="{ active: $route.params.lessonId === l.id }"
            >
              <span class="lesson-num">{{ li + 1 }}.</span> {{ l.title }}
            </NuxtLink>
          </div>
        </div>
        <a class="nav-item add" @click="showAddModule = true">+ Модуль</a>
      </nav>
      <div class="nav-divider"></div>
      <NuxtLink :to="`/courses/${course.id}`" class="nav-item" :class="{ active: !$route.params.moduleId }">
        Настройки
      </NuxtLink>
    </aside>

    <main class="course-main">
      <NuxtPage />
    </main>

    <Teleport to="body">
      <div v-if="showAddModule" class="modal-overlay" @click.self="showAddModule = false">
        <div class="modal">
          <h3 class="modal-title">Новый модуль</h3>
          <input v-model="newModuleName" placeholder="Название модуля" @keyup.enter="createModule" class="modal-input" ref="moduleInput" />
          <div class="modal-actions">
            <button class="btn-primary" @click="createModule" :disabled="!newModuleName.trim()">Создать</button>
            <button class="btn-cancel" @click="showAddModule = false">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <div v-else-if="error" class="error">{{ error }}</div>
  <div v-else class="loading">Загрузка...</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const course = ref<any>(null)
const error = ref('')
const expanded = ref<Record<string, boolean>>({})
const showAddModule = ref(false)
const newModuleName = ref('')
const moduleInput = ref<HTMLInputElement | null>(null)

provide('course', course)
provide('expanded', expanded)

async function fetchCourse() {
  try {
    const { data } = await $api.get(`/courses/${route.params.id}`)
    course.value = data.course
    if (data.course.modules?.length) {
      expanded.value[data.course.modules[0].id] = true
    }
  } catch {
    error.value = 'Курс не найден'
  }
}

function toggleModule(id: string) {
  expanded.value[id] = !expanded.value[id]
}

async function removeModule(id: string) {
  await $api.delete(`/modules/${id}`)
  course.value.modules = course.value.modules.filter((m: any) => m.id !== id)
}

async function createModule() {
  if (!newModuleName.value.trim()) return
  const { data } = await $api.post(`/courses/${route.params.id}/modules`, { name: newModuleName.value.trim() })
  course.value.modules.push(data.module)
  expanded.value[data.module.id] = true
  showAddModule.value = false
  newModuleName.value = ''
  router.push(`/courses/${route.params.id}/modules/${data.module.id}`)
}

fetchCourse()
</script>

<style scoped>
.course-layout { display: flex; gap: 0; height: calc(100vh - 3rem); margin: -1.5rem; }

.course-sidebar {
  width: 240px;
  background: #f1f5f9;
  color: #1e293b;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.course-title {
  padding: 0 1rem 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 1rem;
  color: #475569;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.1s;
  text-decoration: none;
}

.nav-item:hover { background: #e2e8f0; color: #1e293b; }
.nav-item.active { background: #e2e8f0; color: #0f172a; font-weight: 600; }
.nav-item.add { color: #2563eb; font-size: 0.8rem; }

.nav-item-name { display: flex; align-items: center; gap: 0.25rem; overflow: hidden; flex: 1; }

.nav-item-link {
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expand-icon { font-size: 0.6rem; color: #94a3b8; width: 12px; flex-shrink: 0; cursor: pointer; }
.expand-icon:hover { color: #475569; }

.lesson-list { background: #f8fafc; }

.lesson-item {
  display: block;
  padding: 0.375rem 1rem 0.375rem 2rem;
  font-size: 0.8125rem;
  color: #64748b;
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

.lesson-item:hover { background: #e2e8f0; color: #1e293b; }
.lesson-item.active { background: #dbeafe; color: #1d4ed8; font-weight: 500; }

.lesson-num { color: #94a3b8; font-weight: 400; }

.nav-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0.125rem 0.25rem;
  flex-shrink: 0;
}

.nav-btn:hover { color: #dc2626; }

.nav-divider { border-top: 1px solid #e2e8f0; margin: 0.5rem 1rem; }

.course-main {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: #f8fafc;
}

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; z-index: 100;
}

.modal {
  background: white; border-radius: 8px; padding: 1.5rem; width: 360px; max-width: 90vw; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
}

.modal-title { font-size: 1rem; margin: 0 0 1rem; }

.modal-input {
  width: 100%; padding: 0.5rem 0.625rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.875rem;
  box-sizing: border-box;
}

.modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end; }

.btn-primary {
  padding: 0.375rem 0.75rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;
}

.btn-primary:disabled { background: #93c5fd; cursor: default; }

.btn-cancel {
  padding: 0.375rem 0.75rem; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;
}

.error { color: #dc2626; padding: 1rem; }
.loading { color: #6b7280; padding: 1rem; }
</style>
