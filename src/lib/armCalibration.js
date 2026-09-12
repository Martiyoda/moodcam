// Configuración visible en la web para calibrar cada articulación dentro de sus límites.
export const ARM_SERVOS = [
  { id: 'base', label: 'Base', gpio: 26, minAngle: -30, maxAngle: 180 },
  { id: 'shoulder', label: 'Hombro', gpio: 25, minAngle: 45, maxAngle: 170 },
  { id: 'elbow', label: 'Codo', gpio: 33, minAngle: 35, maxAngle: 150 },
  { id: 'wrist', label: 'Muñeca', gpio: 32, minAngle: 0, maxAngle: 120 },
]

export const INITIAL_JOINT_STATE = {
  base: 90,
  shoulder: 90,
  elbow: 90,
  wrist: 90,
  positionKnown: false,
  moving: false,
  anglesAreCommanded: true,
}

export const INITIAL_ATTACHED_STATE = {
  base: null,
  shoulder: null,
  elbow: null,
  wrist: null,
}

export function buildStartCalibrationCommand() {
  // Solicita al firmware iniciar calibración suponiendo que el brazo está en HOME.
  return { type: 'start_calibration', assume_home: true }
}

export function buildResumeCommand() {
  return { type: 'resume' }
}

export function buildJogCommand(servo, delta) {
  // Crea un desplazamiento pequeño y validado para ajuste manual.
  if (!ARM_SERVOS.some((entry) => entry.id === servo)) throw new Error('Servo no permitido')
  if (![-5, -1, 1, 5].includes(delta)) throw new Error('Delta no permitido')
  return { type: 'jog', servo, delta }
}

export function buildSetAngleCommand(servo, angle, durationMs) {
  // Crea un movimiento absoluto validando ángulo, servo y duración.
  const config = ARM_SERVOS.find((entry) => entry.id === servo)
  if (!config) throw new Error('Servo no permitido')
  if (!Number.isInteger(angle) || angle < config.minAngle || angle > config.maxAngle) {
    throw new Error(`El ángulo debe estar entre ${config.minAngle}° y ${config.maxAngle}°`)
  }
  if (!Number.isInteger(durationMs) || durationMs < 200 || durationMs > 5000) {
    throw new Error('La duración debe estar entre 200 y 5000 ms')
  }
  return { type: 'set_angle', servo, angle, duration_ms: durationMs }
}

export function buildSetOperatingModeCommand(mode) {
  // Solicita cambiar entre calibración y ejecución real.
  const normalized = String(mode || '').trim().toLowerCase()
  if (!['calibration', 'real'].includes(normalized)) {
    throw new Error('Modo no permitido. Usa calibration o real')
  }
  return { type: 'set_operating_mode', mode: normalized }
}

export function jointStateFromPayload(payload, previous = INITIAL_JOINT_STATE) {
  // Convierte el estado MQTT del firmware en estado utilizable por React.
  if (!payload || payload.status !== 'joint_state') return previous
  return {
    base: numericOrPrevious(payload.base, previous.base),
    shoulder: numericOrPrevious(payload.shoulder, previous.shoulder),
    elbow: numericOrPrevious(payload.elbow, previous.elbow),
    wrist: numericOrPrevious(payload.wrist, previous.wrist),
    positionKnown: payload.position_known === true,
    moving: payload.moving === true,
    anglesAreCommanded: payload.angles_are_commanded !== false,
  }
}

export function updateAttachedState(payload, previous = INITIAL_ATTACHED_STATE) {
  // Actualiza qué servos están conectados a partir de eventos del firmware.
  if (!payload || typeof payload !== 'object') return previous
  if (payload.status === 'servos_released') return { base: false, shoulder: false, elbow: false, wrist: false }
  if (payload.status !== 'servo_attaching') return previous
  const detail = parseDetail(payload.detail)
  if (!ARM_SERVOS.some((entry) => entry.id === detail.servo)) return previous
  return { ...previous, [detail.servo]: true }
}

export function parseDetail(detail) {
  if (typeof detail !== 'string') return {}
  return Object.fromEntries(detail.split(/\s+/).flatMap((part) => {
    const separator = part.indexOf('=')
    if (separator < 1) return []
    return [[part.slice(0, separator), part.slice(separator + 1)]]
  }))
}

function numericOrPrevious(value, previous) {
  return Number.isFinite(Number(value)) ? Number(value) : previous
}
