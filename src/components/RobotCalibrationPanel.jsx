import { useEffect, useMemo, useState } from 'react'

import {
  ARM_SERVOS,
  INITIAL_ATTACHED_STATE,
  INITIAL_JOINT_STATE,
  buildJogCommand,
  buildSetAngleCommand,
  buildStartCalibrationCommand,
  jointStateFromPayload,
  parseDetail,
  updateAttachedState,
} from '../lib/armCalibration'

const RESPONSE_TIMEOUT_MS = 10_000

export default function RobotCalibrationPanel({
  mqttStatus,
  lastStatus,
  lastError,
  lastCommand,
  topics,
  onSend,
  onCalibrationStateChange,
}) {
  const [jointState, setJointState] = useState(INITIAL_JOINT_STATE)
  const [attachedState, setAttachedState] = useState(INITIAL_ATTACHED_STATE)
  const [selectedServo, setSelectedServo] = useState('shoulder')
  const [directAngle, setDirectAngle] = useState(90)
  const [durationMs, setDurationMs] = useState(500)
  const [localError, setLocalError] = useState('')
  const [clock, setClock] = useState(Date.now())

  const mqttConnected = mqttStatus === 'connected'
  const esp32Available = mqttConnected
    && lastStatus?.timestamp
    && clock - lastStatus.timestamp < RESPONSE_TIMEOUT_MS
  const controlsBlocked = !mqttConnected || !jointState.positionKnown || jointState.moving
  const guideSteps = [
    { label: 'Conectar MQTT', done: mqttConnected, detail: mqttConnected ? 'Conectado' : 'Actívalo desde configuración' },
    { label: 'Confirmar ESP32', done: esp32Available, detail: esp32Available ? 'Estado recibido' : `Esperando ${topics.status}` },
    { label: 'Colocar HOME', done: jointState.positionKnown, detail: jointState.positionKnown ? 'Posición conocida' : 'Coloca el brazo y confirma HOME' },
    { label: 'Probar articulaciones', done: jointState.positionKnown && !jointState.moving, detail: jointState.moving ? 'Movimiento en curso' : 'Mueve un servo cada vez' },
    { label: 'Continuar', done: jointState.positionKnown && esp32Available && !jointState.moving, detail: 'Brazo listo para el plan' },
  ]
  const selectedConfig = ARM_SERVOS.find((servo) => servo.id === selectedServo)
  const statusDetail = useMemo(() => parseDetail(lastStatus?.payload?.detail), [lastStatus])
  const errorDetail = useMemo(() => parseDetail(lastError?.payload?.detail), [lastError])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!mqttConnected) return undefined
    onSend({ type: 'get_joint_state' })
    const timer = window.setInterval(() => onSend({ type: 'get_joint_state' }), 4000)
    return () => window.clearInterval(timer)
  }, [mqttConnected, onSend])

  useEffect(() => {
    const payload = lastStatus?.payload
    if (!payload || typeof payload !== 'object') return

    setJointState((previous) => {
      let next = jointStateFromPayload(payload, previous)
      if (payload.status === 'calibration_started') next = { ...next, positionKnown: true, moving: false }
      if (payload.status === 'moving') next = { ...next, moving: true }
      if (['movement_completed', 'stopped'].includes(payload.status)) next = { ...next, moving: false }
      if (payload.status === 'servos_released') next = { ...next, positionKnown: false, moving: false }

      const detail = parseDetail(payload.detail)
      const commandedAngle = Number(detail.commanded_angle ?? detail.target)
      if (ARM_SERVOS.some((servo) => servo.id === detail.servo) && Number.isFinite(commandedAngle)) {
        next = { ...next, [detail.servo]: commandedAngle }
      }
      return next
    })
    setAttachedState((previous) => updateAttachedState(payload, previous))
  }, [lastStatus])

  useEffect(() => {
    onCalibrationStateChange?.({
      active: jointState.positionKnown,
      moving: jointState.moving,
    })
  }, [jointState.moving, jointState.positionKnown, onCalibrationStateChange])

  const sendCommand = (payload) => {
    setLocalError('')
    if (!mqttConnected) {
      setLocalError('MQTT está desconectado. Actívalo desde Configuración antes de calibrar.')
      return false
    }
    if (!onSend(payload)) {
      setLocalError('No se pudo publicar el comando por MQTT.')
      return false
    }
    return true
  }

  const startCalibration = () => {
    if (!window.confirm('Coloca físicamente el brazo en la posición HOME antes de continuar. ¿Confirmas que ya está colocado?')) return
    sendCommand(buildStartCalibrationCommand())
  }

  const jog = (servo, delta) => {
    if (controlsBlocked) return
    const config = ARM_SERVOS.find((entry) => entry.id === servo)
    const target = jointState[servo] + delta
    if (target < config.minAngle || target > config.maxAngle) {
      setLocalError(`Movimiento rechazado: ${config.label} quedaría fuera de ${config.minAngle}°–${config.maxAngle}°.`)
      return
    }
    sendCommand(buildJogCommand(servo, delta))
  }

  const setAngle = (event) => {
    event.preventDefault()
    if (controlsBlocked) return
    try {
      sendCommand(buildSetAngleCommand(selectedServo, Number(directAngle), Number(durationMs)))
    } catch (error) {
      setLocalError(error.message)
    }
  }

  const releaseServos = () => {
    if (!jointState.positionKnown || jointState.moving) return
    if (!window.confirm('El brazo puede caer o moverse por gravedad al liberar los servos. ¿Quieres continuar?')) return
    sendCommand({ type: 'release_servos' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Calibración del brazo</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Control angular directo. HiveMQ transporta los comandos automáticamente; no necesitas abrir su cliente web.
          </p>
        </div>
        <div className={`rounded-md border px-3 py-2 text-xs ${jointState.moving ? 'border-amber-400/30 bg-amber-400/10 text-amber-100' : jointState.positionKnown ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>
          {jointState.moving ? 'Movimientos artísticos bloqueados durante el movimiento' : jointState.positionKnown ? 'Brazo listo para continuar' : 'Calibración pendiente'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <StatusItem label="MQTT" value={mqttConnected ? 'Conectado' : 'Desconectado'} state={mqttConnected ? 'ok' : 'error'} />
        <StatusItem label="ESP32" value={esp32Available ? 'Disponible' : 'Sin respuesta'} state={esp32Available ? 'ok' : 'warning'} />
        <StatusItem label="Calibración" value={jointState.positionKnown ? 'Activa' : 'Inactiva'} state={jointState.positionKnown ? 'ok' : 'idle'} />
        <StatusItem label="Posición" value={jointState.positionKnown ? 'Conocida' : 'Desconocida'} state={jointState.positionKnown ? 'ok' : 'warning'} />
        <StatusItem label="Movimiento" value={jointState.moving ? 'Activo' : 'Detenido'} state={jointState.moving ? 'warning' : 'ok'} />
      </div>

      <section className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Orden recomendado</p>
            <p className="mt-1 text-xs text-zinc-500">Avanza de izquierda a derecha. Si un paso queda bloqueado, revisa el mensaje de detalle.</p>
          </div>
          <div className="text-xs text-zinc-500">
            Escucha <span className="text-cyan-200">{topics.status}</span>
            <span className="mx-1">·</span>
            último estado {formatAge(lastStatus?.timestamp, clock)}
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {guideSteps.map((step, index) => (
            <div key={step.label} className={`rounded-md border px-3 py-2 ${step.done ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-zinc-800 bg-zinc-950/70'}`}>
              <div className="flex items-center gap-2 text-[10px] uppercase text-zinc-500">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step.done ? 'bg-emerald-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>{index + 1}</span>
                {step.label}
              </div>
              <p className="mt-2 text-xs text-zinc-300">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky top-3 z-10 flex flex-wrap items-center gap-3 rounded-md border border-zinc-700 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => sendCommand({ type: 'stop' })}
          disabled={!mqttConnected}
          className="min-h-12 flex-1 rounded-md bg-red-600 px-6 text-base font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          STOP
        </button>
        <button type="button" onClick={() => sendCommand({ type: 'get_joint_state' })} disabled={!mqttConnected} className="min-h-12 rounded-md border border-zinc-600 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
          Actualizar estado
        </button>
        <button type="button" onClick={releaseServos} disabled={!mqttConnected || !jointState.positionKnown || jointState.moving} className="min-h-12 rounded-md border border-amber-500/50 px-4 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40">
          Liberar servos
        </button>
        <span className="ml-auto text-xs text-zinc-500">{topics.command}</span>
      </div>

      <section className="border-y border-zinc-800 py-4">
        <p className="text-sm font-semibold text-white">Inicio seguro</p>
        <p className="mt-1 text-sm text-amber-200">Coloca físicamente el brazo en la posición HOME antes de continuar.</p>
        <button
          type="button"
          onClick={startCalibration}
          disabled={!mqttConnected || jointState.moving || jointState.positionKnown}
          className="mt-3 rounded-md bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirmar brazo en HOME e iniciar calibración
        </button>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">Prueba por articulación</p>
          <p className="mt-1 text-xs text-zinc-500">Usa pasos pequeños primero. Los controles se activan después de confirmar HOME.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ARM_SERVOS.map((servo) => (
          <ServoCard
            key={servo.id}
            servo={servo}
            angle={jointState[servo.id]}
            attached={attachedState[servo.id]}
            disabled={controlsBlocked}
            onJog={jog}
          />
        ))}
        </div>
      </section>

      <details className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Controles avanzados</summary>
        <form onSubmit={setAngle} className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <Field label="Servo">
            <select value={selectedServo} onChange={(event) => setSelectedServo(event.target.value)} className={inputClass} disabled={jointState.moving}>
              {ARM_SERVOS.map((servo) => <option key={servo.id} value={servo.id}>{servo.label}</option>)}
            </select>
          </Field>
          <Field label={`Ángulo (${selectedConfig.minAngle}°–${selectedConfig.maxAngle}°)`}>
            <input type="number" min={selectedConfig.minAngle} max={selectedConfig.maxAngle} step="1" value={directAngle} onChange={(event) => setDirectAngle(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Duración (200–5000 ms)">
            <input type="number" min="200" max="5000" step="50" value={durationMs} onChange={(event) => setDurationMs(event.target.value)} className={inputClass} />
          </Field>
          <button type="submit" disabled={controlsBlocked} className="h-10 rounded-md bg-cyan-300 px-4 text-sm font-bold text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
            Mover
          </button>
        </form>
      </details>

      <p className="rounded-md border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-sm text-cyan-100">
        Los grados mostrados son ángulos ordenados, no mediciones físicas reales.
      </p>

      {(localError || lastError) && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {localError || messageText(lastError.payload)}
        </div>
      )}

      <MessageLog
        lastCommand={lastCommand}
        lastStatus={lastStatus}
        lastError={lastError}
        statusDetail={statusDetail}
        errorDetail={errorDetail}
      />

    </div>
  )
}

function ServoCard({ servo, angle, attached, disabled, onJog }) {
  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">{servo.label}</h3>
          <p className="text-xs text-zinc-500">GPIO {servo.gpio}</p>
        </div>
        <span className="text-xs text-zinc-400">{attachedLabel(attached)}</span>
      </div>
      <div className="my-5 text-center">
        <span className="text-4xl font-black tabular-nums text-white">{angle}°</span>
        <span className="mt-1 block text-[10px] uppercase text-zinc-500">ángulo ordenado</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[-5, -1, 1, 5].map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => onJog(servo.id, delta)}
            disabled={disabled}
            className="h-10 rounded-md border border-zinc-700 bg-zinc-950 text-sm font-bold text-zinc-200 hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {delta > 0 ? `+${delta}°` : `${delta}°`}
          </button>
        ))}
      </div>
    </article>
  )
}

