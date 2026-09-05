// Selector de alto nivel: reutiliza el selector comun y conecta su resultado
// con la experiencia que usa las recetas de la presentacion WRO.
import ArtistSelector from './ArtistSelector'

export default function PainterSelector(props) {
  return <ArtistSelector {...props} />
}
