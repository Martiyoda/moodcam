export default function ConversationPanel({
  artist,
  status,
  error,
  transcript,
  mode,
  voiceEnabled,
  voiceAvailable,
  voiceConsentGranted,
  remainingSeconds,
  captureDurationSeconds,
  progress,
  sessionActive,
  captureComplete,
  onVoiceConsentChange,
  onReset,
}) {
  const progressValue = Math.max(0, Math.min(100, progress || 0))
  const progressStyle = sessionActive
    ? { animation: `capture-progress-fill ${captureDurationSeconds}s linear forwards` }
    : { transform: `scaleX(${progressValue / 100})` }
  const modeLabel = voiceEnabled ? mode?.label || 'Sesión visual' : 'Sesión sólo rostro'
  const modeDescription = voiceEnabled
    ? mode?.description || `Moodcam mide la emoción visual durante ${captureDurationSeconds} segundos.`
    : `Moodcam usa únicamente la cámara para estimar la emoción durante ${captureDurationSeconds} segundos.`

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">2. Lee tu emoción con {artist.name}</h2>
          <p className="text-xs text-gray-500 mt-1">{modeDescription}</p>
        </div>
        <StatusBadge status={status} mode={mode} voiceEnabled={voiceEnabled} />
      </div>

      <ArtistAvatar
        artist={artist}
        status={status}
        sessionActive={sessionActive}
        captureComplete={captureComplete}
        progress={progressValue}
      />

      <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{modeLabel}</span>
          <span className="text-2xl font-semibold text-white">{captureComplete ? '0s' : sessionActive ? `${remainingSeconds}s` : `${captureDurationSeconds}s`}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full w-full origin-left bg-linear-to-r from-cyan-300 via-amber-300 to-rose-400"
            style={progressStyle}
          />
        </div>
        {voiceAvailable && (
          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs text-gray-400">
            <span>Permitir captura de voz</span>
            <input
              type="checkbox"
              checked={voiceConsentGranted}
              disabled={sessionActive}
              onChange={(event) => onVoiceConsentChange(event.target.checked)}
              className="h-4 w-4 accent-amber-300 disabled:opacity-40"
            />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
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

      {!captureComplete && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3 max-h-56 overflow-y-auto space-y-2">
          {!voiceEnabled ? (
            <p className="text-sm text-gray-500">Voz desactivada. La emoción se calculará sólo con la cámara.</p>
          ) : transcript.length === 0 ? (
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
      )}
    </div>
  )
}

function ArtistAvatar({ artist, status, sessionActive, captureComplete, progress }) {
  const speaking = status === 'listening' || status === 'live'
  const resting = !sessionActive && !captureComplete
  const palette = avatarPalette(artist?.id)
  const pulse = sessionActive ? 'animate-pulse' : ''
  const eyeClass = speaking ? 'h-3' : resting ? 'h-1.5' : 'h-2'
  const mouthClass = speaking
    ? 'h-3 w-10 rounded-b-full border-b-2 border-current'
    : captureComplete
      ? 'h-1.5 w-9 rounded-full bg-current'
      : 'h-1 w-7 rounded-full bg-current'

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-800 bg-gray-950/80 p-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-cyan-300 via-amber-300 to-rose-400" style={{ transform: `scaleX(${Math.max(0.04, progress / 100)})`, transformOrigin: 'left' }} />
      <div className="flex items-center gap-4">
        <div className={`relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-linear-to-br ${palette.face} shadow-lg shadow-black/30 ${pulse}`}>
          <div className={`absolute -left-3 top-6 h-8 w-8 rounded-full ${palette.accent} opacity-70`} />
          <div className={`absolute -right-2 bottom-5 h-7 w-7 rounded-full ${palette.accentAlt} opacity-70`} />
          <div className="relative h-16 w-16 rounded-full border border-white/15 bg-black/20 backdrop-blur-sm">
            <div className="absolute left-4 top-5 flex items-end gap-5 text-white/90">
              <span className={`block w-2 rounded-full bg-current transition-all ${eyeClass}`} />
              <span className={`block w-2 rounded-full bg-current transition-all ${eyeClass}`} />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/85">
              <span className={`block transition-all ${mouthClass}`} />
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{artist.name}</p>
          <p className="mt-1 text-sm font-semibold text-gray-200">{avatarStateLabel({ status, sessionActive, captureComplete })}</p>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2, 3].map((item) => (
              <span key={item} className={`h-1.5 rounded-full ${item < Math.ceil(progress / 25) ? palette.bar : 'bg-gray-800'} ${item === 0 ? 'w-8' : item === 1 ? 'w-5' : item === 2 ? 'w-7' : 'w-4'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function avatarPalette(artistId) {
  const palettes = {
    kandinsky: { face: 'from-blue-600 to-amber-300', accent: 'bg-red-500', accentAlt: 'bg-violet-500', bar: 'bg-amber-300' },
    pollock: { face: 'from-red-600 to-yellow-300', accent: 'bg-blue-500', accentAlt: 'bg-violet-500', bar: 'bg-red-400' },
    rothko: { face: 'from-blue-900 to-red-500', accent: 'bg-violet-600', accentAlt: 'bg-yellow-400', bar: 'bg-blue-400' },
    'alma-thomas': { face: 'from-yellow-300 to-blue-500', accent: 'bg-red-500', accentAlt: 'bg-violet-500', bar: 'bg-violet-300' },
  }
  return palettes[artistId] || palettes.kandinsky
}

function avatarStateLabel({ status, sessionActive, captureComplete }) {
  if (captureComplete) return 'Lectura completada'
  if (status === 'listening' || status === 'live') return 'Acompañando la captura'
  if (status === 'starting' || status === 'connecting') return 'Preparando conversación'
  if (status === 'error') return 'Modo visual activo'
  return sessionActive ? 'Observando señales' : 'Listo para iniciar'
}

function StatusBadge({ status, mode, voiceEnabled }) {
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

  const label = !voiceEnabled ? 'Sólo rostro' : mode?.id === 'none' && status === 'idle' ? mode.statusLabel : labels[status] || status

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${styles[status] || styles.idle}`}>
      {label}
    </span>
  )
}
