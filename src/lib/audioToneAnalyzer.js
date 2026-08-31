// Convierte caracteristicas sencillas del sonido en senales emocionales.
// No interpreta palabras ni pretende diagnosticar: solo aporta una pista mas.
import { normalizePhysicalEmotionScores } from './emotionCategories.js'

export function createAudioToneAnalyzer(stream, { sampleMs = 500, onSample } = {}) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) throw new Error('Este navegador no permite analizar audio con Web Audio.')

  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  const source = audioContext.createMediaStreamSource(stream)
  const data = new Uint8Array(analyser.fftSize)
  let lastSpeechAt = Date.now()

  source.connect(analyser)

  const timer = window.setInterval(() => {
    analyser.getByteTimeDomainData(data)
    const metrics = calculateToneMetrics(data, lastSpeechAt)
    if (metrics.speaking) lastSpeechAt = Date.now()
    onSample?.(metrics)
  }, sampleMs)

  return {
    stop() {
      window.clearInterval(timer)
      audioContext.close()
    },
  }
}

export function calculateToneMetrics(data, lastSpeechAt = Date.now(), now = Date.now()) {
  let sum = 0
  let peak = 0

  for (let i = 0; i < data.length; i += 1) {
    const centered = (data[i] - 128) / 128
    sum += centered * centered
    peak = Math.max(peak, Math.abs(centered))
  }

  const rms = Math.sqrt(sum / data.length)
  const intensity = Math.min(100, Math.round(rms * 220))
  const speaking = intensity > 7 || peak > 0.16

  return {
    intensity,
    rms: round(rms),
    peak: round(peak),
    speaking,
    silenceMs: speaking ? 0 : now - lastSpeechAt,
  }
}

export function scoreToneEmotion(metrics = {}, wordsPerMinute = 0) {
  const intensity = Math.max(0, Math.min(100, Number(metrics.intensity) || 0))
  const silenceMs = Number(metrics.silenceMs) || 0
  const speaking = Boolean(metrics.speaking)

  if (!speaking && silenceMs > 2200) return normalizePhysicalEmotionScores({ sad: 0.55, neutral: 0.45 })
  if (intensity > 72 && wordsPerMinute > 135) return normalizePhysicalEmotionScores({ angry: 0.6, happy: 0.25, neutral: 0.15 })
  if (intensity > 62) return normalizePhysicalEmotionScores({ happy: 0.4, angry: 0.35, neutral: 0.25 })
  if (intensity < 18 && speaking) return normalizePhysicalEmotionScores({ sad: 0.45, neutral: 0.55 })
  if (intensity < 12) return normalizePhysicalEmotionScores({ neutral: 0.8, sad: 0.2 })
  return normalizePhysicalEmotionScores({ neutral: 0.55, happy: 0.2, sad: 0.15, angry: 0.1 })
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
