import { dominantSimpleEmotion, getSimpleEmotion, normalizeSimpleScores, simpleScoresToArtSummary } from './emotionCategories.js'

export function fuseEmotionSignals({ textScores, toneScores, faceScores }, weights = { text: 0.45, tone: 0.2, face: 0.35 }) {
  const totals = {}
  addWeightedScores(totals, textScores, weights.text)
  addWeightedScores(totals, toneScores, weights.tone)
  addWeightedScores(totals, faceScores, weights.face)

  const scores = normalizeSimpleScores(totals)
  const dominant = dominantSimpleEmotion(scores)
  const emotion = getSimpleEmotion(dominant)

  return {
    dominant,
    label: emotion.label,
    confidence: scores[dominant] || 0,
    scores,
    art_summary: simpleScoresToArtSummary(scores),
  }
}

function addWeightedScores(target, scores = {}, weight) {
  Object.entries(normalizeSimpleScores(scores)).forEach(([emotion, value]) => {
    target[emotion] = (target[emotion] || 0) + value * weight
  })
}
