export default function PainterVideoManager({ painter, response, emotionLabel }) {
  const video = response?.video
  const question = painter.questions?.[0] || '¿Qué quieres expresar con esta pintura?'
  const followUp = painter.questions?.[1]
  const videoReady = Boolean(video?.ready)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl shadow-black/20">
      <div className="relative aspect-video bg-zinc-950 flex items-center justify-center">
        {videoReady ? (
          <video
            src={video.src}
            poster={video.poster}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid grid-cols-[1fr_1.15fr] bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,#09090b_0%,#1c1917_45%,#111827_100%)]">
            <div className="flex items-center justify-center border-r border-white/10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-amber-300/20 blur-xl" />
                <img src={painter.avatar} alt={painter.name} className="relative w-24 h-24 rounded-full border border-white/15 bg-black/30 p-2 shadow-lg object-contain" />
              </div>
            </div>
            <div className="flex flex-col justify-center p-5 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">Video temporal</p>
              <p className="mt-2 text-xl font-semibold text-white truncate">{painter.name}</p>
              <p className="mt-1 text-sm text-zinc-300">{painter.styleLabel}</p>
              <div className="mt-4 flex items-end gap-1 h-7" aria-hidden="true">
                {[16, 28, 12, 23, 18, 31, 14].map((height, index) => (
                  <span
                    key={height + index}
                    className="w-2 rounded-full bg-amber-300/80 animate-pulse"
                    style={{ height, animationDelay: `${index * 90}ms` }}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-500 truncate">Ruta preparada: {video?.src}</p>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
          {emotionLabel ? `Estado: ${emotionLabel}` : 'Esperando respuesta'}
        </div>
        <div className="absolute right-3 top-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
          {videoReady ? 'HeyGen cargado' : 'Mock sustituible'}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-2">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Guion base</span>
          <p className="text-sm text-zinc-200">{painter.openingLine}</p>
          <p className="text-sm text-cyan-100">{question}</p>
          {followUp && <p className="text-xs text-zinc-400">{followUp}</p>}
        </div>
        <div className="rounded-lg bg-amber-400/10 border border-amber-400/30 p-3">
          <span className="block text-[10px] uppercase tracking-wider text-amber-200/70">Respuesta seleccionada</span>
          <p className="text-sm text-amber-50 mt-1">{response?.text || 'Esperando emoción para elegir una respuesta.'}</p>
          {response?.actionCue && (
            <p className="text-xs text-amber-100/60 mt-2">Dirección HeyGen: {response.actionCue}</p>
          )}
        </div>
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-zinc-500">Script completo del clip</summary>
          <p className="mt-2 text-xs leading-relaxed text-zinc-300">{response?.script || 'El script se cargará cuando haya una emoción estimada.'}</p>
        </details>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Notas para HeyGen</span>
          <p className="text-xs leading-relaxed text-zinc-400 mt-1">{painter.heygenNotes}</p>
        </div>
      </div>
    </div>
  )
}
