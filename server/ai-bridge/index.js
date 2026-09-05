// Orquestador MQTT del AI Bridge: recuerda sesiones, decide arte y publica al robot.
import mqtt from 'mqtt'
import { pathToFileURL } from 'node:url'
import { TOPIC_KEYS, buildPresencePayload, parseJsonMessage } from '../../packages/contracts/mqttContract.js'
import { buildMqttOptions, loadBridgeConfig } from './config.js'
import { createSessionEndChunk, decideArtChunk, decideArtPlan } from './providers/artDecisionProvider.js'
import { publishBridgeError, publishChunkAndCommands, publishPlanAndCommands } from './providers/robotCommandPublisher.js'

const sessions = new Map()
const BRIDGE_PRESENCE_INTERVAL_MS = 5000

export function startAiBridge(config = loadBridgeConfig()) {
  // Inicia la conexión, presencia y suscripciones del proceso de decisión.
  const client = mqtt.connect(config.mqttUrl, buildMqttOptions(config))
  const queueTracker = createRobotQueueTracker(config)
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
      config.topics[TOPIC_KEYS.sessionWindow],
      config.topics[TOPIC_KEYS.sessionEnd],
      config.topics[TOPIC_KEYS.robotStatus],
    ], { qos: 1 })
  })

  client.on('message', async (topic, message) => {
    // MQTT entrega bytes; primero intentamos convertirlos en un objeto JSON.
    // Un mensaje incompleto se ignora para no derribar todo el bridge.
    const payload = parseJsonMessage(message)
    if (!payload || typeof payload !== 'object') return

    try {
      if (topic === config.topics[TOPIC_KEYS.sessionStart]) {
        resetForNewSession(payload, queueTracker)
        console.log(`Sesion iniciada: ${payload.session_id || 'sin id'}`)
      }

      if (topic === config.topics[TOPIC_KEYS.faceEmotion]) {
        rememberFaceEmotion(payload)
      }

      if (topic === config.topics[TOPIC_KEYS.robotStatus]) {
        rememberRobotStatus(payload)
        queueTracker.observe(payload)
      }

      if (topic === config.topics[TOPIC_KEYS.sessionSummary]) {
        // El resumen cierra la decision global. Si ya llegaron chunks durante
        // la sesion, publicamos el plan informativo sin repetir comandos fisicos.
        rememberSession(payload)
        const sessionState = getSession(payload.session_id) || {}
        const latestFaceEmotion = sessionState.latestFaceEmotion
        const decision = await decideArtPlan({ sessionSummary: payload, latestFaceEmotion, config })
        if (sessionState.completed_stroke_count > 0) {
          client.publish(config.topics[TOPIC_KEYS.strokePlan], JSON.stringify(decision.plan), { qos: 1 })
          console.log(`Plan ${decision.plan.id} publicado sin comandos: la sesion ya genero ${sessionState.completed_stroke_count} trazos.`)
          return
        }
        const publishResult = await publishPlanAndCommands(client, config, decision.plan, {
          waitForQueueCapacity: () => queueTracker.waitForCapacity(),
          onCommandPublished: () => queueTracker.reserveCommand(),
        })

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

      if (topic === config.topics[TOPIC_KEYS.sessionWindow]) {
        // Cada ventana permite que la obra avance mientras la persona sigue
        // participando; la cola del robot se vigila antes de enviar mas trabajo.
        rememberSessionWindow(payload)
        const sessionState = getSession(payload.session_id) || {}
        const queueBlockReason = queueBackpressureReason(sessionState.latestRobotStatus, config)
        if (queueBlockReason) {
          console.warn(`Ventana ${payload.window_index} en espera: ${queueBlockReason}`)
        }

        const decision = await decideArtChunk({ emotionWindow: payload, sessionState, config })
        const publishResult = await publishChunkAndCommands(client, config, decision.chunk, {
          waitForQueueCapacity: () => queueTracker.waitForCapacity(),
          onCommandPublished: () => queueTracker.reserveCommand(),
        })

        if (decision.source === 'local_fallback') {
          publishBridgeError(client, config, {
            session_id: payload.session_id,
            severity: 'warning',
            message: decision.reason,
            fallback: true,
          })
        }

        rememberPublishedChunk(decision.chunk)
        console.log(`Chunk ${decision.chunk.chunk_id} publicado (${decision.source}) con ${publishResult.commandCount} mensajes.`)
        if (decision.reason) {
          console.warn(`Motivo ${decision.source}: ${decision.reason}`)
        }
      }

      if (topic === config.topics[TOPIC_KEYS.sessionEnd]) {
        rememberSession(payload)
        const sessionState = getSession(payload.session_id) || {}
        const chunk = createSessionEndChunk({ sessionEnd: payload, sessionState })
        const publishResult = await publishChunkAndCommands(client, config, chunk, {
          waitForQueueCapacity: () => queueTracker.waitForCapacity(),
          onCommandPublished: () => queueTracker.reserveCommand(),
        })
        rememberPublishedChunk(chunk)
        console.log(`Cierre ${chunk.chunk_id} publicado con ${publishResult.commandCount} mensajes.`)
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
    extra: {
      openai_configured: Boolean(config.openaiApiKey),
    },
  })), { qos: 0, retain: true })
}

