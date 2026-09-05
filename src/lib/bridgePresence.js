import { normalizeDeviceId } from './mqttContract.js'

export function isBridgePresenceForDevice(payload, deviceId) {
  return payload?.type === 'presence'
    && payload?.component === 'ai-bridge'
    && normalizeDeviceId(payload.device_id) === normalizeDeviceId(deviceId)
}