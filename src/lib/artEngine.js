const CANVAS_WIDTH = 220
const CANVAS_HEIGHT = 160
const SAFE_MARGIN = 6
const Z_UP = 28
const Z_PAINT = 8

export const EMOTION_PROFILES = {
  happy: {
    label: 'Alegría',
    colors: [
      { name: 'yellow', hex: '#f8d447' },
      { name: 'orange', hex: '#f97316' },
      { name: 'pink', hex: '#fb7185' },
    ],
    speed: 78,
    pressure: 38,
    density: 70,
    randomness: 34,
    direction: 'upward',
    shapes: ['circle', 'curve', 'open_arc'],
  },
  neutral: {
    label: 'Calma',
    colors: [
      { name: 'light_blue', hex: '#7dd3fc' },
      { name: 'white', hex: '#f8fafc' },
      { name: 'soft_green', hex: '#86efac' },
    ],
    speed: 34,
    pressure: 32,
    density: 42,
    randomness: 16,
    direction: 'horizontal',
    shapes: ['long_curve', 'circle', 'line'],
  },
  sad: {
    label: 'Melancolía',
    colors: [
      { name: 'deep_blue', hex: '#1d4ed8' },
      { name: 'gray', hex: '#94a3b8' },
      { name: 'violet', hex: '#8b5cf6' },
    ],
    speed: 30,
    pressure: 44,
    density: 48,
    randomness: 22,
    direction: 'downward',
    shapes: ['vertical_line', 'soft_spot', 'long_curve'],
  },
  angry: {
    label: 'Tension',
    colors: [
      { name: 'red', hex: '#ef4444' },
      { name: 'black', hex: '#111827' },
      { name: 'hot_orange', hex: '#f97316' },
    ],
    speed: 86,
    pressure: 78,
    density: 82,
    randomness: 58,
    direction: 'diagonal',
    shapes: ['triangle', 'broken_line', 'slash'],
  },
  fear: {
    label: 'Alerta',
    colors: [
      { name: 'purple', hex: '#a855f7' },
      { name: 'indigo', hex: '#4f46e5' },
      { name: 'white', hex: '#f8fafc' },
    ],
    speed: 72,
    pressure: 36,
    density: 62,
    randomness: 66,
    direction: 'zigzag',
    shapes: ['zigzag', 'short_line', 'triangle'],
  },
  disgust: {
    label: 'Fricción',
    colors: [
      { name: 'green', hex: '#22c55e' },
      { name: 'mustard', hex: '#ca8a04' },
      { name: 'dark_green', hex: '#166534' },
    ],
    speed: 54,
    pressure: 58,
    density: 56,
    randomness: 48,
    direction: 'fragmented',
    shapes: ['short_line', 'spot', 'broken_line'],
  },
  surprise: {
    label: 'Sorpresa',
    colors: [
      { name: 'cyan', hex: '#22d3ee' },
      { name: 'magenta', hex: '#d946ef' },
      { name: 'yellow', hex: '#fde047' },
    ],
    speed: 84,
    pressure: 34,
    density: 72,
    randomness: 62,
    direction: 'radial',
    shapes: ['burst', 'circle', 'line'],
  },
}

export const ARTISTS = [
  {
    id: 'kandinsky',
    name: 'Kandinsky',
    style: 'geometric',
    label: 'Geometría musical',
    summary: 'Círculos, triángulos, arcos y líneas con ritmo.',
    shapes: ['circle', 'triangle', 'line', 'arc', 'spiral'],
    baseSpeed: 64,
    basePressure: 42,
    density: 58,
    randomness: 32,
    mobility: 76,
  },
  {
    id: 'pollock',
    name: 'Pollock',
    style: 'action',
    label: 'Acción y salpicadura',
    summary: 'Trazos rápidos, gotas, saltos y recorridos caóticos.',
    shapes: ['splatter', 'flick', 'loop', 'drip'],
    baseSpeed: 90,
    basePressure: 34,
    density: 88,
    randomness: 88,
    mobility: 96,
  },
  {
    id: 'rothko',
    name: 'Rothko',
    style: 'field',
    label: 'Campos de color',
    summary: 'Bloques lentos, capas amplias y bordes suaves.',
    shapes: ['block', 'wash', 'horizon'],
    baseSpeed: 30,
    basePressure: 50,
    density: 44,
    randomness: 14,
    mobility: 42,
  },
  {
    id: 'alma-thomas',
    name: 'Alma Thomas',
    style: 'mosaic',
    label: 'Patrón y mosaico',
    summary: 'Pinceladas pequeñas repetidas con movimiento ordenado.',
    shapes: ['dash', 'mosaic', 'short_arc'],
    baseSpeed: 58,
    basePressure: 40,
    density: 78,
    randomness: 28,
    mobility: 68,
  },
  {
    id: 'de-kooning',
    name: 'De Kooning',
    style: 'gesture',
    label: 'Gesto intenso',
    summary: 'Curvas rotas, barridos y trazos fragmentados.',
    shapes: ['gesture', 'slash', 'curve', 'broken_line'],
    baseSpeed: 82,
    basePressure: 72,
    density: 74,
    randomness: 70,
    mobility: 90,
  },
]

