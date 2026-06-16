import test from 'node:test'
import assert from 'node:assert/strict'
import { loadBridgeConfig } from './config.js'

test('permite sobrescribir el topic de comandos robot para ESP32 real', () => {
  const config = loadBridgeConfig({
    MQTT_DEVICE_ID: 'device1',
    MQTT_URL: 'wss://broker.hivemq.com:8884/mqtt',
    MQTT_ROBOT_COMMAND_TOPIC: 'robot/test',
  })

  assert.equal(config.topics.robotCommand, 'robot/test')
  assert.equal(config.topics.sessionSummary, 'moodcam/device1/session/summary')
})
