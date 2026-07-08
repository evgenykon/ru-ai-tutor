export function useSpeechRecognition() {
  const isListening = ref(false)
  const interimText = ref('')
  const finalText = ref('')
  const onResult = ref<((text: string) => void) | null>(null)

  let recognition: any = null

  function start() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('SpeechRecognition not supported')
      return
    }

    stop()

    recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      interimText.value = interim
      if (final.trim()) {
        finalText.value = final.trim()
        onResult.value?.(final.trim())
      }
    }

    recognition.onerror = () => {
      isListening.value = false
    }

    recognition.onend = () => {
      // Restart if still should be listening
      if (isListening.value) {
        try { recognition.start() } catch { /* ignore */ }
      }
    }

    recognition.start()
    isListening.value = true
  }

  function stop() {
    if (recognition) {
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

  return { isListening, interimText, finalText, onResult, start, stop, reset }
}
