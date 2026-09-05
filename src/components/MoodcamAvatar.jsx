// Paletas pequenas para que el avatar acompan e visualmente al pintor elegido.
// Son solo datos de presentacion y no sustituyen la paleta enviada al robot.
const ARTIST_PALETTES = {
  kandinsky: { primary: '#f6c453', accent: '#3ee7c7' },
  pollock: { primary: '#ff6b5f', accent: '#f6c453' },
  rothko: { primary: '#9b6b93', accent: '#e06c75' },
  'alma-thomas': { primary: '#f6c453', accent: '#5ec4d8' },
}

export default function MoodcamAvatar({ artist, voiceStatus, sessionActive, captureComplete }) {
  const palette = ARTIST_PALETTES[artist?.id] || ARTIST_PALETTES.kandinsky
  const speaking = voiceStatus === 'listening' || voiceStatus === 'live'
  const state = avatarState({ speaking, sessionActive, captureComplete })

  return (
    <div
      className="relative aspect-square min-h-72 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950"
      aria-label={`Avatar Moodcam: ${state.label}`}
    >
      <video className="absolute inset-0 h-full w-full object-cover opacity-45" src="/moodcam-avatar/background.mp4" autoPlay loop muted playsInline aria-hidden="true" />
      <video className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${speaking ? 'opacity-0' : 'opacity-100'}`} src="/moodcam-avatar/idle.mp4" autoPlay loop muted playsInline aria-hidden="true" />
      <video className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${speaking ? 'opacity-100' : 'opacity-0'}`} src="/moodcam-avatar/speak.mp4" autoPlay loop muted playsInline aria-hidden="true" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 flex min-h-56 items-center justify-center p-5">
        <div className="relative h-36 w-32 opacity-0" aria-hidden="true">
          <div className="absolute inset-x-5 top-3 h-24 rounded-[45%] border-2 border-white/80 bg-zinc-900 shadow-[0_0_28px_rgba(255,255,255,.1)]" />
          <div className="absolute left-10 top-12 h-2.5 w-2.5 rounded-full bg-white" />
          <div className="absolute right-10 top-12 h-2.5 w-2.5 rounded-full bg-white" />
          <div
            className={`absolute left-1/2 top-20 -translate-x-1/2 border-b-2 border-white transition-all ${speaking ? 'h-4 w-10 rounded-b-full' : 'h-1 w-8 rounded-full'}`}
          />
          <div className="absolute inset-x-0 bottom-0 h-12 rounded-t-[48%] border-x-2 border-t-2 border-white/50 bg-zinc-900" />
          <span className={`absolute -left-1 top-8 h-3 w-3 rounded-full ${sessionActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: palette.accent }} />
          <span className="absolute -right-1 bottom-9 h-3 w-3 rounded-full" style={{ backgroundColor: palette.primary }} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 border-t border-zinc-800 bg-zinc-950/90 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Moodcam · {artist?.name || 'Artista'}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{state.label}</p>
        </div>
        <span className="shrink-0 text-xs font-medium" style={{ color: palette.primary }}>{state.detail}</span>
      </div>
    </div>
  )
}

function avatarState({ speaking, sessionActive, captureComplete }) {
  if (captureComplete) return { label: 'Lectura completada', detail: 'lista' }
  if (speaking) return { label: 'Escuchando la conversación', detail: 'voz activa' }
  if (sessionActive) return { label: 'Observando señales', detail: 'capturando' }
  return { label: 'Listo para empezar', detail: 'en espera' }
}