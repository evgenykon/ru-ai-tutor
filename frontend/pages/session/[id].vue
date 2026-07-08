<template>
  <div class="session-root">
  <div v-if="!started" class="start-overlay" @click="start">
    <div class="start-card" @click.stop>
      <div class="start-avatar-wrap">
        <img v-if="avatarUrl" :src="avatarUrl" class="start-avatar" />
      </div>
      <div class="start-card-body">
        <div class="start-card-name">{{ assistant?.name || 'Ассистент' }}</div>
        <div class="start-card-course">{{ session?.course?.name }}</div>
        <div v-if="session?.course?.description" class="start-card-desc">{{ session.course.description }}</div>
        <label class="discussion-label">
          <input v-model="discussionEnabled" type="checkbox" />
          Хочу вести дискуссию
        </label>
        <div v-if="discussionEnabled" class="mic-indicator">
          <div class="mic-bar" :style="{ width: micVolume * 100 + '%' }" />
        </div>
        <button class="start-button" @click="start">Начать урок</button>
      </div>
    </div>
  </div>
  <div v-if="session" class="session-page">
    <div class="session-header">
      <h2>{{ session.course.name }}</h2>
      <span class="session-status">Сессия активна</span>
      <button v-if="isPlaying" class="tts-btn playing" title="Остановить" @click="stopTts">⏹</button>
      <button v-else-if="currentStep.assistantText" class="tts-btn" title="Озвучить" @click="playTts">🔊</button>
      <span class="socket-status" :class="socketStatus">{{ socketStatus === 'connected' ? '✓ Подключено' : socketStatus === 'connecting' ? '⋯ Подключение...' : '✗ Отключено' }}</span>
    </div>

    <div class="session-layout">
      <aside class="session-sidebar">
        <div v-if="avatarUrl" class="assistant-avatar-wrap">
          <img :src="avatarUrl" class="assistant-avatar" />
          <div v-if="currentStep.assistantText" ref="avatarTextRef" class="avatar-text-overlay">
            <div class="avatar-text-inner">{{ currentStep.assistantText }}</div>
          </div>
        </div>
        <div v-for="m in session.course.modules" :key="m.id" class="session-module">
          <div class="session-module-title">{{ m.name }}</div>
          <div
            v-for="l in m.lessons"
            :key="l.id"
            class="session-lesson"
            :class="{ active: activeLessonId === l.id }"
            @click="selectLesson(l.id)"
          >
            <span class="lesson-dot" />
            {{ l.title }}
          </div>
        </div>
      </aside>

      <main class="session-main">
        <template v-if="activeLessonId && steps.length > 0">
          <div class="step-slide" :class="{ 'step-slide-pdf': currentStep.slideType === 'pdf' }">
            <div v-if="currentStep.slideType === 'text'" class="slide-text">{{ currentStep.slideContent }}</div>
            <img v-else-if="currentStep.slideType === 'image'" :src="currentStep.slideContent" class="slide-image" />
            <iframe v-else-if="currentStep.slideType === 'pdf'" :src="currentStep.slideContent" class="slide-pdf" />
            <div v-else class="slide-text">{{ currentStep.slideContent }}</div>
          </div>
        </template>
        <template v-else-if="activeLessonId">
          <p class="session-placeholder">У этого урока нет шагов</p>
        </template>
        <template v-else>
          <p class="session-placeholder">Загрузка первого урока...</p>
        </template>
      </main>
    </div>

    <div v-if="steps.length > 0" class="step-progress-bar">
      <div
        v-for="(step, idx) in steps"
        :key="step.id"
        class="step-progress-item"
        :class="{ active: idx === currentStepIndex, completed: idx < currentStepIndex, future: idx > currentStepIndex }"
        @click="goToStep(idx)"
      >
        <div class="step-progress-dot">
          <span v-if="idx < currentStepIndex">✓</span>
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <div class="step-progress-title">{{ step.title || `Шаг ${idx + 1}` }}</div>
      </div>
    </div>

    <div v-if="steps.length > 0" class="step-nav">
      <button :disabled="currentStepIndex === 0" class="nav-btn" @click="prevStep">Назад</button>
      <span class="step-counter">{{ currentStepIndex + 1 }} / {{ steps.length }}</span>
      <button :disabled="currentStepIndex === steps.length - 1" class="nav-btn" @click="nextStep">Вперёд</button>
    </div>
  </div>
  <div v-else class="loading">Загрузка сессии...</div>
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()
const route = useRoute()

const session = ref<any>(null)
const activeLessonId = ref<string | null>(null)
const steps = ref<any[]>([])
const currentStepIndex = ref(0)
const socketStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const isPlaying = ref(false)
const started = ref(false)
const discussionEnabled = ref(false)
const micVolume = ref(0)
const avatarsMap = ref<Record<string, { url: string }>>({})
const avatarTextRef = ref<HTMLElement | null>(null)
let micStream: MediaStream | null = null
let micAnalyser: AnalyserNode | null = null
let textScrollId: number | null = null
let micAnimationId: number | null = null

let ws: WebSocket | null = null
let audioEl: HTMLAudioElement | null = null

