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

  const strokePoints = plan.robot_commands
    .filter((command) => command.type === 'stroke')
    .flatMap((command) => command.points)

  strokePoints.forEach((point) => {
    assert.ok(point.x >= DEFAULT_ROBOT_CALIBRATION.canvas.originX + DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.x <= DEFAULT_ROBOT_CALIBRATION.canvas.width - DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.y >= DEFAULT_ROBOT_CALIBRATION.canvas.originY + DEFAULT_ROBOT_CALIBRATION.canvas.margin)
    assert.ok(point.y <= DEFAULT_ROBOT_CALIBRATION.canvas.height - DEFAULT_ROBOT_CALIBRATION.canvas.margin)
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

  assert.ok(commandTypes.includes('move_to_paint'))
  assert.ok(commandTypes.includes('dip_paint'))
  assert.ok(commandTypes.includes('stroke'))
  assert.ok(commandTypes.includes('move_to_water'))
  assert.ok(commandTypes.includes('rinse_brush'))
  assert.ok(commandTypes.includes('move_to_towel'))
  assert.ok(commandTypes.includes('dry_brush'))
  assert.equal(commandTypes.at(-1), 'move_to_rest')
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
  assert.ok(first.strokes.length <= 5)
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