export function getArtistById(artistId) {
  return ARTISTS.find((artist) => artist.id === artistId) || ARTISTS[0]
}

export function getEmotionLabel(emotion) {
  return EMOTION_PROFILES[emotion]?.label || emotion
}

export function calculateEmotionSummary(samples, limit = 2) {
  const totals = {}

  samples.forEach((sample) => {
    Object.entries(sample.emotions || {}).forEach(([emotion, rawValue]) => {
      const value = normalizeScore(rawValue)
      totals[emotion] = (totals[emotion] || 0) + value
    })
  })

  const totalScore = Object.values(totals).reduce((sum, value) => sum + value, 0)
  if (!totalScore) return []

  return Object.entries(totals)
    .map(([emotion, score]) => ({
      emotion,
      label: getEmotionLabel(emotion),
      percentage: Math.round((score / totalScore) * 100),
      average: Math.round((score / Math.max(samples.length, 1)) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
}

export function generateArtPlan({ mainEmotions, artistId, mobility = 85, calibration = null, colorPreferences = [], voiceSummary = null }) {
  const artist = getArtistById(artistId)
  const primary = mainEmotions[0] || { emotion: 'neutral', percentage: 100, label: getEmotionLabel('neutral') }
  const secondary = mainEmotions[1] || primary
  const primaryProfile = getProfile(primary.emotion)
  const secondaryProfile = getProfile(secondary.emotion)
  const movementLevel = clamp(mobility, 0, 100)
  const resolvedCalibration = normalizeCalibration(calibration)

  const baseColors = uniqueColors([...primaryProfile.colors, ...secondaryProfile.colors]).slice(0, 5)
  const colors = selectPalette(baseColors, colorPreferences, resolvedCalibration.paints)
  const speed = clamp(
    Math.round(weightedAverage(primaryProfile.speed, secondaryProfile.speed, primary.percentage) * 0.45 + artist.baseSpeed * 0.35 + movementLevel * 0.2),
    15,
    100
  )
  const pressure = clamp(
    Math.round(weightedAverage(primaryProfile.pressure, secondaryProfile.pressure, primary.percentage) * 0.55 + artist.basePressure * 0.45),
    10,
    100
  )
  const density = clamp(
    Math.round(weightedAverage(primaryProfile.density, secondaryProfile.density, primary.percentage) * 0.45 + artist.density * 0.35 + movementLevel * 0.2),
    15,
    100
  )
  const randomness = clamp(
    Math.round(weightedAverage(primaryProfile.randomness, secondaryProfile.randomness, primary.percentage) * 0.45 + artist.randomness * 0.35 + movementLevel * 0.2),
    0,
    100
  )

  const strokeCount = clamp(Math.round(6 + density / 8 + movementLevel / 7), 8, 30)
  const shapes = uniqueStrings([...artist.shapes, ...primaryProfile.shapes, ...secondaryProfile.shapes]).slice(0, 7)
  const planId = `plan-${Date.now()}`

  const rawStrokes = Array.from({ length: strokeCount }, (_, index) => (
    createStroke({
      index,
      artist,
      shapes,
      colors,
      speed,
      pressure,
      randomness,
      movementLevel,
      direction: index % 2 === 0 ? primaryProfile.direction : secondaryProfile.direction,
    })
  ))
  const strokes = rawStrokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((strokePoint) => projectPointToCanvas(strokePoint, resolvedCalibration)),
  }))
  const robotCommands = createRobotCommands(strokes, resolvedCalibration)

  return {
    id: planId,
    created_at: new Date().toISOString(),
    artist: artist.id,
    artist_name: artist.name,
    style: artist.style,
    main_emotion: primary.emotion,
    secondary_emotion: secondary.emotion,
    main_emotions: [primary, secondary],
    voice_summary: voiceSummary,
    colors: colors.map((color) => color.name),
    palette: colors,
    stroke_type: artist.style,
    shapes,
    speed,
    pressure,
    density,
    randomness,
    movement_level: movementLevel,
    movement_strategy: movementLevel > 75
      ? 'recorridos amplios, cambios de dirección y levantamientos frecuentes del pincel'
      : 'movimientos contenidos y transiciones suaves',
    canvas: { ...resolvedCalibration.canvas, unit: 'mm', orientation: 'horizontal-a4' },
    calibration: resolvedCalibration,
    strokes,
    robot_commands: robotCommands,
  }
}

function getProfile(emotion) {
  return EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral
}

function normalizeScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return value > 1 ? value / 100 : value
}

