import test from 'node:test'
import assert from 'node:assert/strict'

import { createCalibrationSimulator } from './calibrationState.js'

test('simula inicio de calibracion y estado de articulaciones', () => {
    const simulator = createCalibrationSimulator()
    const messages = simulator.handleCommand({ type: 'start_calibration', assume_home: true })

    assert.equal(messages[0].payload.status, 'calibration_started')
    assert.equal(messages[1].payload.status, 'joint_state')
    assert.equal(messages[1].payload.position_known, true)
    assert.equal(messages[1].payload.base, 90)
})

test('rechaza movimiento antes de conocer HOME', () => {
    const simulator = createCalibrationSimulator()
    const [message] = simulator.handleCommand({ type: 'jog', servo: 'base', delta: 1 })

    assert.equal(message.topic, 'error')
    assert.match(message.payload.detail, /position_unknown/)
})

test('simula jog y set_angle con attach y estado final', () => {
    const simulator = createCalibrationSimulator()
    simulator.handleCommand({ type: 'start_calibration', assume_home: true })

    const jogMessages = simulator.handleCommand({ type: 'jog', servo: 'base', delta: 1 })
    assert.deepEqual(jogMessages.map((message) => message.payload.status), [
        'servo_attaching', 'moving', 'movement_completed', 'joint_state',
    ])
    assert.match(jogMessages[0].payload.detail, /servo=base/)
    assert.equal(jogMessages.at(-1).payload.base, 91)

    const setMessages = simulator.handleCommand({ type: 'set_angle', servo: 'shoulder', angle: 95, duration_ms: 500 })
    assert.equal(setMessages.at(-1).payload.shoulder, 95)
})

test('rechaza limites, delta invalido y duracion invalida', () => {
    const simulator = createCalibrationSimulator()
    simulator.handleCommand({ type: 'start_calibration', assume_home: true })

    assert.match(simulator.handleCommand({ type: 'jog', servo: 'base', delta: 2 })[0].payload.detail, /delta/)
    assert.match(simulator.handleCommand({ type: 'set_angle', servo: 'base', angle: 111, duration_ms: 500 })[0].payload.detail, /limites/)
    assert.match(simulator.handleCommand({ type: 'set_angle', servo: 'base', angle: 90, duration_ms: 199 })[0].payload.detail, /duration_ms/)
})

test('simula stop y release_servos', () => {
    const simulator = createCalibrationSimulator()
    simulator.handleCommand({ type: 'start_calibration', assume_home: true })
    simulator.handleCommand({ type: 'jog', servo: 'wrist', delta: 1 })

    const stopMessages = simulator.handleCommand({ type: 'stop' })
    assert.equal(stopMessages[0].payload.status, 'stopped')
    assert.equal(stopMessages[1].payload.position_known, true)

    const releaseMessages = simulator.handleCommand({ type: 'release_servos' })
    assert.equal(releaseMessages[0].payload.status, 'servos_released')
    assert.equal(releaseMessages[1].payload.position_known, false)
})