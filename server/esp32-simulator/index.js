import mqtt from 'mqtt'
import { ARM_CALIBRATION_TOPICS, DEFAULT_DEVICE_ID, TOPIC_KEYS, createTopicMap, normalizeDeviceId, parseJsonMessage } from '../../packages/contracts/mqttContract.js'
import { loadServerEnv } from '../loadEnv.js'
import { createCalibrationSimulator } from './calibrationState.js'

loadServerEnv()

const deviceId = normalizeDeviceId(process.env.MQTT_DEVICE_ID || process.env.MOODCAM_DEVICE_ID || DEFAULT_DEVICE_ID)
const mqttUrl = process.env.MQTT_URL || process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt'
const commandDelayMs = clampNumber(process.env.ESP32_SIMULATOR_DELAY_MS, 0, 5000, 80)
const topics = createTopicMap(deviceId)
const calibration = createCalibrationSimulator()

const client = mqtt.connect(mqttUrl, {
  clean: true,
  reconnectPeriod: 5000,
  clientId: `moodcam-esp32-simulator-${deviceId}-${Math.random().toString(16).slice(2)}`,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
})

client.on('connect', () => {
  console.log(`ESP32 simulator conectado a ${mqttUrl} para ${deviceId}`)
  client.subscribe([topics[TOPIC_KEYS.robotCommand], ARM_CALIBRATION_TOPICS.command], { qos: 1 })
  publishStatus('idle', { message: 'Simulador listo.' })
  publishCalibrationStatus({ status: 'joint_state', ...calibration.getState(), position_known: false, angles_are_commanded: true })
})

client.on('message', async (topic, message) => {
  const command = parseJsonMessage(message)
  if (!command || typeof command !== 'object') return

  if (topic === ARM_CALIBRATION_TOPICS.command) {
    handleCalibrationCommand(command)
    return
  }

  const status = statusForCommand(command.type)
  publishStatus(status, {
    plan_id: command.plan_id,
    sequence_index: command.sequence_index,
    sequence_total: command.sequence_total,
    command_type: command.type,
  })

  if (Array.isArray(command.points)) {
    for (const point of command.points) {
      moveTo(point.x, point.y, point.z)
      setBrush(Boolean(point.brush))
      await sleep(commandDelayMs)
    }
  }

  if (typeof command.speed === 'number') setSpeed(command.speed)

  if (command.type === 'paint_sequence_end') {
    publishStatus('idle', {
      plan_id: command.plan_id,
      message: 'Secuencia terminada.',
    })
  }
})

client.on('error', (error) => {
  console.error('ESP32 simulator MQTT error:', error.message)
})

function handleCalibrationCommand(command) {
  const messages = calibration.handleCommand(command)
  messages.forEach((message) => {
    if (message.topic === 'error') {
      publishCalibrationError(message.payload)
      return
    }
    publishCalibrationStatus(message.payload)
  })
}

function statusForCommand(type) {
  if (type === 'paint_sequence_start') return 'idle'
  if (type === 'move_to_paint' || type === 'dip_paint') return 'loading_paint'
  if (type === 'stroke') return 'painting'
  if (type === 'move_to_water' || type === 'rinse_brush') return 'rinsing'
  if (type === 'move_to_towel' || type === 'dry_brush') return 'drying'
  if (type === 'move_to_rest') return 'resting'
  if (type === 'paint_sequence_end') return 'resting'
  return 'error'
}

function publishStatus(status, extra = {}) {
  client.publish(topics[TOPIC_KEYS.robotStatus], JSON.stringify({
    device_id: deviceId,
    status,
    ...extra,
    timestamp: Date.now(),
  }), { qos: 0 })
}

function publishCalibrationStatus(payload) {
  client.publish(ARM_CALIBRATION_TOPICS.status, JSON.stringify({
    ...payload,
    timestamp: Date.now(),
  }), { qos: 0 })
}

function publishCalibrationError(payload) {
  client.publish(ARM_CALIBRATION_TOPICS.error, JSON.stringify({
    ...payload,
    timestamp: Date.now(),
  }), { qos: 0 })
}

function moveTo(x, y, z) {
  console.log(`moveTo(${x}, ${y}, ${z})`)
}

function setBrush(active) {
  console.log(`setBrush(${active ? 'on' : 'off'})`)
}

function setSpeed(value) {
  console.log(`setSpeed(${value})`)
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
