import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = readFileSync(new URL('../arduino/main/src/robot_config.h', import.meta.url), 'utf8')
const main = readFileSync(new URL('../arduino/main/main.ino', import.meta.url), 'utf8')
const motors = readFileSync(new URL('../arduino/main/src/core/motors.cpp', import.meta.url), 'utf8')

function functionBody(source, name, nextName) {
  const start = source.indexOf(name)
  const end = source.indexOf(nextName, start + name.length)
  assert.notEqual(start, -1, `${name} no encontrado`)
  assert.notEqual(end, -1, `${nextName} no encontrado`)
  return source.slice(start, end)
}

test('configura el mapa definitivo y los limites de calibracion', () => {
  assert.match(config, /#define CALIBRATION_MODE true/)
  assert.match(config, /static_assert\(!CALIBRATION_MODE \|\| SAFE_TEST_MODE/)
  assert.match(config, /SERVO_BASE, "base", 26, true, 80, 110, 90/)
  assert.match(config, /SERVO_SHOULDER, "shoulder", 25, true, 80, 110, 90/)
  assert.match(config, /SERVO_ELBOW, "elbow", 33, true, 80, 110, 90/)
  assert.match(config, /SERVO_WRIST, "wrist", 32, true, 80, 110, 90/)
  assert.match(config, /SERVO_BRUSH, "brush", -1, false/)
  assert.match(config, /CALIBRATION_MIN_DURATION_MS = 200/)
  assert.match(config, /CALIBRATION_MAX_DURATION_MS = 5000/)
})

test('arranca detached y con posicion desconocida sin asumir HOME fisico', () => {
  const begin = functionBody(motors, 'void beginMotors()', 'bool motorsConfigured()')
  assert.match(begin, /positionKnown = false/)
  assert.match(begin, /attached = false/)
  assert.ok(begin.indexOf('if (!FINAL_ARM_MODE)') < begin.indexOf('baseServo.attach'))

  const start = functionBody(motors, 'bool startCalibrationAssumingHome()', 'bool calibrationPositionKnown()')
  assert.doesNotMatch(start, /\.attach\(/)
  assert.doesNotMatch(start, /\.write\(/)
  assert.match(start, /positionKnown = true/)
})

test('parser admite enteros negativos y exige assume_home booleano', () => {
  assert.match(main, /json\.charAt\(valueEnd\) == '-'/)
  assert.match(main, /extractBoolValue\(json, "assume_home", false\)/)
  assert.match(main, /substring\(valueStart, valueStart \+ 4\) == "true"/)
})

test('jog y set_angle rechazan valores invalidos sin limitarlos', () => {
  assert.match(main, /delta == -5 \|\| delta == -1 \|\| delta == 1 \|\| delta == 5/)
  assert.match(main, /jog rechazado: el resultado supera los limites configurados/)
  assert.match(main, /set_angle rechazado: angulo fuera de limites/)
  assert.match(main, /duration_ms debe estar entre 200 y 5000/)
})

test('movimiento activo solo permite stop y get_joint_state', () => {
  assert.match(main, /calibrationMotionActive\(\) && type != "stop" && type != "get_joint_state"/)
  assert.match(main, /publishError\("robot_busy"\)/)
  assert.match(main, /!mqttClient\.connected\(\)[\s\S]*!calibrationMotionActive\(\)[\s\S]*connectMQTT\(\)/)
})

test('STOP conserva attach y release detacha con posicion desconocida', () => {
  const stop = functionBody(motors, 'bool stopCalibrationMotion(', 'bool releaseCalibrationServos()')
  assert.doesNotMatch(stop, /\.detach\(/)
  assert.match(stop, /calibrationMotion\.active = false/)

  const release = functionBody(motors, 'bool releaseCalibrationServos()', 'JointCommandState calibrationJointState()')
  assert.match(release, /servo->detach\(\)/)
  assert.match(release, /positionKnown = false/)
  assert.match(main, /ADVERTENCIA: posible caida por gravedad/)
})

test('la interpolacion de calibracion es no bloqueante', () => {
  const update = functionBody(motors, 'bool updateCalibrationMotion(', 'bool stopCalibrationMotion(')
  assert.match(update, /millis\(\)/)
  assert.match(update, /commandedAngle \+= calibrationMotion\.direction/)
  assert.doesNotMatch(update, /delay\(/)
  assert.ok(main.indexOf('mqttClient.loop()') < main.indexOf('updateCalibrationMotion(completedServo'))
  assert.ok(main.indexOf('if (!Serial.available())') < main.indexOf('updateCalibrationMotion(completedServo'))
})