function rememberSession(payload) {
  // Guardamos solo estado temporal necesario para unir mensajes de una misma sesion.
  // La clave de reserva latest permite aceptar estados del robot sin session_id.
  const key = payload.session_id || 'latest'
  sessions.set(key, {
    ...getSession(key),
    session: payload,
  })
}

function resetForNewSession(payload, queueTracker) {
  const latestRobotStatus = getSession('latest')?.latestRobotStatus
  sessions.clear()
  sessions.set('latest', latestRobotStatus ? { latestRobotStatus } : {})
  sessions.set(payload.session_id || 'latest', {
    session: payload,
    latestRobotStatus,
  })
  queueTracker.reset(latestRobotStatus)
}

function rememberFaceEmotion(payload) {
  const key = payload.session_id || 'latest'
  sessions.set(key, {
    ...getSession(key),
    latestFaceEmotion: payload,
  })
}

function rememberSessionWindow(payload) {
  const key = payload.session_id || 'latest'
  const previous = getSession(key)
  sessions.set(key, {
    ...previous,
    session: previous?.session || payload,
    artist_id: payload.artist_id || previous?.artist_id,
    calibration: payload.calibration || previous?.calibration,
    mobility: payload.mobility || previous?.mobility,
    latestWindow: payload,
  })
}

function rememberRobotStatus(payload) {
  const key = payload.session_id || 'latest'
  const previous = getSession(key)
  const next = {
    ...previous,
    latestRobotStatus: payload,
  }
  sessions.set(key, next)

  if (key !== 'latest') {
    sessions.set('latest', {
      ...getSession('latest'),
      latestRobotStatus: payload,
    })
  }
}

function rememberPublishedChunk(chunk) {
  const key = chunk.session_id || 'latest'
  const previous = getSession(key)
  const chunks = previous?.chunks || []
  sessions.set(key, {
    ...previous,
    completed_stroke_count: (previous?.completed_stroke_count || 0)
      + (Array.isArray(chunk.strokes) ? chunk.strokes.length : 0),
    chunks: [...chunks, {
      chunk_id: chunk.chunk_id,
      window_index: chunk.window_index,
      command_count: Array.isArray(chunk.robot_commands) ? chunk.robot_commands.length : 0,
      timestamp: Date.now(),
    }],
  })
}

function queueBackpressureReason(robotStatus, config) {
  if (!robotStatus || typeof robotStatus !== 'object') return ''
  if (robotStatus.queue_full === true || robotStatus.status === 'queue_full') return 'ESP32 informa queue_full; AI Bridge pausa la ventana.'
  const queueDepth = Number(robotStatus.queue_depth)
  if (Number.isFinite(queueDepth) && queueDepth >= config.queueHighWaterMark) {
    return `ESP32 queue_depth=${queueDepth} supera umbral ${config.queueHighWaterMark}; AI Bridge pausa la ventana.`
  }
  return ''
}

function createRobotQueueTracker(config) {
  // El tracker combina lo que el ESP32 confirma con lo que acabamos de reservar.
  // Esto evita llenar la cola entre dos mensajes de estado consecutivos.
  let observedDepth = 0
  let reservedDepth = 0

  return {
    reset(payload) {
      const depth = Number(payload?.queue_depth)
      observedDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0
      reservedDepth = observedDepth
    },
    observe(payload) {
      const depth = Number(payload?.queue_depth)
      if (!Number.isFinite(depth)) return
      const drainedDepth = Math.max(0, observedDepth - depth)
      observedDepth = Math.max(0, depth)
      reservedDepth = Math.max(observedDepth, reservedDepth - drainedDepth)
    },
    reserveCommand() {
      reservedDepth++
    },
    async waitForCapacity() {
      const deadline = Date.now() + config.queueWaitTimeoutMs
      while (Date.now() < deadline) {
        if (Math.max(observedDepth, reservedDepth) < config.queueHighWaterMark) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      throw new Error(`ESP32 no libera espacio en la cola de comandos durante ${Math.round(config.queueWaitTimeoutMs / 1000)} segundos.`)
    },
  }
}

function getSession(sessionId) {
  const key = sessionId || 'latest'
  return sessions.get(key) || (key !== 'latest' ? sessions.get('latest') : null) || null
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startAiBridge()
}
