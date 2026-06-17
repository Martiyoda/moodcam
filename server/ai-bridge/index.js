import mqtt from 'mqtt'
import { pathToFileURL } from 'node:url'
import { TOPIC_KEYS, buildPresencePayload, parseJsonMessage } from '../../packages/contracts/mqttContract.js'
import { buildMqttOptions, loadBridgeConfig } from './config.js'
import { decideArtPlan } from './providers/artDecisionProvider.js'
import { publishBridgeError, publishPlanAndCommands } from './providers/robotCommandPublisher.js'

const sessions = new Map()
const BRIDGE_PRESENCE_INTERVAL_MS = 5000

export function startAiBridge(config = loadBridgeConfig()) {
  const client = mqtt.connect(config.mqttUrl, buildMqttOptions(config))
  const startedAt = Date.now()
  let presenceTimer = null

  client.on('connect', () => {
    console.log(`AI Bridge conectado a ${config.mqttUrl} para ${config.deviceId}`)
    console.log(`AI Bridge presencia MQTT: ${config.topics[TOPIC_KEYS.bridgePresence]}`)
    publishBridgePresence(client, config, startedAt)
    if (presenceTimer) clearInterval(presenceTimer)
    presenceTimer = setInterval(() => {
      if (client.connected) publishBridgePresence(client, config, startedAt)
    }, BRIDGE_PRESENCE_INTERVAL_MS)
    client.subscribe([
      config.topics[TOPIC_KEYS.sessionStart],
      config.topics[TOPIC_KEYS.faceEmotion],
      config.topics[TOPIC_KEYS.sessionSummary],
    ], { qos: 1 })
  })

  client.on('message', async (topic, message) => {
    const payload = parseJsonMessage(message)
    if (!payload || typeof payload !== 'object') return

    try {
      if (topic === config.topics[TOPIC_KEYS.sessionStart]) {
        rememberSession(payload)
        console.log(`Sesion iniciada: ${payload.session_id || 'sin id'}`)
      }

      if (topic === config.topics[TOPIC_KEYS.faceEmotion]) {
        rememberFaceEmotion(payload)
      }

      if (topic === config.topics[TOPIC_KEYS.sessionSummary]) {
        rememberSession(payload)
        const latestFaceEmotion = getSession(payload.session_id)?.latestFaceEmotion
        const decision = await decideArtPlan({ sessionSummary: payload, latestFaceEmotion, config })
        const publishResult = await publishPlanAndCommands(client, config, decision.plan)

        if (decision.source === 'local_fallback') {
          publishBridgeError(client, config, {
            session_id: payload.session_id,
            severity: 'warning',
            message: decision.reason,
            fallback: true,
          })
        }

        console.log(`Plan ${decision.plan.id} publicado (${decision.source}) con ${publishResult.commandCount} mensajes.`)
        if (decision.reason) {
          console.warn(`Motivo ${decision.source}: ${decision.reason}`)
        }
      }
    } catch (error) {
      publishBridgeError(client, config, {
        session_id: payload.session_id,
        severity: 'error',
        message: error.message || 'Error procesando mensaje MQTT.',
      })
      console.error('AI Bridge error:', error)
    }
  })

  client.on('error', (error) => {
    console.error('MQTT bridge error:', error.message)
  })

  client.on('close', () => {
    if (presenceTimer) {
      clearInterval(presenceTimer)
      presenceTimer = null
    }
  })

  return client
}

function publishBridgePresence(client, config, startedAt) {
  client.publish(config.topics[TOPIC_KEYS.bridgePresence], JSON.stringify(buildPresencePayload({
    deviceId: config.deviceId,
    component: 'ai-bridge',
    uptimeMs: Date.now() - startedAt,
    intervalMs: BRIDGE_PRESENCE_INTERVAL_MS,
  })), { qos: 0, retain: true })
}

function rememberSession(payload) {
  const key = payload.session_id || 'latest'
  sessions.set(key, {
    ...getSession(key),
    session: payload,
  })
}

function rememberFaceEmotion(payload) {
  const key = payload.session_id || 'latest'
  sessions.set(key, {
    ...getSession(key),
    latestFaceEmotion: payload,
  })
}

function getSession(sessionId) {
  return sessions.get(sessionId || 'latest') || null
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startAiBridge()
}
