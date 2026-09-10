// Este componente muestra las opciones de pintor que puede elegir la persona.
// La seleccion solo cambia la receta artistica; no mueve el brazo por si sola.
import { ARTISTS } from '../lib/artEngine'
import { WRO_PRESENTATION_ARTIST_IDS } from '../lib/painterRecipes'

const PRESENTATION_ARTISTS = ARTISTS.filter((artist) => WRO_PRESENTATION_ARTIST_IDS.includes(artist.id))
const ARTWORK_REFERENCES = {
  kandinsky: {
    title: 'Several Circles, 1926',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Vassily%20Kandinsky%2C%201926%20-%20Several%20Circles%2C%20Gugg%200910%2025.jpg?width=900',
  },
  pollock: {
    title: 'Su estudio de pintura de acción',
    imageUrl: 'https://en.wikipedia.org/wiki/Special:FilePath/Pollock-Krasner_House_studio_floor.jpg?width=900',
  },
  rothko: {
    title: 'No. 9, 1948',
    imageUrl: 'https://en.wikipedia.org/wiki/Special:FilePath/No._9%2C_1948%2C_Mark_Rothko_at_NGA_2023.jpg?width=900',
  },
  'alma-thomas': {
    title: 'Resurrection, 1966',
    imageUrl: 'https://en.wikipedia.org/wiki/Special:FilePath/Resurrection%2C_1966%2C_Alma_Thomas_at_SAAM_2023.jpg?width=900',
  },
}

export default function ArtistSelector({ selectedArtist, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="lg:w-44 lg:shrink-0">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Elige el pintor</h2>
        <p className="text-xs text-gray-500 mt-1">Elige el estilo para la sesión.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {PRESENTATION_ARTISTS.map((artist) => {
          const active = selectedArtist === artist.id
          const artwork = ARTWORK_REFERENCES[artist.id]

          return (
            <button
              key={artist.id}
              onClick={() => onSelect(artist.id)}
              className={`overflow-hidden rounded-lg border text-left transition-colors ${
                active
                  ? 'border-[#2295D4] bg-[#2295D4]/10 text-white'
                  : 'border-gray-800 bg-gray-900/70 text-gray-300 hover:border-gray-700 hover:bg-gray-800/70'
              }`}
            >
              <img
                src={artwork.imageUrl}
                alt={`Obra de referencia: ${artwork.title}, ${artist.name}`}
                className="h-28 w-full object-cover"
                loading="lazy"
              />
              <span className="block p-3">
                <span className="block text-sm font-semibold">{artist.name}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{artist.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
