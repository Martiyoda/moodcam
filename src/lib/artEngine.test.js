import test from 'node:test'
import assert from 'node:assert/strict'
import { generateArtPlan } from './artEngine.js'
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