function weightedAverage(primaryValue, secondaryValue, primaryPercentage) {
  const primaryWeight = clamp(primaryPercentage || 50, 0, 100) / 100
  return primaryValue * primaryWeight + secondaryValue * (1 - primaryWeight)
}

function uniqueColors(colors) {
  const seen = new Set()
  return colors.filter((color) => {
    if (seen.has(color.name)) return false
    seen.add(color.name)
    return true
  })
}

function uniqueStrings(values) {
  return [...new Set(values)]
}

function normalizeCalibration(calibration) {
  const canvas = {
    originX: 0,
    originY: 0,
    width: 297,
    height: 210,
    margin: 12,
    ...(calibration?.canvas || {}),
  }
  const z = {
    up: 30,
    paint: 8,
    dip: 2,
    ...(calibration?.z || {}),
  }
  const paints = (calibration?.paints || []).filter((paint) => paint.id && paint.color)

  return {
    canvas,
    z,
    rest: calibration?.rest || { x: canvas.originX + canvas.width + 38, y: canvas.originY + canvas.height - 20, z: z.up },
    water: calibration?.water || { x: canvas.originX + canvas.width + 33, y: canvas.originY + 145, z: z.dip },
    towel: calibration?.towel || { x: canvas.originX + canvas.width + 33, y: canvas.originY + 170, z: z.paint },
    paints: paints.length ? paints : [
      { id: 'yellow', label: 'Amarillo', color: 'yellow', hex: '#f8d447', x: canvas.originX + canvas.width + 33, y: 18, z: z.dip },
      { id: 'orange', label: 'Naranja', color: 'orange', hex: '#f97316', x: canvas.originX + canvas.width + 33, y: 42, z: z.dip },
      { id: 'red', label: 'Rojo', color: 'red', hex: '#ef4444', x: canvas.originX + canvas.width + 33, y: 66, z: z.dip },
      { id: 'blue', label: 'Azul', color: 'light_blue', hex: '#38bdf8', x: canvas.originX + canvas.width + 33, y: 90, z: z.dip },
      { id: 'black', label: 'Negro', color: 'black', hex: '#111827', x: canvas.originX + canvas.width + 33, y: 114, z: z.dip },
    ],
  }
}

function selectPalette(profileColors, colorPreferences, paints) {
  const available = paints.map((paint) => ({
    name: paint.color,
    hex: paint.hex,
    paint_id: paint.id,
    label: paint.label,
  }))
  if (!available.length) return profileColors

  const preferred = colorPreferences
    .map((colorName) => available.find((paint) => paint.name === colorName || paint.paint_id === colorName))
    .filter(Boolean)
  const fromEmotion = profileColors
    .map((color) => available.find((paint) => paint.name === color.name) || color)
    .filter(Boolean)
  const fallback = available

  return uniquePalette([...preferred, ...fromEmotion, ...fallback]).slice(0, 5)
}

