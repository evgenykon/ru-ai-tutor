<template>
  <Teleport to="body">
    <div v-if="visible" class="ai-agent-panel" ref="panelRef" :style="panelStyle">
      <div class="ai-agent-header" @pointerdown="onDragStart">
          <span>Генератор</span>
          <div class="ai-agent-mode">
            <button :class="['mode-btn', { active: mode === 'plan' }]" @click="mode = 'plan'">План</button>
            <button :class="['mode-btn', { active: mode === 'build' }]" @click="mode = 'build'">Билд</button>
          </div>
          <select v-model="selectedModel" class="model-select" title="Модель">
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <button class="ai-agent-close" @click="close">✕</button>
        </div>

        <div ref="messagesRef" class="ai-agent-messages">
          <div v-for="(msg, i) in messages" :key="i" class="msg" :class="msg.role">
            <div class="msg-bubble">{{ msg.text }}</div>
          </div>
          <div v-if="streamingText" class="msg assistant">
            <div class="msg-bubble streaming">{{ streamingText }}<span v-if="streamingText" class="cursor">▊</span></div>
          </div>
        </div>

        <div v-if="execTotal > 0" class="exec-bar">
          <div class="exec-bar-label">{{ execCurrent }} / {{ execTotal }}</div>
          <div class="exec-bar-track">
            <div class="exec-bar-fill" :style="{ width: (execTotal ? (execCurrent / execTotal) * 100 : 0) + '%' }" />
          </div>
        </div>

        <form class="ai-agent-input-row" @submit.prevent="send">
          <input
            v-model="input"
            class="ai-agent-input"
            type="text"
            placeholder="Введите сообщение..."
            autocomplete="off"
            :disabled="streaming || execRunning"
          />
          <button type="submit" class="ai-agent-send" :disabled="!input.trim() || streaming || execRunning">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.21L4.5 11 12 12l-7.5 1-2.49 6.19a1 1 0 0 0 1.39 1.21z" />
            </svg>
          </button>
        </form>
      </div>
  </Teleport>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()

const props = defineProps<{
  assistantId: string
  courseData?: any
}>()

const emit = defineEmits<{
  (e: 'close' | 'created'): void
}>()

const visible = ref(true)
const mode = ref<'plan' | 'build'>('plan')
const input = ref('')
const models = ref<{ id: string; name: string }[]>([])
const selectedModel = ref('')
const messages = ref<{ role: 'user' | 'assistant'; text: string }[]>([])
const streaming = ref(false)
const streamingText = ref('')
const execRunning = ref(false)
const execCurrent = ref(0)
const execTotal = ref(0)
const localModules = ref<any[]>([])
const messagesRef = ref<HTMLElement | null>(null)

const panelRef = ref<HTMLElement | null>(null)
const savedPos = (() => {
  try { const v = sessionStorage.getItem('generator-pos'); return v ? JSON.parse(v) : null } catch { return null }
})()
const posX = ref(savedPos?.x ?? window.innerWidth - 440 - 24)
const posY = ref(savedPos?.y ?? 80)
const dragging = ref(false)
let dragStart = { x: 0, y: 0, px: 0, py: 0 }

const panelStyle = computed(() => {
  return { left: `${posX.value}px`, top: `${posY.value}px` }
})

function onDragStart(e: PointerEvent) {
  if (!panelRef.value) return
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('select')) return
  dragging.value = true
  dragStart = { x: e.clientX, y: e.clientY, px: posX.value, py: posY.value }
  panelRef.value.setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}

function onDragMove(e: PointerEvent) {
  if (!dragging.value) return
  posX.value = Math.max(0, Math.min(window.innerWidth - 440, dragStart.px + e.clientX - dragStart.x))
  posY.value = Math.max(0, Math.min(window.innerHeight - 200, dragStart.py + e.clientY - dragStart.y))
}

function onDragEnd() {
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  sessionStorage.setItem('generator-pos', JSON.stringify({ x: posX.value, y: posY.value }))
}

function close() {
  visible.value = false
  emit('close')
}

