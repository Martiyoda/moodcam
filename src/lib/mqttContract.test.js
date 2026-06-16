import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ARM_CALIBRATION_COMMAND_TYPES,
  ARM_CALIBRATION_TOPICS,
  buildFaceEmotionPayload,
  buildSessionSummaryPayload,
  createRobotCommandSequence,
  createTopicMap,
} from './mqttContract.js'

test('limita la calibración web a comandos y topics aprobados', () => {
  assert.deepEqual(ARM_CALIBRATION_TOPICS, {
    command: 'robot/test',
    status: 'robot/status',
    error: 'robot/error',
  })
  assert.deepEqual(ARM_CALIBRATION_COMMAND_TYPES, [
    'start_calibration', 'jog', 'set_angle', 'get_joint_state', 'stop', 'release_servos',
  ])
  assert.equal(ARM_CALIBRATION_COMMAND_TYPES.includes('emotion_test'), false)
  assert.equal(ARM_CALIBRATION_COMMAND_TYPES.includes('pose_test'), false)
  assert.equal(ARM_CALIBRATION_COMMAND_TYPES.includes('stroke_id'), false)
  assert.equal(ARM_CALIBRATION_COMMAND_TYPES.includes('base_function'), false)
})

test('crea topics por deviceId para Moodcam, AI Bridge y robot', () => {
  const topics = createTopicMap('robot aula 1')

  assert.equal(topics.sessionStart, 'moodcam/robot-aula-1/session/start')
  assert.equal(topics.faceEmotion, 'moodcam/robot-aula-1/emotion/face')
  assert.equal(topics.strokePlan, 'ai/robot-aula-1/stroke_plan')
  assert.equal(topics.robotCommand, 'robot/robot-aula-1/command')
  assert.equal(topics.systemError, 'system/robot-aula-1/error')
})

test('normaliza payloads de observacion y resumen de sesion', () => {
  const face = buildFaceEmotionPayload({
    sessionId: 's1',
    deviceId: 'device1',
    artistId: 'kandinsky',
    emotions: { happy: 0.7567 },
    dominant: 'happy',
    sampleCount: 3,
    sessionActive: true,
  })

  assert.equal(face.session_id, 's1')
  assert.equal(face.face_emotions.happy, 0.757)
  assert.equal(face.confidence, 0.757)

  const summary = buildSessionSummaryPayload({
    sessionId: 's1',
    deviceId: 'device1',
    artist: { id: 'kandinsky', name: 'Kandinsky' },
    combinedSummary: [{ emotion: 'happy', percentage: 100 }],
  })

  assert.equal(summary.type, 'session_summary')
  assert.equal(summary.artist_id, 'kandinsky')
  assert.equal(summary.combined_emotions[0].emotion, 'happy')
})

test('envuelve comandos de robot con inicio, indices y fin', () => {
  const sequence = createRobotCommandSequence({
    id: 'plan-1',
    session_id: 's1',
    artist: 'kandinsky',
    robot_commands: [
      { type: 'move_to_rest', points: [{ x: 1, y: 2, z: 3, brush: 0 }] },
    ],
  })

  assert.equal(sequence[0].type, 'paint_sequence_start')
  assert.equal(sequence[1].sequence_index, 1)
  assert.equal(sequence[1].sequence_total, 1)
  assert.equal(sequence.at(-1).type, 'paint_sequence_end')
})
