// Este componente muestra las opciones de pintor que puede elegir la persona.
// La seleccion solo cambia la receta artistica; no mueve el brazo por si sola.
import { ARTISTS } from '../lib/artEngine'
import { WRO_PRESENTATION_ARTIST_IDS } from '../lib/painterRecipes'

const PRESENTATION_ARTISTS = ARTISTS.filter((artist) => WRO_PRESENTATION_ARTIST_IDS.includes(artist.id))

export default function ArtistSelector({ selectedArtist, onSelect }) {
  return (
    <div className="space-y-3 lg:flex lg:items-center lg:gap-4 lg:space-y-0">
      <div className="lg:w-44 lg:shrink-0">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Elige el pintor</h2>
        <p className="text-xs text-gray-500 mt-1">Define estilo, trazos y receta del brazo.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:flex-1">
        {PRESENTATION_ARTISTS.map((artist) => {
          const active = selectedArtist === artist.id

          return (
            <button
              key={artist.id}
              onClick={() => onSelect(artist.id)}
              className={`min-h-24 text-left p-3 rounded-lg border transition-colors ${
                active
                  ? 'border-amber-400 bg-amber-400/10 text-white'
                  : 'border-gray-800 bg-gray-900/70 text-gray-300 hover:border-gray-700 hover:bg-gray-800/70'
              }`}
            >
              <span className="block text-sm font-semibold">{artist.name}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{artist.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
