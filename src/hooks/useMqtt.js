import { useEffect, useRef, useState, useCallback } from 'react'
import mqtt from 'mqtt'
import {
    ARM_CALIBRATION_COMMAND_TYPES,
    DEFAULT_DEVICE_ID,
    TOPIC_KEYS,
    buildFaceEmotionPayload,
    buildSessionStartPayload,
    buildSessionSummaryPayload,
    createMqttClientId,
    createRobotCommandSequence,
    createTopicMap,
    parseJsonMessage,
    topicFor,
} from '../lib/mqttContract'

const MQTT_STORAGE_KEY = 'moodcam-mqtt-config'

export const DEFAULT_MQTT_CONFIG = {
    enabled: false,
    brokerUrl: 'wss://broker.hivemq.com:8884/mqtt',
    deviceId: DEFAULT_DEVICE_ID,
    topicBase: `moodcam/${DEFAULT_DEVICE_ID}`,
    topics: createTopicMap(DEFAULT_DEVICE_ID),
    username: '',
    password: '',
    interval: 2000,
}

function loadMqttConfig() {
    try {
        const stored = localStorage.getItem(MQTT_STORAGE_KEY)
        if (!stored) return null
        const parsed = JSON.parse(stored)
        return mergeDeep(structuredClone(DEFAULT_MQTT_CONFIG), parsed)
    } catch {
        return null
    }
}

function saveMqttConfig(config) {
    try {
        localStorage.setItem(MQTT_STORAGE_KEY, JSON.stringify(config))
    } catch {
        // Silenciar errores
    }
}

function mergeDeep(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && key in target) {
            mergeDeep(target[key], source[key])
        } else if (key in target) {
            target[key] = source[key]
        }
    }
    return target
}

function getTopic(config, key) {
    const configured = config.topics?.[key]?.trim()
    if (configured) return configured
    return topicFor(key, config.deviceId || DEFAULT_DEVICE_ID)
}

function toJsonPayload(payload) {
    return JSON.stringify(payload)
}

