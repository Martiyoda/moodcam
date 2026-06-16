export function createBrowserSpeechToTextProvider({ lang = 'es-ES', onTranscript, onStatus, onError } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    return {
      supported: false,
      start() {
        onError?.('Speech-to-text no está disponible en este navegador. Se usará solo análisis de tono.')
      },
      stop() {},
    }
  }

  const recognition = new SpeechRecognition()
  recognition.lang = lang
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onstart = () => onStatus?.('listening')
  recognition.onend = () => onStatus?.('idle')
  recognition.onerror = (event) => onError?.(event.error || 'Error de speech-to-text.')
  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const text = result[0]?.transcript?.trim()
      if (!text) continue
      onTranscript?.({
        text,
        final: result.isFinal,
        confidence: result[0]?.confidence || 0,
        timestamp: Date.now(),
      })
    }
  }

  return {
    supported: true,
    start() {
      try {
        recognition.start()
      } catch {
        // start() puede lanzar si el reconocimiento ya estaba activo.
      }
    },
    stop() {
      try {
        recognition.stop()
      } catch {
        // stop() puede lanzar si ya estaba parado.
      }
    },
  }
}