const currentStep = computed(() => steps.value[currentStepIndex.value] || {})
const assistant = computed(() => session.value?.course?.assistant || null)
const avatarUrl = computed(() => {
  const id = assistant.value?.avatar
  return id ? avatarsMap.value[id]?.url : null
})

async function fetchAvatars() {
  try {
    const { data } = await $api.get('/avatars')
    const map: Record<string, { url: string }> = {}
    for (const a of data.avatars) map[a.id] = a
    avatarsMap.value = map
  } catch { /* empty */ }
}

async function fetchSession() {
  try {
    const { data } = await $api.get(`/sessions/${route.params.id}`)
    session.value = data.session
  } catch {
    socketStatus.value = 'disconnected'
  }
}

function stopMic() {
  if (micAnimationId) { cancelAnimationFrame(micAnimationId); micAnimationId = null }
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null }
  micAnalyser = null
  micVolume.value = 0
}

async function enableMic() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(micStream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    micAnalyser = analyser
    tickVolume()
  } catch {
    discussionEnabled.value = false
  }
}

function tickVolume() {
  if (!micAnalyser) return
  const data = new Uint8Array(micAnalyser.frequencyBinCount)
  micAnalyser.getByteTimeDomainData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128
    sum += v * v
  }
  micVolume.value = Math.min(1, Math.sqrt(sum / data.length) * 3)
  micAnimationId = requestAnimationFrame(tickVolume)
}

watch(discussionEnabled, (val) => {
  if (val) enableMic()
  else stopMic()
})

async function start() {
  started.value = true
  connectSocket()
  autoStartFirstLesson()
}

async function selectLesson(lessonId: string) {
  stopTts()
  steps.value = []
  activeLessonId.value = lessonId
  currentStepIndex.value = 0
  try {
    const { data } = await $api.get(`/lessons/${lessonId}/steps`)
    steps.value = data.steps
  } catch {
    steps.value = []
  }
}

function goToStep(idx: number) {
  if (idx >= 0 && idx < steps.value.length) {
    currentStepIndex.value = idx
  }
}

function nextStep() {
  if (currentStepIndex.value < steps.value.length - 1) {
    currentStepIndex.value++
  }
}

function prevStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

function advanceStep() {
  if (currentStepIndex.value < steps.value.length - 1) {
    currentStepIndex.value++
    return
  }
  const modules = session.value?.course?.modules
  if (!modules) return
  let found = false
  for (const mod of modules) {
    for (let i = 0; i < mod.lessons.length; i++) {
      if (mod.lessons[i].id === activeLessonId.value) {
        if (i + 1 < mod.lessons.length) {
          selectLesson(mod.lessons[i + 1].id)
        } else {
          const modIdx = modules.indexOf(mod)
          if (modIdx + 1 < modules.length) {
            selectLesson(modules[modIdx + 1].lessons[0]?.id)
          }
        }
        found = true
        break
      }
    }
    if (found) break
  }
}

function playTts() {
  const a = assistant.value
  if (!ws || ws.readyState !== WebSocket.OPEN || !a?.ttsVoice || !currentStep.value?.assistantText) return

  stopTts()

  ws.send(JSON.stringify({
    type: 'tts-request',
    text: currentStep.value.assistantText,
    voice: a.ttsVoice,
    speed: a.speechRate ?? 1,
  }))
}

function stopTts() {
  if (audioEl) {
    audioEl.pause()
    audioEl.src = ''
    audioEl = null
  }
  isPlaying.value = false
}

function autoStartFirstLesson() {
  const firstModule = session.value?.course?.modules?.[0]
  const firstLesson = firstModule?.lessons?.[0]
  if (firstLesson) {
    selectLesson(firstLesson.id)
  }
}

function connectSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const url = `${protocol}//${host}/socket?sessionId=${route.params.id}`

  ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    socketStatus.value = 'connected'
  }

  ws.onmessage = (event) => {
    // Binary audio data
    if (event.data instanceof ArrayBuffer) {
      const blob = new Blob([event.data], { type: 'audio/ogg' })
      const url = URL.createObjectURL(blob)
      stopTts()
      const currentAudio = new Audio(url)
      audioEl = currentAudio
      isPlaying.value = true

      currentAudio.onloadedmetadata = () => {
        startSyncScroll(currentAudio)
      }

      currentAudio.onended = () => {
        URL.revokeObjectURL(url)
        if (audioEl !== currentAudio) return
        stopTextScroll()
        isPlaying.value = false
        audioEl = null
        setTimeout(() => advanceStep(), 800)
      }

      currentAudio.onerror = () => {
        URL.revokeObjectURL(url)
        if (audioEl !== currentAudio) return
        stopTextScroll()
        isPlaying.value = false
        audioEl = null
      }

      audioEl.play()
      return
    }

    try {
      const msg = JSON.parse(event.data)
      console.log('socket message:', msg)
    } catch {
      console.log('socket raw:', event.data)
    }
  }

  ws.onclose = () => {
    socketStatus.value = 'disconnected'
  }

  ws.onerror = () => {
    socketStatus.value = 'disconnected'
  }
}

