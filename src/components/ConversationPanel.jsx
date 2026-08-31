// Panel de conversacion: une el avatar con el texto y el estado de la sesion.
// Recibe datos ya preparados para concentrarse solo en presentarlos.
import MoodcamAvatar from './MoodcamAvatar'

export default function ConversationPanel({
  artist,
  status,
  error,
  transcript,
  mode,
  voiceEnabled,
  sessionActive,
  captureComplete,
}) {
  return (
    <div className="space-y-4">
      <MoodcamAvatar
        artist={artist}
        voiceStatus={status}
        sessionActive={sessionActive}
        captureComplete={captureComplete}
      />

      <div className="flex justify-end">
        <StatusBadge status={status} mode={mode} voiceEnabled={voiceEnabled} />
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
    idle: 'Rostro + voz',
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
