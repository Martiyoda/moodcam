// Publica planes/chunks y sus comandos, respetando capacidad de cola y orden global.
import { TOPIC_KEYS, buildStrokeChunkPayload, createRobotCommandSequence } from '../../../packages/contracts/mqttContract.js'

let robotCommandPublishChain = Promise.resolve()

export async function publishPlanAndCommands(client, config, plan, options = {}) {
  // Envía el plan y después su secuencia de comandos físicos.
  return runExclusiveRobotPublish(async () => {
    publishJson(client, config.topics[TOPIC_KEYS.strokePlan], plan, { qos: 1 })

    const commandMessages = createRobotCommandSequence(plan)
    for (const command of commandMessages) {
      await waitForQueueCapacity(options.waitForQueueCapacity)
      publishJson(client, config.topics[TOPIC_KEYS.robotCommand], command, { qos: 1 })
      options.onCommandPublished?.()
      if (config.commandDelayMs > 0) await sleep(config.commandDelayMs)
    }

    return {
      planTopic: config.topics[TOPIC_KEYS.strokePlan],
      commandTopic: config.topics[TOPIC_KEYS.robotCommand],
      commandCount: commandMessages.length,
    }
  })
}

export async function publishChunkAndCommands(client, config, chunk, options = {}) {
  // Envía un chunk incremental y sus comandos asociados.
  return runExclusiveRobotPublish(async () => {
    publishJson(client, config.topics[TOPIC_KEYS.strokeChunk], buildStrokeChunkPayload({
      sessionId: chunk.session_id,
      deviceId: chunk.device_id || config.deviceId,
      chunkId: chunk.chunk_id || chunk.id,
      windowIndex: chunk.window_index,
      chunkIndex: chunk.chunk_index,
      chunkTotal: chunk.chunk_total,
      artist: { id: chunk.artist, name: chunk.artist_name },
      decisionSource: chunk.decision_source,
      directives: chunk.directives || compactObject({ ai_directive: chunk.ai_directive }),
      robotCommands: chunk.robot_commands,
      summary: chunk.summary,
    }), { qos: 1 })

    const commandMessages = createRobotCommandSequence(chunk)
    for (const command of commandMessages) {
      await waitForQueueCapacity(options.waitForQueueCapacity)
      publishJson(client, config.topics[TOPIC_KEYS.robotCommand], command, { qos: 1 })
      options.onCommandPublished?.()
      if (config.commandDelayMs > 0) await sleep(config.commandDelayMs)
    }

    return {
      chunkTopic: config.topics[TOPIC_KEYS.strokeChunk],
      commandTopic: config.topics[TOPIC_KEYS.robotCommand],
      commandCount: commandMessages.length,
    }
  })
}

export function publishBridgeError(client, config, payload) {
  // Notifica errores de decisión o fallback al resto del sistema.
  publishJson(client, config.topics[TOPIC_KEYS.systemError], {
    type: 'ai_bridge_error',
    device_id: config.deviceId,
    ...payload,
    timestamp: Date.now(),
  }, { qos: 1 })
}

function publishJson(client, topic, payload, options) {
  client.publish(topic, JSON.stringify(payload), options)
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForQueueCapacity(waitForQueueCapacity) {
  if (typeof waitForQueueCapacity === 'function') {
    await waitForQueueCapacity()
  }
}

function runExclusiveRobotPublish(task) {
  // Serializa publicaciones para evitar que dos sesiones intercalen comandos.
  const result = robotCommandPublishChain.then(task, task)
  robotCommandPublishChain = result.catch(() => {})
  return result
}
