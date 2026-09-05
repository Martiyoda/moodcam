import { bridgeReadiness, cameraReadiness, voiceReadiness } from '../lib/systemReadiness'

// Resumen rapido de si la demostracion esta lista para comenzar.
// No realiza acciones fisicas: ayuda a detectar conexiones o permisos pendientes.
export default function DemoReadinessPanel({
  mqttStatus,
  aiPlan,
  aiChunk,
  bridgePresence,
  hasEmotionSummary,
  robotStatus,
  cameraModelsLoaded,
  cameraActive,
  cameraLoading,
  cameraError,
  voiceStatus,
  voiceEnabled,
  avatarConnectionStatus,
  avatarRelayStatus,
  painter,
  sessionActive,
  calibrationActive,
  calibrationLocked,
  calibrationMoving,
}) {
  const camera = cameraReadiness({ modelsLoaded: cameraModelsLoaded, cameraActive, loading: cameraLoading, error: cameraError })
  const voice = voiceReadiness({ voiceAvailable: true, voiceEnabled, voiceStatus, sessionActive })
  const bridge = bridgeReadiness({ bridgePresence, calibrationLocked, aiPlan, aiChunk, hasEmotionSummary, sessionActive })
  const checks = [
    {
      label: 'MQTT',
      value: mqttStatus === 'connected' ? 'conectado' : mqttStatus,
      state: mqttStatus === 'connected' ? 'ok' : mqttStatus === 'connecting' ? 'pending' : 'idle',
    },
    {
      label: 'Estilo',
      value: painter?.name || 'sin seleccionar',
      state: painter ? 'ok' : 'idle',
    },
    {
      label: 'Cámara',
      value: camera.label,
      state: camera.state,
    },
    {
      label: 'Voz',
      value: voice.label,
      state: voice.state,
    },
    {
      label: 'Avatar',
      value: avatarStatusLabel(avatarConnectionStatus, avatarRelayStatus),
      state: avatarState(avatarConnectionStatus, avatarRelayStatus),
    },
    {
      label: 'AI Bridge',
      value: bridge.label,
      state: bridge.state,
    },
    {
      label: 'Brazo',
      value: calibrationActive ? (calibrationMoving ? 'calibrando' : robotStatus?.payload?.status || 'sin respuesta') : robotStatus?.payload?.status || 'sin status',
      state: robotStatus ? 'ok' : 'pending',
    },
  ]

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Estado del sistema</h2>
          <p className="mt-1 text-xs text-zinc-500">{calibrationActive ? 'Calibración directa del brazo. AI Bridge aislado.' : 'Ruta esperada: emoción, chunks artísticos y brazo físico.'}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(check.state)}`} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">{check.label}</span>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-zinc-200">{check.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function avatarStatusLabel(status, relayStatus) {
  if (status === 'Connected') return 'conectado'
  if (status === 'Connecting') return 'conectando'
  if (relayStatus === 'ready') return 'listo'
  if (relayStatus === 'checking') return 'comprobando'
  if (relayStatus === 'error') return 'no disponible'
  return 'desconectado'
}

function avatarState(status, relayStatus) {
  if (status === 'Connected' || relayStatus === 'ready') return 'ok'
  if (status === 'Connecting' || relayStatus === 'checking') return 'pending'
  if (relayStatus === 'error') return 'error'
  return 'idle'
}

function dotClass(state) {
  if (state === 'ok') return 'bg-emerald-400'
  if (state === 'pending') return 'bg-amber-300 animate-pulse'
  if (state === 'error') return 'bg-red-400'
  return 'bg-zinc-600'
}