export default function useMqtt() {
    const [mqttConfig, setMqttConfig] = useState(() => loadMqttConfig() || structuredClone(DEFAULT_MQTT_CONFIG))
    const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected | connecting | connected | error
    const [lastError, setLastError] = useState(null)
    const [lastPublished, setLastPublished] = useState(null)
    const [lastRobotStatus, setLastRobotStatus] = useState(null)
    const [lastAiPlan, setLastAiPlan] = useState(null)
    const [lastSystemError, setLastSystemError] = useState(null)
    const [lastCalibrationStatus, setLastCalibrationStatus] = useState(null)
    const [lastCalibrationError, setLastCalibrationError] = useState(null)
    const [lastCalibrationCommand, setLastCalibrationCommand] = useState(null)

    const clientRef = useRef(null)
    const configRef = useRef(mqttConfig)
    const lastSentRef = useRef({ dominant: null, timestamp: 0 })

    // Sincronizar ref
    useEffect(() => {
        configRef.current = mqttConfig
    }, [mqttConfig])

    // Persistir config
    useEffect(() => {
        saveMqttConfig(mqttConfig)
    }, [mqttConfig])

    const updateMqttConfig = useCallback((key, value) => {
        setMqttConfig(prev => {
            const next = structuredClone(prev)
            if (key === 'deviceId') {
                next.deviceId = value
                next.topicBase = `moodcam/${value || DEFAULT_DEVICE_ID}`
                next.topics = createTopicMap(value || DEFAULT_DEVICE_ID)
                return next
            }
            const keys = key.split('.')
            let obj = next
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]]
            }
            obj[keys[keys.length - 1]] = value
            return next
        })
    }, [])

    const resetMqttConfig = useCallback(() => {
        setMqttConfig(structuredClone(DEFAULT_MQTT_CONFIG))
    }, [])

    // Conectar / desconectar según config.enabled
    useEffect(() => {
        if (!mqttConfig.enabled || !mqttConfig.brokerUrl) {
            // Desconectar si estaba conectado
            if (clientRef.current) {
                clientRef.current.end(true)
                clientRef.current = null
            }
            setConnectionStatus('disconnected')
            setLastError(null)
            return
        }

        // Normalizar URL: asegurar que tenga protocolo wss:// o ws://
        let brokerUrl = mqttConfig.brokerUrl.trim()
        if (!/^wss?:\/\//i.test(brokerUrl)) {
            brokerUrl = `wss://${brokerUrl}`
        }
        // Asegurar puerto :8884 si no se especificó uno y es wss://
        if (/^wss:\/\//i.test(brokerUrl) && !/:\d+/.test(brokerUrl.replace(/^wss?:\/\//, ''))) {
            // Insertar :8884 antes del path
            brokerUrl = brokerUrl.replace(/^(wss:\/\/[^/]+)/, '$1:8884')
        }
        // Asegurar path /mqtt si no tiene path
        if (!/\/\w/.test(brokerUrl.replace(/^wss?:\/\/[^/]*/, ''))) {
            brokerUrl = brokerUrl.replace(/\/?$/, '/mqtt')
        }

        setConnectionStatus('connecting')
        setLastError(null)

        const options = {
            reconnectPeriod: 5000,
            connectTimeout: 10000,
            clean: true,
            clientId: createMqttClientId('web', mqttConfig.deviceId || DEFAULT_DEVICE_ID, Math.random().toString(16).slice(2)),
            will: {
                topic: getTopic(mqttConfig, TOPIC_KEYS.moodcamStatus),
                payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
                qos: 1,
                retain: true,
            },
        }

        if (mqttConfig.username) {
            options.username = mqttConfig.username
        }
        if (mqttConfig.password) {
            options.password = mqttConfig.password
        }

        let client
        try {
            client = mqtt.connect(brokerUrl, options)
        } catch (err) {
            console.error('MQTT connect error:', err)
            setLastError(err.message || 'URL del broker inválida')
            setConnectionStatus('error')
            return
        }
        clientRef.current = client

        client.on('connect', () => {
            setConnectionStatus('connected')
            setLastError(null)
            // Publicar estado online
            client.publish(
                getTopic(configRef.current, TOPIC_KEYS.moodcamStatus),
                JSON.stringify({ status: 'online', timestamp: Date.now() }),
                { qos: 1, retain: true }
            )
            client.subscribe([...new Set([
                getTopic(configRef.current, TOPIC_KEYS.robotStatus),
                getTopic(configRef.current, TOPIC_KEYS.strokePlan),
                getTopic(configRef.current, TOPIC_KEYS.systemError),
            ])], { qos: 0 })
        })

        client.on('message', (topic, message) => {
            const parsedPayload = parseJsonMessage(message)
            const receivedMessage = { topic, payload: parsedPayload, timestamp: Date.now() }
            if (topic === getTopic(configRef.current, TOPIC_KEYS.robotStatus)) {
                setLastRobotStatus(receivedMessage)
                if (isCalibrationStatus(parsedPayload)) {
                    setLastCalibrationStatus(receivedMessage)
                }
            }
            if (topic === getTopic(configRef.current, TOPIC_KEYS.strokePlan)) {
                setLastAiPlan({
                    topic,
                    payload: parseJsonMessage(message),
                    timestamp: Date.now(),
                })
                setLastSystemError(null)
            }
            if (topic === getTopic(configRef.current, TOPIC_KEYS.systemError)) {
                setLastSystemError({
                    topic,
                    payload: parseJsonMessage(message),
                    timestamp: Date.now(),
                })
                if (parsedPayload?.type !== 'ai_bridge_error' && parsedPayload?.type !== 'bridge_offline') {
                    setLastCalibrationError(receivedMessage)
                }
            }
        })

        client.on('error', (err) => {
            console.error('MQTT error:', err)
            setLastError(err.message || 'Error de conexión')
            setConnectionStatus('error')
        })

        client.on('reconnect', () => {
            setConnectionStatus('connecting')
        })

        client.on('close', () => {
            if (configRef.current.enabled) {
                setConnectionStatus('connecting')
            } else {
                setConnectionStatus('disconnected')
            }
        })

        client.on('offline', () => {
            setConnectionStatus('disconnected')
        })

        return () => {
            // Publicar offline antes de cerrar
            if (client.connected) {
                client.publish(
                    getTopic(configRef.current, TOPIC_KEYS.moodcamStatus),
                    JSON.stringify({ status: 'offline', timestamp: Date.now() }),
                    { qos: 1, retain: true }
                )
            }
            client.end(true)
            clientRef.current = null
            setConnectionStatus('disconnected')
        }
    }, [mqttConfig])

    const publishJson = useCallback((topicKey, payload, options = { qos: 0 }) => {
        const client = clientRef.current
        const config = configRef.current
        if (!client || !client.connected || !config.enabled) return false

        const topic = getTopic(config, topicKey)
        client.publish(topic, toJsonPayload(payload), options)
        setLastPublished({ topic, payload, timestamp: Date.now() })
        return true
    }, [])

    const publishFaceEmotion = useCallback(({ sessionId, artistId, emotions, dominant, calibration, mobility, sampleCount, sessionActive }) => {
        const client = clientRef.current
        const config = configRef.current
        if (!client || !client.connected || !config.enabled || !emotions || !dominant) return

        const now = Date.now()
        const last = lastSentRef.current
        const elapsed = now - last.timestamp
        const dominantChanged = dominant !== last.dominant
        const intervalPassed = elapsed >= config.interval

        // Estrategia híbrida: publicar si cambió la emoción dominante O si pasó el intervalo
        if (!dominantChanged && !intervalPassed) return

        const payload = {
            ...buildFaceEmotionPayload({
                sessionId,
                deviceId: config.deviceId,
                artistId,
                emotions,
                dominant,
                calibration,
                mobility,
                sampleCount,
                sessionActive,
            }),
            trigger: dominantChanged ? 'change' : 'heartbeat',
        }

        client.publish(
            getTopic(config, TOPIC_KEYS.faceEmotion),
            JSON.stringify(payload),
            { qos: 0 }
        )
        setLastPublished({ topic: getTopic(config, TOPIC_KEYS.faceEmotion), payload, timestamp: now })

        lastSentRef.current = { dominant, timestamp: now }
    }, [])

    const publishSessionStart = useCallback(({ sessionId, artist, mobility, calibration, conversationMode }) => (
        publishJson(TOPIC_KEYS.sessionStart, buildSessionStartPayload({
            sessionId,
            deviceId: configRef.current.deviceId,
            artist,
            mobility,
            calibration,
            conversationMode,
        }), { qos: 1 })
    ), [publishJson])

    const publishArtPlan = useCallback((plan) => (
        publishJson(TOPIC_KEYS.strokePlan, plan, { qos: 1 })
    ), [publishJson])

    const publishSessionSummary = useCallback((summary) => (
        publishJson(TOPIC_KEYS.sessionSummary, buildSessionSummaryPayload({
            ...summary,
            deviceId: configRef.current.deviceId,
        }), { qos: 1 })
    ), [publishJson])

    const publishRobotCommands = useCallback((plan) => {
        const client = clientRef.current
        const config = configRef.current
        if (!client || !client.connected || !config.enabled) return false

        const topic = getTopic(config, TOPIC_KEYS.robotCommand)
        const messages = createRobotCommandSequence(plan)

        messages.forEach((payload) => {
            client.publish(topic, toJsonPayload(payload), { qos: 1 })
        })
        setLastPublished({
            topic,
            payload: { type: 'paint_sequence', command_count: plan.robot_commands.length },
            timestamp: Date.now(),
        })
        return true
    }, [])

    const publishCalibrationCommand = useCallback((payload) => {
        const client = clientRef.current
        const config = configRef.current
        if (!payload || !ARM_CALIBRATION_COMMAND_TYPES.includes(payload.type)) return false
        if (!client || !client.connected || !config.enabled) return false

        const topic = getTopic(config, TOPIC_KEYS.robotCommand)
        client.publish(topic, toJsonPayload(payload), { qos: 1 })
        const published = {
            topic,
            payload,
            timestamp: Date.now(),
        }
        setLastCalibrationCommand(published)
        setLastPublished(published)
        return true
    }, [])

    return {
        mqttConfig,
        updateMqttConfig,
        resetMqttConfig,
        connectionStatus,
        lastError,
        lastPublished,
        lastRobotStatus,
        lastAiPlan,
        lastSystemError,
        lastCalibrationStatus,
        lastCalibrationError,
        lastCalibrationCommand,
        publishFaceEmotion,
        publishSessionStart,
        publishSessionSummary,
        publishArtPlan,
        publishRobotCommands,
        publishCalibrationCommand,
    }
}

function isCalibrationStatus(payload) {
    return [
        'joint_state',
        'calibration_started',
        'moving',
        'movement_completed',
        'stopped',
        'servos_released',
        'servo_attaching',
    ].includes(payload?.status)
}
