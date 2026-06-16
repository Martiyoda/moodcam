import test from 'node:test'
import assert from 'node:assert/strict'
import { loadStrokes } from '../server/load_strokes.js'
import { normalizeAndValidateForEsp32, sendToEsp32 } from '../server/send_to_esp32.js'
import { validateDecision } from '../server/validator.js'

const validDecision = {
  stroke_id: 'pollock-angry-simulated-splash-v1',
  speed: 54,
  intensity: 80,
  duration_ms: 1200,
  pressure: 42,
  selected_colors: ['rojo', 'negro'],
}

test('carga 35 movimientos aprobados y funciones Arduino existentes', () => {
  const catalog = loadStrokes({ forceReload: true })
  assert.equal(catalog.strokes.length, 35)
  assert.equal(catalog.byId.size, 35)
  assert.ok(catalog.approvedFunctions.has('pollockSimulatedSplash'))
})

test('acepta una decisión aprobada y devuelve solo un comando seguro', () => {
  const result = validateDecision(validDecision)

  assert.deepEqual(result, {
    valid: true,
    command: {
      base_function: 'pollockSimulatedSplash',
      speed: 54,
      intensity: 80,
      duration_ms: 1200,
      pressure: 42,
      selected_colors: ['rojo', 'negro'],
    },
  })
})

test('rechaza un stroke_id inventado sin producir comando', () => {
  const result = validateDecision({ ...validDecision, stroke_id: 'POLLOCK_RABIA_SPLASH_01' })
  assert.equal(result.valid, false)
  assert.equal('command' in result, false)
  assert.match(result.error, /stroke_id no aprobado/)
})

test('rechaza metadatos internos enviados por la IA', () => {
  assert.match(validateDecision({ ...validDecision, artist: 'pollock' }).error, /Campos inesperados o peligrosos/)
  assert.match(validateDecision({ ...validDecision, emotion: 'angry' }).error, /Campos inesperados o peligrosos/)
  assert.match(validateDecision({ ...validDecision, base_function: 'pollockSimulatedSplash' }).error, /Campos inesperados o peligrosos/)
})

test('rechaza valores globales fuera de 0 a 100', () => {
  assert.match(validateDecision({ ...validDecision, speed: 101 }).error, /speed debe estar entre 0 y 100/)
  assert.match(validateDecision({ ...validDecision, intensity: -1 }).error, /intensity debe estar entre 0 y 100/)
  assert.match(validateDecision({ ...validDecision, pressure: 101 }).error, /pressure debe estar entre 0 y 100/)
})

test('rechaza parámetros que superan los límites seguros específicos del trazo', () => {
  assert.match(validateDecision({ ...validDecision, speed: 80 }).error, /speed fuera de los límites seguros/)
  assert.match(validateDecision({ ...validDecision, intensity: 40 }).error, /intensity fuera de los límites seguros/)
  assert.match(validateDecision({ ...validDecision, duration_ms: 6000 }).error, /duration_ms fuera de los límites seguros/)
  assert.match(validateDecision({ ...validDecision, pressure: 60 }).error, /pressure fuera de los límites seguros/)
})

test('rechaza selected_colors vacío, desconocido, duplicado o no aprobado', () => {
  assert.match(validateDecision({ ...validDecision, selected_colors: [] }).error, /no puede estar vacío/)
  assert.match(validateDecision({ ...validDecision, selected_colors: ['verde'] }).error, /color desconocido/)
  assert.match(validateDecision({ ...validDecision, selected_colors: ['rojo', 'red'] }).error, /duplicados/)
  assert.match(validateDecision({ ...validDecision, selected_colors: ['azul'] }).error, /no aprobados/)
})

test('rechaza acciones y campos inesperados peligrosos', () => {
  const result = validateDecision({
    ...validDecision,
    action: 'moveServoDirectly',
    servo_angle: 180,
  })

  assert.equal(result.valid, false)
  assert.equal('command' in result, false)
  assert.match(result.error, /Campos inesperados o peligrosos/)
})

test('rechaza campos obligatorios ausentes y valores no enteros', () => {
  const { duration_ms, ...missingDuration } = validDecision
  assert.match(validateDecision(missingDuration).error, /Faltan campos obligatorios: duration_ms/)
  assert.match(validateDecision({ ...validDecision, speed: 45.5 }).error, /speed debe ser un número entero/)
})

test('rechaza base_function directo en modo producción', () => {
  const result = normalizeAndValidateForEsp32({
    base_function: 'pollockSplash',
    speed: 80,
    intensity: 75,
    duration_ms: 6000,
    pressure: 40,
    selected_colors: ['rojo', 'negro'],
  })

  assert.equal(result.valid, false)
  assert.match(result.error, /base_function directo está prohibido/)
})

test('rechaza base_function aunque venga junto a stroke_id en modo producción', () => {
  const result = normalizeAndValidateForEsp32({
    stroke_id: 'pollock-angry-simulated-splash-v1',
    base_function: 'pollockSimulatedSplash',
    speed: 54,
    intensity: 80,
    duration_ms: 1200,
    pressure: 42,
    selected_colors: ['rojo', 'negro'],
  })

  assert.equal(result.valid, false)
  assert.match(result.error, /campos no permitidos/)
})

test('TEST_MODE no mezcla stroke_id con metadatos internos', () => {
  const result = normalizeAndValidateForEsp32({
    ...validDecision,
    base_function: 'pollockSimulatedSplash',
  }, loadStrokes(), { testMode: true })

  assert.equal(result.valid, false)
  assert.match(result.error, /Campos inesperados o peligrosos/)
})

test('TEST_MODE permite pruebas manuales con base_function directo', () => {
  const result = normalizeAndValidateForEsp32({
    base_function: 'pollockSplash',
    speed: 80,
    intensity: 75,
    duration_ms: 6000,
    pressure: 40,
    selected_colors: ['rojo', 'negro'],
  }, loadStrokes(), { testMode: true })

  assert.equal(result.valid, true)
  assert.equal(result.command.base_function, 'pollockSplash')
})

test('sendToEsp32 simula por defecto usando stroke_id y no envia comandos invalidos', async () => {
  const simulated = await sendToEsp32({
    stroke_id: 'pollock-angry-simulated-splash-v1',
    speed: 54,
    intensity: 80,
    duration_ms: 1200,
    pressure: 42,
    selected_colors: ['rojo', 'negro'],
  })
  assert.equal(simulated.valid, true)
  assert.equal(simulated.mode, 'simulation')
  assert.equal(simulated.status, 'completed')
  assert.equal(simulated.sent.command.base_function, 'pollockSimulatedSplash')

  const rejected = await sendToEsp32({
    base_function: 'inventedAction',
    speed: 80,
    intensity: 75,
    duration_ms: 6000,
    pressure: 40,
    selected_colors: ['rojo', 'negro'],
  })
  assert.equal(rejected.valid, false)
  assert.equal('sent' in rejected, false)
})
