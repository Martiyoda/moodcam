// Analiza tono y transcripción temporal para obtener señales emocionales y preferencias de color.
import { dominantPhysicalEmotion, physicalScoresToArtSummary, toPhysicalEmotionId, toPhysicalEmotionScores } from './emotionCategories.js'

export const DEFAULT_ROBOT_CALIBRATION = {
  canvas: {
    originX: 0,
    originY: 0,
    width: 297,
    height: 210,
    margin: 12,
  },
  z: {
    up: 30,
    paint: 8,
    dip: 2,
  },
  rest: { x: 335, y: 190, z: 30 },
  water: { x: 330, y: 145, z: 2 },
  towel: { x: 330, y: 170, z: 8 },
  paints: [
    { id: 'blue', label: 'Azul', color: 'blue', hex: '#2563eb', x: 330, y: 18, z: 2 },
    { id: 'violet', label: 'Violeta', color: 'violet', hex: '#7c3aed', x: 330, y: 42, z: 2 },
    { id: 'red', label: 'Rojo', color: 'red', hex: '#dc2626', x: 330, y: 66, z: 2 },
    { id: 'yellow', label: 'Amarillo', color: 'yellow', hex: '#facc15', x: 330, y: 90, z: 2 },
  ],
}

const EMOTION_KEYWORDS = {
  happy: ['feliz', 'alegre', 'contento', 'contenta', 'bien', 'divertido', 'risa', 'encanta', 'gusta', 'sorpresa', 'sorprendido', 'sorprendida', 'wow', 'increíble', 'increible'],
  sad: ['triste', 'pena', 'llorar', 'solo', 'sola', 'melancolía', 'melancolia', 'gris'],
  angry: ['rabia', 'enfado', 'enfadado', 'enfadada', 'furia', 'molesto', 'molesta', 'odio', 'miedo', 'asustado', 'asustada', 'nervioso', 'nerviosa', 'temor', 'preocupa', 'asco', 'disgusto', 'raro', 'incómodo', 'incomodo'],
  neutral: ['calma', 'tranquilo', 'tranquila', 'relajado', 'relajada', 'paz', 'suave'],
}

const COLOR_KEYWORDS = {
  yellow: ['amarillo', 'amarilla', 'sol', 'dorado', 'dorada', 'naranja'],
  red: ['rojo', 'roja', 'rosa', 'rosado', 'rosada'],
  blue: ['azul claro', 'celeste', 'azul oscuro', 'azul', 'verde', 'blanco', 'blanca'],
  violet: ['violeta', 'morado', 'morada', 'lila', 'negro', 'negra'],
}

export function createVoiceSample(metrics, text = '') {
  // Convierte una lectura de audio y texto en una muestra normalizada para la sesión.
  const audioScores = scoreAudioEmotion(metrics)
  const textAnalysis = analyzeTranscriptText(text)
  const emotionScores = toPhysicalEmotionScores(mergeEmotionScores(audioScores, textAnalysis.emotionScores, 0.65, 0.35))
  const dominant = dominantPhysicalEmotion(emotionScores)

  return {
    timestamp: Date.now(),
    detection_time: new Date().toISOString(),
    intensity: clamp(Math.round(metrics.intensity || 0), 0, 100),
    rms: round(metrics.rms || 0),
    peak: round(metrics.peak || 0),
    speaking: Boolean(metrics.speaking),
    silence_ms: Math.round(metrics.silenceMs || 0),
    words_per_minute: Math.round(metrics.wordsPerMinute || 0),
    dominant,
    confidence: round(emotionScores[dominant] || 0),
    emotions: emotionScores,
    colors: textAnalysis.colors,
    keywords: textAnalysis.keywords,
    transcript_fragment: text,
  }
}

export function analyzeTranscriptText(text = '') {
  // Busca palabras de emoción y color sin enviar audio al broker MQTT.
  const normalized = normalizeText(text)
  const emotionScores = {}
  const keywords = []
  const colors = []

  Object.entries(EMOTION_KEYWORDS).forEach(([emotion, words]) => {
    words.forEach((word) => {
      if (normalized.includes(normalizeText(word))) {
        emotionScores[emotion] = (emotionScores[emotion] || 0) + 1
        keywords.push(word)
      }
    })
  })

  Object.entries(COLOR_KEYWORDS).forEach(([color, words]) => {
    if (words.some((word) => normalized.includes(normalizeText(word)))) {
      colors.push(color)
    }
  })

  return {
    emotionScores: toPhysicalEmotionScores(emotionScores),
    colors: [...new Set(colors)],
    keywords: [...new Set(keywords)],
  }
}