function uniquePalette(colors) {
  const seen = new Set()
  return colors.filter((color) => {
    const key = color.paint_id || color.name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function projectPointToCanvas(strokePoint, calibration) {
  const { canvas, z } = calibration
  const usableWidth = Math.max(1, canvas.width - canvas.margin * 2)
  const usableHeight = Math.max(1, canvas.height - canvas.margin * 2)

  return {
    x: round(canvas.originX + canvas.margin + (strokePoint.x / CANVAS_WIDTH) * usableWidth),
    y: round(canvas.originY + canvas.margin + (strokePoint.y / CANVAS_HEIGHT) * usableHeight),
    z: strokePoint.brush ? z.paint : z.up,
    brush: strokePoint.brush,
  }
}

function createRobotCommands(strokes, calibration) {
  const commands = []
  let currentPaintId = null

  strokes.forEach((stroke) => {
    const station = findPaintStation(stroke.color, calibration)
    if (station.id !== currentPaintId) {
      if (currentPaintId) commands.push(...createBrushCleaningCommands(calibration))
      commands.push(...createPaintLoadCommands(station, calibration))
      currentPaintId = station.id
    }

    commands.push({
      type: 'stroke',
      id: stroke.id,
      shape: stroke.shape,
      color: station.color,
      paint_id: station.id,
      speed: stroke.speed,
      pressure: stroke.pressure,
      points: stroke.points.map((strokePoint) => ({ ...strokePoint })),
    })
  })

  if (currentPaintId) commands.push(...createBrushCleaningCommands(calibration))
  commands.push({
    type: 'move_to_rest',
    points: [
      { x: calibration.rest.x, y: calibration.rest.y, z: calibration.z.up, brush: 0 },
    ],
  })

  return commands
}

function createBrushCleaningCommands(calibration) {
  return [
    ...createWaterCommands(calibration),
    ...createTowelCommands(calibration),
  ]
}

function findPaintStation(color, calibration) {
  const colorName = color.paint_id || color.name
  return calibration.paints.find((paint) => paint.id === colorName || paint.color === color.name) || calibration.paints[0]
}

function createPaintLoadCommands(station, calibration) {
  const upPoint = { x: station.x, y: station.y, z: calibration.z.up, brush: 0 }
  const dipPoint = { x: station.x, y: station.y, z: station.z ?? calibration.z.dip, brush: 0 }

  return [
    {
      type: 'move_to_paint',
      color: station.color,
      paint_id: station.id,
      points: [upPoint],
    },
    {
      type: 'dip_paint',
      color: station.color,
      paint_id: station.id,
      points: [upPoint, dipPoint, upPoint],
    },
  ]
}

function createWaterCommands(calibration) {
  const upPoint = { x: calibration.water.x, y: calibration.water.y, z: calibration.z.up, brush: 0 }
  const dipPoint = { x: calibration.water.x, y: calibration.water.y, z: calibration.water.z ?? calibration.z.dip, brush: 0 }

  return [
    {
      type: 'move_to_water',
      points: [upPoint],
    },
    {
      type: 'rinse_brush',
      points: [
        upPoint,
        dipPoint,
        { ...dipPoint, x: round(dipPoint.x + 5) },
        { ...dipPoint, x: round(dipPoint.x - 5) },
        dipPoint,
        upPoint,
      ],
    },
  ]
}

function createTowelCommands(calibration) {
  const upPoint = { x: calibration.towel.x, y: calibration.towel.y, z: calibration.z.up, brush: 0 }
  const dryPoint = { x: calibration.towel.x, y: calibration.towel.y, z: calibration.towel.z ?? calibration.z.paint, brush: 0 }

  return [
    {
      type: 'move_to_towel',
      points: [upPoint],
    },
    {
      type: 'dry_brush',
      points: [
        upPoint,
        dryPoint,
        { ...dryPoint, y: round(dryPoint.y + 5) },
        { ...dryPoint, y: round(dryPoint.y - 5) },
        dryPoint,
        upPoint,
      ],
    },
  ]
}

function createStroke({ index, artist, shapes, colors, speed, pressure, randomness, movementLevel, direction }) {
  const shape = pickShape(artist, shapes, index)
  const color = colors[index % colors.length]
  const jitter = randomness / 100
  const strokeSpeed = clamp(Math.round(speed + randomBetween(-10, 14) * jitter + movementLevel * 0.05), 10, 100)
  const strokePressure = clamp(Math.round(pressure + randomBetween(-8, 10) * jitter), 10, 100)
  const points = createPointsForShape(shape, direction, movementLevel, jitter, index)

  return {
    id: `stroke-${index + 1}`,
    shape,
    color,
    speed: strokeSpeed,
    pressure: strokePressure,
    points,
  }
}

function pickShape(artist, shapes, index) {
  if (artist.id === 'alma-thomas') return index % 3 === 0 ? 'mosaic' : 'dash'
  if (artist.id === 'rothko') return index % 2 === 0 ? 'block' : 'wash'
  if (artist.id === 'pollock') return ['splatter', 'flick', 'loop', 'drip'][index % 4]
  if (artist.id === 'de-kooning') return ['gesture', 'slash', 'curve', 'broken_line'][index % 4]
  return shapes[index % shapes.length]
}

function createPointsForShape(shape, direction, movementLevel, jitter, index) {
  if (shape === 'circle') return circlePoints(randomX(), randomY(), randomBetween(10, 24 + movementLevel * 0.1), 14)
  if (shape === 'spiral') return spiralPoints(randomX(), randomY(), randomBetween(8, 24 + movementLevel * 0.1), 18)
  if (shape === 'triangle') return polygonPoints(randomX(), randomY(), randomBetween(16, 34 + movementLevel * 0.16), 3, -Math.PI / 2)
  if (shape === 'arc' || shape === 'open_arc') return arcPoints(randomX(), randomY(), randomBetween(18, 38), 12)
  if (shape === 'block' || shape === 'wash' || shape === 'horizon') return blockPoints(index, movementLevel)
  if (shape === 'mosaic' || shape === 'dash' || shape === 'short_arc') return dashPoints(index, movementLevel, shape === 'short_arc')
  if (shape === 'splatter' || shape === 'flick' || shape === 'drip' || shape === 'loop') return actionPoints(shape, movementLevel, jitter)
  if (shape === 'gesture' || shape === 'slash' || shape === 'curve' || shape === 'broken_line') return gesturePoints(direction, movementLevel, jitter)
  return linePoints(direction, movementLevel, jitter)
}

function randomX() {
  return randomBetween(18, CANVAS_WIDTH - 18)
}

function randomY() {
  return randomBetween(18, CANVAS_HEIGHT - 18)
}

function circlePoints(cx, cy, radius, segments) {
  const points = []
  for (let i = 0; i <= segments; i += 1) {
    const angle = (Math.PI * 2 * i) / segments
    points.push(point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Z_PAINT, 1))
  }
  return withLift(points)
}

function spiralPoints(cx, cy, radius, segments) {
  const points = []
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const angle = Math.PI * 4.5 * t
    const r = radius * t
    points.push(point(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, Z_PAINT, 1))
  }
  return withLift(points)
}

function polygonPoints(cx, cy, radius, sides, rotation = 0) {
  const points = []
  for (let i = 0; i <= sides; i += 1) {
    const angle = rotation + (Math.PI * 2 * i) / sides
    points.push(point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Z_PAINT, 1))
  }
  return withLift(points)
}

