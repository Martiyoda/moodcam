// Normaliza el resultado del detector facial del navegador al formato del proyecto.
// La imagen se procesa localmente; este modulo trabaja con numeros, no con fotos.
import { normalizePhysicalEmotionScores } from './emotionCategories.js'

const FACE_TO_PHYSICAL = {
  happy: 'happy',
  neutral: 'neutral',
  sad: 'sad',
  angry: 'angry',
  fear: 'sad',
  disgust: 'angry',
  surprise: 'happy',
}

export function mapFaceEmotionToPhysical(faceEmotions = {}) {
  const scores = {}

  Object.entries(faceEmotions || {}).forEach(([faceEmotion, rawValue]) => {
    const physicalEmotion = FACE_TO_PHYSICAL[faceEmotion] || 'neutral'
    scores[physicalEmotion] = (scores[physicalEmotion] || 0) + normalizeScore(rawValue)
  })

  return normalizePhysicalEmotionScores(scores)
}

export function buildFaceEmotionSignal({ emotions, dominant }) {
  const scores = mapFaceEmotionToPhysical(emotions)
  return {
    source: 'face',
    dominant_face_emotion: dominant,
    scores,
  }
}

function normalizeScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return value > 1 ? value / 100 : value
}
