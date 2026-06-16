export default function DemoReadinessPanel({
  mqttStatus,
  aiPlan,
  robotStatus,
  voiceStatus,
  painter,
  sessionActive,
  calibrationActive,
  calibrationMoving,
}) {
  const checks = [
    {
      label: 'MQTT',
      value: mqttStatus === 'connected' ? 'conectado' : mqttStatus,
      state: mqttStatus === 'connected' ? 'ok' : mqttStatus === 'connecting' ? 'pending' : 'idle',
    },
    {
      label: 'Pintor',
      value: painter?.name || 'sin seleccionar',
      state: painter ? 'ok' : 'idle',
    },
    {
      label: 'Voz',
      value: voiceStatusLabel(voiceStatus, sessionActive),
      state: voiceStatus === 'listening' || voiceStatus === 'ended' ? 'ok' : sessionActive ? 'pending' : 'idle',
    },
    {
      label: 'Videos',
      value: 'mock HeyGen listo',
      state: 'ok',
    },
    {
      label: 'AI Bridge',
      value: calibrationActive ? 'bloqueado por calibración' : aiPlan ? `plan ${aiPlan.payload?.plan_id || aiPlan.payload?.id || 'recibido'}` : 'esperando plan',
      state: calibrationActive ? 'idle' : aiPlan ? 'ok' : 'pending',
    },
    {
      label: 'ESP32',
      value: calibrationActive ? (calibrationMoving ? 'calibrando' : robotStatus?.payload?.status || 'sin respuesta') : robotStatus?.payload?.status || 'sin status',
      state: robotStatus ? 'ok' : 'pending',
    },
  ]

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Estado del sistema</h2>
          <p className="mt-1 text-xs text-zinc-500">{calibrationActive ? 'Calibración directa: web a HiveMQ y ESP32. AI Bridge aislado.' : 'Ruta esperada: web a HiveMQ, AI Bridge y ESP32/simulador.'}</p>
        </div>
        <span className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-100">
          device sync
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
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

function voiceStatusLabel(status, sessionActive) {
  if (status === 'listening') return 'escuchando'
  if (status === 'ended') return 'analizada'
  if (status === 'error') return 'error micro'
  return sessionActive ? 'iniciando' : 'lista'
}

function dotClass(state) {
  if (state === 'ok') return 'bg-emerald-400'
  if (state === 'pending') return 'bg-amber-300 animate-pulse'
  return 'bg-zinc-600'
}
