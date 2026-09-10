// Estas pruebas comprueban que los valores enviados para calibrar el brazo
// tienen nombres, limites y formas compatibles con el resto de la aplicacion.
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  INITIAL_ATTACHED_STATE,
  INITIAL_JOINT_STATE,
  buildJogCommand,
  buildSetAngleCommand,
  buildStartCalibrationCommand,
  jointStateFromPayload,
  parseDetail,
  updateAttachedState,
} from './armCalibration.js'

test('construye únicamente comandos de calibración permitidos', () => {
  assert.deepEqual(buildStartCalibrationCommand(), { type: 'start_calibration', assume_home: true })
  assert.deepEqual(buildJogCommand('base', 1), { type: 'jog', servo: 'base', delta: 1 })
  assert.deepEqual(buildSetAngleCommand('shoulder', 95, 500), {
    type: 'set_angle', servo: 'shoulder', angle: 95, duration_ms: 500,
  })
  assert.throws(() => buildJogCommand('brush', 1))
  assert.throws(() => buildJogCommand('base', 2))
})

test('rechaza ángulos y duraciones fuera de límites', () => {
  assert.deepEqual(buildSetAngleCommand('base', -30, 500), {
    type: 'set_angle', servo: 'base', angle: -30, duration_ms: 500,
  })
  assert.deepEqual(buildSetAngleCommand('base', 180, 500), {
    type: 'set_angle', servo: 'base', angle: 180, duration_ms: 500,
  })
  assert.throws(() => buildSetAngleCommand('base', 181, 500))
  assert.throws(() => buildSetAngleCommand('shoulder', 166, 400))
  assert.throws(() => buildSetAngleCommand('shoulder', 44, 400))
  assert.throws(() => buildSetAngleCommand('shoulder', 85, 100))
})

test('interpreta joint_state y estados attached', () => {
  const state = jointStateFromPayload({
    status: 'joint_state', base: 91, shoulder: 92, elbow: 93, wrist: 94,
    position_known: true, moving: true, angles_are_commanded: true,
  }, INITIAL_JOINT_STATE)
  assert.equal(state.base, 91)
  assert.equal(state.positionKnown, true)
  assert.equal(state.moving, true)

  const attached = updateAttachedState({ status: 'servo_attaching', detail: 'servo=elbow gpio=33' }, INITIAL_ATTACHED_STATE)
  assert.equal(attached.elbow, true)
  assert.deepEqual(updateAttachedState({ status: 'servos_released' }, attached), {
    base: false, shoulder: false, elbow: false, wrist: false,
  })
})

test('extrae metadatos del detail del firmware', () => {
  assert.deepEqual(parseDetail('servo=base gpio=26 previous=90 target=91'), {
    servo: 'base', gpio: '26', previous: '90', target: '91',
  })
})