function arcPoints(cx, cy, radius, segments) {
  const start = randomBetween(-Math.PI, Math.PI * 0.3)
  const span = randomBetween(Math.PI * 0.7, Math.PI * 1.5)
  const points = []
  for (let i = 0; i <= segments; i += 1) {
    const angle = start + (span * i) / segments
    points.push(point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Z_PAINT, 1))
  }
  return withLift(points)
}

function linePoints(direction, movementLevel, jitter) {
  const start = { x: randomX(), y: randomY() }
  const length = randomBetween(30, 58 + movementLevel * 0.45)
  const angle = angleForDirection(direction) + randomBetween(-0.55, 0.55) * (1 + jitter)
  const end = {
    x: start.x + Math.cos(angle) * length,
    y: start.y + Math.sin(angle) * length,
  }
  return withLift([point(start.x, start.y, Z_PAINT, 1), point(end.x, end.y, Z_PAINT, 1)])
}

function blockPoints(index, movementLevel) {
  const width = randomBetween(72, 120 + movementLevel * 0.25)
  const height = randomBetween(22, 42 + movementLevel * 0.1)
  const x = clamp(randomBetween(18, CANVAS_WIDTH - width - 18), 12, CANVAS_WIDTH - width - 12)
  const y = clamp(22 + (index % 5) * 24 + randomBetween(-8, 8), 12, CANVAS_HEIGHT - height - 12)
  const rows = Math.max(3, Math.round(height / 8))
  const points = []

  for (let row = 0; row <= rows; row += 1) {
    const py = y + (height * row) / rows
    const left = point(x, py, Z_PAINT, 1)
    const right = point(x + width, py, Z_PAINT, 1)
    points.push(row % 2 === 0 ? left : right)
    points.push(row % 2 === 0 ? right : left)
  }

  return withLift(points)
}

