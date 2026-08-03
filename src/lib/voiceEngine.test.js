import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeTranscriptText,
  combineEmotionSummaries,
  createVoiceSample,
  summarizeVoiceEmotion,
} from './voiceEngine.js'

test('analiza vocabulario emocional y colores del transcript', () => {
  const result = analyzeTranscriptText('Estoy feliz y me gusta el azul claro con amarillo')

  assert.ok(result.emotionScores.happy > 0)
  assert.ok(result.colors.includes('blue'))
  assert.ok(result.colors.includes('yellow'))
  assert.deepEqual(Object.keys(result.emotionScores).sort(), ['angry', 'happy', 'neutral', 'sad'])
})

test('crea muestras de voz con intensidad y emoción dominante', () => {
  const sample = createVoiceSample({
    intensity: 82,
    rms: 0.35,
    peak: 0.7,
    speaking: true,
    silenceMs: 0,
    wordsPerMinute: 150,
  }, 'me sorprende y estoy contento')

  assert.equal(sample.speaking, true)
  assert.ok(sample.intensity >= 80)
  assert.ok(sample.dominant)
  assert.deepEqual(Object.keys(sample.emotions).sort(), ['angry', 'happy', 'neutral', 'sad'])
})

test('fusiona rostro y voz con pesos 60/40', () => {
  const faceSummary = [{ emotion: 'happy', label: 'Alegría', percentage: 80 }]
  const voiceSummary = {
    main_emotions: [{ emotion: 'sad', label: 'Melancolía', percentage: 100 }],
  }

  const combined = combineEmotionSummaries(faceSummary, voiceSummary)

  assert.equal(combined[0].emotion, 'happy')
  assert.equal(combined[1].emotion, 'sad')
})

test('resume voz con colores mencionados', () => {
  const samples = [
    createVoiceSample({ intensity: 30, rms: 0.1, peak: 0.2, speaking: true, silenceMs: 0 }, 'me gusta el rojo'),
    createVoiceSample({ intensity: 65, rms: 0.2, peak: 0.4, speaking: true, silenceMs: 0 }, 'quiero azul'),
  ]

  const summary = summarizeVoiceEmotion(samples, [])

  assert.ok(summary.sample_count === 2)
  assert.ok(summary.color_preferences.includes('red'))
  assert.ok(summary.color_preferences.includes('blue'))
  assert.ok(summary.main_emotions.every((item) => ['happy', 'angry', 'sad', 'neutral'].includes(item.emotion)))
})
