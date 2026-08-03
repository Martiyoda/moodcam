import { dominantPhysicalEmotion, getPhysicalEmotion, normalizePhysicalEmotionScores, physicalScoresToArtSummary } from './emotionCategories.js'

export function fuseEmotionSignals({ textScores, toneScores, faceScores }, weights = { text: 0.45, tone: 0.2, face: 0.35 }) {
  const totals = {}
  addWeightedScores(totals, textScores, weights.text)
  addWeightedScores(totals, toneScores, weights.tone)
  addWeightedScores(totals, faceScores, weights.face)

  const scores = normalizePhysicalEmotionScores(totals)
  const dominant = dominantPhysicalEmotion(scores)
  const emotion = getPhysicalEmotion(dominant)

  return {
    dominant,
    label: emotion.label,
    confidence: scores[dominant] || 0,
    scores,
    art_summary: physicalScoresToArtSummary(scores),
  }
}

function addWeightedScores(target, scores = {}, weight) {
  Object.entries(normalizePhysicalEmotionScores(scores)).forEach(([emotion, value]) => {
    target[emotion] = (target[emotion] || 0) + value * weight
  })
}
