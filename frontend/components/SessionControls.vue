<template>
  <div
    ref="panelRef"
    class="session-controls"
    :class="{ positioned, dragging }"
    role="toolbar"
    aria-label="Управление сессией"
    :style="positionStyle"
  >
    <div
      class="drag-handle"
      aria-label="Перетащить панель"
      title="Перетащить панель"
      @pointerdown="onDragStart"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </div>

    <button
      class="ctrl-btn ptt"
      :class="{ recording: isRecording, blocked: !micGranted }"
      :disabled="!micGranted"
      :aria-pressed="isRecording"
      :title="micGranted ? 'Push-to-talk (клавиша P)' : 'Доступ к микрофону не предоставлен'"
      :aria-label="micGranted ? 'Push-to-talk, клавиша P' : 'Микрофон заблокирован'"
      @pointerdown="onPttStart"
      @pointerup="onPttEnd"
      @pointerleave="onPttEnd"
      @pointercancel="onPttEnd"
    >
      <svg v-if="micGranted" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="2" x2="22" y1="2" y2="22" />
        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
        <path d="M5 10v2a7 7 0 0 0 12 5" />
        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
      <span v-if="micGranted && !isRecording" class="kbd-hint" aria-hidden="true">P</span>
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: chatOpen }"
      :aria-pressed="chatOpen"
      :title="chatOpen ? 'Закрыть чат' : 'Открыть чат'"
      :aria-label="chatOpen ? 'Закрыть чат' : 'Открыть чат'"
      @click="$emit('toggle-chat')"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: isPlaying }"
      :disabled="!canPlay"
      :title="isPlaying ? 'Пауза' : 'Продолжить'"
      :aria-label="isPlaying ? 'Пауза' : 'Продолжить'"
      @click="$emit('toggle-playback')"
    >
      <svg v-if="isPlaying" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
    </button>

    <div class="separator" aria-hidden="true" />

    <button
      class="ctrl-btn"
      :disabled="!canGoPrev"
      title="Предыдущий шаг"
      aria-label="Предыдущий шаг"
      @click="$emit('prev')"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="19 20 9 12 19 4 19 20" />
        <line x1="5" x2="5" y1="19" y2="5" />
      </svg>
    </button>

    <button
      class="ctrl-btn"
      :disabled="!canGoNext"
      title="Следующий шаг"
      aria-label="Следующий шаг"
      @click="$emit('next')"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="5 4 15 12 5 20 5 4" />
        <line x1="19" x2="19" y1="5" y2="19" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isPlaying: boolean
  isRecording: boolean
  canGoPrev: boolean
  canGoNext: boolean
  canPlay: boolean
  chatOpen: boolean
  micGranted: boolean
}>()

const emit = defineEmits<{
  (e: 'prev' | 'next' | 'toggle-chat' | 'toggle-playback' | 'ptt-start' | 'ptt-end'): void
}>()

const panelRef = ref<HTMLElement | null>(null)
const posX = ref(0)
const posY = ref(0)
const positioned = ref(false)
const dragging = ref(false)

let dragPointerId: number | null = null
let startPointerX = 0
let startPointerY = 0
let startPanelX = 0
let startPanelY = 0

const positionStyle = computed(() => {
  if (!positioned.value) return {}
  return { top: `${posY.value}px`, left: `${posX.value}px` }
})

const STORAGE_KEY = 'session-controls-pos'

function onDragStart(e: PointerEvent) {
  if (!panelRef.value) return
  e.preventDefault()
  dragPointerId = e.pointerId
  startPointerX = e.clientX
  startPointerY = e.clientY
  startPanelX = posX.value
  startPanelY = posY.value
  dragging.value = true
  panelRef.value.setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(e: PointerEvent) {
  if (e.pointerId !== dragPointerId) return
  const dx = e.clientX - startPointerX
  const dy = e.clientY - startPointerY
  const el = panelRef.value
  if (!el) return
  const maxX = window.innerWidth - el.offsetWidth
  const maxY = window.innerHeight - el.offsetHeight
  posX.value = Math.max(0, Math.min(startPanelX + dx, maxX))
  posY.value = Math.max(0, Math.min(startPanelY + dy, maxY))
}

function onDragEnd(e: PointerEvent) {
  if (e.pointerId !== dragPointerId) return
  dragging.value = false
  dragPointerId = null
  panelRef.value?.releasePointerCapture(e.pointerId)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: posX.value, y: posY.value }))
  } catch { /* ignore */ }
}

function onPttStart(e: PointerEvent) {
  e.preventDefault()
  emit('ptt-start')
}

function onPttEnd() {
  emit('ptt-end')
}

onMounted(() => {
  const el = panelRef.value
  if (!el) return
  const w = el.offsetWidth
  const h = el.offsetHeight
  const defaultX = Math.max(0, (window.innerWidth - w) / 2)
  const defaultY = Math.max(0, window.innerHeight - h - 24)

  let savedX = defaultX
  let savedY = defaultY
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        savedX = parsed.x
        savedY = parsed.y
      }
    }
  } catch { /* ignore */ }

  const maxX = window.innerWidth - w
  const maxY = window.innerHeight - h
  posX.value = Math.max(0, Math.min(savedX, maxX))
  posY.value = Math.max(0, Math.min(savedY, maxY))
  positioned.value = true
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
})
</script>

<style scoped>
.session-controls {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 10px -3px rgba(0, 0, 0, 0.08);
  user-select: none;
  touch-action: none;
  transition: box-shadow 0.15s, transform 0.05s;
}

.session-controls.positioned {
  bottom: auto;
  left: 0;
  transform: none;
}

.session-controls.dragging {
  box-shadow: 0 18px 40px -8px rgba(0, 0, 0, 0.25);
  cursor: grabbing;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 44px;
  margin-right: 0.25rem;
  border-radius: 6px;
  cursor: grab;
  touch-action: none;
  flex-shrink: 0;
  color: #cbd5e1;
}

.drag-handle:hover { color: #94a3b8; }
.drag-handle:active { cursor: grabbing; }

.ctrl-btn {
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  transition: background 0.1s, border-color 0.1s, transform 0.05s, color 0.1s;
}

.ctrl-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

.ctrl-btn:active:not(:disabled) { transform: scale(0.95); }

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrl-btn.active {
  background: #dbeafe;
  border-color: #2563eb;
  color: #1d4ed8;
}

.ctrl-btn.ptt {
  background: white;
  border-color: #fecaca;
  color: #dc2626;
}

.ctrl-btn.ptt.recording {
  background: #dc2626;
  border-color: #dc2626;
  color: white;
  animation: ptt-pulse 1.2s ease-in-out infinite;
}

.ctrl-btn.ptt.blocked {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #94a3b8;
}

.kbd-hint {
  position: absolute;
  bottom: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  font-size: 0.6rem;
  font-weight: 700;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  line-height: 1;
  letter-spacing: -0.02em;
}

@keyframes ptt-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}

.separator {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  margin: 0 0.15rem;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .session-controls {
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.35rem 0.4rem;
  }
  .session-controls.positioned {
    bottom: auto;
    left: 0;
    transform: none;
  }
  .ctrl-btn { width: 40px; height: 40px; }
  .drag-handle { height: 40px; }
}
</style>
