<template>
  <div>
  <div v-if="assistant">
    <div class="topbar">
      <input v-model="assistant.name" class="name-input" />
    </div>

    <div class="status-bar">
      <div class="status-btns">
        <button :class="['status-btn', { active: assistant.active }]" :disabled="!canActivate" @click="tryActivate">Активен</button>
        <button :class="['status-btn', { active: !assistant.active }]" @click="assistant.active = false">Отключён</button>
      </div>
      <div v-if="activateError" class="activate-error">{{ activateError }}</div>
    </div>

    <div class="layout">
      <div class="layout-left">
        <div class="field">
          <label>System prompt</label>
          <textarea v-model="assistant.prompt" rows="6"></textarea>
        </div>

        <div class="field">
          <label>LLM модель</label>
          <div class="model-picker">
            <input v-model="modelDisplay" placeholder="Поиск..." @focus="openModelPicker('llm')" @input="filterModels('llm')" />
            <div v-if="activePicker === 'llm'" class="model-dropdown">
              <div
                v-for="m in filteredLlm"
                :key="m.id"
                :class="['model-option', { selected: assistant.model === m.id }]"
                @click="selectModel('llm', m.id, m.name)"
              >{{ m.name }}</div>
              <div v-if="!filteredLlm.length" class="model-option empty">Нет моделей</div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Температура</label>
          <input v-model.number="assistant.temperature" type="number" step="0.1" min="0" max="2" class="short-input" style="width: 120px;" />
        </div>

        <div class="field">
          <label>Модель синтеза речи</label>
          <div class="model-picker">
            <input v-model="assistant.ttsModel" placeholder="Поиск..." @focus="openModelPicker('tts')" @input="filterModels('tts')" />
            <div v-if="activePicker === 'tts'" class="model-dropdown">
              <div
                v-for="m in filteredTts"
                :key="m.id"
                :class="['model-option', { selected: assistant.ttsModel === m.id }]"
                @click="selectModel('tts', m.id)"
              >{{ m.name }}</div>
              <div v-if="!filteredTts.length" class="model-option empty">Нет моделей</div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Пол ассистента</label>
          <div class="gender-btns">
            <button :class="['g-btn', { active: voiceGender === 'female' }]" @click="voiceGender = 'female'">Женский</button>
            <button :class="['g-btn', { active: voiceGender === 'male' }]" @click="voiceGender = 'male'">Мужской</button>
          </div>
        </div>

        <div class="field">
          <label>Голос</label>
          <div class="model-picker">
            <input v-model="voiceSearch" placeholder="Поиск голоса..." @focus="openVoicePicker" @input="filterVoices" />
            <div v-if="showVoicePicker" class="model-dropdown voice-dropdown">
              <div
                v-for="v in filteredVoices"
                :key="v.id"
                :class="['model-option', { selected: assistant.ttsVoice === v.id }]"
                @click="selectVoice(v.id)"
              >{{ v.name }} <span class="voice-lang">{{ v.gender === 'male' ? '♂' : '♀' }} {{ v.lang }}</span></div>
              <div v-if="!filteredVoices.length" class="model-option empty">Нет голосов</div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Скорость речи <strong>{{ (assistant.speechRate ?? 1).toFixed(1) }}x</strong></label>
          <input v-model.number="assistant.speechRate" type="range" step="0.1" min="0.1" max="3" class="slider" />
        </div>

        <div class="field">
          <button :disabled="ttsTesting" class="test-btn" @click="testTts">{{ ttsTesting ? 'Генерация...' : '🔊 Test' }}</button>
        </div>
      </div>

      <div class="layout-right">
        <div class="media-row">
          <div class="upload-block">
            <span class="upload-block-label">Аватар</span>
            <div class="avatar-zone" @click="showAvatarModal = true">
              <img v-if="assistant.avatar" :src="avatarsMap[assistant.avatar]?.url" class="avatar-img" />
              <div v-else class="upload-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                <span>Выбрать</span>
              </div>
            </div>
            <button v-if="assistant.avatar" type="button" class="block-reset" @click="assistant.avatar = null">Сбросить</button>
          </div>

          <div class="upload-block">
            <span class="upload-block-label">Видео «Молчание»</span>
            <label class="video-zone" :class="{ attached: assistant.silenceVideo }">
              <input type="file" accept="video/mp4,video/webm,video/ogg" style="display:none" @change="uploadVideo($event, 'silenceVideo')" />
              <video v-if="assistant.silenceVideo" :src="assistant.silenceVideo" muted preload="auto" class="video-preview" @click.prevent="toggleVideo($event)" />
              <div v-else class="upload-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Нажмите для загрузки</span>
              </div>
            </label>
            <button v-if="assistant.silenceVideo" type="button" class="block-reset" @click="assistant.silenceVideo = null">Сбросить</button>
          </div>

          <div class="upload-block">
            <span class="upload-block-label">Видео «Разговор»</span>
            <label class="video-zone" :class="{ attached: assistant.talkVideo }">
              <input type="file" accept="video/mp4,video/webm,video/ogg" style="display:none" @change="uploadVideo($event, 'talkVideo')" />
              <video v-if="assistant.talkVideo" :src="assistant.talkVideo" muted preload="auto" class="video-preview" @click.prevent="toggleVideo($event)" />
              <div v-else class="upload-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Нажмите для загрузки</span>
              </div>
            </label>
            <button v-if="assistant.talkVideo" type="button" class="block-reset" @click="assistant.talkVideo = null">Сбросить</button>
          </div>
        </div>

        <div class="media-row">
          <div class="upload-block">
            <span class="upload-block-label">Видео «Похвала»</span>
            <label class="video-zone" :class="{ attached: assistant.praiseVideo }">
              <input type="file" accept="video/mp4,video/webm,video/ogg" style="display:none" @change="uploadVideo($event, 'praiseVideo')" />
              <video v-if="assistant.praiseVideo" :src="assistant.praiseVideo" muted preload="auto" class="video-preview" @click.prevent="toggleVideo($event)" />
              <div v-else class="upload-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Нажмите для загрузки</span>
              </div>
            </label>
            <button v-if="assistant.praiseVideo" type="button" class="block-reset" @click="assistant.praiseVideo = null">Сбросить</button>
          </div>

          <div class="upload-block">
            <span class="upload-block-label">Видео «Отрицание»</span>
            <label class="video-zone" :class="{ attached: assistant.denialVideo }">
              <input type="file" accept="video/mp4,video/webm,video/ogg" style="display:none" @change="uploadVideo($event, 'denialVideo')" />
              <video v-if="assistant.denialVideo" :src="assistant.denialVideo" muted preload="auto" class="video-preview" @click.prevent="toggleVideo($event)" />
              <div v-else class="upload-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Нажмите для загрузки</span>
              </div>
            </label>
            <button v-if="assistant.denialVideo" type="button" class="block-reset" @click="assistant.denialVideo = null">Сбросить</button>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-actions">
      <div v-if="saveError" class="save-error">{{ saveError }}</div>
      <button :disabled="!hasChanges || saving" class="save-btn" @click="save">{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
      <button class="back-btn" @click="router.push('/assistants')">Назад</button>
    </div>
  </div>

  <div v-else-if="error" class="error">{{ error }}</div>
  <div v-else class="loading">Загрузка...</div>

  <Teleport to="body">
    <div v-if="showAvatarModal" class="modal-overlay" @click.self="showAvatarModal = false">
      <div class="modal">
        <h2>Выберите аватар</h2>
        <div class="avatar-grid">
          <div
            v-for="a in filteredAvatars"
            :key="a.id"
            :class="['avatar-option', { selected: assistant.avatar === a.id }]"
            @click="selectAvatar(a.id)"
          >
            <img :src="a.url" class="avatar-thumb" />
            <span>{{ a.name }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-close-btn" @click="showAvatarModal = false">Закрыть</button>
        </div>
      </div>
    </div>
  </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'default' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const assistant = ref<any>(null)
const original = ref<any>(null)
const error = ref('')
const saveError = ref('')
const ttsTesting = ref(false)
const activateError = ref('')
const activePicker = ref<'llm' | 'tts' | null>(null)
const modelDisplay = ref('')
const allModels = ref<{ id: string; name: string; service: string }[]>([])

const canActivate = computed(() => {
  return assistant.value?.name?.trim()
    && assistant.value?.model?.trim()
    && assistant.value?.ttsModel?.trim()
    && assistant.value?.ttsVoice?.trim()
    && assistant.value?.avatar
})

function tryActivate() {
  activateError.value = ''
  const missing: string[] = []
  if (!assistant.value?.name?.trim()) missing.push('имя')
  if (!assistant.value?.model?.trim()) missing.push('LLM модель')
  if (!assistant.value?.ttsModel?.trim()) missing.push('модель синтеза речи')
  if (!assistant.value?.ttsVoice?.trim()) missing.push('голос')
  if (!assistant.value?.avatar) missing.push('аватар')
  if (missing.length) {
    activateError.value = 'Заполните: ' + missing.join(', ')
    return
  }
  assistant.value.active = true
}
const showVoicePicker = ref(false)
const voiceGender = ref('female')
const voiceSearch = ref('')
const allVoices = ref<{ id: string; name: string; gender: string; lang: string }[]>([])
const filteredVoices = ref<{ id: string; name: string; gender: string; lang: string }[]>([])
const llmModelList = ref<{ id: string; name: string }[]>([])
const ttsModelList = ref<{ id: string; name: string }[]>([])
const filteredLlm = ref<{ id: string; name: string }[]>([])
const filteredTts = ref<{ id: string; name: string }[]>([])

function filterModels(type: 'llm' | 'tts') {
  const list = type === 'llm' ? llmModelList : ttsModelList
  const q = (type === 'llm' ? modelDisplay.value : assistant.value.ttsModel || '').toLowerCase()
  const filtered = type === 'llm' ? filteredLlm : filteredTts
  filtered.value = list.value.filter(m => m.name.toLowerCase().includes(q))
}

async function openModelPicker(type: 'llm' | 'tts') {
  activePicker.value = type
  const list = type === 'llm' ? llmModelList : ttsModelList
  const filtered = type === 'llm' ? filteredLlm : filteredTts
  if (!list.value.length) {
    const { data } = await $api.get('/yandex-models', { params: { type: type === 'tts' ? 'tts' : undefined } })
    list.value = data.models
    if (type === 'llm') allModels.value = data.models
  }
  filtered.value = list.value
  if (type === 'llm' && assistant.value?.model) {
    const found = allModels.value.find(m => m.id === assistant.value.model)
    if (found) modelDisplay.value = found.name
  }
}

function filterVoices() {
  const q = voiceSearch.value.toLowerCase()
  filteredVoices.value = allVoices.value.filter(v => {
    if (v.gender !== voiceGender.value) return false
    return v.id.toLowerCase().includes(q) || v.name.toLowerCase().includes(q)
  })
}

watch(voiceGender, () => {
  assistant.value.ttsVoice = ''
  voiceSearch.value = ''
  assistant.value.avatar = null
  filterVoices()
})

async function openVoicePicker() {
  showVoicePicker.value = true
  activePicker.value = null
  if (!allVoices.value.length) {
    const { data } = await $api.get('/yandex-voices')
    allVoices.value = data.voices
  }
  filterVoices()
}

function selectVoice(id: string) {
  assistant.value.ttsVoice = id
  const v = allVoices.value.find(x => x.id === id)
  voiceSearch.value = v?.name || id
  showVoicePicker.value = false
}

function selectModel(type: 'llm' | 'tts', id: string, name?: string) {
  if (type === 'llm') {
    assistant.value.model = id
    assistant.value.service = 'yandex-ai'
    modelDisplay.value = name || id
  } else assistant.value.ttsModel = id
  activePicker.value = null
}

function closePicker(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.model-picker')) {
    activePicker.value = null
    showVoicePicker.value = false
  }
}

onMounted(() => document.addEventListener('click', closePicker))
onUnmounted(() => document.removeEventListener('click', closePicker))
const saving = ref(false)

const avatars = ref<{ id: string; name: string; url: string; gender?: string }[]>([])
const filteredAvatars = computed(() => {
  const g = assistant.value.ttsVoice ? allVoices.value.find(v => v.id === assistant.value.ttsVoice)?.gender : voiceGender.value
  return avatars.value.filter(a => !a.gender || a.gender === (g || voiceGender.value))
})
const avatarsMap = computed(() => {
  const map: Record<string, { name: string; url: string }> = {}
  for (const a of avatars.value) map[a.id] = a
  return map
})
const showAvatarModal = ref(false)

async function fetchAvatars() {
  try {
    const { data } = await $api.get('/avatars')
    avatars.value = data.avatars
  } catch { /* empty */ }
}

function selectAvatar(id: string) {
  assistant.value.avatar = assistant.value.avatar === id ? null : id
  showAvatarModal.value = false
}

const videoUploading = ref<'silenceVideo' | 'talkVideo' | 'praiseVideo' | 'denialVideo' | null>(null)

function toggleVideo(e: MouseEvent) {
  const video = e.currentTarget as HTMLVideoElement
  if (video.paused) { video.play() } else { video.pause() }
}

function preloadVideos() {
  if (!assistant.value) return
  const urls = [assistant.value.silenceVideo, assistant.value.talkVideo, assistant.value.praiseVideo, assistant.value.denialVideo].filter(Boolean)
  for (const url of urls) {
    const el = document.createElement('video')
    el.preload = 'auto'
    el.muted = true
    el.src = url
    el.load()
  }
}

async function uploadVideo(event: Event, field: 'silenceVideo' | 'talkVideo' | 'praiseVideo' | 'denialVideo') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  videoUploading.value = field
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await $api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    assistant.value[field] = data.url
  } catch {
    saveError.value = 'Ошибка загрузки видео'
  } finally {
    videoUploading.value = null
    input.value = ''
  }
}

