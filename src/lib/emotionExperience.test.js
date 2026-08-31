// Comprueba las reglas que conectan emociones detectadas con la experiencia visual.
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateToneMetrics, scoreToneEmotion } from './audioToneAnalyzer.js'
import { analyzeEmotionText } from './emotionTextAnalyzer.js'
import { fuseEmotionSignals } from './emotionFusionService.js'
import { mapFaceEmotionToPhysical } from './faceEmotionProvider.js'
import { getPainterProfile } from './painterProfiles.js'
import { selectPainterResponse } from './painterResponseSelector.js'

test('analiza texto de voz en las cuatro categorias fisicas y colores', () => {
  const result = analyzeEmotionText('Estoy nervioso, no sé qué pintar, pero quiero azul')

  assert.ok(result.scores.angry > 0)
  assert.deepEqual(Object.keys(result.scores).sort(), ['angry', 'happy', 'neutral', 'sad'])
  assert.ok(result.colors.includes('blue'))
})

test('analiza tono basico con intensidad y silencio', () => {
  const quiet = new Uint8Array(8).fill(128)
  const metrics = calculateToneMetrics(quiet, Date.now() - 3000, Date.now())
  const scores = scoreToneEmotion(metrics, 0)

  assert.equal(metrics.speaking, false)
  assert.ok(scores.sad > 0)
  assert.deepEqual(Object.keys(scores).sort(), ['angry', 'happy', 'neutral', 'sad'])
})

test('fusiona texto, tono y rostro en una emocion fisica', () => {
  const fused = fuseEmotionSignals({
    textScores: { happy: 1 },
    toneScores: { neutral: 1 },
    faceScores: { happy: 1 },
  })

  assert.equal(fused.dominant, 'happy')
  assert.equal(fused.label, 'alegre')
  assert.equal(fused.art_summary[0].emotion, 'happy')
  assert.equal(fused.art_summary[0].color, 'yellow')
})

test('mapea las siete emociones faciales a cuatro categorias fisicas', () => {
  const scores = mapFaceEmotionToPhysical({ happy: 0.3, fear: 0.2, disgust: 0.2, surprise: 0.3 })

  assert.deepEqual(Object.keys(scores).sort(), ['angry', 'happy', 'neutral', 'sad'])
  assert.equal(scores.happy, 0.6)
  assert.equal(scores.sad, 0.2)
  assert.equal(scores.angry, 0.2)
})

test('prepara perfiles de pintor con respuestas emocionales simples', () => {
  const painter = getPainterProfile('kandinsky')
  const response = selectPainterResponse({ painterId: 'kandinsky', emotion: 'confused' })

  assert.equal(painter.id, 'kandinsky')
  assert.equal(Array.isArray(painter.responses), true)
  assert.ok(painter.responses.length > 0)
  assert.equal(response.emotion, 'confused')
  assert.ok(response.text.length > 0)
})
