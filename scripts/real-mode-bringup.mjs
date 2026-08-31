#!/usr/bin/env node
// Guia automatizada para poner el brazo en modo real paso a paso.
// Las comprobaciones previas reducen el riesgo de mandar movimiento inesperado.
// Asistente interactivo para los 3 movimientos del paso 4 del protocolo de
// puesta en marcha del modo real. Publica un comando, espera ack/ejecucion
// del firmware y pide confirmacion humana antes de pasar al siguiente.
//
// Uso:
//   npm run robot:bringup -- [--device-id <id>] [--dry-run]
//
// Requiere haber pasado a modo real previamente desde la web (paso 3 del
// protocolo) y que el ESP32 este conectado al broker MQTT.

import mqtt from 'mqtt'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { loadServerEnv } from '../server/loadEnv.js'
import {
    DEFAULT_DEVICE_ID,
    TOPIC_KEYS,
    createMqttClientId,
    createTopicMap,
    normalizeDeviceId,
    parseJsonMessage,
} from '../packages/contracts/mqttContract.js'

loadServerEnv()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const deviceIdArgIndex = args.indexOf('--device-id')
const deviceIdOverride = deviceIdArgIndex >= 0 ? args[deviceIdArgIndex + 1] : null

const deviceId = normalizeDeviceId(
    deviceIdOverride
    || process.env.MQTT_DEVICE_ID
    || process.env.MOODCAM_DEVICE_ID
    || DEFAULT_DEVICE_ID,
)
const mqttUrl = process.env.MQTT_URL
    || process.env.MQTT_BROKER_URL
    || 'wss://broker.hivemq.com:8884/mqtt'
const topics = createTopicMap(deviceId)
const commandTopic = process.env.MQTT_ROBOT_COMMAND_TOPIC?.trim()
    || topics[TOPIC_KEYS.robotCommand]
const statusTopic = topics[TOPIC_KEYS.robotStatus]
const errorTopic = topics[TOPIC_KEYS.systemError]
const presenceTopic = topics[TOPIC_KEYS.esp32Presence]

const ACK_TIMEOUT_MS = 4_000
const EXEC_TIMEOUT_MS = 15_000

const steps = [
    {
        label: '4.1 — Punto central, brush arriba (transit)',
        expectation: 'Movimiento suave a centro del lienzo. Sin oscilaciones al final.',
        command: {
            type: 'move_to_rest',
            points: [{ x: 148, y: 105, z: 35, brush: 0 }],
            speed: 10,
            duration_ms: 2000,
        },
    },
    {
        label: '4.2 — Desplazamiento lateral (base)',
        expectation: 'La base gira ~3 grados, resto apenas cambia. Devuelvelo al centro tras este paso si quieres.',
        command: {
            type: 'move_to_paint',
            points: [{ x: 120, y: 105, z: 35, brush: 0 }],
            speed: 10,
            duration_ms: 2000,
        },
    },
    {
        label: '4.3 — Trazo corto (3 puntos en Y)',
        expectation: 'Base quieta, hombro+codo abren progresivamente, muneca casi sin moverse. Debe seguir llegando presence.',
        command: {
            type: 'stroke',
            points: [
                { x: 148, y: 90, z: 20, brush: 0 },
                { x: 148, y: 105, z: 20, brush: 0 },
                { x: 148, y: 120, z: 20, brush: 0 },
            ],
            speed: 15,
            duration_ms: 3000,
        },
    },
]

function nowIso() {
    return new Date().toISOString()
}

function log(message) {
    console.log(`[${nowIso()}] ${message}`)
}

function warn(message) {
    console.warn(`[${nowIso()}] WARN  ${message}`)
}

function err(message) {
    console.error(`[${nowIso()}] ERROR ${message}`)
}

const rl = readline.createInterface({ input, output })

async function askYesNo(question) {
    while (true) {
        const answer = (await rl.question(`${question} (s/n): `)).trim().toLowerCase()
        if (answer === 's' || answer === 'si' || answer === 'sí' || answer === 'y' || answer === 'yes') return true
        if (answer === 'n' || answer === 'no') return false
        console.log('Responde con s o n.')
    }
}

async function pause(prompt) {
    await rl.question(`${prompt} (enter para continuar) `)
}

function abort(client, code) {
    rl.close()
    client.end(true, () => process.exit(code))
}

