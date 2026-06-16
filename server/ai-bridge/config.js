import { DEFAULT_DEVICE_ID, createTopicMap, normalizeDeviceId } from '../../packages/contracts/mqttContract.js'
import { loadServerEnv } from '../loadEnv.js'

loadServerEnv()

export function loadBridgeConfig(env = process.env) {
  const deviceId = normalizeDeviceId(env.MQTT_DEVICE_ID || env.MOODCAM_DEVICE_ID || DEFAULT_DEVICE_ID)
  const topics = createTopicMap(deviceId)
  applyTopicOverrides(topics, env)

  return {
    deviceId,
    mqttUrl: env.MQTT_URL || env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt',
    mqttUsername: env.MQTT_USERNAME || '',
    mqttPassword: env.MQTT_PASSWORD || '',
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_DECISION_MODEL || 'gpt-4.1-mini',
    commandDelayMs: clampNumber(env.MQTT_COMMAND_DELAY_MS, 0, 5000, 60),
    topics,
  }
}

export function buildMqttOptions(config) {
  const options = {
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clientId: `moodcam-ai-bridge-${config.deviceId}-${Math.random().toString(16).slice(2)}`,
    will: {
      topic: config.topics.systemError,
      payload: JSON.stringify({
        type: 'bridge_offline',
        device_id: config.deviceId,
        message: 'AI Bridge desconectado inesperadamente.',
        timestamp: Date.now(),
      }),
      qos: 1,
      retain: false,
    },
  }

  if (config.mqttUsername) options.username = config.mqttUsername
  if (config.mqttPassword) options.password = config.mqttPassword
  return options
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function applyTopicOverrides(topics, env) {
  const overrides = {
    sessionStart: env.MQTT_SESSION_START_TOPIC,
    faceEmotion: env.MQTT_FACE_EMOTION_TOPIC,
    sessionSummary: env.MQTT_SESSION_SUMMARY_TOPIC,
    strokePlan: env.MQTT_STROKE_PLAN_TOPIC,
    robotCommand: env.MQTT_ROBOT_COMMAND_TOPIC,
    robotStatus: env.MQTT_ROBOT_STATUS_TOPIC,
    systemError: env.MQTT_SYSTEM_ERROR_TOPIC,
    moodcamStatus: env.MQTT_MOODCAM_STATUS_TOPIC,
  }

  Object.entries(overrides).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) topics[key] = value.trim()
  })
}
