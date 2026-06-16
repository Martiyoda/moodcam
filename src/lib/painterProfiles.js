import { ARTISTS } from './artEngine.js'

const PLACEHOLDER_VIDEO_BASE = '/painters/placeholders'
const SIMPLE_VIDEO_EMOTIONS = ['neutral', 'joyful', 'calm', 'sad', 'nervous', 'tired', 'confused']

const PAINTER_SCRIPT_DATA = {
  kandinsky: {
    avatar: '/e-motion-symbol.png',
    callTheme: 'formas, ritmo y color',
    openingLine: 'Hola, soy tu guia Kandinsky. Vamos a escuchar tu emocion como si fuera musica y convertirla en formas.',
    questions: [
      'Si tu emoción fuera un color o una forma, ¿cuál sería ahora?',
      '¿Qué ritmo te gustaría que tuviera este dibujo?',
    ],
    heygenNotes: 'Avatar artistico inspirado en pintura abstracta: tono curioso, musical y preciso. No imitar voz real.',
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
    avatar: '/e-motion-symbol.png',
    callTheme: 'accion, energia y gesto',
    openingLine: 'Estoy listo para mover la pintura. Respira, dime que energia quieres soltar y la convertiremos en gesto.',
    questions: [
      '¿Qué energía quieres soltar en la pintura?',
      '¿Tu emoción se mueve rápido, lento o con saltos?',
    ],
    heygenNotes: 'Avatar artistico inspirado en action painting: energia alta, frases cortas y movimiento corporal. No imitar voz real.',
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
    avatar: '/e-motion-symbol.png',
    callTheme: 'campos de color y calma',
    openingLine: 'Miremos el color como un lugar. Dime que sientes y construiremos una superficie tranquila para sostenerlo.',
    questions: [
      '¿Qué color profundo describe mejor cómo estás?',
      '¿Tu emoción ocupa mucho espacio o está quieta en un rincón?',
    ],
    heygenNotes: 'Avatar artistico inspirado en campos de color: pausado, contemplativo, pocas palabras. No imitar voz real.',
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
    avatar: '/e-motion-symbol.png',
    callTheme: 'luz, mosaico y naturaleza',
    openingLine: 'Vamos a pintar como si la emocion fuera luz atravesando pequenas piezas de color.',
    questions: [
      '¿Qué color alegre o tranquilo quieres repetir en el cuadro?',
      '¿Tu emoción parece luz, mosaico o naturaleza?',
    ],
    heygenNotes: 'Avatar artistico inspirado en patrones y luz: voz amable, optimista y didactica. No imitar voz real.',
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
  'de-kooning': {
    avatar: '/e-motion-symbol.png',
    callTheme: 'gesto, curva y transformacion',
    openingLine: 'No hace falta que la emocion este ordenada. Dime que quieres transformar y lo llevaremos al gesto.',
    questions: [
      '¿Tu emoción sale como una curva suave o como un gesto intenso?',
      '¿Qué quieres transformar con este dibujo?',
    ],
    heygenNotes: 'Avatar artistico inspirado en gesto expresivo: intenso, directo y plastico. No imitar voz real.',
    responses: {
      joyful: 'La alegria saldra como curvas grandes y cortes de color con mucha presencia.',
      calm: 'Voy a suavizar el gesto y dejar que las curvas se abran sin romperse.',
      sad: 'Usare barridos lentos y fragmentos oscuros para mover esa emocion con cuidado.',
      nervous: 'La tension ira a trazos rotos y diagonales, pero con control de velocidad y margen.',
      tired: 'Reducire el gesto: menos presion, curvas bajas y una composicion mas respirada.',
      confused: 'Trabajare con fragmentos, capas y curvas cruzadas hasta encontrar una direccion.',
      neutral: 'Hare un gesto base: suficiente energia para empezar, sin forzar el cuadro.',
    },
  },
}

export function getPainterProfiles() {
  return ARTISTS.map((artist) => buildPainterProfile(artist))
}

export function getPainterProfile(painterId) {
  return getPainterProfiles().find((painter) => painter.id === painterId) || getPainterProfiles()[0]
}

export function getPainterVideo(painterId, emotion = 'neutral') {
  const painter = getPainterProfile(painterId)
  return painter.videos.find((video) => video.emotion === emotion) || painter.videos.find((video) => video.emotion === 'neutral')
}

function buildPainterProfile(artist) {
  const data = PAINTER_SCRIPT_DATA[artist.id] || PAINTER_SCRIPT_DATA.kandinsky

  return {
    id: artist.id,
    name: artist.name,
    description: artist.summary,
    style: artist.style,
    styleLabel: artist.label,
    avatar: data.avatar,
    callTheme: data.callTheme,
    openingLine: data.openingLine,
    questions: data.questions,
    heygenNotes: data.heygenNotes,
    videos: buildPlaceholderVideos(artist.id),
    responses: buildResponses(artist.id, data),
  }
}

function buildPlaceholderVideos(painterId) {
  return SIMPLE_VIDEO_EMOTIONS.map((emotion) => ({
    id: `${painterId}-${emotion}-placeholder`,
    emotion,
    label: emotion,
    src: `${PLACEHOLDER_VIDEO_BASE}/${painterId}/${emotion}.mp4`,
    poster: '/e-motion-wordmark.png',
    provider: 'heygen-placeholder',
    ready: false,
  }))
}

function buildResponses(painterId, data) {
  return SIMPLE_VIDEO_EMOTIONS.map((emotion) => ({
    id: `${painterId}-response-${emotion}`,
    emotion,
    text: data.responses?.[emotion] || data.responses?.neutral,
    script: buildHeygenScript(data, emotion),
    actionCue: actionCueForEmotion(emotion),
    videoId: `${painterId}-${emotion}-placeholder`,
  }))
}

function buildHeygenScript(data, emotion) {
  const question = data.questions[0]
  const response = data.responses?.[emotion] || data.responses?.neutral

  return [
    data.openingLine,
    question,
    response,
    'Ahora enviaré esta emoción al robot para que la convierta en trazos dentro del papel A4.',
  ].join(' ')
}

function actionCueForEmotion(emotion) {
  const cues = {
    joyful: 'sonreir ligeramente, mirar a camara, gesto abierto',
    calm: 'hablar despacio, pausa breve, gesto suave con la mano',
    sad: 'tono bajo y cuidadoso, mirada tranquila',
    nervous: 'energia contenida, respirar antes de responder',
    tired: 'ritmo lento, expresion serena',
    confused: 'mirada curiosa, explicar con claridad',
    neutral: 'tono equilibrado, expresion atenta',
  }
  return cues[emotion] || cues.neutral
}
