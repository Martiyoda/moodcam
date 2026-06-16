export default function VoiceEmotionPanel({ latestSample, summary, combinedSummary, faceSummary }) {
  const intensity = latestSample?.intensity || summary.average_intensity || 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">3. Voz + emociones</h2>
        <p className="text-xs text-gray-500 mt-1">Estimación aproximada: texto, tono básico y rostro. No es diagnóstico.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Intensidad voz" value={`${intensity}%`} />
        <Metric label="Estado voz" value={latestSample?.label || summary.label || 'neutro'} />
      </div>

      <div className="space-y-2">
        <EmotionGroup title="Rostro" items={faceSummary} />
        <EmotionGroup title="Voz" items={summary.main_emotions || []} />
        <EmotionGroup title="Combinado" items={combinedSummary} strong />
      </div>

      {summary.color_preferences?.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3">
          <span className="block text-[10px] uppercase tracking-wider text-gray-500">Colores mencionados</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {summary.color_preferences.map((color) => (
              <span key={color} className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-300">{color}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmotionGroup({ title, items, strong = false }) {
  return (
    <div className={`rounded-lg border p-3 ${strong ? 'border-amber-400/40 bg-amber-400/10' : 'border-gray-800 bg-gray-900/70'}`}>
      <span className="block text-[10px] uppercase tracking-wider text-gray-500">{title}</span>
      {items?.length ? (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {items.map((item) => (
            <div key={`${title}-${item.emotion}`}>
              <span className="block text-xs text-gray-500">{item.label}</span>
              <span className="text-lg font-semibold text-white">{item.percentage}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-2">Esperando datos.</p>
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
