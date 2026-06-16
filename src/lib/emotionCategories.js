export const SIMPLE_EMOTIONS = {
  joyful: {
    id: 'joyful',
    label: 'alegre',
    artEmotion: 'happy',
  },
  calm: {
    id: 'calm',
    label: 'tranquilo',
    artEmotion: 'neutral',
  },
  sad: {
    id: 'sad',
    label: 'triste',
    artEmotion: 'sad',
  },
  nervous: {
    id: 'nervous',
    label: 'nervioso',
    artEmotion: 'fear',
  },
  tired: {
    id: 'tired',
    label: 'cansado',
    artEmotion: 'sad',
  },
  confused: {
    id: 'confused',
    label: 'confundido',
    artEmotion: 'surprise',
  },
  neutral: {
    id: 'neutral',
    label: 'neutro',
    artEmotion: 'neutral',
  },
}

export const SIMPLE_EMOTION_IDS = Object.keys(SIMPLE_EMOTIONS)

export function getSimpleEmotion(id = 'neutral') {
  return SIMPLE_EMOTIONS[id] || SIMPLE_EMOTIONS.neutral
}

export function normalizeSimpleScores(scores = {}) {
  const entries = SIMPLE_EMOTION_IDS.map((emotionId) => [emotionId, Math.max(0, Number(scores[emotionId]) || 0)])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (!total) return { neutral: 1 }
  return Object.fromEntries(entries.map(([key, value]) => [key, round(value / total)]))
}

export function dominantSimpleEmotion(scores = {}) {
  const normalized = normalizeSimpleScores(scores)
  return Object.entries(normalized).sort(([, a], [, b]) => b - a)[0][0]
}

export function simpleScoresToArtSummary(scores = {}, limit = 2) {
  const normalized = normalizeSimpleScores(scores)
  return Object.entries(normalized)
    .map(([emotionId, score]) => {
      const emotion = getSimpleEmotion(emotionId)
      return {
        emotion: emotion.artEmotion,
        label: emotion.label,
        simple_emotion: emotion.id,
        percentage: Math.round(score * 100),
      }
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
