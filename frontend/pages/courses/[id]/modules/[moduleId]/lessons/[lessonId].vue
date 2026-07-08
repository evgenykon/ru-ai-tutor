<template>
  <div v-if="lessonData" class="lesson-page">
    <NuxtLink :to="`/courses/${course.id}/modules/${route.params.moduleId}`" class="back-link">← Назад к модулю</NuxtLink>

    <div class="lesson-header">
      <input v-model="lessonData.title" @blur="saveLesson" @keyup.enter="saveLesson" class="title-input" />
      <button @click="saveLesson" class="save-btn">Сохранить</button>
    </div>

    <div v-if="loadingSteps" class="loading">Загрузка шагов...</div>

    <div v-else class="timeline">
      <div
        v-for="(step, idx) in steps"
        :key="step.id"
        class="timeline-step"
        :class="{ 'is-active': activeStepId === step.id }"
      >
        <div class="timeline-marker" @click="toggleStep(step.id)">
          <span class="step-num" :class="{ collapsed: activeStepId !== step.id }">{{ idx + 1 }}</span>
          <div class="timeline-line" />
        </div>

        <div class="step-card" @click="activeStepId !== step.id && toggleStep(step.id)">
          <div class="step-header">
            <input
              :value="step.title"
              @input="debounceUpdate(step.id, { title: ($event.target as any).value })"
              class="step-title-input"
              :placeholder="'Шаг ' + (idx + 1)"
              @click.stop
            />
            <span class="collapse-indicator">{{ activeStepId === step.id ? '▾' : '▸' }}</span>
            <button class="btn-icon danger" @click.stop="removeStep(step.id)" title="Удалить шаг">&#10005;</button>
          </div>

          <template v-if="activeStepId === step.id">
            <div class="step-section">
              <label class="field-label">Слайд</label>
              <div class="slide-type-selector">
                <label v-for="t in slideTypes" :key="t.value" class="slide-type-option">
                  <input
                    type="radio"
                    :value="t.value"
                    :checked="step.slideType === t.value"
                    @change="onSlideTypeChange(step, t.value)"
                  />
                  <span>{{ t.label }}</span>
                </label>
              </div>

              <div v-if="step.slideType === 'text'" class="slide-content-area">
                <textarea
                  :value="step.slideContent"
                  @input="debounceUpdate(step.id, { slideContent: ($event.target as any).value })"
                  class="markdown-input"
                  placeholder="Markdown текст слайда..."
                  rows="8"
                />
              </div>
              <div v-else class="slide-content-area">
                <label class="upload-zone" :class="{ 'has-file': step.slideContent }">
                  <input type="file" :accept="step.slideType === 'image' ? 'image/*' : '.pdf'" class="file-input" @change="uploadFile(step.id, $event)" />
                  <span v-if="!step.uploading" class="upload-placeholder">{{ step.slideContent ? 'Заменить файл' : 'Выберите файл' }}</span>
                  <span v-else class="upload-placeholder">Загрузка...</span>
                </label>
                <div v-if="step.slideContent" class="slide-preview">
                  <img v-if="step.slideType === 'image'" :src="step.slideContent" class="preview-image" />
                  <a v-else :href="step.slideContent" target="_blank" class="preview-link">Открыть PDF</a>
                  <button class="btn-icon remove-file" @click="updateStep(step.id, { slideContent: null })" title="Удалить файл">&#10005;</button>
                </div>
              </div>
            </div>

            <div class="step-section">
              <label class="field-label">Текст для ассистента (читка)</label>
              <textarea
                :value="step.assistantText"
                @input="debounceUpdate(step.id, { assistantText: ($event.target as any).value })"
                class="markdown-input"
                placeholder="Текст, который будет читать ассистент..."
                rows="6"
              />
            </div>
          </template>

          <div v-else class="step-collapsed-preview">
            <span v-if="step.title" class="preview-title">{{ step.title }}</span>
            <span v-if="step.slideType === 'text' && step.slideContent" class="preview-line">{{ truncate(step.slideContent, 80) }}</span>
            <span v-else-if="step.slideType !== 'text' && step.slideContent" class="preview-line">{{ step.slideType === 'image' ? '🖼 Изображение' : '📄 PDF' }}</span>
            <span v-else class="preview-line dim">Нет контента</span>
          </div>
        </div>
      </div>

      <div class="timeline-step timeline-add">
        <div class="timeline-marker">
          <span class="step-num add" @click="addStep">+</span>
        </div>
        <div class="step-card add-card">
          <button @click="addStep" class="add-step-btn">+ Добавить шаг</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="error">Урок не найден</div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()
const route = useRoute()

const course = inject('course') as any
const expanded = inject('expanded') as any

const steps = ref<any[]>([])
const loadingSteps = ref(true)
const activeStepId = ref<string | null>(null)

const slideTypes = [
  { value: 'text', label: 'Текст' },
  { value: 'image', label: 'Изображение' },
  { value: 'pdf', label: 'PDF' },
]

const lessonData = computed(() => {
  const mod = course.value?.modules?.find((m: any) => m.id === route.params.moduleId)
  return mod?.lessons?.find((l: any) => l.id === route.params.lessonId) || null
})

watch(course, (c) => {
  if (c) {
    const mod = c.modules?.find((m: any) => m.id === route.params.moduleId)
    if (mod) {
      expanded.value[mod.id] = true
    }
  }
}, { immediate: true })

