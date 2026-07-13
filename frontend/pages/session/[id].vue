<template>
  <div class="session-root">
  <div v-if="!started" class="start-overlay" @click="start">
    <div class="start-card" @click.stop>
      <div class="start-avatar-wrap">
        <img v-if="avatarUrl" :src="avatarUrl" class="start-avatar" />
        <div v-if="videosLoading" class="start-avatar-loader">
          <div class="spinner" />
        </div>
      </div>
      <div class="start-card-body">
        <div class="start-card-name">{{ assistant?.name || 'Ассистент' }}</div>
        <div class="start-card-course">{{ session?.course?.name }}</div>
        <div v-if="session?.course?.description" class="start-card-desc">{{ session.course.description }}</div>
        <button class="start-button" :disabled="videosLoading" @click="start">{{ videosLoading ? 'Загрузка...' : hasSavedProgress ? 'Продолжить' : 'Начать урок' }}</button>
      </div>
    </div>
  </div>
  <div v-if="session" class="session-page" :class="{ 'with-stepbar': steps.length > 0 && mode === 'reading' }">
    <div class="session-header">
      <h2>{{ session.course.name }}</h2>
      <span class="session-status">Сессия активна</span>
      <div v-if="mode === 'discussion'" class="mic-indicator">
        <div class="mic-bar" :style="{ width: micVolume * 100 + '%' }" />
      </div>
      <span class="socket-status" :class="socketStatus">{{ socketStatus === 'connected' ? '✓ Подключено' : socketStatus === 'connecting' ? '⋯ Подключение...' : '✗ Отключено' }}</span>
    </div>

    <div class="session-layout">
      <main class="session-main">
        <template v-if="activeLessonId && steps.length > 0">
          <div class="step-slide">
            <div v-if="currentStep.slideType === 'text'" class="slide-text" v-html="renderMd(currentStep.slideContent || '')" />
            <img v-else-if="currentStep.slideType === 'image'" :src="currentStep.slideContent" class="slide-image" />
            <iframe v-else-if="currentStep.slideType === 'pdf'" :src="currentStep.slideContent" class="slide-pdf" />
            <div v-else class="slide-text" v-html="renderMd(currentStep.slideContent || '')" />
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

    <aside class="session-sidebar">
      <div class="assistant-avatar-wrap">
        <div v-if="!started" class="sidebar-avatar-placeholder" />
        <template v-if="started && silenceVideoUrl && talkVideoUrl">
          <video :src="silenceVideoUrl" muted autoplay loop playsinline preload="auto" class="assistant-video" v-show="!isPlaying" />
          <video :src="talkVideoUrl" muted autoplay loop playsinline preload="auto" class="assistant-video" v-show="isPlaying" />
        </template>
        <img v-else-if="started && avatarUrl" :src="avatarUrl" class="assistant-avatar" />
        <div v-if="currentStep.assistantText && mode !== 'discussion' && started" ref="avatarTextRef" class="avatar-text-overlay">
          <div class="avatar-text-inner">{{ currentStep.assistantText }}</div>
        </div>
      </div>
      <div class="session-modules-list">
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
      </div>
    </aside>

    <aside v-show="chatVisible" class="chat-sidebar">
      <div class="chat-header">Чат</div>
      <div ref="chatRef" class="chat-messages">
        <div v-for="(m, i) in messages" :key="i" class="chat-msg" :class="m.role">
          <div v-if="m.context" class="chat-msg-context">
            Модуль {{ m.context.module }} · Урок {{ m.context.lesson }} · Шаг {{ m.context.step }}
          </div>
          <div class="chat-bubble" v-html="renderMd(m.text)" />
        </div>
      </div>
      <form class="chat-input-row" @submit.prevent="sendChatMessage">
        <input
          v-model="chatInput"
          class="chat-input"
          type="text"
          placeholder="Введите сообщение..."
          autocomplete="off"
        />
        <button type="submit" class="chat-send-btn" :disabled="!chatInput.trim()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.21L4.5 11 12 12l-7.5 1-2.49 6.19a1 1 0 0 0 1.39 1.21z" />
          </svg>
        </button>
      </form>
    </aside>

    <div v-if="steps.length > 0 && mode === 'reading'" class="step-progress-bar">
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
  </div>
  <div v-else class="loading">Загрузка сессии...</div>
  <SessionControls
    v-if="started && session"
    :is-playing="isPlaying"
    :is-recording="isRecording"
    :can-go-prev="steps.length > 0 && currentStepIndex > 0"
    :can-go-next="steps.length > 0 && currentStepIndex < steps.length - 1"
    :can-play="!!currentStep.assistantText"
    :chat-open="chatVisible"
    :mic-granted="micPermissionGranted"
    @prev="prevStep"
    @next="nextStep"
    @toggle-chat="chatVisible = !chatVisible"
    @toggle-playback="togglePlayback"
    @ptt-start="pushToTalkStart"
    @ptt-end="pushToTalkEnd"
  />
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt({ html: false, breaks: true, linkify: true })
function renderMd(text: string) {
  return md.render(text)
}

