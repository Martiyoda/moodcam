import { TOPIC_KEYS, createRobotCommandSequence } from '../../../packages/contracts/mqttContract.js'

export async function publishPlanAndCommands(client, config, plan) {
  publishJson(client, config.topics[TOPIC_KEYS.strokePlan], plan, { qos: 1 })

  const commandMessages = createRobotCommandSequence(plan)
  for (const command of commandMessages) {
    publishJson(client, config.topics[TOPIC_KEYS.robotCommand], command, { qos: 1 })
    if (config.commandDelayMs > 0) await sleep(config.commandDelayMs)
  }

  return {
    planTopic: config.topics[TOPIC_KEYS.strokePlan],
    commandTopic: config.topics[TOPIC_KEYS.robotCommand],
    commandCount: commandMessages.length,
  }
}

export function publishBridgeError(client, config, payload) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
