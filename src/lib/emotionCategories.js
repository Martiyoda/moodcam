export const PHYSICAL_EMOTIONS = {
  happy: { id: 'happy', label: 'alegre', color: 'yellow', colorLabel: 'amarillo' },
  angry: { id: 'angry', label: 'enfadado', color: 'red', colorLabel: 'rojo' },
  sad: { id: 'sad', label: 'triste', color: 'violet', colorLabel: 'violeta' },
  neutral: { id: 'neutral', label: 'tranquilo', color: 'blue', colorLabel: 'azul' },
}

export const PHYSICAL_EMOTION_IDS = Object.keys(PHYSICAL_EMOTIONS)

const RAW_EMOTION_TO_PHYSICAL = {
  happy: 'happy',
  surprise: 'happy',
  angry: 'angry',
  disgust: 'angry',
  sad: 'sad',
  fear: 'sad',
  neutral: 'neutral',
  calm: 'neutral',
  tired: 'sad',
  nervous: 'angry',
  confused: 'angry',
  joyful: 'happy',
}

export function getPhysicalEmotion(id = 'neutral') {
  return PHYSICAL_EMOTIONS[id] || PHYSICAL_EMOTIONS.neutral
}

export function toPhysicalEmotionId(id = 'neutral') {
  return RAW_EMOTION_TO_PHYSICAL[id] || 'neutral'
}

export function toPhysicalEmotionScores(scores = {}) {
  const physicalScores = {}
  Object.entries(scores).forEach(([emotion, value]) => {
    const physicalEmotion = toPhysicalEmotionId(emotion)
    physicalScores[physicalEmotion] = (physicalScores[physicalEmotion] || 0) + Math.max(0, Number(value) || 0)
  })
  return normalizePhysicalEmotionScores(physicalScores)
}

export function normalizePhysicalEmotionScores(scores = {}) {
  const entries = PHYSICAL_EMOTION_IDS.map((emotionId) => [emotionId, Math.max(0, Number(scores[emotionId]) || 0)])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (!total) return { neutral: 1 }
  return Object.fromEntries(entries.map(([key, value]) => [key, round(value / total)]))
}

export function dominantPhysicalEmotion(scores = {}) {
  const normalized = normalizePhysicalEmotionScores(scores)
  return Object.entries(normalized).sort(([, left], [, right]) => right - left)[0][0]
}

export function physicalScoresToArtSummary(scores = {}, limit = 2) {
  const normalized = normalizePhysicalEmotionScores(scores)
  return Object.entries(normalized)
    .map(([emotionId, score]) => {
      const emotion = getPhysicalEmotion(emotionId)
      return {
        emotion: emotion.id,
        label: emotion.label,
        color: emotion.color,
        color_label: emotion.colorLabel,
        percentage: Math.round(score * 100),
      }
    })
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, limit)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
