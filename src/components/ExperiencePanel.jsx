export default function ExperiencePanel({
  sessionActive,
  remainingSeconds,
  sampleCount,
  summary,
  guideMessage,
  onStart,
  onFinish,
  onReset,
  disabled,
}) {
  const progress = summary.length > 0 && !sessionActive
    ? 100
    : Math.max(0, Math.min(100, ((60 - remainingSeconds) / 60) * 100))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Experiencia</h2>
        <p className="text-xs text-gray-500 mt-1">{guideMessage}</p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Observación</span>
          <span className="text-2xl font-semibold text-white">{sessionActive ? `${remainingSeconds}s` : '60s'}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-300 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{sampleCount} lecturas guardadas</span>
          <span>{summary.length > 0 ? 'Resumen listo' : 'Esperando datos'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onStart}
          disabled={disabled || sessionActive}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-400 text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
        >
          Iniciar minuto
        </button>
        <button
          onClick={onFinish}
          disabled={!sessionActive}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Finalizar
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
        >
          Reiniciar
        </button>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {summary.map((item) => (
            <div key={item.emotion} className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
              <span className="block text-xs text-gray-500">{item.label}</span>
              <span className="block text-xl font-semibold text-white">{item.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