function startSyncScroll(audio: HTMLAudioElement) {
  stopTextScroll()
  const el = avatarTextRef.value
  if (!el) return
  const inner = el.firstElementChild as HTMLElement
  if (!inner) return
  const overflow = inner.offsetHeight - el.clientHeight
  if (overflow <= 0) return
  const max = overflow + 12
  inner.style.transform = 'translateY(0)'

  function tick() {
    if (!audioEl || audio.paused || audio.ended || !avatarTextRef.value) {
      stopTextScroll()
      return
    }
    const dur = audio.duration
    if (!dur || !isFinite(dur)) {
      textScrollId = requestAnimationFrame(tick)
      return
    }
    const progress = Math.min(audio.currentTime / (dur * 0.85), 1)
    inner.style.transform = `translateY(-${progress * max}px)`
    if (progress < 1) textScrollId = requestAnimationFrame(tick)
  }
  textScrollId = requestAnimationFrame(tick)
}

function stopTextScroll() {
  if (textScrollId) { cancelAnimationFrame(textScrollId); textScrollId = null }
}

watch(currentStep, () => {
  stopTextScroll()
  if (avatarTextRef.value?.firstElementChild) {
    (avatarTextRef.value.firstElementChild as HTMLElement).style.transform = ''
  }
  if (currentStep.value?.assistantText) {
    playTts()
  }
})

onUnmounted(() => {
  stopTts()
  stopMic()
  stopTextScroll()
  if (ws) ws.close()
})

fetchAvatars()
fetchSession()
</script>

<style scoped>
.start-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.start-card {
  background: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 360px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);
}

.start-avatar-wrap {
  width: 100%;
  border-radius: 20px 20px 0 0;
  line-height: 0;
}

.start-avatar {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  display: block;
}

.start-card-body {
  padding: 1.5rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.start-card-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.start-card-course {
  font-size: 0.85rem;
  color: #64748b;
}

.start-card-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.discussion-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #475569;
  cursor: pointer;
  user-select: none;
}

.discussion-label input { accent-color: #2563eb; }

.mic-indicator {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.mic-bar {
  height: 100%;
  background: #2563eb;
  border-radius: 3px;
  transition: width 0.08s linear;
}

.start-button {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}

.start-button:hover { background: #1d4ed8; }

.session-page { display: flex; flex-direction: column; height: 100%; }

.session-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.session-header h2 { margin: 0; font-size: 1.2rem; color: #1e293b; }

.session-status {
  font-size: 0.75rem;
  color: #16a34a;
  background: #f0fdf4;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.tts-btn {
  margin-left: auto;
  background: #f1f5f9;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
}

.tts-btn:hover { background: #e2e8f0; }
.tts-btn.playing { background: #dbeafe; border-color: #2563eb; }

.session-layout {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.session-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
}

.assistant-avatar-wrap {
  position: relative;
  width: 100%;
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
  line-height: 0;
}

.assistant-avatar {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  display: block;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.avatar-text-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.4rem;
  padding: 0.35rem 0.6rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  overflow: hidden;
}

.avatar-text-inner {
  color: white;
  font-size: 0.75rem;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.session-module { margin-bottom: 1rem; }

.session-module-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.session-lesson {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: #475569;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}

.session-lesson:hover { background: #f1f5f9; }
.session-lesson.active { background: #dbeafe; color: #1d4ed8; font-weight: 500; }

.lesson-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}

.session-lesson.active .lesson-dot { background: #2563eb; }

.session-main {
  flex: 1;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  overflow-y: auto;
}

.step-slide {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-text {
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
  max-width: 600px;
  text-align: center;
}

.slide-image { max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 8px; }

.step-slide-pdf {
  align-self: stretch;
  align-items: stretch;
  flex: 1;
}

.slide-pdf {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  flex: 1;
}

.session-placeholder {
  color: #94a3b8;
  font-size: 0.9rem;
  text-align: center;
}

.socket-status {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  white-space: nowrap;
}

.socket-status.connected { color: #16a34a; background: #f0fdf4; }
.socket-status.connecting { color: #d97706; background: #fffbeb; }
.socket-status.disconnected { color: #dc2626; background: #fef2f2; }

.step-progress-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.step-progress-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}

.step-progress-item:hover { background: #f1f5f9; }

.step-progress-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-progress-item.future .step-progress-dot { background: #f1f5f9; color: #94a3b8; border: 1.5px solid #d1d5db; }
.step-progress-item.active .step-progress-dot { background: #2563eb; color: white; }
.step-progress-item.completed .step-progress-dot { background: #16a34a; color: white; }

.step-progress-title {
  font-size: 0.7rem;
  color: #475569;
  line-height: 1.2;
}

.step-progress-item.active .step-progress-title { color: #2563eb; font-weight: 600; }
.step-progress-item.completed .step-progress-title { color: #16a34a; }

.step-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.75rem;
}

.nav-btn {
  padding: 0.4rem 1rem;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.nav-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
.nav-btn:disabled { opacity: 0.4; cursor: default; }

.step-counter {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}

.loading { color: #6b7280; padding: 2rem; font-size: 0.875rem; }
</style>