const { $api } = useNuxtApp()
const route = useRoute()

const session = ref<any>(null)
const activeLessonId = ref<string | null>(null)
const steps = ref<any[]>([])
const currentStepIndex = ref(0)
const socketStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const isPlaying = ref(false)
const started = ref(false)
const micVolume = ref(0)
const mode = ref<'reading' | 'discussion'>('reading')
const avatarsMap = ref<Record<string, { url: string }>>({})
const avatarTextRef = ref<HTMLElement | null>(null)
const messages = ref<{ role: string; text: string; context?: { module: string; lesson: string; step: number } }[]>([])
const isRecording = ref(false)
const micPermissionGranted = ref(false)
const chatInput = ref('')
const chatVisible = ref(false)
const videosLoading = ref(false)
const hasSavedProgress = ref(false)

const { interimText, onInterim, onResult, start: startStt, stop: stopStt, reset: resetStt } = useSpeechRecognition()
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

const silenceVideoUrl = computed(() => assistant.value?.silenceVideo || null)
const talkVideoUrl = computed(() => assistant.value?.talkVideo || null)

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
    preloadSessionVideos()
  } catch {
    socketStatus.value = 'disconnected'
  }
}

async function preloadSessionVideos() {
  const a = session.value?.course?.assistant
  const urls = [a?.silenceVideo, a?.talkVideo, a?.praiseVideo, a?.denialVideo].filter(Boolean)
  if (!urls.length) { videosLoading.value = false; return }
  videosLoading.value = true
  const promises = urls.map(url => new Promise<void>(resolve => {
    const el = document.createElement('video')
    el.preload = 'auto'
    el.muted = true
    el.oncanplaythrough = () => resolve()
    el.onerror = () => resolve()
    el.src = url
    el.load()
  }))
  await Promise.race([Promise.all(promises), new Promise<void>(r => setTimeout(r, 10000))])
  videosLoading.value = false
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
    micPermissionGranted.value = true
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(micStream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    micAnalyser = analyser
    tickVolume()
  } catch {
    micPermissionGranted.value = false
  }
}

async function requestMicPermission() {
  if (micPermissionGranted.value) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    micPermissionGranted.value = true
  } catch {
    micPermissionGranted.value = false
  }
}

function tickVolume() {
  if (!micAnalyser) return
  const data = new Uint8Array(micAnalyser.frequencyBinCount)
  micAnalyser.getByteTimeDomainData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const v = ((data[i] ?? 128) - 128) / 128
    sum += v * v
  }
  micVolume.value = Math.min(1, Math.sqrt(sum / data.length) * 3)
  micAnimationId = requestAnimationFrame(tickVolume)
}

function toggleMode() {
  if (mode.value === 'reading') {
    mode.value = 'discussion'
    stopTts()
    stopTextScroll()
    enableMic()
  } else {
    mode.value = 'reading'
    stopMic()
  }
}

function togglePlayback() {
  if (isPlaying.value) {
    stopTts()
  } else {
    playTts()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.repeat) return
  if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
    e.preventDefault()
    pushToTalkStart()
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
    e.preventDefault()
    pushToTalkEnd()
  }
}

async function start() {
  started.value = true
  await requestMicPermission()
  connectSocket()
  if (!activeLessonId.value) {
    autoStartFirstLesson()
  }
  try {
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
  } catch { /* ignore */ }
}

function getCurrentStepContext() {
  if (!activeLessonId.value || !session.value) return null
  for (const mod of session.value.course?.modules || []) {
    for (const lesson of mod.lessons) {
      if (lesson.id === activeLessonId.value) {
        return {
          module: mod.name,
          lesson: lesson.title,
          step: currentStepIndex.value + 1,
        }
      }
    }
  }
  return null
}

function storageKey(sessionId: string, key: string) {
  return `session-${sessionId}-${key}`
}

function loadMessagesFromStorage(sessionId: string) {
  try {
    const raw = localStorage.getItem(storageKey(sessionId, 'messages'))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveMessagesToStorage(sessionId: string, msgs: typeof messages.value) {
  try {
    localStorage.setItem(storageKey(sessionId, 'messages'), JSON.stringify(msgs))
  } catch { /* ignore */ }
}

function loadProgressFromStorage(sessionId: string): { activeLessonId: string; currentStepIndex: number } | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId, 'progress'))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveProgressToStorage(sessionId: string, progress: { activeLessonId: string; currentStepIndex: number }) {
  try {
    localStorage.setItem(storageKey(sessionId, 'progress'), JSON.stringify(progress))
  } catch { /* ignore */ }
}

