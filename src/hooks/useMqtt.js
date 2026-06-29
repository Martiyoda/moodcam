import { useEffect, useRef, useState, useCallback } from 'react'
import mqtt from 'mqtt'

const MQTT_STORAGE_KEY = 'moodcam-mqtt-config'

export const DEFAULT_MQTT_CONFIG = {
    enabled: false,
    brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
    topicBase: 'moodcam/device1',
    username: '',
    password: '',
    interval: 2000,
}

function loadMqttConfig() {
    try {
        const stored = localStorage.getItem(MQTT_STORAGE_KEY)
        if (!stored) return null
        const parsed = JSON.parse(stored)
        return { ...structuredClone(DEFAULT_MQTT_CONFIG), ...parsed }
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

export default function useMqtt() {
    const [mqttConfig, setMqttConfig] = useState(() => loadMqttConfig() || structuredClone(DEFAULT_MQTT_CONFIG))
    const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected | connecting | connected | error
    const [lastError, setLastError] = useState(null)

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
        setMqttConfig(prev => ({ ...prev, [key]: value }))
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
            will: {
                topic: `${mqttConfig.topicBase}/status`,
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
                `${configRef.current.topicBase}/status`,
                JSON.stringify({ status: 'online', timestamp: Date.now() }),
                { qos: 1, retain: true }
            )
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
                    `${configRef.current.topicBase}/status`,
                    JSON.stringify({ status: 'offline', timestamp: Date.now() }),
                    { qos: 1, retain: true }
                )
            }
            client.end(true)
            clientRef.current = null
            setConnectionStatus('disconnected')
        }
    }, [mqttConfig.enabled, mqttConfig.brokerUrl, mqttConfig.username, mqttConfig.password, mqttConfig.topicBase])

    // Publicar emociones — estrategia híbrida
    const publishEmotion = useCallback((emotions, dominant) => {
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
            dominant,
            confidence: emotions[dominant] ? Math.round(emotions[dominant] * 100) / 100 : 0,
            emotions: Object.fromEntries(
                Object.entries(emotions).map(([k, v]) => [k, Math.round(v * 100) / 100])
            ),
            trigger: dominantChanged ? 'change' : 'heartbeat',
            timestamp: now,
        }

        client.publish(
            `${config.topicBase}/emotion`,
            JSON.stringify(payload),
            { qos: 0 }
        )

        lastSentRef.current = { dominant, timestamp: now }
    }, [])

    return {
        mqttConfig,
        updateMqttConfig,
        resetMqttConfig,
        connectionStatus,
        lastError,
        publishEmotion,
    }
}