const hasChanges = computed(() => {
  if (!original.value || !assistant.value) return false
  return original.value.name !== assistant.value.name
    || original.value.prompt !== assistant.value.prompt
    || original.value.model !== assistant.value.model
    || original.value.temperature !== assistant.value.temperature
    || original.value.avatar !== assistant.value.avatar
    || original.value.silenceVideo !== assistant.value.silenceVideo
    || original.value.talkVideo !== assistant.value.talkVideo
    || original.value.praiseVideo !== assistant.value.praiseVideo
    || original.value.denialVideo !== assistant.value.denialVideo
    || original.value.speechRate !== assistant.value.speechRate
    || original.value.active !== assistant.value.active
    || original.value.ttsModel !== assistant.value.ttsModel
    || original.value.ttsVoice !== assistant.value.ttsVoice
    || original.value.service !== assistant.value.service
})

async function fetchAssistant() {
  try {
    const { data } = await $api.get(`/assistants/${route.params.id}`)
    assistant.value = { ...data.assistant, speechRate: data.assistant.speechRate ?? 1.0, ttsModel: data.assistant.ttsModel || '', service: data.assistant.service || 'open-router', silenceVideo: data.assistant.silenceVideo || null, talkVideo: data.assistant.talkVideo || null, praiseVideo: data.assistant.praiseVideo || null, denialVideo: data.assistant.denialVideo || null }
    if (data.assistant.model) {
      const { data: modelsData } = await $api.get('/yandex-models')
      allModels.value = modelsData.models
      const found = allModels.value.find(m => m.id === data.assistant.model)
      modelDisplay.value = found?.name || data.assistant.model.split('/').pop() || data.assistant.model
    }
    if (data.assistant.ttsVoice) {
      const { data: voicesData } = await $api.get('/yandex-voices')
      allVoices.value = voicesData.voices
      voiceSearch.value = allVoices.value.find((v: any) => v.id === data.assistant.ttsVoice)?.name || data.assistant.ttsVoice
    }
    original.value = { name: data.assistant.name, prompt: data.assistant.prompt, model: data.assistant.model, ttsModel: data.assistant.ttsModel, ttsVoice: data.assistant.ttsVoice, temperature: data.assistant.temperature, avatar: data.assistant.avatar, silenceVideo: data.assistant.silenceVideo || null, talkVideo: data.assistant.talkVideo || null, praiseVideo: data.assistant.praiseVideo || null, denialVideo: data.assistant.denialVideo || null, speechRate: data.assistant.speechRate ?? 1.0, active: data.assistant.active, service: data.assistant.service || 'open-router' }
    preloadVideos()
  await fetchAvatars()
  } catch {
    error.value = 'Ассистент не найден'
  }
}

