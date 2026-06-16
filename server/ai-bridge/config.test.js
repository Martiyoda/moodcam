import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMqttOptions, loadBridgeConfig } from './config.js'

test('crea topics de comandos robot por deviceId para ESP32 real', () => {
  const config = loadBridgeConfig({
    MQTT_DEVICE_ID: 'device1',
    MQTT_URL: 'wss://broker.hivemq.com:8884/mqtt',
  })

  assert.equal(config.topics.robotCommand, 'robot/device1/command')
  assert.equal(config.topics.robotStatus, 'robot/device1/status')
  assert.equal(config.topics.systemError, 'system/device1/error')
  assert.equal(config.topics.sessionSummary, 'moodcam/device1/session/summary')
  assert.equal(buildMqttOptions(config).clientId, 'emotion-ai-bridge-device1')
})