export function summarizeVoiceEmotion(samples, transcriptItems = []) {
  // Resume las muestras nuevas de voz para incluirlas en una ventana MQTT.
  const totals = {}
  const colors = []
  const keywords = []
  let totalIntensity = 0
  let speakingSamples = 0

  samples.forEach((sample) => {
    Object.entries(sample.emotions || {}).forEach(([emotion, value]) => {
      const physicalEmotion = toPhysicalEmotionId(emotion)
      totals[physicalEmotion] = (totals[physicalEmotion] || 0) + normalizeScore(value)
    })
    totalIntensity += sample.intensity || 0
    if (sample.speaking) speakingSamples += 1
    colors.push(...(sample.colors || []))
    keywords.push(...(sample.keywords || []))
  })

  transcriptItems.forEach((item) => {
    const analysis = analyzeTranscriptText(item.text || '')
    Object.entries(analysis.emotionScores).forEach(([emotion, value]) => {
      const physicalEmotion = toPhysicalEmotionId(emotion)
      totals[physicalEmotion] = (totals[physicalEmotion] || 0) + value
    })
    colors.push(...analysis.colors)
    keywords.push(...analysis.keywords)
  })

  const mainEmotions = physicalScoresToArtSummary(totals)
  const averageIntensity = samples.length ? Math.round(totalIntensity / samples.length) : 0

  return {
    main_emotions: mainEmotions,
    average_intensity: averageIntensity,
    speaking_ratio: samples.length ? round(speakingSamples / samples.length) : 0,
    color_preferences: rankedStrings(colors),
    keywords: rankedStrings(keywords),
    sample_count: samples.length,
  }
}

export function combineEmotionSummaries(faceSummary, voiceSummary, weights = { face: 0.6, voice: 0.4 }) {
  const totals = {}

  faceSummary.forEach((item) => {
    const emotion = toPhysicalEmotionId(item.emotion)
    totals[emotion] = (totals[emotion] || 0) + normalizeScore(item.percentage) * weights.face
  })

    ; (voiceSummary.main_emotions || []).forEach((item) => {
      const emotion = toPhysicalEmotionId(item.emotion)
      totals[emotion] = (totals[emotion] || 0) + normalizeScore(item.percentage) * weights.voice
    })

  return physicalScoresToArtSummary(totals)
}

export function buildSessionSummary({ artist, faceSummary, voiceSummary, combinedSummary, transcript }) {
  return {
    artist: artist.id,
    artist_name: artist.name,
    face_emotions: faceSummary,
    voice_emotions: voiceSummary.main_emotions,
    combined_emotions: combinedSummary,
    voice_intensity: voiceSummary.average_intensity,
    color_preferences: voiceSummary.color_preferences,
    keywords: voiceSummary.keywords,
    transcript: transcript.map((item) => ({
      speaker: item.speaker,
      text: item.text,
      timestamp: item.timestamp,
    })),
    timestamp: Date.now(),
  }
}

function scoreAudioEmotion(metrics) {
  const intensity = clamp(metrics.intensity || 0, 0, 100)
  const silence = metrics.silenceMs || 0
  const speaking = Boolean(metrics.speaking)
  const wordsPerMinute = metrics.wordsPerMinute || 0

  if (!speaking && silence > 1800) return { neutral: 0.7, sad: 0.3 }
  if (intensity > 72 && wordsPerMinute > 130) return { angry: 0.6, happy: 0.25, neutral: 0.15 }
  if (intensity > 62) return { happy: 0.4, angry: 0.35, neutral: 0.25 }
  if (intensity < 20 && speaking) return { sad: 0.45, neutral: 0.55 }
  if (intensity < 12) return { neutral: 0.78, sad: 0.22 }
  return { neutral: 0.55, happy: 0.2, sad: 0.15, angry: 0.1 }
}

function mergeEmotionScores(primary, secondary, primaryWeight, secondaryWeight) {
  const result = {}
  const keys = new Set([...Object.keys(primary || {}), ...Object.keys(secondary || {})])
  keys.forEach((key) => {
    result[key] = (primary[key] || 0) * primaryWeight + (secondary[key] || 0) * secondaryWeight
  })
  return toPhysicalEmotionScores(result)
}

function normalizeScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return value > 1 ? value / 100 : value
}

function rankedStrings(values) {
  const counts = values.reduce((map, value) => {
    if (!value) return map
    map.set(value, (map.get(value) || 0) + 1)
    return map
  }, new Map())

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([value]) => value)
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
