import CameraView from './CameraView'
import { getEmotionLabel } from '../lib/artEngine'

export default function LiveExperienceView({
  videoRef,
  canvasRef,
  cameraActive,
  artist,
  emotionSummary,
  plan,
  robotStatus,
  lastPublished,
}) {
  const primaryEmotion = emotionSummary?.[0]
  const strokeCommands = plan?.robot_commands?.filter((command) => command.type === 'stroke') || []
  const lastCommand = lastPublished?.payload?.type || 'esperando'

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <section className="space-y-4">
        <CameraView videoRef={videoRef} canvasRef={canvasRef} cameraActive={cameraActive} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <LiveMetric label="Emoción" value={primaryEmotion?.label || 'Esperando'} detail={primaryEmotion ? `${primaryEmotion.percentage}%` : 'Sin lectura'} />
          <LiveMetric label="Pintor" value={artist?.name || 'Sin seleccionar'} detail={artist?.label || 'Estilo pendiente'} />
          <LiveMetric label="Robot" value={formatRobotStatus(robotStatus)} detail={`Último comando: ${lastCommand}`} />
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Lectura actual</span>
          <h2 className="mt-2 text-3xl font-black text-white">{primaryEmotion?.label || 'Sin emoción final'}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {plan
              ? `${artist?.name || 'El pintor'} transforma esta lectura en ${strokeCommands.length} trazos sobre A4.`
              : 'Completa la captura para generar una respuesta artística.'}
          </p>
        </div>

        {plan && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Plan transmitido</span>
                <p className="mt-1 text-sm font-semibold text-zinc-200">
                  {getEmotionLabel(plan.main_emotion)} + {getEmotionLabel(plan.secondary_emotion)}
                </p>
              </div>
              <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                {plan.robot_commands.length} comandos
              </span>
            </div>
            <PlanPreview plan={plan} />
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.palette.map((color) => (
                <span key={color.name} className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                  {color.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function LiveMetric({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3">
      <span className="block text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="mt-1 block truncate text-lg font-bold text-white">{value}</span>
      <span className="mt-1 block truncate text-xs text-zinc-500">{detail}</span>
    </div>
  )
}

function PlanPreview({ plan }) {
  return (
    <div className="relative aspect-[11/8] overflow-hidden rounded-lg border border-zinc-800 bg-stone-100">
      <svg viewBox={`0 0 ${plan.canvas.width} ${plan.canvas.height}`} className="absolute inset-0 h-full w-full">
        <rect width={plan.canvas.width} height={plan.canvas.height} fill="#f8f2e7" />
        {plan.strokes.map((stroke) => {
          const points = stroke.points
            .filter((point) => point.brush === 1)
            .map((point) => `${point.x},${point.y}`)
            .join(' ')

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
  if (!robotStatus) return 'Sin estado'
  if (typeof robotStatus === 'string') return robotStatus
  return robotStatus.status || JSON.stringify(robotStatus)
}