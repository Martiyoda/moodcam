import { ARTISTS } from '../lib/artEngine'

export default function ArtistSelector({ selectedArtist, onSelect }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">1. Elegir pintor</h2>
        <p className="text-xs text-gray-500 mt-1">
          Es la primera selección: define el estilo, los trazos y la forma en que pintará el brazo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ARTISTS.map((artist) => {
          const active = selectedArtist === artist.id

          return (
            <button
              key={artist.id}
              onClick={() => onSelect(artist.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                active
                  ? 'border-amber-400 bg-amber-400/10 text-white'
                  : 'border-gray-800 bg-gray-900/70 text-gray-300 hover:border-gray-700 hover:bg-gray-800/70'
              }`}
            >
              <span className="block text-sm font-semibold">{artist.name}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{artist.label}</span>
              <span className="block text-[11px] text-gray-500 mt-2 leading-relaxed">{artist.summary}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
