export default function ConversationPanel({
  artist,
  status,
  error,
  transcript,
  mode,
  remainingSeconds,
  sessionActive,
  onStart,
  onFinish,
  onReset,
  disabled,
}) {
  const progress = sessionActive ? Math.max(0, Math.min(100, ((60 - remainingSeconds) / 60) * 100)) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">2. Captura con {artist.name}</h2>
          <p className="text-xs text-gray-500 mt-1">{mode?.description || 'Moodcam mide la emoción visual durante 60 segundos.'}</p>
        </div>
        <StatusBadge status={status} mode={mode} />
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{mode?.label || 'Sesión visual'}</span>
          <span className="text-2xl font-semibold text-white">{sessionActive ? `${remainingSeconds}s` : '60s'}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-400 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onStart}
            disabled={disabled || sessionActive}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-400 text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
          >
            Iniciar captura
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
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3 max-h-56 overflow-y-auto space-y-2">
        {transcript.length === 0 ? (
          <p className="text-sm text-gray-500">El transcript aparecerá aquí si el navegador permite speech-to-text. Si no, Moodcam seguirá midiendo energía, pausas y rostro.</p>
        ) : (
          transcript.map((item) => (
            <div key={item.id} className="text-sm">
              <span className={item.speaker === 'user' ? 'text-cyan-300' : 'text-amber-300'}>
                {item.speaker === 'user' ? 'Usuario' : artist.name}:
              </span>
              <span className="text-gray-300 ml-2">{item.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, mode }) {
  const styles = {
    idle: 'bg-gray-700 text-gray-300',
    starting: 'bg-amber-400/15 text-amber-200',
    listening: 'bg-emerald-400/15 text-emerald-200',
    connecting: 'bg-amber-400/15 text-amber-200',
    live: 'bg-emerald-400/15 text-emerald-200',
    ended: 'bg-cyan-400/15 text-cyan-200',
    error: 'bg-red-500/15 text-red-200',
  }
  const labels = {
    idle: 'Listo',
    starting: 'Iniciando',
    listening: 'Escuchando',
    connecting: 'Conectando',
    live: 'En vivo',
    ended: 'Finalizado',
    error: 'Error',
  }

  const label = mode?.id === 'none' && status === 'idle' ? mode.statusLabel : labels[status] || status

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${styles[status] || styles.idle}`}>
      {label}
    </span>
  )
}