async function save() {
  saveError.value = ''
  saving.value = true
  try {
    await $api.put(`/assistants/${route.params.id}`, {
      name: assistant.value.name,
      prompt: assistant.value.prompt,
      model: assistant.value.model,
      service: assistant.value.service || 'open-router',
      temperature: assistant.value.temperature,
      active: assistant.value.active,
      avatar: assistant.value.avatar || null,
      silenceVideo: assistant.value.silenceVideo || null,
      talkVideo: assistant.value.talkVideo || null,
      praiseVideo: assistant.value.praiseVideo || null,
      denialVideo: assistant.value.denialVideo || null,
      speechRate: assistant.value.speechRate ?? null,
      ttsModel: assistant.value.ttsModel || null,
      ttsVoice: assistant.value.ttsVoice || null,
    })
    original.value = { name: assistant.value.name, prompt: assistant.value.prompt, model: assistant.value.model, ttsModel: assistant.value.ttsModel, ttsVoice: assistant.value.ttsVoice, temperature: assistant.value.temperature, avatar: assistant.value.avatar, speechRate: assistant.value.speechRate, active: assistant.value.active, service: assistant.value.service || 'open-router' }
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function testTts() {
  if (!assistant.value?.ttsVoice) return
  ttsTesting.value = true
  try {
    const res = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        text: 'Привет, я ваш ассистент.',
        voice: assistant.value.ttsVoice,
        speed: assistant.value.speechRate ?? 1,
      }),
    })
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    audio.play()
  } catch {
    saveError.value = 'Ошибка воспроизведения'
  } finally {
    ttsTesting.value = false
  }
}