function scrollBottom() {
  nextTick(() => {
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  })
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  input.value = ''

  if (mode.value === 'plan') {
    messages.value.push({ role: 'user', text })
    scrollBottom()
    streaming.value = true
    streamingText.value = ''
    scrollBottom()

    const systemPrompt = 'Ты — ассистент по созданию структуры курса. Обсуждай с пользователем план курса: модули, уроки, их порядок. Предлагай варианты. НЕ создавай ничего напрямую.'
    const chatMessages = [
      ...messages.value.slice(0, -1).map(m => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      { role: 'user' as const, content: text },
    ]

    const full = await askAI(chatMessages, systemPrompt)
    streaming.value = false
    if (full) {
      streamingText.value = ''
      messages.value.push({ role: 'assistant', text: full })
      scrollBottom()
    }
    return
  }

  await runBuildCycle(text)
}

async function askAI(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  if (!props.assistantId) return ''

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const res = await fetch('/api/internal/llm/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({
        assistantId: props.assistantId,
        model: selectedModel.value || undefined,
        systemPrompt,
        messages,
      }),
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      try { await res.text() } catch { /* ignore */ }
      return ''
    }

    const raw = await res.text()
    let full = ''

    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        if (parsed.text) {
          full += parsed.text
          streamingText.value = full
          await new Promise(r => setTimeout(r, 30))
          scrollBottom()
        }
      } catch { /* skip */ }
    }

    return full.trim()
  } catch {
    clearTimeout(timeoutId)
    return ''
  }
}

async function runBuildCycle(userMessage?: string) {
  const systemPrompt = `Ты — ассистент по наполнению курса. Создавай модули, уроки и шаги по утверждённому плану.

ВАЖНО: Каждый JSON-объект заверни в отдельный блок \`\`\`json ... \`\`\`.

Форматы команд:

\`\`\`json
{"action":"create_module","name":"Название модуля","description":"Описание модуля"}
\`\`\`

\`\`\`json
{"action":"create_lesson","moduleName":"Название существующего модуля","title":"Название урока","steps":[{"title":"Название шага","slideContent":"ОЧЕНЬ ДЛИННЫЙ текст 30-40 предложений. Каждое предложение раскрывает одну мысль.","assistantText":"ОЧЕНЬ ДЛИННЫЙ текст 30-40 предложений для озвучки, более разговорный стиль."}]}
\`\`\`

ТРЕБОВАНИЯ К ОБЪЁМУ (критически важно):
- slideContent: строго 30-40 предложений. Это полноценный лекционный материал, не тезисы.
- assistantText: строго 30-40 предложений. Пересказ slideContent разговорным языком.
- Если текст будет короче 30 предложений — он не принимается.

Правила:
1. За один ответ создавай ТОЛЬКО ОДИН УРОК с его шагами.
2. Если модуль ещё не создан — сначала создай модуль (create_module), потом сразу урок (create_lesson) для него.
3. Если модуль уже существует — сразу создавай только урок (create_lesson).
4. Каждый шаг: title — заголовок, slideContent — ОЧЕНЬ ДЛИННЫЙ текст (30-40 предложений), assistantText — ОЧЕНЬ ДЛИННЫЙ текст для озвучки (30-40 предложений).
5. slideContent и assistantText — это полноценные лекции, не короткие заметки. Минимум 30 предложений каждый.
6. Когда урок готов — ответь "Готово" и жди следующего запроса на следующий урок.`

  const prompt = userMessage || 'Создай следующий урок для этого курса. Если все уроки по плану созданы — напиши "Готово".'
  const chatMessages = [
    { role: 'assistant' as const, content: `Текущий курс: ${JSON.stringify(props.courseData?.modules || [])}` },
    ...messages.value.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text })),
    { role: 'user' as const, content: prompt },
  ]

  messages.value.push({ role: 'user', text: userMessage || '…' })
  scrollBottom()
  streaming.value = true
  streamingText.value = ''
  scrollBottom()

  const full = await askAI(chatMessages, systemPrompt)
  if (!full) { streaming.value = false; return }

  streamingText.value = ''
  streaming.value = false
  messages.value.push({ role: 'assistant', text: full })
  scrollBottom()

  const cmds = parseJsonCommands(full)
  if (cmds.length) {
    await refreshModules()
    execTotal.value = cmds.length
    execCurrent.value = 0
    execRunning.value = true

    for (const cmd of cmds) {
      await executeCommand(cmd)
      execCurrent.value++
    }

    execRunning.value = false
    execTotal.value = 0
    execCurrent.value = 0

    const aiSaysDone = /готово/i.test(full)
    if (!aiSaysDone) {
      await runBuildCycle()
    }
  } else {
    streaming.value = false
  }
}

async function fetchModels() {
  try {
    const { data } = await $api.get('/yandex-models')
    models.value = data.models || []
    const saved = sessionStorage.getItem('generator-model')
    if (saved && models.value.some(m => m.id === saved)) {
      selectedModel.value = saved
    } else if (models.value.length) {
      const first = models.value[0]
      if (first) selectedModel.value = first.id
    }
  } catch { /* ignore */ }
}

watch(selectedModel, (val) => {
  if (val) sessionStorage.setItem('generator-model', val)
})

fetchModels()

async function refreshModules() {
  if (!props.courseData?.id) return
  try {
    const { data } = await $api.get(`/courses/${props.courseData.id}`)
    localModules.value = data.course?.modules || []
  } catch {
    localModules.value = props.courseData?.modules || []
  }
}