async function restoreSessionState() {
  if (!session.value) return
  const sessionId = session.value.id

  const savedMessages = loadMessagesFromStorage(sessionId)
  if (savedMessages.length > 0) {
    messages.value = savedMessages
  }

  const savedProgress = loadProgressFromStorage(sessionId)
  if (savedProgress) {
    hasSavedProgress.value = true
    activeLessonId.value = savedProgress.activeLessonId
    await selectLesson(savedProgress.activeLessonId)
    if (savedProgress.currentStepIndex < steps.value.length) {
      currentStepIndex.value = savedProgress.currentStepIndex
    }
  }
}

function sendChatMessage() {
  const text = chatInput.value.trim()
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return
  messages.value.push({ role: 'user', text })
  const a = assistant.value
  ws.send(JSON.stringify({
    type: 'user-message',
    text,
    assistantId: a?.id,
    voice: a?.ttsVoice || undefined,
    model: a?.ttsModel,
    speed: a?.speechRate ?? 1,
    courseId: session.value?.course?.id,
  }))
  chatInput.value = ''
}

let pttAccumulated = ''

function pushToTalkStart() {
  chatVisible.value = true
  chatInput.value = ''
  pttAccumulated = ''
  if (mode.value !== 'discussion') toggleMode()
  stopTts()
  resetStt()
  onResult.value = (text: string) => {
    pttAccumulated = text
  }
  onInterim.value = (text: string) => {
    chatInput.value = text
  }
  if (startStt()) {
    isRecording.value = true
  } else {
    chatInput.value = 'Распознавание не поддерживается в этом браузере'
  }
}

function pushToTalkEnd() {
  if (!isRecording.value) return
  isRecording.value = false
  const text = pttAccumulated || interimText.value.trim()
  stopStt()
  if (text) {
    messages.value.push({ role: 'user', text })
    const a = assistant.value
    ws?.send(JSON.stringify({
      type: 'user-message',
      text,
      assistantId: a?.id,
      voice: a?.ttsVoice || undefined,
      model: a?.ttsModel,
      speed: a?.speechRate ?? 1,
      courseId: session.value?.course?.id,
    }))
  }
  chatInput.value = ''
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
  if (!found) {
    mode.value = 'discussion'
    enableMic()
  }
}