fetchAssistant()
</script>

<style scoped>
.topbar { margin-bottom: 1.5rem; }

.name-input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
  box-sizing: border-box;
}

.status-bar { margin-bottom: 1rem; }

.activate-error { font-size: 0.75rem; color: #dc2626; margin-top: 0.375rem; }

.status-btns { display: flex; gap: 0; }

.status-btn {
  padding: 0.375rem 0.75rem;
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
.status-btn:disabled { opacity: 0.4; cursor: default; }

.layout { display: flex; gap: 2rem; }

.layout-left { flex: 1; max-width: 600px; }

.layout-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;
  align-items: flex-start;
}

.media-row {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.upload-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}



.upload-block-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.4rem;
  align-self: flex-start;
}

.block-reset {
  margin-top: 0.35rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #94a3b8;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
  align-self: flex-start;
}

.block-reset:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

.avatar-zone {
  width: 200px;
  height: 300px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s;
  background: #f9fafb;
}

.avatar-zone:hover { border-color: #93c5fd; }

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #94a3b8;
  font-size: 0.75rem;
}

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; z-index: 100;
}

.modal {
  background: white; border-radius: 8px; padding: 1.5rem; width: 360px; max-width: 90vw; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
}

.modal h2 { font-size: 1rem; margin: 0 0 1rem; }

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.avatar-thumb { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 4px; }

