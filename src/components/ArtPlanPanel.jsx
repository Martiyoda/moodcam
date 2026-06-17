import { getEmotionLabel } from '../lib/artEngine'

export default function ArtPlanPanel({ plan, planSource, mqttEnabled, mqttStatus, robotStatus, onSend, disabled = false, disabledReason = '' }) {
  if (!plan) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 text-sm text-gray-500">
        Termina la lectura emocional y elige un estilo para generar la obra.
      </div>
    )
  }

  const strokeCommands = plan.robot_commands.filter((command) => command.type === 'stroke')
  const paintPoints = strokeCommands.reduce((total, command) => (
    total + command.points.filter((point) => point.brush === 1).length
  ), 0)
  const summary = plan.summary || plan.artistic_summary || buildFallbackSummary(plan, planSource, strokeCommands.length)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Obra propuesta</h2>
          <p className="text-xs text-gray-500 mt-1">
            {plan.artist_name}: {getEmotionLabel(plan.main_emotion)} + {getEmotionLabel(plan.secondary_emotion)}
          </p>
          <span className={`inline-flex mt-2 rounded-md px-2 py-1 text-[11px] font-semibold ${
            planSource === 'ai_bridge' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'
          }`}>
            {planSource === 'ai_bridge' ? 'Recibido desde AI Bridge' : 'Fallback local'}
          </span>
        </div>
        <button
          onClick={onSend}
          disabled={disabled || !mqttEnabled || mqttStatus !== 'connected'}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
        >
          {disabled ? 'Pintura no disponible' : 'Pintar la obra'}
        </button>
      </div>

      {disabledReason && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {disabledReason}
        </div>
      )}

      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
        <span className="block text-[10px] uppercase tracking-wider text-amber-200/70">Resumen artístico</span>
        <h3 className="mt-2 text-lg font-bold text-white">{summary.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{summary.text}</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-100/70">{summary.movement}</p>
      </div>

      <StrokePreview plan={plan} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Trazos" value={strokeCommands.length} />
        <Metric label="Puntos" value={paintPoints} />
        <Metric label="Comandos" value={plan.robot_commands.length} />
        <Metric label="Velocidad" value={plan.speed} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Presión" value={plan.pressure} />
        <Metric label="Densidad" value={plan.density} />
        <Metric label="Movilidad" value={plan.movement_level} />
        <Metric label="Lienzo" value={`${plan.canvas.width}x${plan.canvas.height}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {plan.palette.map((color) => (
          <span key={color.name} className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
            {color.name}
          </span>
        ))}
      </div>

      {robotStatus && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          Robot: {formatRobotStatus(robotStatus)}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
      <span className="block text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="block text-lg font-semibold text-white">{value}</span>
    </div>
  )
}

function StrokePreview({ plan }) {
  return (
    <div className="relative aspect-11/8 rounded-lg overflow-hidden border border-gray-800 bg-stone-100">
      <svg viewBox={`0 0 ${plan.canvas.width} ${plan.canvas.height}`} className="absolute inset-0 w-full h-full">
        <rect width={plan.canvas.width} height={plan.canvas.height} fill="#f8f2e7" />
        {plan.strokes.map((stroke) => {
          const drawPoints = stroke.points.filter((point) => point.brush === 1)
          const points = drawPoints.map((point) => `${point.x},${point.y}`).join(' ')

          if (!points) return null

          return (
            <polyline
              key={stroke.id}
              points={points}
              fill="none"
              stroke={stroke.color.hex}
              strokeWidth={stroke.pressure > 65 ? 4.5 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.82}
            />
          )
        })}
      </svg>
    </div>
  )
}

function formatRobotStatus(robotStatus) {
  if (typeof robotStatus === 'string') return robotStatus
  if (robotStatus.status) return robotStatus.status
  return JSON.stringify(robotStatus)
}

function buildFallbackSummary(plan, planSource, strokeCount) {
  const colors = (plan.palette || []).slice(0, 3).map((color) => color.name.replaceAll('_', ' ')).join(', ')
  const sourceLabel = planSource === 'ai_bridge' ? 'AI Bridge' : 'fallback local'

  return {
    title: `${getEmotionLabel(plan.main_emotion)} en estilo ${plan.artist_name}`,
    text: `${sourceLabel} propone una respuesta para ${plan.artist_name} basada en ${getEmotionLabel(plan.main_emotion).toLowerCase()} y ${getEmotionLabel(plan.secondary_emotion).toLowerCase()}, con ${strokeCount} trazos y una paleta de ${colors || 'colores emocionales'}.`,
    movement: `El brazo usará velocidad ${plan.speed}, presión ${plan.pressure} y densidad ${plan.density}.`,
  }
}
