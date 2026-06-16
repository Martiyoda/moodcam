import { normalizeSimpleScores } from './emotionCategories.js'

const FACE_TO_SIMPLE = {
  happy: 'joyful',
  neutral: 'calm',
  sad: 'sad',
  angry: 'nervous',
  fear: 'nervous',
  disgust: 'confused',
  surprise: 'confused',
}

export function mapFaceEmotionToSimple(faceEmotions = {}) {
  const scores = {}

  Object.entries(faceEmotions || {}).forEach(([faceEmotion, rawValue]) => {
    const simpleEmotion = FACE_TO_SIMPLE[faceEmotion] || 'neutral'
    scores[simpleEmotion] = (scores[simpleEmotion] || 0) + normalizeScore(rawValue)
  })

  return normalizeSimpleScores(scores)
}

export function buildFaceEmotionSignal({ emotions, dominant }) {
  const scores = mapFaceEmotionToSimple(emotions)
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
