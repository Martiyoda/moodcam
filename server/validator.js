import { loadStrokes } from './load_strokes.js'

const ALLOWED_FIELDS = new Set([
  'stroke_id',
  'speed',
  'intensity',
  'duration_ms',
  'pressure',
  'selected_colors',
])

const REQUIRED_FIELDS = [
  'stroke_id',
  'speed',
  'intensity',
  'duration_ms',
  'pressure',
  'selected_colors',
]

const COLOR_ALIASES = {
  red: 'red',
  rojo: 'red',
  yellow: 'yellow',
  amarillo: 'yellow',
  orange: 'orange',
  naranja: 'orange',
  blue: 'blue',
  azul: 'blue',
  violet: 'violet',
  violeta: 'violet',
  morado: 'violet',
  purple: 'violet',
  black: 'black',
  negro: 'black',
}

export function validateDecision(decision, catalog = loadStrokes()) {
  try {
    assertPlainObject(decision)
    assertAllowedFields(decision)
    assertRequiredFields(decision)

    const stroke = catalog.byId.get(decision.stroke_id)
    if (!stroke) fail(`stroke_id no aprobado: ${decision.stroke_id}`)
    if (!catalog.artists.has(stroke.artist)) fail(`Artista no aprobado: ${stroke.artist}`)
    if (!catalog.emotions.has(stroke.emotion)) fail(`Emoción no aprobada: ${stroke.emotion}`)
    if (!catalog.approvedFunctions.has(stroke.base_function)) {
      fail(`Función base no aprobada: ${stroke.base_function}`)
    }

    assertIntegerRange(decision.speed, 'speed', 0, 100)
    assertIntegerRange(decision.intensity, 'intensity', 0, 100)
    assertIntegerRange(decision.duration_ms, 'duration_ms', 1, Number.MAX_SAFE_INTEGER)
    assertIntegerRange(decision.pressure, 'pressure', 0, 100)

    assertWithinSafeLimits(decision, stroke.safe_limits)
    assertSelectedColors(decision.selected_colors, stroke.color_palette)

    return {
      valid: true,
      command: {
        base_function: stroke.base_function,
        speed: decision.speed,
        intensity: decision.intensity,
        duration_ms: decision.duration_ms,
        pressure: decision.pressure,
        selected_colors: [...decision.selected_colors],
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message || 'Decisión rechazada por el validador.',
    }
  }
}

function assertPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('La decisión debe ser un objeto JSON.')
  }
}

function assertAllowedFields(decision) {
  const unexpected = Object.keys(decision).filter((field) => !ALLOWED_FIELDS.has(field))
  if (unexpected.length) {
    fail(`Campos inesperados o peligrosos: ${unexpected.join(', ')}`)
  }
}

function assertRequiredFields(decision) {
  const missing = REQUIRED_FIELDS.filter((field) => decision[field] === undefined)
  if (missing.length) fail(`Faltan campos obligatorios: ${missing.join(', ')}`)
}

function assertIntegerRange(value, field, min, max) {
  if (!Number.isInteger(value)) fail(`${field} debe ser un número entero.`)
  if (value < min || value > max) fail(`${field} debe estar entre ${min} y ${max}.`)
}

function assertWithinSafeLimits(decision, limits) {
  assertLimit(decision.speed, 'speed', limits.min_speed, limits.max_speed)
  assertLimit(decision.intensity, 'intensity', limits.min_intensity, limits.max_intensity)
  assertLimit(decision.duration_ms, 'duration_ms', limits.min_duration_ms, limits.max_duration_ms)
  assertLimit(decision.pressure, 'pressure', limits.min_pressure, limits.max_pressure)
}

function assertLimit(value, field, min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    fail(`La receta no define límites seguros para ${field}.`)
  }
  if (value < min || value > max) {
    fail(`${field} fuera de los límites seguros de la receta: ${min}-${max}.`)
  }
}

function assertSelectedColors(selectedColors, approvedPalette) {
  if (!Array.isArray(selectedColors) || selectedColors.length === 0) {
    fail('selected_colors no puede estar vacío.')
  }
  if (selectedColors.length > approvedPalette.length) {
    fail('selected_colors contiene más colores que la paleta aprobada.')
  }

  const approved = new Set(approvedPalette)
  const normalized = selectedColors.map((color) => {
    if (typeof color !== 'string' || !color.trim()) fail('selected_colors contiene un valor inválido.')
    return COLOR_ALIASES[normalizeText(color)]
  })

  if (normalized.some((color) => !color)) {
    fail('selected_colors contiene un color desconocido.')
  }
  if (new Set(normalized).size !== normalized.length) {
    fail('selected_colors contiene colores duplicados.')
  }
  const rejected = normalized.filter((color) => !approved.has(color))
  if (rejected.length) {
    fail(`Colores no aprobados para este trazo: ${[...new Set(rejected)].join(', ')}`)
  }
}

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function fail(message) {
  throw new Error(message)
}
