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
  assert.equal(config.topics.bridgePresence, 'system/device1/presence/ai-bridge')
  const options = buildMqttOptions(config)
  assert.equal(options.clientId, 'emotion-ai-bridge-device1')
  assert.equal(options.will.topic, 'system/device1/presence/ai-bridge')
  assert.equal(options.will.retain, true)
  assert.equal(JSON.parse(options.will.payload).type, 'presence')
  assert.equal(JSON.parse(options.will.payload).status, 'offline')
})