.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s;
  font-size: 0.75rem;
  color: #64748b;
}

.avatar-option:hover { background: #f1f5f9; }
.avatar-option.selected { border-color: #2563eb; background: #eff6ff; color: #1e293b; }

.modal-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }

.modal-close-btn {
  padding: 0.375rem 0.75rem;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }

.field textarea {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
}

.model-picker { position: relative; }

.model-picker input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  box-sizing: border-box;
}

.model-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.model-option {
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.model-option:hover { background: #f1f5f9; }
.model-option.selected { background: #eff6ff; color: #2563eb; }
.model-option.empty { color: #9ca3af; justify-content: center; }
.model-option code { font-size: 0.7rem; color: #94a3b8; }

.test-btn {
  padding: 0.5rem 1rem;
  background: #059669;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
}

.test-btn:disabled { background: #6ee7b7; cursor: default; }
.test-btn:hover:not(:disabled) { background: #047857; }
.voice-lang { font-size: 0.7rem; color: #94a3b8; }

.voice-dropdown { max-height: 320px; }

.gender-btns { display: flex; gap: 0; }

.g-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  font-size: 0.8125rem;
  background: white;
  color: #64748b;
  cursor: pointer;
}

.g-btn:first-child { border-radius: 4px 0 0 4px; }
.g-btn:last-child { border-radius: 0 4px 4px 0; margin-left: -1px; }
.g-btn.active { background: #2563eb; color: white; border-color: #2563eb; z-index: 1; position: relative; }
.g-btn:not(.active):hover { background: #f1f5f9; }

.slider { width: 200px; display: block; }

.short-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  box-sizing: border-box;
}

.bottom-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap;
  align-items: center;
}

.save-error {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.save-btn {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
}

.save-btn:disabled { background: #93c5fd; cursor: default; }

.back-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #64748b;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
}

.back-btn:hover { background: #f1f5f9; }

.error { color: #dc2626; }
.loading { color: #6b7280; }

.video-zone {
  width: 200px;
  height: 300px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s;
  background: #f9fafb;
  position: relative;
}

.video-zone:hover { border-color: #93c5fd; }

.video-zone.attached { border-style: solid; border-color: #bbf7d0; background: #f0fdf4; }

.video-preview {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
</style>
