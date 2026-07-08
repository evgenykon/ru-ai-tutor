<template>
  <div v-if="moduleData" class="module-page">
    <NuxtLink :to="`/courses/${course.id}`" class="back-link">← Назад к курсу</NuxtLink>

    <div class="section-header">
      <input v-model="moduleData.name" @blur="saveModule" @keyup.enter="saveModule" class="title-input" />
      <button @click="saveModule" class="save-btn">Сохранить</button>
    </div>

    <label class="field-label">Описание модуля (Markdown)</label>
    <textarea
      v-model="moduleData.description"
      @blur="saveModule"
      class="markdown-input"
      placeholder="Markdown описание модуля..."
      rows="12"
    />

    <div class="section-subheader">Уроки</div>

    <div class="lessons">
      <div v-for="(l, li) in moduleData.lessons" :key="l.id" class="lesson-row">
        <NuxtLink :to="`/courses/${course.id}/modules/${moduleData.id}/lessons/${l.id}`" class="lesson-link">
          <span class="lesson-num">{{ li + 1 }}.</span> {{ l.title }}
        </NuxtLink>
        <button class="small delete" @click="removeLesson(l.id)">&#10005;</button>
      </div>
      <div class="add-lesson">
        <input v-model="newLessonTitle" placeholder="Название урока" @keyup.enter="addLesson" />
        <button @click="addLesson">+ Урок</button>
      </div>
    </div>
  </div>
  <div v-else class="error">Модуль не найден</div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const course = inject('course') as any
const expanded = inject('expanded') as any

const moduleId = computed(() => route.params.moduleId as string)
const moduleData = computed(() => {
  return course.value?.modules?.find((m: any) => m.id === moduleId.value) || null
})
const newLessonTitle = ref('')

watch(course, (c) => {
  if (c) {
    const mod = c.modules?.find((m: any) => m.id === moduleId.value)
    if (mod) {
      expanded.value[mod.id] = true
    }
  }
}, { immediate: true })

async function saveModule() {
  if (!moduleData.value) return
  await $api.put(`/modules/${moduleData.value.id}`, { name: moduleData.value.name, description: moduleData.value.description })
}

async function removeLesson(id: string) {
  await $api.delete(`/lessons/${id}`)
  if (moduleData.value) {
    moduleData.value.lessons = moduleData.value.lessons.filter((l: any) => l.id !== id)
  }
}

async function addLesson() {
  if (!newLessonTitle.value || !moduleData.value) return
  const { data } = await $api.post(`/modules/${moduleData.value.id}/lessons`, { title: newLessonTitle.value })
  moduleData.value.lessons.push(data.lesson)
  newLessonTitle.value = ''
  router.push(`/courses/${course.value.id}/modules/${moduleData.value.id}/lessons/${data.lesson.id}`)
}
</script>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover { text-decoration: underline; }

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

.field-label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; margin-top: 1rem; }

.markdown-input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  font-family: monospace;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.section-subheader {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid #e2e8f0;
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

.lesson-link {
  flex: 1;
  color: #1e293b;
  text-decoration: none;
  font-size: 0.875rem;
}

.lesson-link:hover { color: #2563eb; }

.lesson-num { color: #94a3b8; }

button.small.delete { background: transparent; color: #dc2626; border: none; cursor: pointer; font-size: 0.8rem; }

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

.error { color: #dc2626; padding: 1rem; }
</style>
