import { normalizeSimpleScores } from './emotionCategories.js'

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

  if (!speaking && silenceMs > 2200) return normalizeSimpleScores({ tired: 0.45, sad: 0.25, neutral: 0.3 })
  if (intensity > 72 && wordsPerMinute > 135) return normalizeSimpleScores({ nervous: 0.5, confused: 0.2, joyful: 0.2, neutral: 0.1 })
  if (intensity > 62) return normalizeSimpleScores({ joyful: 0.35, nervous: 0.3, confused: 0.15, neutral: 0.2 })
  if (intensity < 18 && speaking) return normalizeSimpleScores({ tired: 0.35, sad: 0.25, calm: 0.25, neutral: 0.15 })
  if (intensity < 12) return normalizeSimpleScores({ calm: 0.45, neutral: 0.35, tired: 0.2 })
  return normalizeSimpleScores({ neutral: 0.35, calm: 0.3, joyful: 0.15, sad: 0.1, nervous: 0.1 })
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
