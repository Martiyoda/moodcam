const EMOTION_MAP = {
  neutral: { label: 'Neutral', emoji: '😐', color: 'text-gray-400' },
  happy: { label: 'Feliz', emoji: '😊', color: 'text-yellow-400' },
  sad: { label: 'Triste', emoji: '😢', color: 'text-blue-400' },
  angry: { label: 'Enfadado', emoji: '😠', color: 'text-red-500' },
  fear: { label: 'Asustado', emoji: '😨', color: 'text-purple-400' },
  disgust: { label: 'Disgustado', emoji: '🤢', color: 'text-green-500' },
  surprise: { label: 'Sorprendido', emoji: '😲', color: 'text-orange-400' },
}

function EmotionBar({ name, value }) {
  const info = EMOTION_MAP[name] || { label: name, emoji: '❓', color: 'text-white' }
  const pct = Math.round(value * 100)

  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-center text-lg">{info.emoji}</span>
      <span className={`w-24 text-sm font-medium ${info.color}`}>{info.label}</span>
      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: 'linear-gradient(to right, #1378BC, #5AB5DB)' }}
        />
      </div>
      <span className="w-10 text-right text-xs text-gray-400">{pct}%</span>
    </div>
  )
}

export default function EmotionDisplay({ emotions, dominant, age, gender }) {
  if (!emotions) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-4xl mb-2">🔍</p>
        <p className="text-sm">Buscando rostro...</p>
      </div>
    )
  }

  const info = EMOTION_MAP[dominant] || { label: dominant, emoji: '❓', color: 'text-white' }

  const sorted = Object.entries(emotions).sort(([, a], [, b]) => b - a)

  const genderLabel = gender === 'male' ? '♂ Hombre' : gender === 'female' ? '♀ Mujer' : null

  return (
    <div className="space-y-4">
      {/* Emoción dominante */}
      <div className="text-center">
        <span className="text-6xl block mb-1">{info.emoji}</span>
        <span className={`text-2xl font-bold ${info.color}`}>{info.label}</span>
        <span className="block text-xs text-gray-500 mt-1">
          {Math.round(emotions[dominant] * 100)}% de confianza
        </span>
      </div>

      {/* Edad y género */}
      {(age || genderLabel) && (
        <div className="flex justify-center gap-4 text-sm text-gray-400">
          {age && <span>🎂 ~{age} años</span>}
          {genderLabel && <span>{genderLabel}</span>}
        </div>
      )}

      {/* Barras de todas las emociones */}
      <div className="space-y-2">
        {sorted.map(([name, value]) => (
          <EmotionBar key={name} name={name} value={value} />
        ))}
      </div>
    </div>
  )
}
