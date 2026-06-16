import test from 'node:test'
import assert from 'node:assert/strict'
import { decideArtPlan } from './providers/artDecisionProvider.js'
import { DEFAULT_ROBOT_CALIBRATION } from '../../src/lib/voiceEngine.js'

test('usa fallback local cuando OpenAI no esta configurado', async () => {
  const result = await decideArtPlan({
    config: {
      openaiApiKey: '',
      openaiModel: 'gpt-4.1-mini',
    },
    sessionSummary: {
      session_id: 's1',
      device_id: 'device1',
      artist_id: 'kandinsky',
      combined_emotions: [
        { emotion: 'happy', label: 'Alegría', percentage: 70 },
        { emotion: 'surprise', label: 'Sorpresa', percentage: 30 },
      ],
      calibration: DEFAULT_ROBOT_CALIBRATION,
      mobility: 80,
      conversation_mode: 'none',
    },
  })

  assert.equal(result.source, 'local_fallback')
  assert.equal(result.plan.session_id, 's1')
  assert.equal(result.plan.validated_by, 'artEngine')
  assert.ok(result.plan.robot_commands.some((command) => command.type === 'stroke'))
})

test('usa decision OpenAI simulada y valida el plan antes de publicar', async () => {
  const result = await decideArtPlan({
    config: {
      openaiApiKey: 'test-key',
      openaiModel: 'test-model',
    },
    sessionSummary: {
      session_id: 's2',
      device_id: 'device1',
      artist_id: 'pollock',
      combined_emotions: [
        { emotion: 'fear', label: 'nervioso', percentage: 65 },
        { emotion: 'happy', label: 'alegre', percentage: 35 },
      ],
      voice_summary: {
        color_preferences: ['red', 'black', 'unknown'],
        keywords: ['nervioso', 'energia'],
      },
      calibration: DEFAULT_ROBOT_CALIBRATION,
      mobility: 95,
      conversation_mode: 'voice_detector',
    },
    fetchImpl: async () => ({
      ok: true,
      text: async () => JSON.stringify({
        output_text: JSON.stringify({
          primary_emotion: 'angry',
          secondary_emotion: 'surprise',
          mobility: 500,
          color_preferences: ['red', 'black'],
          style_directive: 'Gesto energico, seguro y validado por limites A4.',
        }),
      }),
    }),
  })

  assert.equal(result.source, 'openai')
  assert.equal(result.plan.decision_source, 'openai')
  assert.equal(result.plan.main_emotion, 'angry')
  assert.equal(result.plan.movement_level, 100)
  assert.ok(result.plan.ai_directive.includes('Gesto energico'))
  assert.ok(result.plan.robot_commands.every((command) => command.type))
})

test('vuelve a fallback local si OpenAI devuelve respuesta invalida', async () => {
  const result = await decideArtPlan({
    config: {
      openaiApiKey: 'test-key',
      openaiModel: 'test-model',
    },
    sessionSummary: {
      session_id: 's3',
      device_id: 'device1',
      artist_id: 'rothko',
      combined_emotions: [
        { emotion: 'sad', label: 'triste', percentage: 80 },
      ],
      calibration: DEFAULT_ROBOT_CALIBRATION,
      mobility: 55,
      conversation_mode: 'voice_detector',
    },
    fetchImpl: async () => ({
      ok: true,
      text: async () => JSON.stringify({ output_text: '"no objeto"' }),
    }),
  })

  assert.equal(result.source, 'local_fallback')
  assert.equal(result.plan.session_id, 's3')
  assert.equal(result.plan.validated_by, 'artEngine')
})