const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

async function fetchSteps() {
  try {
    const { data } = await $api.get(`/lessons/${route.params.lessonId}/steps`)
    steps.value = data.steps || []
    if (steps.value.length && !activeStepId.value) {
      activeStepId.value = steps.value[0].id
    }
  } catch {
    steps.value = []
  } finally {
    loadingSteps.value = false
  }
}

function debounceUpdate(stepId: string, payload: Record<string, any>) {
  if (debounceTimers[stepId]) clearTimeout(debounceTimers[stepId])
  debounceTimers[stepId] = setTimeout(() => updateStep(stepId, payload), 600)
}

async function saveLesson() {
  if (!lessonData.value) return
  await $api.put(`/lessons/${lessonData.value.id}`, { title: lessonData.value.title })
}

function onSlideTypeChange(step: any, newType: string) {
  const payload: Record<string, any> = { slideType: newType }
  if (newType !== 'text' && step.slideType === 'text') {
    payload.slideContent = null
  }
  if (newType === 'text' && step.slideType !== 'text') {
    payload.slideContent = null
  }
  updateStep(step.id, payload)
}

function toggleStep(id: string) {
  activeStepId.value = activeStepId.value === id ? null : id
}

async function addStep() {
  const { data } = await $api.post(`/lessons/${route.params.lessonId}/steps`)
  steps.value.push(data.step)
  activeStepId.value = data.step.id
}

async function updateStep(stepId: string, payload: Record<string, any>) {
  await $api.put(`/steps/${stepId}`, payload)
  // Update local state for radio buttons to reflect immediately
  const step = steps.value.find((s: any) => s.id === stepId)
  if (step) Object.assign(step, payload)
}

async function removeStep(stepId: string) {
  await $api.delete(`/steps/${stepId}`)
  steps.value = steps.value.filter((s: any) => s.id !== stepId)
}

function truncate(text: string, len: number) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

async function uploadFile(stepId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const step = steps.value.find((s: any) => s.id === stepId)
  if (!step) return

  step.uploading = true

  const form = new FormData()
  form.append('file', file)

  try {
    const { data } = await $api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    await updateStep(stepId, { slideContent: data.url })
  } finally {
    step.uploading = false
    input.value = ''
  }
}

fetchSteps()
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

.lesson-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
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

.loading { color: #6b7280; padding: 1rem 0; font-size: 0.875rem; }

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-step {
  display: flex;
  gap: 0.75rem;
  min-height: 60px;
}

.timeline-step.is-active .timeline-marker { cursor: default; }

.step-num.collapsed {
  background: #e2e8f0;
  color: #64748b;
  cursor: pointer;
}

.step-num.collapsed:hover { background: #cbd5e1; }

.collapse-indicator {
  font-size: 0.65rem;
  color: #94a3b8;
  margin-left: 0.25rem;
}

.step-card { cursor: pointer; }

.timeline-step.is-active .step-card { cursor: default; }

.step-collapsed-preview {
  padding: 0.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.preview-title {
  font-size: 0.8rem;
  font-weight: 500;
  color: #1e293b;
}

.preview-line {
  font-size: 0.8125rem;
  color: #475569;
  line-height: 1.4;
}

.preview-line.dim { color: #94a3b8; }

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 28px;
  flex-shrink: 0;
}

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-num.add {
  background: #dbeafe;
  color: #2563eb;
  cursor: pointer;
}

.timeline-line {
  flex: 1;
  width: 2px;
  background: #d1d5db;
  min-height: 100%;
}

.timeline-step:last-child .timeline-line {
  display: none;
}

.step-card {
  flex: 1;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.step-title-input {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  border: none;
  background: transparent;
  padding: 0.15rem 0;
  outline: none;
  min-width: 0;
}

.step-title-input::placeholder { color: #94a3b8; }
.step-title-input:focus { border-bottom: 1px solid #2563eb; margin-bottom: -1px; }

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.btn-icon.danger { color: #94a3b8; }
.btn-icon.danger:hover { color: #dc2626; background: #fef2f2; }

.step-section {
  margin-bottom: 1rem;
}

.step-section:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.375rem;
  font-weight: 500;
}

.slide-type-selector {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.slide-type-option {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: #475569;
  cursor: pointer;
}

.slide-type-option input { accent-color: #2563eb; }

.slide-content-area {
  margin-top: 0.375rem;
}

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #fafafa;
}

.upload-zone:hover { border-color: #2563eb; background: #eff6ff; }

.upload-zone.has-file { border-color: #22c55e; background: #f0fdf4; }

.file-input { display: none; }

.upload-placeholder {
  font-size: 0.8125rem;
  color: #6b7280;
}

.upload-zone.has-file .upload-placeholder { color: #22c55e; }

.remove-file {
  margin-left: 0.5rem;
  vertical-align: middle;
}

.markdown-input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: #fafafa;
  font-family: monospace;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.slide-preview {
  margin-top: 0.5rem;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.preview-link {
  display: inline-block;
  color: #2563eb;
  font-size: 0.8125rem;
  text-decoration: underline;
}

.add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  background: #f8fafc;
}

.add-step-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #2563eb;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.add-step-btn:hover { color: #1d4ed8; }

.error { color: #dc2626; padding: 1rem; }
</style>
