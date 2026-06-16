import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateDecision } from './validator.js'
import { loadStrokes } from './load_strokes.js'

const COMMAND_FIELDS = new Set([
  'base_function',
  'speed',
  'intensity',
  'duration_ms',
  'pressure',
  'selected_colors',
])

const TEST_MODE_ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

// Transporte inicial seguro:
// - Sin ESP32_SERIAL_PORT: simula el envío y no toca hardware.
// - Con ESP32_SERIAL_PORT: escribe una línea JSON por USB/Serial.
export async function sendToEsp32(input, {
  serialPort = process.env.ESP32_SERIAL_PORT || '',
  catalog = loadStrokes(),
  transport = null,
  testMode = isTestModeEnabled(process.env.TEST_MODE),
} = {}) {
  const validated = normalizeAndValidateForEsp32(input, catalog, { testMode })
  if (!validated.valid) return validated

  const packet = {
    type: 'paint_command',
    command: validated.command,
    timestamp: Date.now(),
  }

  if (!serialPort && !transport) {
    return {
      valid: true,
      mode: 'simulation',
      status: 'completed',
      sent: packet,
      response: {
        status: 'completed',
        detail: 'Simulación local: no se definió ESP32_SERIAL_PORT.',
      },
    }
  }

  try {
    if (transport) {
      await transport(JSON.stringify(packet))
    } else {
      await writeSerialLine(serialPort, JSON.stringify(packet))
    }

    return {
      valid: true,
      mode: 'serial',
      status: 'sent',
      sent: packet,
    }
  } catch (error) {
    return {
      valid: false,
      error: `No se pudo enviar a ESP32: ${error.message}`,
    }
  }
}

export function normalizeAndValidateForEsp32(input, catalog = loadStrokes(), { testMode = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'El comando debe ser un objeto JSON.' }
  }

  // Producción: la única entrada aceptada es una decisión con stroke_id.
  // El backend deriva base_function usando validator.js y /strokes.
  if (input.stroke_id) {
    if (!testMode) {
      const forbiddenDecisionFields = ['base_function', 'artist', 'emotion']
        .filter((field) => input[field] !== undefined)
      if (forbiddenDecisionFields.length) {
        return {
          valid: false,
          error: `Modo producción: campos no permitidos en decisión IA: ${forbiddenDecisionFields.join(', ')}`,
        }
      }
    }
    return validateDecision(input, catalog)
  }

  if (!testMode) {
    return {
      valid: false,
      error: 'Modo producción: base_function directo está prohibido. Usa stroke_id y validator.js.',
    }
  }

  const unexpected = Object.keys(input).filter((field) => !COMMAND_FIELDS.has(field))
  if (unexpected.length) {
    return { valid: false, error: `Campos inesperados o peligrosos: ${unexpected.join(', ')}` }
  }

  const missing = [...COMMAND_FIELDS].filter((field) => input[field] === undefined)
  if (missing.length) {
    return { valid: false, error: `Faltan campos obligatorios: ${missing.join(', ')}` }
  }

  if (!catalog.approvedFunctions.has(input.base_function)) {
    return { valid: false, error: `base_function no aprobada: ${input.base_function}` }
  }

  for (const field of ['speed', 'intensity', 'duration_ms', 'pressure']) {
    if (!Number.isInteger(input[field])) {
      return { valid: false, error: `${field} debe ser un número entero.` }
    }
  }
  if (!inRange(input.speed, 0, 100)) return { valid: false, error: 'speed debe estar entre 0 y 100.' }
  if (!inRange(input.intensity, 0, 100)) return { valid: false, error: 'intensity debe estar entre 0 y 100.' }
  if (!inRange(input.pressure, 0, 100)) return { valid: false, error: 'pressure debe estar entre 0 y 100.' }
  if (!inRange(input.duration_ms, 250, 10000)) {
    return { valid: false, error: 'duration_ms debe estar entre 250 y 10000.' }
  }
  if (!Array.isArray(input.selected_colors) || input.selected_colors.length === 0) {
    return { valid: false, error: 'selected_colors no puede estar vacío.' }
  }
  if (input.selected_colors.some((color) => typeof color !== 'string' || !color.trim())) {
    return { valid: false, error: 'selected_colors contiene valores inválidos.' }
  }

  return {
    valid: true,
    command: {
      base_function: input.base_function,
      speed: input.speed,
      intensity: input.intensity,
      duration_ms: input.duration_ms,
      pressure: input.pressure,
      selected_colors: [...input.selected_colors],
    },
  }
}

function writeSerialLine(serialPort, line) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(serialPort, { flags: 'a' })
    stream.on('error', reject)
    stream.end(`${line}\n`, resolve)
  })
}

function inRange(value, min, max) {
  return value >= min && value <= max
}

function isTestModeEnabled(value) {
  return TEST_MODE_ENABLED_VALUES.has(String(value || '').trim().toLowerCase())
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = process.argv[2]
  if (!raw) {
    console.error('Uso: node server/send_to_esp32.js \'{"stroke_id":"pollock-angry-simulated-splash-v1",...}\'')
    process.exit(1)
  }
  const input = JSON.parse(raw)
  const result = await sendToEsp32(input)
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
}
