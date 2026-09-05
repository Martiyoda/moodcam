// Carga y normaliza la configuración del proceso que conecta MQTT, IA y robot.
import { DEFAULT_DEVICE_ID, TOPIC_KEYS, buildPresencePayload, createMqttClientId, createTopicMap, normalizeDeviceId } from '../../packages/contracts/mqttContract.js'
import { loadServerEnv } from '../loadEnv.js'

loadServerEnv()

export function loadBridgeConfig(env = process.env) {
  // Construye una configuración completa con límites seguros y topics coherentes.
  const deviceId = normalizeDeviceId(env.MQTT_DEVICE_ID || env.MOODCAM_DEVICE_ID || DEFAULT_DEVICE_ID)
  const topics = createTopicMap(deviceId)
  applyTopicOverrides(topics, env)

  return {
    deviceId,
    mqttUrl: normalizeMqttUrl(env.MQTT_URL || env.MQTT_BROKER_URL),
    mqttUsername: env.MQTT_USERNAME || '',
    mqttPassword: env.MQTT_PASSWORD || '',
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_DECISION_MODEL || 'gpt-4.1-mini',
    commandDelayMs: clampNumber(env.MQTT_COMMAND_DELAY_MS, 0, 5000, 60),
    queueHighWaterMark: clampNumber(env.MQTT_QUEUE_HIGH_WATERMARK, 1, 31, 24),
    queueWaitTimeoutMs: clampNumber(env.MQTT_QUEUE_WAIT_TIMEOUT_MS, 30000, 900000, 600000),
    topics,
  }
}

export function buildMqttOptions(config) {
  // Prepara autenticación, reconexión y mensaje de última voluntad MQTT.
  const options = {
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clientId: createMqttClientId('ai-bridge', config.deviceId),
    will: {
      topic: config.topics[TOPIC_KEYS.bridgePresence],
      payload: JSON.stringify(buildPresencePayload({
        deviceId: config.deviceId,
        component: 'ai-bridge',
        status: 'offline',
        reason: 'lwt',
      })),
      qos: 0,
      retain: true,
    },
  }

  if (config.mqttUsername) options.username = config.mqttUsername
  if (config.mqttPassword) options.password = config.mqttPassword
  return options
}

function normalizeMqttUrl(rawValue) {
  const fallbackUrl = 'wss://broker.hivemq.com:8884/mqtt'
  const trimmedValue = String(rawValue || '').trim()
  if (!trimmedValue) return fallbackUrl
  if (/^[a-z]+:\/\//i.test(trimmedValue)) return trimmedValue

  const hasExplicitPath = trimmedValue.includes('/')
  const hasExplicitPort = /:\d+$/.test(trimmedValue)
  const looksLikeHiveMqCloud = /\.hivemq\.cloud$/i.test(trimmedValue)

  if (looksLikeHiveMqCloud) {
    if (hasExplicitPath || hasExplicitPort) {
      return `wss://${trimmedValue}`
    }
    return `wss://${trimmedValue}:8884/mqtt`
  }

  return `mqtt://${trimmedValue}`
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
    sessionWindow: env.MQTT_SESSION_WINDOW_TOPIC,
    sessionEnd: env.MQTT_SESSION_END_TOPIC,
    strokePlan: env.MQTT_STROKE_PLAN_TOPIC,
    strokeChunk: env.MQTT_STROKE_CHUNK_TOPIC,
    robotCommand: env.MQTT_ROBOT_COMMAND_TOPIC,
    robotStatus: env.MQTT_ROBOT_STATUS_TOPIC,
    systemError: env.MQTT_SYSTEM_ERROR_TOPIC,
    moodcamStatus: env.MQTT_MOODCAM_STATUS_TOPIC,
    webPresence: env.MQTT_WEB_PRESENCE_TOPIC,
    bridgePresence: env.MQTT_BRIDGE_PRESENCE_TOPIC,
    esp32Presence: env.MQTT_ESP32_PRESENCE_TOPIC,
  }

  Object.entries(overrides).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) topics[key] = value.trim()
  })
}
