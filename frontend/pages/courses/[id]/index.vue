<template>
  <div>
    <div class="course-topbar">
      <div class="topbar-left">
        <input v-model="course.name" @blur="updateCourse" class="top-input" />
        <div class="slug-row">
          <input v-model="course.slug" class="slug-input" placeholder="my-course-slug" @input="slugCheck = 'idle'" />
          <button @click="generateSlug" class="slug-btn" title="Сгенерировать из названия">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
          <button @click="checkSlug" class="slug-btn" title="Проверить уникальность">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <span v-if="slugCheck === 'checking'" class="slug-status checking">...</span>
          <span v-else-if="slugCheck === 'available'" class="slug-status available">Свободен</span>
          <span v-else-if="slugCheck === 'taken'" class="slug-status taken">Занят</span>
        </div>
      </div>
      <div class="status-btns">
        <button :class="['status-btn', { active: !course.active }]" @click="course.active = false">Черновик</button>
        <button :class="['status-btn', { active: course.active }]" @click="course.active = true">Опубликован</button>
      </div>
    </div>

    <div class="settings">
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

    <div class="bottom-actions">
      <div v-if="saveError" class="save-error">{{ saveError }}</div>
      <button v-if="course.active && !course.archived" @click="startSession" class="start-btn">Запустить</button>
      <button @click="updateCourse" :disabled="!hasChanges" class="save-btn">Сохранить</button>
      <button @click="archiveCourse" class="archive-btn">Архив</button>
      <button @click="router.push('/courses')" class="back-btn">Назад</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const course = inject('course') as any
const assistants = ref<any[]>([])
const originalCourse = ref<any>(null)
const slugCheck = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const saveError = ref('')

const hasChanges = computed(() => {
  if (!originalCourse.value || !course.value) return false
  return originalCourse.value.name !== course.value.name
    || originalCourse.value.slug !== course.value.slug
    || originalCourse.value.description !== course.value.description
    || originalCourse.value.active !== course.value.active
    || originalCourse.value.assistantId !== course.value.assistantId
})

watch(course, (c) => {
  if (c && !originalCourse.value) {
    originalCourse.value = { ...c }
  }
}, { immediate: true })

onMounted(async () => {
  const { data: a } = await $api.get('/assistants')
  assistants.value = a.assistants
})

async function updateCourse() {
  saveError.value = ''
  try {
    const body: any = { description: course.value.description, active: course.value.active, assistantId: course.value.assistantId }
    body.slug = course.value.slug || null
    if (course.value.name !== originalCourse.value?.name) body.name = course.value.name
    await $api.put(`/courses/${route.params.id}`, body)
    originalCourse.value = { ...course.value }
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || e?.message || 'Ошибка сохранения'
  }
}

async function startSession() {
  const { data } = await $api.post(`/courses/${route.params.id}/sessions`)
  router.push(`/session/${data.session.id}`)
}

async function archiveCourse() {
  await $api.put(`/courses/${route.params.id}`, { archived: true })
  router.push('/courses')
}

function transliterate(text: string) {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
    ь: '', э: 'e', ю: 'yu', я: 'ya',
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z', И: 'I',
    Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T',
    У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch', Ъ: '', Ы: 'Y',
    Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
  }
  return text.split('').map(c => map[c] || c).join('').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function generateSlug() {
  if (course.value.name) {
    course.value.slug = transliterate(course.value.name)
    slugCheck.value = 'idle'
  }
}

async function checkSlug() {
  if (!course.value.slug) return
  slugCheck.value = 'checking'
  try {
    const { data } = await $api.get('/courses/check-slug', { params: { slug: course.value.slug, id: route.params.id } })
    slugCheck.value = data.available ? 'available' : 'taken'
  } catch {
    slugCheck.value = 'idle'
  }
}
</script>

<style scoped>
.course-topbar {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.topbar-left { flex: 1; display: flex; flex-direction: column; gap: 0.375rem; }

.top-input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
  box-sizing: border-box;
}

.status-btns { display: flex; gap: 0; }

.status-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  font-size: 0.8125rem;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.1s;
}

.status-btn:first-child { border-radius: 4px 0 0 4px; }
.status-btn:last-child { border-radius: 0 4px 4px 0; margin-left: -1px; }
.status-btn.active { background: #2563eb; color: white; border-color: #2563eb; z-index: 1; position: relative; }
.status-btn:not(.active):hover { background: #f1f5f9; }

.slug-row { display: flex; gap: 0.375rem; align-items: center; }

.slug-input {
  flex: 1;
  padding: 0.5rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  background: white;
  font-family: monospace;
}

.slug-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.375rem;
  cursor: pointer;
  color: #64748b;
  display: inline-flex;
  align-items: center;
}

.slug-btn:hover { background: #f1f5f9; color: #1e293b; }

.slug-status { font-size: 0.75rem; font-weight: 600; }
.slug-status.available { color: #16a34a; }
.slug-status.taken { color: #dc2626; }
.slug-status.checking { color: #6b7280; }

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

.bottom-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap;
  align-items: center;
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

.save-btn:disabled { background: #93c5fd; cursor: default; }

.archive-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.archive-btn:hover { background: #fef2f2; }

.start-btn {
  padding: 0.375rem 0.75rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
}

.start-btn:hover { background: #15803d; }

.back-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  color: #64748b;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.back-btn:hover { background: #f1f5f9; }

.save-error {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  font-size: 0.8125rem;
}
</style>
