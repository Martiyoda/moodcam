// Simula una sesion MQTT pequena para comprobar el cableado entre web y bridge.
// No mueve hardware por si mismo: sirve para revisar mensajes y respuestas.
import mqtt from 'mqtt'
import { loadServerEnv } from '../server/loadEnv.js'
import {
  DEFAULT_DEVICE_ID,
  TOPIC_KEYS,
  buildSessionStartPayload,
  buildSessionSummaryPayload,
  createMqttClientId,
  createSessionId,
  createTopicMap,
  normalizeDeviceId,
  parseJsonMessage,
} from '../packages/contracts/mqttContract.js'
import { DEFAULT_ROBOT_CALIBRATION } from '../src/lib/voiceEngine.js'

loadServerEnv()

const deviceId = normalizeDeviceId(process.env.MQTT_DEVICE_ID || process.env.MOODCAM_DEVICE_ID || DEFAULT_DEVICE_ID)
const mqttUrl = process.env.MQTT_URL || process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt'
const topics = createTopicMap(deviceId)
if (process.env.MQTT_ROBOT_COMMAND_TOPIC?.trim()) {
  topics[TOPIC_KEYS.robotCommand] = process.env.MQTT_ROBOT_COMMAND_TOPIC.trim()
}
const sessionId = createSessionId(deviceId)
const timeoutMs = Number(process.env.MQTT_SMOKE_TIMEOUT_MS || 45_000)

const client = mqtt.connect(mqttUrl, {
  clean: true,
  reconnectPeriod: 0,
  connectTimeout: 10_000,
  clientId: createMqttClientId('smoke', deviceId, Math.random().toString(16).slice(2)),
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
})

let sawPlan = false
let sawRobotCommand = false
let sawRobotStatus = false

const timer = setTimeout(() => {
  console.error(`Smoke timeout: plan=${sawPlan} robotCommand=${sawRobotCommand} robotStatus=${sawRobotStatus}`)
  client.end(true, () => process.exit(1))
}, timeoutMs)

client.on('connect', () => {
  console.log(`Smoke conectado a ${mqttUrl} para ${deviceId}`)
  client.subscribe([
    topics[TOPIC_KEYS.strokePlan],
    topics[TOPIC_KEYS.robotCommand],
    topics[TOPIC_KEYS.robotStatus],
    topics[TOPIC_KEYS.systemError],
  ], { qos: 1 }, (error) => {
    if (error) throw error
    publishDemoSession()
  })
})

client.on('message', (topic, message) => {
  const payload = parseJsonMessage(message)

  if (topic === topics[TOPIC_KEYS.strokePlan]) {
    sawPlan = true
    console.log(`Plan recibido: ${payload.plan_id || payload.id} (${payload.decision_source || 'sin fuente'})`)
  }

  if (topic === topics[TOPIC_KEYS.robotStatus]) {
    sawRobotStatus = true
    console.log(`Robot status: ${payload.status} ${payload.command_type || ''}`.trim())
  }

  if (topic === topics[TOPIC_KEYS.robotCommand]) {
    sawRobotCommand = true
    console.log(`Robot command en ${topic}: ${payload.type} ${payload.sequence_index || ''}`.trim())
  }

  if (topic === topics[TOPIC_KEYS.systemError]) {
    console.log(`Sistema: ${payload.severity || 'info'} ${payload.message || JSON.stringify(payload)}`)
  }

  if (sawPlan && (sawRobotCommand || sawRobotStatus)) {
    clearTimeout(timer)
    console.log('Smoke OK: AI Bridge publico plan y comandos robot.')
    client.end(true, () => process.exit(0))
  }
})

client.on('error', (error) => {
  clearTimeout(timer)
  console.error(`MQTT smoke error: ${error.message}`)
  client.end(true, () => process.exit(1))
})

function publishDemoSession() {
  const artist = { id: 'kandinsky', name: 'Kandinsky' }
  const startPayload = buildSessionStartPayload({
    sessionId,
    deviceId,
    artist,
    mobility: 82,
    calibration: DEFAULT_ROBOT_CALIBRATION,
    conversationMode: 'voice_detector',
  })
  const summaryPayload = buildSessionSummaryPayload({
    sessionId,
    deviceId,
    artist,
    faceSummary: [
      { emotion: 'happy', label: 'Alegria', percentage: 62 },
      { emotion: 'neutral', label: 'Tranquilo', percentage: 38 },
    ],
    voiceSummary: {
      main_emotions: [
        { emotion: 'happy', label: 'alegre', color: 'yellow', percentage: 70 },
        { emotion: 'neutral', label: 'tranquilo', color: 'blue', percentage: 30 },
      ],
      physical_emotion: 'happy',
      label: 'alegre',
      color_preferences: ['yellow', 'blue'],
      keywords: ['alegre', 'azul', 'movimiento'],
      sample_count: 5,
    },
    combinedSummary: [
      { emotion: 'happy', label: 'alegre', color: 'yellow', percentage: 68 },
      { emotion: 'angry', label: 'enfadado', color: 'red', percentage: 32 },
    ],
    transcript: [
      {
        speaker: 'user',
        text: 'Me siento alegre pero un poco nervioso, quiero amarillo y azul con movimiento.',
        timestamp: Date.now(),
      },
    ],
    calibration: DEFAULT_ROBOT_CALIBRATION,
    mobility: 82,
    conversationMode: 'voice_detector',
  })

  client.publish(topics[TOPIC_KEYS.sessionStart], JSON.stringify(startPayload), { qos: 1 })
  client.publish(topics[TOPIC_KEYS.sessionSummary], JSON.stringify(summaryPayload), { qos: 1 })
  console.log(`Sesion demo publicada: ${sessionId}`)
}
