import { physicalScoresToArtSummary, toPhysicalEmotionScores } from '../../../src/lib/emotionCategories.js'

export function resolveSessionEmotions(sessionSummary, latestFaceEmotion) {
  const combined = normalizeSummary(sessionSummary?.combined_emotions)
  if (combined.length) return combined

  const face = normalizeSummary(sessionSummary?.face_emotions)
  if (face.length) return face

  if (latestFaceEmotion?.face_emotions) {
    return physicalScoresToArtSummary(toPhysicalEmotionScores(latestFaceEmotion.face_emotions))
  }

  return [{ emotion: 'neutral', label: 'Calma', percentage: 100 }]
}

function normalizeSummary(value) {
  if (!Array.isArray(value)) return []
  const scores = value.reduce((result, item) => {
    if (!item?.emotion) return result
    result[item.emotion] = (result[item.emotion] || 0) + Math.max(0, Number(item.percentage) || 0)
    return result
  }, {})
  if (Object.keys(scores).length === 0) return []
  return physicalScoresToArtSummary(toPhysicalEmotionScores(scores))
}
