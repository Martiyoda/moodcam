import { calculateEmotionSummary } from '../../../src/lib/artEngine.js'

export function resolveSessionEmotions(sessionSummary, latestFaceEmotion) {
  const combined = normalizeSummary(sessionSummary?.combined_emotions)
  if (combined.length) return combined

  const face = normalizeSummary(sessionSummary?.face_emotions)
  if (face.length) return face

  if (latestFaceEmotion?.face_emotions) {
    return calculateEmotionSummary([{
      emotions: latestFaceEmotion.face_emotions,
    }])
  }

  return [{ emotion: 'neutral', label: 'Calma', percentage: 100 }]
}

function normalizeSummary(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item?.emotion)
    .map((item) => ({
      emotion: item.emotion,
      label: item.label || item.emotion,
      percentage: Math.max(0, Math.min(100, Math.round(Number(item.percentage) || 0))),
    }))
    .filter((item) => item.percentage > 0)
    .slice(0, 2)
}