function playTts() {
  const a = assistant.value
  if (!ws || ws.readyState !== WebSocket.OPEN || !a?.ttsVoice || !a?.ttsModel || !currentStep.value?.assistantText) return

  stopTts()

  ws.send(JSON.stringify({
    type: 'tts-request',
    text: currentStep.value.assistantText,
    voice: a.ttsVoice,
    model: a.ttsModel,
    speed: a.speechRate ?? 1,
    courseId: session.value?.course?.id,
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
        if (mode.value === 'reading') setTimeout(() => advanceStep(), 800)
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
      if (msg.type === 'assistant-message') {
        messages.value.push({ role: 'assistant', text: msg.text })
      }
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

const chatRef = ref<HTMLElement | null>(null)

watch(chatVisible, (visible) => {
  if (visible) {
    nextTick(() => {
      if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
    })
  }
})

watch(messages, () => {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  })
}, { deep: true })

watch(currentStep, () => {
  stopTextScroll()
  if (avatarTextRef.value?.firstElementChild) {
    (avatarTextRef.value.firstElementChild as HTMLElement).style.transform = ''
  }
  if (currentStep.value?.assistantText) {
    const text = currentStep.value.assistantText
    if (!messages.value.some(m => m.role === 'assistant' && m.text === text)) {
      messages.value.push({
        role: 'assistant',
        text,
        context: getCurrentStepContext() ?? undefined,
      })
    }
    playTts()
  }
})

watch(session, (newSession) => {
  if (newSession) restoreSessionState()
}, { immediate: true })

watch(messages, (msgs) => {
  if (session.value) saveMessagesToStorage(session.value.id, msgs)
}, { deep: true })

watch([activeLessonId, currentStepIndex], async ([lessonId, stepIdx]) => {
  if (session.value && lessonId) {
    saveProgressToStorage(session.value.id, { activeLessonId: lessonId, currentStepIndex: stepIdx })
    try {
      await $api.patch(`/sessions/${session.value.id}/progress`, {
        progress: { activeLessonId: lessonId, currentStepIndex: stepIdx },
      })
    } catch { /* ignore */ }
  }
})

onUnmounted(() => {
  stopTts()
  stopMic()
  stopTextScroll()
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
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
  position: relative;
  width: 100%;
  border-radius: 20px 20px 0 0;
  line-height: 0;
}

.start-avatar-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 20px 20px 0 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.start-avatar {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  display: block;
}

.sidebar-avatar-placeholder {
  width: 100%;
  aspect-ratio: 2/3;
  background: #064e3b;
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

.mic-indicator {
  width: 80px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
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

.start-button:disabled { background: #93c5fd; cursor: default; }
.start-button:hover:not(:disabled) { background: #1d4ed8; }

.session-page { display: flex; flex-direction: column; height: 100%; padding-left: 240px; }

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

.session-layout {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.session-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 240px;
  width: 240px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  overflow: hidden;
}

.session-page.with-stepbar .session-sidebar {
  bottom: 56px;
}

.session-modules-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.assistant-avatar-wrap {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  line-height: 0;
  flex-shrink: 0;
}

.assistant-avatar {
  width: 100%;
  display: block;
}

.assistant-video {
  width: 100%;
  display: block;
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
  min-height: 0;
}

.step-slide {
  width: 100%;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-sidebar {
  position: fixed;
  right: 1.5rem;
  top: 5vh;
  bottom: 64px;
  width: 340px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  min-height: 0;
}

.chat-msg { display: flex; flex-direction: column; }
.chat-msg.user { align-items: flex-end; }
.chat-msg.assistant { align-items: flex-start; }

.chat-msg-context {
  font-size: 0.65rem;
  color: #94a3b8;
  margin-bottom: 0.2rem;
  padding: 0 0.4rem;
  letter-spacing: 0.01em;
  max-width: 80%;
}



.chat-bubble {
  max-width: 80%;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.chat-msg.user .chat-bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
.chat-msg.assistant .chat-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }

.chat-bubble p { margin: 0 0 0.35rem; }
.chat-bubble p:last-child { margin-bottom: 0; }
.chat-bubble strong { font-weight: 700; }
.chat-bubble em { font-style: italic; }
.chat-bubble ul { list-style-type: disc; padding-left: 1rem; margin: 0.35rem 0; }
.chat-bubble ol { list-style-type: decimal; padding-left: 1rem; margin: 0.35rem 0; }
.chat-bubble li { margin-bottom: 0.15rem; }
.chat-bubble code { background: rgba(0,0,0,0.1); padding: 0.1rem 0.25rem; border-radius: 3px; font-size: 0.85em; }
.chat-msg.user .chat-bubble code { background: rgba(255,255,255,0.25); }
.chat-msg.user .chat-bubble a { color: #bfdbfe; }

.chat-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: white;
}

.chat-input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #1e293b;
  background: white;
  outline: none;
  transition: border-color 0.1s, box-shadow 0.1s;
}

.chat-input::placeholder { color: #94a3b8; }

.chat-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.chat-send-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.1s, transform 0.05s;
}

.chat-send-btn:hover:not(:disabled) { background: #1d4ed8; }
.chat-send-btn:active:not(:disabled) { transform: scale(0.95); }
.chat-send-btn:disabled { opacity: 0.4; cursor: default; }

.slide-text {
  font-size: 1rem;
  color: #334155;
  line-height: 1.7;
  max-width: 100%;
  text-align: left;
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  display: block;
  min-height: 0;
}

.slide-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.slide-pdf {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
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
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 0.25rem;
  padding: 0.5rem 1.5rem;
  background: white;
  border-top: 1px solid #e2e8f0;
  position: fixed;
  bottom: 0;
  left: 240px;
  right: 0;
  height: 56px;
  align-items: center;
  z-index: 40;
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

.loading { color: #6b7280; padding: 2rem; font-size: 0.875rem; }
</style>

<style>
/* Global markdown styles for slide content rendered via v-html */
.slide-text > * { margin: 0 0 0.75rem; }

.slide-text h1, .slide-text h2, .slide-text h3, .slide-text h4 {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 0.75rem;
}

.slide-text h1 { font-size: 1.6rem; }
.slide-text h2 { font-size: 1.35rem; }
.slide-text h3 { font-size: 1.15rem; }
.slide-text h4 { font-size: 1rem; }

.slide-text ul, .slide-text ol {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.slide-text ul { list-style-type: disc; }
.slide-text ol { list-style-type: decimal; }

.slide-text li { margin-bottom: 0.35rem; }

.slide-text strong { font-weight: 700; color: #0f172a; }
.slide-text em { font-style: italic; }
.slide-text code {
  background: #f1f5f9;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  font-size: 0.85em;
  font-family: monospace;
}

.slide-text blockquote {
  border-left: 4px solid #93c5fd;
  padding: 0.5rem 1rem;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 0 4px 4px 0;
  margin-bottom: 0.75rem;
}

.slide-text p:last-child,
.slide-text ul:last-child,
.slide-text ol:last-child,
.slide-text blockquote:last-child {
  margin-bottom: 0;
}
</style>