async function main() {
    log(`device_id=${deviceId} mqtt=${mqttUrl}`)
    log(`topic comando=${commandTopic}`)
    log(`topic estado =${statusTopic}`)
    log(`topic presence=${presenceTopic}`)
    if (dryRun) {
        log('DRY-RUN activo: no se publicaran comandos reales en MQTT.')
    }
    console.log('')
    console.log('Antes de continuar comprueba:')
    console.log('  - El paso 3 del protocolo se ha completado (modo real activo).')
    console.log('  - Tienes acceso al cable de alimentacion de los servos para cortar si algo va mal.')
    console.log('  - El brazo esta despejado y el pincel desmontado o sustituido por un peso testigo ligero.')
    console.log('')

    if (!(await askYesNo('Confirmas que todo lo anterior es correcto?'))) {
        err('Abortado por el operador antes de publicar.')
        rl.close()
        process.exit(2)
        return
    }

    const client = mqtt.connect(mqttUrl, {
        clean: true,
        reconnectPeriod: 0,
        connectTimeout: 10_000,
        clientId: createMqttClientId('bringup', deviceId, Math.random().toString(16).slice(2)),
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
    })

    let lastPresenceAt = 0
    let lastStatus = null
    let lastError = null
    const ackWaiters = []
    const execWaiters = []

    client.on('error', (error) => {
        err(`MQTT: ${error.message}`)
        abort(client, 1)
    })

    client.on('connect', () => {
        log(`MQTT conectado como cliente bringup.`)
        client.subscribe([statusTopic, errorTopic, presenceTopic], { qos: 1 }, (subError) => {
            if (subError) {
                err(`No se pudo suscribir: ${subError.message}`)
                abort(client, 1)
            }
        })
    })

    client.on('message', (topic, message) => {
        const payload = parseJsonMessage(message)
        if (topic === presenceTopic) {
            lastPresenceAt = Date.now()
            return
        }
        if (topic === errorTopic) {
            lastError = payload
            warn(`system/error: ${JSON.stringify(payload)}`)
            return
        }
        if (topic === statusTopic) {
            lastStatus = payload
            const status = payload?.status || 'sin_status'
            const detail = payload?.detail || ''
            log(`status: ${status} ${detail}`.trim())
            if (status === 'real_command_received' || status === 'mode_unchanged') {
                ackWaiters.splice(0).forEach((resolve) => resolve(payload))
            }
            if (status === 'real_command_executed') {
                execWaiters.splice(0).forEach((resolve) => resolve(payload))
            }
            if (status === 'error') {
                ackWaiters.splice(0).forEach((resolve) => resolve(payload))
                execWaiters.splice(0).forEach((resolve) => resolve(payload))
            }
        }
    })

    const waitForAck = () => new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ACK_TIMEOUT_MS)
        ackWaiters.push((payload) => {
            clearTimeout(timer)
            resolve(payload)
        })
    })

    const waitForExec = () => new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), EXEC_TIMEOUT_MS)
        execWaiters.push((payload) => {
            clearTimeout(timer)
            resolve(payload)
        })
    })

    // Espera breve para suscripciones.
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (presenceTopic && lastPresenceAt === 0) {
        warn(`Sin presence MQTT todavia. Sigo, pero confirma que el ESP32 esta online.`)
    }

    let success = true
    for (let index = 0; index < steps.length; index++) {
        const step = steps[index]
        console.log('')
        console.log(`================================================================`)
        console.log(`Paso ${index + 1}/${steps.length}: ${step.label}`)
        console.log(`Observa: ${step.expectation}`)
        console.log(`Comando:`)
        console.log(JSON.stringify(step.command, null, 2))
        console.log(`================================================================`)

        if (!(await askYesNo('Publicar este comando ahora?'))) {
            err('Abortado por el operador.')
            success = false
            break
        }

        if (dryRun) {
            log('DRY-RUN: comando NO publicado.')
        } else {
            const ackPromise = waitForAck()
            const execPromise = waitForExec()
            client.publish(commandTopic, JSON.stringify(step.command), { qos: 1 })
            log(`Publicado en ${commandTopic}.`)

            const ack = await ackPromise
            if (!ack) {
                warn(`Sin ack del firmware en ${ACK_TIMEOUT_MS} ms (esperaba real_command_received).`)
            } else if (ack.status === 'error') {
                err(`Firmware devolvio error: ${ack.detail || JSON.stringify(ack)}`)
                success = false
                break
            } else {
                log(`Ack del firmware: ${ack.status} ${ack.detail || ''}`)
            }

            const exec = await execPromise
            if (!exec) {
                warn(`Sin real_command_executed en ${EXEC_TIMEOUT_MS} ms.`)
            } else if (exec.status === 'error') {
                err(`Firmware devolvio error durante ejecucion: ${exec.detail || JSON.stringify(exec)}`)
                success = false
                break
            } else {
                log(`Ejecucion completada: ${exec.detail || ''}`)
            }

            const presenceAge = lastPresenceAt === 0 ? Infinity : Date.now() - lastPresenceAt
            if (Number.isFinite(presenceAge)) {
                log(`Edad ultima presence: ${presenceAge} ms`)
            }
            if (!Number.isFinite(presenceAge) || presenceAge > 12_000) {
                warn('La presence del ESP32 puede haberse interrumpido durante el movimiento.')
            }
        }

        const ok = await askYesNo('Observacion fisica correcta y sin ruidos/calentamiento anomalos?')
        if (!ok) {
            err('Operador reporta anomalia fisica. Aborto.')
            success = false
            break
        }
    }

    console.log('')
    if (success) {
        log('Protocolo de puesta en marcha completado correctamente.')
    } else {
        err('Protocolo INCOMPLETO. Revisa el estado del brazo y la documentacion antes de reintentar.')
    }
    if (lastError) {
        warn(`Ultimo system/error recibido: ${JSON.stringify(lastError)}`)
    }

    abort(client, success ? 0 : 1)
}

main().catch((error) => {
    err(`Fallo inesperado: ${error?.stack || error}`)
    rl.close()
    process.exit(1)
})
