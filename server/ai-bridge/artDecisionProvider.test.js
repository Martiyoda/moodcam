import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionEndChunk, decideArtChunk, decideArtPlan } from './providers/artDecisionProvider.js'
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
  assert.ok(result.plan.summary.text.includes('Kandinsky'))
  assert.ok(result.plan.artistic_summary.text.includes('Kandinsky'))
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
  assert.ok(result.plan.summary.title.includes('Pollock'))
  assert.ok(result.plan.artistic_summary.title.includes('Pollock'))
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

test('genera chunk local por ventana cuando OpenAI no esta configurado', async () => {
  const result = await decideArtChunk({
    config: {
      openaiApiKey: '',
      openaiModel: 'gpt-4.1-mini',
    },
    emotionWindow: {
      session_id: 's4',
      device_id: 'device1',
      artist_id: 'alma-thomas',
      artist_recipe_id: 'alma-thomas-wro-v1',
      window_index: 2,
      combined_summary: [
        { emotion: 'surprise', label: 'Sorpresa', percentage: 70 },
        { emotion: 'happy', label: 'Alegria', percentage: 30 },
      ],
      calibration: DEFAULT_ROBOT_CALIBRATION,
      mobility: 75,
    },
  })

  assert.equal(result.source, 'local_fallback')
  assert.equal(result.chunk.session_id, 's4')
  assert.equal(result.chunk.window_index, 2)
  assert.equal(result.chunk.validated_by, 'artEngine')
  assert.equal(result.chunk.decision_source, 'local_fallback')
  assert.ok(result.chunk.robot_commands.some((command) => command.type === 'stroke'))
  assert.equal(result.chunk.robot_commands.some((command) => command.type === 'move_to_rest'), false)
})

test('usa directivas OpenAI simuladas para acotar un chunk', async () => {
  const result = await decideArtChunk({
    config: {
      openaiApiKey: 'test-key',
      openaiModel: 'test-model',
    },
    emotionWindow: {
      session_id: 's5',
      device_id: 'device1',
      artist_id: 'pollock',
      artist_recipe_id: 'pollock-wro-v1',
      window_index: 1,
      combined_summary: [
        { emotion: 'fear', label: 'Alerta', percentage: 60 },
        { emotion: 'angry', label: 'Tension', percentage: 40 },
      ],
      voice_summary: {
        color_preferences: ['red'],
      },
      transcript_delta: [{ speaker: 'user', text: 'mucha energia' }],
      calibration: DEFAULT_ROBOT_CALIBRATION,
      mobility: 90,
      voice_consent: true,
    },
    fetchImpl: async () => ({
      ok: true,
      text: async () => JSON.stringify({
        output_text: JSON.stringify({
          primary_emotion: 'angry',
          secondary_emotion: 'surprise',
          mobility: 120,
          palette_slots: ['red', 'black', 'yellow'],
          gestures: ['flick', 'unsafe_move', 'loop'],
          randomness: 120,
          style_directive: 'Gesto intenso pero dentro de receta.',
        }),
      }),
    }),
  })

  assert.equal(result.source, 'openai')
  assert.equal(result.chunk.decision_source, 'openai')
  assert.equal(result.chunk.main_emotion, 'angry')
  assert.deepEqual(result.chunk.directives.palette_slots, ['red', 'yellow'])
  assert.deepEqual(result.chunk.directives.gestures, ['flick', 'loop'])
  assert.equal(result.chunk.directives.randomness, 100)
  assert.ok(result.chunk.ai_directive.includes('Gesto intenso'))
})

test('crea chunk final de limpieza y reposo para session_end', () => {
  const chunk = createSessionEndChunk({
    sessionEnd: {
      session_id: 's6',
      device_id: 'device1',
      artist_id: 'rothko',
      total_windows: 6,
      calibration: DEFAULT_ROBOT_CALIBRATION,
    },
  })

  assert.equal(chunk.chunk_id, 's6-session-end')
  assert.equal(chunk.close_session, true)
  assert.equal(chunk.window_index, 6)
  assert.equal(chunk.robot_commands.at(-1).type, 'move_to_rest')
  assert.ok(chunk.robot_commands.some((command) => command.type === 'rinse_brush'))
  assert.ok(chunk.robot_commands.some((command) => command.type === 'dry_brush'))
})
