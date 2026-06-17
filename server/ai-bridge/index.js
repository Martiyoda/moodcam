import mqtt from 'mqtt'
import { pathToFileURL } from 'node:url'
import { TOPIC_KEYS, parseJsonMessage } from '../../packages/contracts/mqttContract.js'
import { buildMqttOptions, loadBridgeConfig } from './config.js'
import { decideArtPlan } from './providers/artDecisionProvider.js'
import { publishBridgeError, publishPlanAndCommands } from './providers/robotCommandPublisher.js'

const sessions = new Map()

export function startAiBridge(config = loadBridgeConfig()) {
  const client = mqtt.connect(config.mqttUrl, buildMqttOptions(config))

  client.on('connect', () => {
    console.log(`AI Bridge conectado a ${config.mqttUrl} para ${config.deviceId}`)
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

  return client
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
