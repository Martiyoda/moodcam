import { getEmotionLabel } from './artEngine.js'

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
    { id: 'yellow', label: 'Amarillo', color: 'yellow', hex: '#f8d447', x: 330, y: 18, z: 2 },
    { id: 'orange', label: 'Naranja', color: 'orange', hex: '#f97316', x: 330, y: 42, z: 2 },
    { id: 'red', label: 'Rojo', color: 'red', hex: '#ef4444', x: 330, y: 66, z: 2 },
    { id: 'blue', label: 'Azul', color: 'light_blue', hex: '#38bdf8', x: 330, y: 90, z: 2 },
    { id: 'black', label: 'Negro', color: 'black', hex: '#111827', x: 330, y: 114, z: 2 },
  ],
}

const EMOTION_KEYWORDS = {
  happy: ['feliz', 'alegre', 'contento', 'contenta', 'bien', 'divertido', 'risa', 'encanta', 'gusta'],
  sad: ['triste', 'pena', 'llorar', 'solo', 'sola', 'melancolía', 'melancolia', 'gris'],
  angry: ['rabia', 'enfado', 'enfadado', 'enfadada', 'furia', 'molesto', 'molesta', 'odio'],
  fear: ['miedo', 'asustado', 'asustada', 'nervioso', 'nerviosa', 'temor', 'preocupa'],
  surprise: ['sorpresa', 'sorprendido', 'sorprendida', 'wow', 'increíble', 'increible'],
  disgust: ['asco', 'disgusto', 'raro', 'incómodo', 'incomodo'],
  neutral: ['calma', 'tranquilo', 'tranquila', 'relajado', 'relajada', 'paz', 'suave'],
}

const COLOR_KEYWORDS = {
  yellow: ['amarillo', 'amarilla', 'sol', 'dorado', 'dorada'],
  orange: ['naranja'],
  red: ['rojo', 'roja'],
  light_blue: ['azul claro', 'celeste'],
  deep_blue: ['azul oscuro', 'azul'],
  black: ['negro', 'negra'],
  white: ['blanco', 'blanca'],
  soft_green: ['verde'],
  violet: ['violeta', 'morado', 'morada', 'lila'],
  pink: ['rosa', 'rosado', 'rosada'],
}

export function createVoiceSample(metrics, text = '') {
  const audioScores = scoreAudioEmotion(metrics)
  const textAnalysis = analyzeTranscriptText(text)
  const emotionScores = mergeEmotionScores(audioScores, textAnalysis.emotionScores, 0.65, 0.35)
  const dominant = topEmotion(emotionScores)

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
    emotions: normalizeScoreMap(emotionScores),
    colors: textAnalysis.colors,
    keywords: textAnalysis.keywords,
    transcript_fragment: text,
  }
}

export function analyzeTranscriptText(text = '') {
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
    emotionScores: normalizeScoreMap(emotionScores),
    colors: [...new Set(colors)],
    keywords: [...new Set(keywords)],
  }
}

export function summarizeVoiceEmotion(samples, transcriptItems = []) {
  const totals = {}
  const colors = []
  const keywords = []
  let totalIntensity = 0
  let speakingSamples = 0

  samples.forEach((sample) => {
    Object.entries(sample.emotions || {}).forEach(([emotion, value]) => {
      totals[emotion] = (totals[emotion] || 0) + normalizeScore(value)
    })
    totalIntensity += sample.intensity || 0
    if (sample.speaking) speakingSamples += 1
    colors.push(...(sample.colors || []))
    keywords.push(...(sample.keywords || []))
  })

  transcriptItems.forEach((item) => {
    const analysis = analyzeTranscriptText(item.text || '')
    Object.entries(analysis.emotionScores).forEach(([emotion, value]) => {
      totals[emotion] = (totals[emotion] || 0) + value
    })
    colors.push(...analysis.colors)
    keywords.push(...analysis.keywords)
  })

  const mainEmotions = scoresToSummary(totals)
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
    totals[item.emotion] = (totals[item.emotion] || 0) + normalizeScore(item.percentage) * weights.face
  })

  ;(voiceSummary.main_emotions || []).forEach((item) => {
    totals[item.emotion] = (totals[item.emotion] || 0) + normalizeScore(item.percentage) * weights.voice
  })

  return scoresToSummary(totals)
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
  if (intensity > 72 && wordsPerMinute > 130) return { angry: 0.42, surprise: 0.28, happy: 0.2, fear: 0.1 }
  if (intensity > 62) return { surprise: 0.35, happy: 0.32, angry: 0.2, fear: 0.13 }
  if (intensity < 20 && speaking) return { sad: 0.36, neutral: 0.46, fear: 0.18 }
  if (intensity < 12) return { neutral: 0.78, sad: 0.22 }
  return { neutral: 0.42, happy: 0.24, sad: 0.16, surprise: 0.1, fear: 0.08 }
}

function mergeEmotionScores(primary, secondary, primaryWeight, secondaryWeight) {
  const result = {}
  const keys = new Set([...Object.keys(primary || {}), ...Object.keys(secondary || {})])
  keys.forEach((key) => {
    result[key] = (primary[key] || 0) * primaryWeight + (secondary[key] || 0) * secondaryWeight
  })
  return normalizeScoreMap(result)
}

function scoresToSummary(scores, limit = 2) {
  const normalized = normalizeScoreMap(scores)
  return Object.entries(normalized)
    .map(([emotion, score]) => ({
      emotion,
      label: getEmotionLabel(emotion),
      percentage: Math.round(score * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
}

function topEmotion(scores) {
  const entries = Object.entries(scores || {})
  if (!entries.length) return 'neutral'
  return entries.sort(([, a], [, b]) => b - a)[0][0]
}

function normalizeScoreMap(scores) {
  const entries = Object.entries(scores || {}).filter(([, value]) => value > 0)
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (!total) return { neutral: 1 }
  return Object.fromEntries(entries.map(([key, value]) => [key, round(value / total)]))
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
