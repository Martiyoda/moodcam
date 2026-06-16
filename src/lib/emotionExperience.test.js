import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateToneMetrics, scoreToneEmotion } from './audioToneAnalyzer.js'
import { analyzeEmotionText } from './emotionTextAnalyzer.js'
import { fuseEmotionSignals } from './emotionFusionService.js'
import { mapFaceEmotionToSimple } from './faceEmotionProvider.js'
import { getPainterProfile } from './painterProfiles.js'
import { selectPainterResponse } from './painterResponseSelector.js'

test('analiza texto de voz en categorias simples y colores', () => {
  const result = analyzeEmotionText('Estoy nervioso, no sé qué pintar, pero quiero azul')

  assert.ok(result.scores.nervous > 0)
  assert.ok(result.scores.confused > 0)
  assert.ok(result.colors.includes('deep_blue'))
})

test('analiza tono basico con intensidad y silencio', () => {
  const quiet = new Uint8Array(8).fill(128)
  const metrics = calculateToneMetrics(quiet, Date.now() - 3000, Date.now())
  const scores = scoreToneEmotion(metrics, 0)

  assert.equal(metrics.speaking, false)
  assert.ok(scores.tired > 0)
})

test('fusiona texto, tono y rostro en emocion simple', () => {
  const fused = fuseEmotionSignals({
    textScores: { joyful: 1 },
    toneScores: { calm: 1 },
    faceScores: { joyful: 1 },
  })

  assert.equal(fused.dominant, 'joyful')
  assert.equal(fused.label, 'alegre')
  assert.equal(fused.art_summary[0].emotion, 'happy')
})

test('mapea emocion facial existente a categorias simples', () => {
  const scores = mapFaceEmotionToSimple({ happy: 0.8, neutral: 0.2 })

  assert.ok(scores.joyful > scores.calm)
})

test('prepara perfiles de pintor con videos placeholder y respuestas', () => {
  const painter = getPainterProfile('kandinsky')
  const response = selectPainterResponse({ painterId: 'kandinsky', emotion: 'confused' })

  assert.equal(painter.id, 'kandinsky')
  assert.ok(painter.questions.length > 0)
  assert.ok(painter.openingLine.includes('Kandinsky'))
  assert.ok(painter.heygenNotes.includes('No imitar voz real'))
  assert.ok(response.video.src.includes('/painters/placeholders/kandinsky/confused.mp4'))
  assert.equal(response.video.ready, false)
  assert.ok(response.script.includes('robot'))
  assert.ok(response.actionCue.length > 0)
})