function parseJsonCommands(text: string) {
  const results: any[] = []

  // First try to find ```json blocks
  const codeMatches = text.matchAll(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g)
  for (const m of codeMatches) {
    try {
      const parsed = JSON.parse(m[1]?.trim() || '')
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.action) results.push(item)
        }
      } else if (parsed?.action) {
        results.push(parsed)
      }
    } catch { /* skip */ }
  }

  // Fallback: find individual JSON objects on separate lines or arrays
  if (!results.length) {
    const trimmed = text.trim()
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.action) results.push(item)
        }
        return results
      }
    } catch { /* skip */ }
  }

  if (!results.length) {
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const cmd = JSON.parse(trimmed)
          if (cmd?.action) results.push(cmd)
        } catch { /* skip */ }
      }
    }
  }
  return results
}

async function executeCommand(cmd: any) {
  try {
    if (cmd.action === 'create_module') {
      await $api.post(`/courses/${props.courseData?.id || ''}/modules`, {
        name: cmd.name,
        description: cmd.description || '',
      })
      await refreshModules()
      emit('created')
      messages.value.push({ role: 'assistant', text: `✅ Модуль «${cmd.name}» создан` })
      scrollBottom()
    } else if (cmd.action === 'create_lesson') {
      const mod = localModules.value.find((m: any) => m.name === cmd.moduleName)
      if (!mod) {
        messages.value.push({ role: 'assistant', text: `❌ Модуль «${cmd.moduleName}» не найден. Доступные: ${localModules.value.map((m: any) => `«${m.name}»`).join(', ')}` })
        scrollBottom()
        return
      }
      const { data: lesson } = await $api.post(`/modules/${mod.id}/lessons`, { title: cmd.title })
      for (const [idx, step] of (cmd.steps || []).entries()) {
        const { data: created } = await $api.post(`/lessons/${lesson.lesson.id}/steps`, {})
        await $api.put(`/steps/${created.step.id}`, {
          title: step.title || '',
          slideType: 'text',
          slideContent: step.slideContent || '',
          assistantText: step.assistantText || '',
          order: idx,
        })
      }
      emit('created')
      messages.value.push({ role: 'assistant', text: `✅ Урок «${cmd.title}» создан в модуле «${cmd.moduleName}» (${(cmd.steps || []).length} шагов)` })
      scrollBottom()
    }
  } catch (e: any) {
    messages.value.push({ role: 'assistant', text: `❌ Ошибка: ${e?.response?.data?.error || e.message || 'неизвестная ошибка'}` })
    scrollBottom()
  }
}
</script>

<style scoped>
.ai-agent-panel {
  position: fixed;
  width: 440px;
  height: 600px;
  max-height: calc(100vh - 100px);
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 50px -8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 210;
  overflow: hidden;
}

.ai-agent-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
}

.ai-agent-header:active { cursor: grabbing; }

.ai-agent-mode {
  display: flex;
  gap: 0;
  margin-left: auto;
}

.mode-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 0.7rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.1s;
}

.mode-btn:first-child { border-radius: 4px 0 0 4px; }
.mode-btn:last-child { border-radius: 0 4px 4px 0; margin-left: -1px; }
.mode-btn.active { background: #2563eb; color: white; border-color: #2563eb; z-index: 1; position: relative; }
.mode-btn:not(.active):hover { background: #f1f5f9; }

.model-select {
  padding: 0.2rem 0.4rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #475569;
  background: white;
  max-width: 140px;
  cursor: pointer;
}

.ai-agent-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem;
  line-height: 1;
  flex-shrink: 0;
}

.ai-agent-close:hover { color: #475569; }

.ai-agent-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }

.msg-bubble {
  max-width: 85%;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  font-size: 0.8rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg.user .msg-bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
.msg.assistant .msg-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
.msg.assistant .msg-bubble.streaming { background: #f1f5f9; }

.cursor { color: #2563eb; animation: blink 0.8s step-end infinite; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.exec-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: #f8fafc;
}

.exec-bar-label {
  font-size: 0.7rem;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}

.exec-bar-track {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.exec-bar-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.ai-agent-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: white;
}

.ai-agent-input {
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
  transition: border-color 0.1s;
}

.ai-agent-input::placeholder { color: #94a3b8; }
.ai-agent-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.ai-agent-input:disabled { background: #f8fafc; color: #94a3b8; }

.ai-agent-send {
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
  transition: background 0.1s;
}

.ai-agent-send:hover:not(:disabled) { background: #1d4ed8; }
.ai-agent-send:disabled { background: #93c5fd; cursor: default; }
</style>
