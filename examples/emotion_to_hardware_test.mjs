import mqtt from 'mqtt'
import { loadServerEnv } from '../server/loadEnv.js'

loadServerEnv()

const mqttUrl = process.env.MQTT_URL || process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt'
const emotionTopic = process.env.MQTT_EMOTION_INPUT_TOPIC || 'emotion/input'
const robotCommandTopic = process.env.MQTT_ROBOT_COMMAND_TOPIC || 'robot/test'
const robotStatusTopic = process.env.MQTT_ROBOT_STATUS_TOPIC || 'robot/status'
const robotErrorTopic = process.env.MQTT_ROBOT_ERROR_TOPIC || 'robot/error'

const emotionMap = {
  happy: { angle: 98, duration_ms: 500 },
  sad: { angle: 87, duration_ms: 700 },
  angry: { angle: 100, duration_ms: 500 },
  calm: { angle: 92, duration_ms: 900 },
  fear: { angle: 86, duration_ms: 500 },
  surprise: { angle: 99, duration_ms: 400 },
  neutral: { angle: 93, duration_ms: 600 },
}

const aliases = {
  alegria: 'happy',
  alegre: 'happy',
  joy: 'happy',
  joyful: 'happy',
  tristeza: 'sad',
  triste: 'sad',
  rabia: 'angry',
  ira: 'angry',
  calma: 'calm',
  tranquilo: 'calm',
  miedo: 'fear',
  sorpresa: 'surprise',
  sorprendido: 'surprise',
  neutro: 'neutral',
}

const client = mqtt.connect(mqttUrl, {
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 10_000,
  clientId: `emotion-hardware-bridge-${Math.random().toString(16).slice(2)}`,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
})

client.on('connect', () => {
  console.log(`Emotion bridge conectado a ${mqttUrl}`)
  client.subscribe([emotionTopic, robotStatusTopic, robotErrorTopic], { qos: 1 }, (error) => {
    if (error) {
      console.error(`No se pudo suscribir: ${error.message}`)
      return
    }
    console.log(`Escuchando emociones en ${emotionTopic}`)
    console.log(`Publicara hardware_test en ${robotCommandTopic}`)
  })
})

client.on('message', (topic, message) => {
  if (topic === robotStatusTopic || topic === robotErrorTopic) {
    console.log(`${topic}: ${message.toString()}`)
    return
  }

  let payload
  try {
    payload = JSON.parse(message.toString())
  } catch {
    console.error('Emotion input invalido: JSON no parseable')
    return
  }

  const emotion = normalizeEmotion(payload.facial_emotion)
  const movement = emotionMap[emotion] || emotionMap.neutral
  const command = {
    type: 'hardware_test',
    servo: 'test',
    angle: movement.angle,
    duration_ms: movement.duration_ms,
  }

  client.publish(robotCommandTopic, JSON.stringify(command), { qos: 1 }, (error) => {
    if (error) {
      console.error(`No se pudo publicar hardware_test: ${error.message}`)
      return
    }
    console.log(`Emotion ${emotion} -> ${robotCommandTopic}: ${JSON.stringify(command)}`)
  })
})

client.on('error', (error) => {
  console.error(`MQTT error: ${error.message}`)
})

function normalizeEmotion(value) {
  const key = String(value || 'neutral').trim().toLowerCase()
  return emotionMap[key] ? key : aliases[key] || 'neutral'
}
