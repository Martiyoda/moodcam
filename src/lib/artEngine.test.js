// Estas pruebas protegen el motor que convierte emociones y recetas en trazos.
// Si fallan, no conviene enviar el plan al brazo porque podria estar incompleto.
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateArtChunk, generateArtPlan } from './artEngine.js'
import { DEFAULT_ROBOT_CALIBRATION } from './voiceEngine.js'

test('genera plan dentro de A4 horizontal', () => {
  const plan = generateArtPlan({
    mainEmotions: [
      { emotion: 'happy', label: 'Alegría', percentage: 60 },
      { emotion: 'neutral', label: 'Calma', percentage: 40 },
    ],
    artistId: 'kandinsky',
    mobility: 80,
    calibration: DEFAULT_ROBOT_CALIBRATION,
  })

  assert.equal(plan.canvas.width, 297)
  assert.equal(plan.canvas.height, 210)
  assert.ok(plan.strokes.length > 0)
  assert.ok(plan.strokes.length <= 8)
  assert.ok(plan.strokes.every((stroke) => stroke.points.length <= 10))

  const strokePoints = plan.robot_commands
    .filter((command) => command.type === 'stroke')
    .flatMap((command) => command.points)

  strokePoints.forEach((point) => {
    assert.ok(point.x >= DEFAULT_ROBOT_CALIBRATION.canvas.originX + DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.x <= DEFAULT_ROBOT_CALIBRATION.canvas.width - DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.y >= DEFAULT_ROBOT_CALIBRATION.canvas.originY + DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.y <= DEFAULT_ROBOT_CALIBRATION.canvas.height - DEFAULT_ROBOT_CALIBRATION.canvas.margin)
  })
  assert.ok(strokePoints.some((point) => point.brush === 0 && point.z === DEFAULT_ROBOT_CALIBRATION.z.paint))
  assert.ok(strokePoints.some((point) => point.brush === 1 && point.z === DEFAULT_ROBOT_CALIBRATION.z.paint))

  const firstStroke = plan.robot_commands.find((command) => command.type === 'stroke')
  assert.equal(firstStroke.points[0].brush, 0)
  assert.equal(firstStroke.points[0].z, DEFAULT_ROBOT_CALIBRATION.z.paint)
  assert.equal(firstStroke.points[1].brush, 1)
  assert.equal(firstStroke.points[1].z, DEFAULT_ROBOT_CALIBRATION.z.paint)
})

test('genera trazos propios para cada pintor dentro del limite seguro', () => {
  const expectedShapes = {
    kandinsky: new Set(['circle', 'triangle', 'line', 'arc', 'spiral', 'open_arc']),
    pollock: new Set(['splatter', 'flick', 'loop', 'drip', 'broken_line']),
    rothko: new Set(['block', 'wash', 'horizon', 'soft_edge']),
    'alma-thomas': new Set(['dash', 'mosaic', 'short_arc', 'column', 'ring']),
  }

  Object.entries(expectedShapes).forEach(([artistId, allowedShapes]) => {
    const plan = generateArtPlan({
      mainEmotions: [{ emotion: 'angry', label: 'Tension', percentage: 100 }],
      artistId,
      mobility: 100,
      calibration: DEFAULT_ROBOT_CALIBRATION,
    })

    assert.ok(plan.strokes.every((stroke) => allowedShapes.has(stroke.shape)))
    assert.ok(plan.strokes.every((stroke) => stroke.points.length <= 10))
  })
})

test('incluye comandos de pintura, agua, trazos y reposo', () => {
  const plan = generateArtPlan({
    mainEmotions: [
      { emotion: 'angry', label: 'Tensión', percentage: 70 },
      { emotion: 'surprise', label: 'Sorpresa', percentage: 30 },
    ],
    artistId: 'pollock',
    mobility: 95,
    calibration: DEFAULT_ROBOT_CALIBRATION,
    colorPreferences: ['red', 'black'],
  })

  const commandTypes = plan.robot_commands.map((command) => command.type)

  assert.equal(commandTypes.includes('dip_paint'), false)
  assert.equal(commandTypes.includes('move_to_paint'), false)
  assert.ok(commandTypes.includes('stroke'))
  assert.ok(commandTypes.includes('move_to_water'))
  assert.ok(commandTypes.includes('rinse_brush'))
  assert.ok(commandTypes.includes('move_to_towel'))
  assert.ok(commandTypes.includes('dry_brush'))
  assert.equal(commandTypes.at(-1), 'move_to_rest')

  const strokeCommands = plan.robot_commands.filter((command) => command.type === 'stroke')
  assert.equal(strokeCommands.length, plan.strokes.length)
  assert.ok(strokeCommands.every((command) => command.paint_id))
})

