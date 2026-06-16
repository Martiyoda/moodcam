import { normalizeSimpleScores } from './emotionCategories.js'

const TEXT_KEYWORDS = {
  joyful: ['feliz', 'alegre', 'contento', 'contenta', 'ilusion', 'ilusión', 'bien', 'risa', 'divertido', 'divertida', 'me gusta', 'encanta'],
  calm: ['calma', 'tranquilo', 'tranquila', 'relajado', 'relajada', 'paz', 'suave', 'sereno', 'serena'],
  sad: ['triste', 'pena', 'llorar', 'lloro', 'solo', 'sola', 'melancolia', 'melancolía', 'gris', 'apagado', 'apagada'],
  nervous: ['nervioso', 'nerviosa', 'miedo', 'asustado', 'asustada', 'preocupa', 'ansioso', 'ansiosa', 'temor', 'inquieto', 'inquieta'],
  tired: ['cansado', 'cansada', 'sueño', 'agotado', 'agotada', 'sin energia', 'sin energía', 'fatiga', 'pesado', 'pesada'],
  confused: ['confuso', 'confusa', 'confundido', 'confundida', 'no se', 'no sé', 'duda', 'raro', 'rara', 'perdido', 'perdida'],
  neutral: ['normal', 'neutro', 'neutra', 'no mucho', 'igual'],
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
    scores: normalizeSimpleScores(scores),
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