function StatusItem({ label, value, state }) {
  const dot = state === 'ok' ? 'bg-emerald-400' : state === 'error' ? 'bg-red-500' : state === 'warning' ? 'bg-amber-300' : 'bg-zinc-600'
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase text-zinc-500"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</div>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function MessageLog({ lastCommand, lastStatus, lastError, statusDetail, errorDetail }) {
  return (
    <section className="grid gap-2 border-t border-zinc-800 pt-4 lg:grid-cols-3">
      <LogItem label="Último comando" message={lastCommand ? JSON.stringify(lastCommand.payload) : 'Ninguno'} timestamp={lastCommand?.timestamp} />
      <LogItem label="Último estado" message={lastStatus ? messageText(lastStatus.payload) : 'Sin respuesta'} timestamp={lastStatus?.timestamp} detail={statusDetail} />
      <LogItem label="Último error" message={lastError ? messageText(lastError.payload) : 'Ninguno'} timestamp={lastError?.timestamp} detail={errorDetail} error={Boolean(lastError)} />
    </section>
  )
}

function LogItem({ label, message, timestamp, detail = {}, error = false }) {
  const previous = detail.previous
  const next = detail.target ?? detail.commanded_angle
  return (
    <div className={`min-w-0 rounded-md border px-3 py-2 ${error ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <p className="text-[10px] uppercase text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-xs ${error ? 'text-red-200' : 'text-zinc-300'}`}>{message}</p>
      {(detail.servo || previous || next) && <p className="mt-1 text-xs text-zinc-500">Servo: {detail.servo || '—'} · anterior: {previous || '—'} · nuevo: {next || '—'}</p>}
      <p className="mt-1 text-[10px] text-zinc-600">{formatTime(timestamp)}</p>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="space-y-1"><span className="block text-xs text-zinc-400">{label}</span>{children}</label>
}

function attachedLabel(value) {
  if (value === true) return 'attached'
  if (value === false) return 'detached'
  return 'estado desconocido'
}

function messageText(payload) {
  if (!payload) return 'Sin datos'
  if (typeof payload === 'string') return payload
  return [payload.status, payload.detail].filter(Boolean).join(': ') || JSON.stringify(payload)
}

function formatTime(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleTimeString('es-ES') : 'Sin mensajes'
}

function formatAge(timestamp, now) {
  if (!timestamp) return 'sin mensajes'
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 2) return 'ahora'
  return `hace ${seconds}s`
}

const inputClass = 'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-40'