test('elige solamente colores fisicos segun la emocion y el pintor', () => {
  const plan = generateArtPlan({
    mainEmotions: [{ emotion: 'sad', label: 'Tristeza', percentage: 100 }],
    artistId: 'kandinsky',
    calibration: DEFAULT_ROBOT_CALIBRATION,
    colorPreferences: ['black', 'orange'],
  })

  assert.ok(plan.colors.every((color) => ['blue', 'violet'].includes(color)))
  assert.ok(plan.robot_commands
    .filter((command) => command.type === 'stroke')
    .every((command) => ['blue', 'violet'].includes(command.paint_id)))
})

test('genera chunks deterministas y acotados por ventana', () => {
  const input = {
    windowSummary: [
      { emotion: 'surprise', label: 'Sorpresa', percentage: 65 },
      { emotion: 'happy', label: 'Alegria', percentage: 35 },
    ],
    artistId: 'alma-thomas',
    mobility: 70,
    calibration: DEFAULT_ROBOT_CALIBRATION,
    sessionState: {
      session_id: 's1',
      window_index: 2,
      chunk_index: 1,
      chunk_total: 1,
    },
    seed: 's1:2:alma-thomas',
  }

  const first = generateArtChunk(input)
  const second = generateArtChunk(input)

  assert.deepEqual(first.strokes, second.strokes)
  assert.equal(first.chunk_id, 's1-window-2-chunk-1')
  assert.equal(first.window_index, 2)
  assert.equal(first.queue_policy, 'enqueue')
  assert.ok(first.strokes.length >= 1)
  assert.ok(first.strokes.length <= 3)
  assert.equal(first.robot_commands.some((command) => command.type === 'move_to_rest'), false)
  assert.ok(first.colors.every((color) => ['blue', 'violet', 'red', 'yellow'].includes(color)))

  const strokePoints = first.robot_commands
    .filter((command) => command.type === 'stroke')
    .flatMap((command) => command.points)

  strokePoints.forEach((point) => {
    assert.ok(point.x >= DEFAULT_ROBOT_CALIBRATION.canvas.originX + DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.x <= DEFAULT_ROBOT_CALIBRATION.canvas.width - DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.y >= DEFAULT_ROBOT_CALIBRATION.canvas.originY + DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.y <= DEFAULT_ROBOT_CALIBRATION.canvas.height - DEFAULT_ROBOT_CALIBRATION.canvas.margin)
  })
})

test('genera ocho paquetes de un trazo sin superar ocho trazos por sesion', () => {
  let completedStrokeCount = 0
  const chunks = Array.from({ length: 8 }, (_, windowIndex) => {
    const chunk = generateArtChunk({
      windowSummary: [{ emotion: 'happy', label: 'Alegria', percentage: 100 }],
      artistId: 'pollock',
      calibration: DEFAULT_ROBOT_CALIBRATION,
      sessionState: {
        session_id: 's-budget',
        window_index: windowIndex,
        completed_stroke_count: completedStrokeCount,
        remaining_windows: 8 - windowIndex,
      },
    })
    completedStrokeCount += chunk.strokes.length
    return chunk
  })

  assert.equal(chunks.length, 8)
  assert.ok(chunks.every((chunk) => chunk.strokes.length === 1))
  assert.equal(completedStrokeCount, 8)

  const fullSessionChunk = generateArtChunk({
    windowSummary: [{ emotion: 'happy', label: 'Alegria', percentage: 100 }],
    artistId: 'pollock',
    calibration: DEFAULT_ROBOT_CALIBRATION,
    sessionState: {
      session_id: 's-full-budget',
      completed_stroke_count: 8,
      remaining_windows: 1,
    },
  })

  assert.equal(fullSessionChunk.strokes.length, 0)
})
