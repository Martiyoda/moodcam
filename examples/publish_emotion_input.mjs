import mqtt from 'mqtt'
import { loadServerEnv } from '../server/loadEnv.js'

loadServerEnv()

const mqttUrl = process.env.MQTT_URL || process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt'
const emotionTopic = process.env.MQTT_EMOTION_INPUT_TOPIC || 'emotion/input'

const payload = {
  selected_artist: 'pollock',
  facial_emotion: process.env.TEST_FACIAL_EMOTION || 'happy',
  facial_confidence: 0.82,
  voice_emotion: 'high_energy',
  voice_confidence: 0.7,
  user_text: 'Me siento motivado',
  available_colors: ['rojo', 'amarillo', 'negro'],
}

const client = mqtt.connect(mqttUrl, {
  clean: true,
  reconnectPeriod: 0,
  connectTimeout: 10_000,
  clientId: `emotion-publisher-${Math.random().toString(16).slice(2)}`,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
})

client.on('connect', () => {
  client.publish(emotionTopic, JSON.stringify(payload), { qos: 1 }, (error) => {
    if (error) {
      console.error(`No se pudo publicar emocion: ${error.message}`)
      client.end(true, () => process.exit(1))
      return
    }
    console.log(`Emocion publicada en ${emotionTopic}: ${JSON.stringify(payload)}`)
    client.end(true, () => process.exit(0))
  })
})

client.on('error', (error) => {
  console.error(`MQTT error: ${error.message}`)
  client.end(true, () => process.exit(1))
})
