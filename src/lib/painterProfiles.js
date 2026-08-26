import { ARTISTS } from './artEngine.js'

const SIMPLE_EMOTIONS = ['neutral', 'joyful', 'calm', 'sad', 'nervous', 'tired', 'confused']

const PAINTER_SCRIPT_DATA = {
  kandinsky: {
    responses: {
      joyful: 'Usare circulos abiertos, amarillos y lineas ascendentes para que la alegria tenga ritmo.',
      calm: 'Voy a ordenar la composicion con azules suaves, curvas lentas y espacios que respiren.',
      sad: 'Pintare capas profundas con formas contenidas para cuidar esa melancolia sin hacerla pesada.',
      nervous: 'Transformare la tension en diagonales controladas, como una partitura que encuentra pulso.',
      tired: 'Bajare la presion del pincel y dejare que el color avance despacio, sin exigir demasiado.',
      confused: 'Separare la mezcla en puntos, arcos y lineas para que cada sensacion encuentre su sitio.',
      neutral: 'Empezare con equilibrio: una forma central, dos colores tranquilos y movimiento suave.',
    },
  },
  pollock: {
    responses: {
      joyful: 'Dejare que la alegria salte con trazos rapidos y manchas luminosas.',
      calm: 'Aunque mi energia sea fuerte, hoy la contendre con recorridos largos y pausas limpias.',
      sad: 'Convertire esa tristeza en capas de movimiento bajo, como lluvia que cae sin romperse.',
      nervous: 'La tension saldra en cambios de direccion, pero el robot mantendra limites seguros.',
      tired: 'Reducire la velocidad, usare menos salpicadura y dejare descansos entre gestos.',
      confused: 'Hare que el caos tenga mapa: bucles, gotas y cortes que se respondan entre ellos.',
      neutral: 'Arrancare con una energia media para descubrir hacia donde quiere ir el cuadro.',
    },
  },
  rothko: {
    responses: {
      joyful: 'La alegria sera un campo luminoso, amplio, sin prisa, para que no se agote.',
      calm: 'Mantendre el pincel lento y dejare que dos colores se encuentren con suavidad.',
      sad: 'Usare azules y violetas profundos, con capas horizontales que den refugio.',
      nervous: 'Voy a bajar el ruido: grandes zonas de color para que la tension se asiente.',
      tired: 'Pintare poco, despacio y con bordes suaves, como una respiracion larga.',
      confused: 'Separare la duda en bloques claros para que la mirada pueda descansar.',
      neutral: 'Preparare un campo equilibrado, sin exceso de gesto, listo para recibir la emocion.',
    },
  },
  'alma-thomas': {
    responses: {
      joyful: 'Repetire colores vivos en pequenas pinceladas para que la alegria brille por partes.',
      calm: 'Construire un mosaico suave con ritmo regular y colores frescos.',
      sad: 'Usare piezas mas profundas, pero dejare pequenas luces para acompanar esa emocion.',
      nervous: 'Ordenare la energia en patrones repetidos para que el movimiento se calme.',
      tired: 'Hare pinceladas cortas y tranquilas, con espacios de descanso entre colores.',
      confused: 'Convertire la mezcla en un mosaico: cada duda sera una pieza visible.',
      neutral: 'Empezare con un patron claro, luminoso y estable.',
    },
  },
}

export function getPainterProfiles() {
  return ARTISTS.map((artist) => buildPainterProfile(artist))
}

export function getPainterProfile(painterId) {
  return getPainterProfiles().find((painter) => painter.id === painterId) || getPainterProfiles()[0]
}

function buildPainterProfile(artist) {
  const data = PAINTER_SCRIPT_DATA[artist.id] || PAINTER_SCRIPT_DATA.kandinsky

  return {
    id: artist.id,
    name: artist.name,
    description: artist.summary,
    style: artist.style,
    styleLabel: artist.label,
    responses: buildResponses(artist.id, data),
  }
}

function buildResponses(painterId, data) {
  return SIMPLE_EMOTIONS.map((emotion) => ({
    id: `${painterId}-response-${emotion}`,
    emotion,
    text: data.responses?.[emotion] || data.responses?.neutral,
  }))
}