function dashPoints(index, movementLevel, curved = false) {
  const column = index % 8
  const row = Math.floor(index / 8)
  const x = 22 + column * 24 + randomBetween(-5, 5)
  const y = 22 + row * 20 + randomBetween(-5, 5)
  const length = randomBetween(10, 18 + movementLevel * 0.12)

  if (curved) {
    return arcPoints(x, y, length, 5)
  }

  return withLift([
    point(x, y, Z_PAINT, 1),
    point(x + length, y + randomBetween(-5, 5), Z_PAINT, 1),
  ])
}

function actionPoints(shape, movementLevel, jitter) {
  const start = { x: randomX(), y: randomY() }
  const points = []
  const count = shape === 'loop' ? 11 : 4 + Math.round(movementLevel / 18)
  let angle = randomBetween(0, Math.PI * 2)
  let x = start.x
  let y = start.y

  for (let i = 0; i < count; i += 1) {
    const step = randomBetween(10, 26 + movementLevel * 0.2)
    angle += randomBetween(-1.2, 1.2) * (1 + jitter)
    if (shape === 'drip') angle = Math.PI / 2 + randomBetween(-0.25, 0.25)
    if (shape === 'loop') angle += Math.PI * 0.42
    x += Math.cos(angle) * step
    y += Math.sin(angle) * step
    points.push(point(x, y, Z_PAINT, 1))
  }

  return withLift(points)
}

function gesturePoints(direction, movementLevel, jitter) {
  const start = { x: randomX(), y: randomY() }
  const points = []
  const count = 5 + Math.round(movementLevel / 18)
  let angle = angleForDirection(direction) + randomBetween(-0.8, 0.8)
  let x = start.x
  let y = start.y

  for (let i = 0; i < count; i += 1) {
    angle += randomBetween(-0.95, 0.95) * (0.5 + jitter)
    const step = randomBetween(16, 30 + movementLevel * 0.22)
    x += Math.cos(angle) * step
    y += Math.sin(angle) * step
    points.push(point(x, y, Z_PAINT, 1))
  }

  return withLift(points)
}

function withLift(drawPoints) {
  if (!drawPoints.length) return []
  const first = drawPoints[0]
  const last = drawPoints[drawPoints.length - 1]

  return [
    point(first.x, first.y, Z_UP, 0),
    ...drawPoints,
    point(last.x, last.y, Z_UP, 0),
  ]
}

function angleForDirection(direction) {
  const angles = {
    upward: -Math.PI / 2,
    horizontal: 0,
    downward: Math.PI / 2,
    diagonal: -Math.PI / 4,
    zigzag: Math.PI / 5,
    fragmented: Math.PI * 0.85,
    radial: randomBetween(0, Math.PI * 2),
  }
  return angles[direction] ?? randomBetween(-Math.PI, Math.PI)
}

function point(x, y, z, brush) {
  return {
    x: round(clamp(x, SAFE_MARGIN, CANVAS_WIDTH - SAFE_MARGIN)),
    y: round(clamp(y, SAFE_MARGIN, CANVAS_HEIGHT - SAFE_MARGIN)),
    z,
    brush,
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function round(value) {
  return Math.round(value * 10) / 10
}
