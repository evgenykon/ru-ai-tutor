<template>
  <div v-if="course" class="course-layout">
    <aside class="course-sidebar">
      <div class="course-title">{{ course.name }}</div>
      <nav>
        <div
          v-for="m in course.modules"
          :key="m.id"
          class="nav-item"
          :class="{ active: view === 'module' && activeModule === m.id }"
          @click="selectModule(m)"
        >
          <span>{{ m.name }}</span>
          <button class="nav-btn" @click.stop="removeModule(m.id)">✕</button>
        </div>
        <a class="nav-item add" @click="addModule">+ Модуль</a>
      </nav>
      <div class="nav-divider"></div>
      <a class="nav-item" :class="{ active: view === 'settings' }" @click="view = 'settings'">Настройки</a>
    </aside>

    <main class="course-main">
      <div class="course-topbar">
        <input v-model="course.name" @blur="updateCourse" class="top-input" />
        <select v-model="course.active" @change="updateCourse" class="top-select">
          <option :value="false">Черновик</option>
          <option :value="true">Опубликован</option>
        </select>
      </div>

      <div v-if="view === 'module' && activeModule" class="module-section">
        <div class="section-header">
          <input v-model="editingModule.name" @blur="saveModule(editingModule)" @keyup.enter="saveModule(editingModule)" class="title-input" />
          <button @click="saveModule(editingModule)" class="save-btn">Сохранить</button>
        </div>

        <div class="lessons">
          <div v-for="l in activeModule.lessons" :key="l.id" class="lesson-row">
            <input v-model="l.title" @blur="saveLesson(l)" @keyup.enter="saveLesson(l)" class="lesson-input" />
            <button class="small delete" @click="removeLesson(l.id)">✕</button>
          </div>
          <div class="add-lesson">
            <input v-model="newLessonTitle" placeholder="Название урока" @keyup.enter="addLesson" />
            <button @click="addLesson">+ Урок</button>
          </div>
        </div>
      </div>

      <div v-if="view === 'settings'" class="settings">
        <div class="field">
          <label>Описание</label>
          <textarea v-model="course.description" rows="3" @blur="updateCourse" />
        </div>
        <div class="field">
          <label>Ассистент</label>
          <select v-model="course.assistantId" @change="updateCourse">
            <option :value="null">Без ассистента</option>
            <option v-for="a in assistants" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
      </div>
    </main>
  </div>
  <div v-else-if="error" class="error">{{ error }}</div>
  <div v-else class="loading">Загрузка...</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const route = useRoute()

const course = ref<any>(null)
const assistants = ref<any[]>([])
const error = ref('')
const view = ref<'module' | 'settings'>('module')
const activeModule = ref<any>(null)
const newLessonTitle = ref('')
const editingModule = ref<any>({ name: '' })

async function fetchCourse() {
  try {
    const { data } = await $api.get(`/courses/${route.params.id}`)
    course.value = data.course
    const { data: a } = await $api.get('/assistants')
    assistants.value = a.assistants
    if (course.value.modules?.length) {
      activeModule.value = course.value.modules[0]
      editingModule.value = { ...course.value.modules[0] }
    }
  } catch {
    error.value = 'Курс не найден'
  }
}

function selectModule(m: any) {
  activeModule.value = m
  editingModule.value = { ...m }
  view.value = 'module'
}

async function updateCourse() {
  await $api.put(`/courses/${route.params.id}`, {
    name: course.value.name,
    description: course.value.description,
    active: course.value.active,
    assistantId: course.value.assistantId,
  })
}

async function addModule() {
  const name = prompt('Название модуля:')
  if (!name) return
  const { data } = await $api.post(`/courses/${route.params.id}/modules`, { name })
  course.value.modules.push(data.module)
  activeModule.value = data.module
  editingModule.value = { ...data.module }
  view.value = 'module'
}

async function saveModule(m: any) {
  await $api.put(`/modules/${m.id}`, { name: m.name })
}

async function removeModule(id: string) {
  await $api.delete(`/modules/${id}`)
  course.value.modules = course.value.modules.filter((m: any) => m.id !== id)
  if (activeModule.value?.id === id) {
    activeModule.value = course.value.modules[0] || null
    if (activeModule.value) editingModule.value = { ...activeModule.value }
  }
}

async function addLesson() {
  if (!newLessonTitle.value || !activeModule.value) return
  const { data } = await $api.post(`/modules/${activeModule.value.id}/lessons`, { title: newLessonTitle.value })
  activeModule.value.lessons.push(data.lesson)
  newLessonTitle.value = ''
}

async function saveLesson(l: any) {
  await $api.put(`/lessons/${l.id}`, { title: l.title })
}

async function removeLesson(id: string) {
  await $api.delete(`/lessons/${id}`)
  if (activeModule.value) {
    activeModule.value.lessons = activeModule.value.lessons.filter((l: any) => l.id !== id)
  }
}

fetchCourse()
</script>

<style scoped>
.course-layout { display: flex; gap: 0; height: calc(100vh - 3rem); margin: -1.5rem; }

.course-sidebar {
  width: 240px;
  background: #1e293b;
  color: white;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.course-title {
  padding: 0 1rem 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid #334155;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.1s;
}

.nav-item:hover { background: #334155; color: #e2e8f0; }
.nav-item.active { background: #334155; color: white; }
.nav-item.add { color: #60a5fa; font-size: 0.8rem; }

.nav-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0.125rem 0.25rem;
}

.nav-btn:hover { color: #f87171; }

.nav-divider { border-top: 1px solid #334155; margin: 0.5rem 1rem; }

.course-main {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: #f1f5f9;
}

.course-topbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.top-input {
  flex: 1;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
}

.top-select {
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.section-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.title-input {
  flex: 1;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
}

.save-btn {
  padding: 0.375rem 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.lessons { display: flex; flex-direction: column; gap: 0.375rem; }

.lesson-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.lesson-input {
  flex: 1;
  border: 1px solid transparent;
  padding: 0.25rem 0.375rem;
  border-radius: 2px;
  font-size: 0.875rem;
  background: transparent;
}

.lesson-input:focus {
  border-color: #2563eb;
  background: white;
  outline: none;
}

button.small.delete { background: transparent; color: #dc2626; border: none; cursor: pointer; font-size: 0.75rem; }

.add-lesson {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.add-lesson input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.add-lesson button {
  padding: 0.375rem 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.settings { max-width: 500px; }

.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }
.field textarea, .field select {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  box-sizing: border-box;
}
.field textarea { font-family: inherit; resize: vertical; }

.error { color: #dc2626; padding: 1rem; }
.loading { color: #6b7280; padding: 1rem; }
</style>
