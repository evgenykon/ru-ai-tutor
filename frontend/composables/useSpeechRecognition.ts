export function useSpeechRecognition() {
  const isListening = ref(false)
  const interimText = ref('')
  const finalText = ref('')
  const onInterim = ref<((text: string) => void) | null>(null)
  const onResult = ref<((text: string) => void) | null>(null)
  const onEnd = ref<(() => void) | null>(null)

  let recognition: any = null

  function start() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      return false
    }

    stop()

    try {
      recognition = new SpeechRecognition()
      recognition.lang = 'ru-RU'
      recognition.continuous = true
      recognition.interimResults = true

      let lastProcessedIndex = 0
      recognition.onresult = (event: any) => {
        let interim = ''
        let final = ''
        for (let i = Math.max(event.resultIndex, lastProcessedIndex); i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' '
            lastProcessedIndex = i + 1
          } else {
            interim += event.results[i][0].transcript
          }
        }
        interimText.value = interim
        onInterim.value?.(interim)
        if (final.trim()) {
          finalText.value = final.trim()
          onResult.value?.(final.trim())
        }
      }

      recognition.onerror = () => {
        isListening.value = false
      }

      recognition.onend = () => {
        if (isListening.value) {
          try { recognition.start() } catch { /* ignore */ }
        } else {
          onEnd.value?.()
        }
      }

      recognition.start()
      isListening.value = true
      return true
    } catch {
      return false
    }
  }

  function stop() {
    if (recognition) {
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      try { recognition.stop() } catch { /* ignore */ }
      recognition = null
    }
    isListening.value = false
    interimText.value = ''
  }

  function reset() {
    finalText.value = ''
    interimText.value = ''
  }

  onUnmounted(() => stop())

  return { isListening, interimText, finalText, onInterim, onResult, onEnd, start, stop, reset }
}
