import test from 'node:test'
import assert from 'node:assert/strict'
import { isBridgePresenceForDevice } from './bridgePresence.js'

test('acepta presencia de AI Bridge del dispositivo configurado', () => {
  assert.equal(isBridgePresenceForDevice({
    type: 'presence',
    component: 'ai-bridge',
    device_id: 'device1',
  }, 'device1'), true)
})

test('rechaza presencia de AI Bridge de otro dispositivo', () => {
  assert.equal(isBridgePresenceForDevice({
    type: 'presence',
    component: 'ai-bridge',
    device_id: 'device2',
  }, 'device1'), false)
})