// Busca indicios muy basicos en el texto transcrito para completar otras senales.
// El texto es temporal y se usa como orientacion, no como una etiqueta definitiva.
import { normalizePhysicalEmotionScores } from './emotionCategories.js'

const TEXT_KEYWORDS = {
  happy: ['feliz', 'alegre', 'contento', 'contenta', 'ilusion', 'ilusión', 'bien', 'risa', 'divertido', 'divertida', 'me gusta', 'encanta', 'sorpresa', 'sorprendido', 'sorprendida'],
  neutral: ['calma', 'tranquilo', 'tranquila', 'relajado', 'relajada', 'paz', 'suave', 'sereno', 'serena', 'normal', 'neutro', 'neutra', 'no mucho', 'igual'],
  sad: ['triste', 'pena', 'llorar', 'lloro', 'solo', 'sola', 'melancolia', 'melancolía', 'gris', 'apagado', 'apagada'],
  angry: ['enfado', 'enfadado', 'enfadada', 'rabia', 'furia', 'nervioso', 'nerviosa', 'miedo', 'asustado', 'asustada', 'preocupa', 'ansioso', 'ansiosa', 'temor', 'inquieto', 'inquieta', 'confuso', 'confusa', 'confundido', 'confundida', 'no se', 'no sé', 'duda', 'raro', 'rara', 'perdido', 'perdida'],
}

const COLOR_KEYWORDS = {
  yellow: ['amarillo', 'amarilla', 'sol', 'dorado', 'dorada', 'naranja'],
  red: ['rojo', 'roja', 'rosa', 'rosado', 'rosada'],
  blue: ['azul claro', 'celeste', 'azul oscuro', 'azul', 'verde', 'blanco', 'blanca'],
  violet: ['violeta', 'morado', 'morada', 'lila', 'negro', 'negra'],
}

export function analyzeEmotionText(text = '') {
  const normalized = normalizeText(text)
  const scores = {}
  const keywords = []
  const colors = []

  Object.entries(TEXT_KEYWORDS).forEach(([emotion, words]) => {
    words.forEach((word) => {
      if (normalized.includes(normalizeText(word))) {
        scores[emotion] = (scores[emotion] || 0) + 1
        keywords.push(word)
      }
    })
  })

  Object.entries(COLOR_KEYWORDS).forEach(([color, words]) => {
    if (words.some((word) => normalized.includes(normalizeText(word)))) colors.push(color)
  })

  return {
    scores: normalizePhysicalEmotionScores(scores),
    keywords: [...new Set(keywords)],
    colors: [...new Set(colors)],
  }
}

export function estimateWordsPerMinute(transcriptItems = [], windowMs = 15_000) {
  const now = Date.now()
  const recent = transcriptItems.filter((item) => now - item.timestamp <= windowMs)
  const words = recent.reduce((sum, item) => sum + countWords(item.text), 0)
  return Math.round((words / (windowMs / 1000)) * 60)
}

function countWords(text = '') {
  return String(text).trim().split(/\s+/).filter(Boolean).length
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
