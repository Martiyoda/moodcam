import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = readFileSync(new URL('../arduino/main/src/robot_config.h', import.meta.url), 'utf8')
const main = readFileSync(new URL('../arduino/main/main.ino', import.meta.url), 'utf8')
const motors = readFileSync(new URL('../arduino/main/src/core/motors.cpp', import.meta.url), 'utf8')
const mqttConfigExample = readFileSync(new URL('../arduino/main/src/config.example.h', import.meta.url), 'utf8')
const legacyMoodcamPoses = readFileSync(new URL('../arduino/main/src/legacy_moodcam_pose_reference.h', import.meta.url), 'utf8')

function functionBody(source, name, nextName) {
  const start = source.indexOf(name)
  const end = source.indexOf(nextName, start + name.length)
  assert.notEqual(start, -1, `${name} no encontrado`)
  assert.notEqual(end, -1, `${nextName} no encontrado`)
  return source.slice(start, end)
}

test('configura el mapa Moodcam y los limites de calibracion', () => {
  assert.match(config, /#define CALIBRATION_MODE false/)
  assert.match(config, /static_assert\(!CALIBRATION_MODE \|\| SAFE_TEST_MODE/)
  assert.match(config, /SERVO_BASE, "base", 26, true, 0, 180, 90/)
  assert.match(config, /SERVO_SHOULDER, "shoulder", 25, true, 60, 165, 90/)
  assert.match(config, /SERVO_ELBOW, "elbow", 33, true, 35, 150, 90/)
  assert.match(config, /SERVO_WRIST, "wrist", 32, true, 0, 120, 90/)
  assert.doesNotMatch(config, /SERVO_BRUSH|BRUSH_SERVO_CONFIG/)
  assert.match(config, /CALIBRATION_MIN_DURATION_MS = 200/)
  assert.match(config, /CALIBRATION_MAX_DURATION_MS = 5000/)
})

test('conserva las poses Moodcam validadas solo como referencia de migracion', () => {
  assert.match(legacyMoodcamPoses, /Reference only/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_REST = \{90, 90, 90, 90\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_PAINT_YELLOW = \{172, 158, 73, 17\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_PAINT_RED = \{143, 158, 85, 30\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_PAINT_VIOLET = \{30, 158, 90, 30\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_PAINT_BLUE = \{0, 162, 82, 22\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_WATER = \{90, 150, 48, 5\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_WATER_SHAKE_REPETITIONS = 15/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_TOWEL = \{0, 150, 50, 0\}/)
  assert.match(legacyMoodcamPoses, /LEGACY_MOODCAM_TOWEL_TAP_REPETITIONS = 10/)
})

test('ejecuta las poses Moodcam para cargar, limpiar y secar el pincel', () => {
  assert.match(main, /bool loadMoodcamPaint\(const String& paintId, int speed\)/)
  assert.match(main, /pose = \{172, 158, 73, 17\}/)
  assert.match(main, /pose = \{143, 158, 85, 30\}/)
  assert.match(main, /pose = \{30, 158, 90, 30\}/)
  assert.match(main, /pose = \{0, 162, 82, 22\}/)
  assert.match(main, /const ServoPose waterPose = \{90, 150, 48, 5\}/)
  assert.match(main, /for \(int repetition = 0; repetition < 15; repetition\+\+\)/)
  assert.match(main, /const ServoPose towelPose = \{0, 150, 50, 0\}/)
  assert.match(main, /for \(int repetition = 0; repetition < 10; repetition\+\+\)/)
  assert.match(main, /strokesSincePaintLoad >= 2/)
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
  assert.match(main, /calibrationMotionActive\(\) && type != "stop" && type != "get_joint_state" && type != "set_operating_mode"/)
  assert.match(main, /publishError\("robot_busy"\)/)
  assert.match(main, /!mqttClient\.connected\(\)[\s\S]*!calibrationMotionActive\(\)[\s\S]*connectMQTT\(\)/)
})

test('soporta cambio de modo operativo en runtime por MQTT', () => {
  assert.match(main, /"set_operating_mode"/)
  assert.match(main, /handleOperatingModeCommand\(json, fromMqtt\)/)
  assert.match(main, /operating_mode_changed/)
  assert.match(main, /operating_mode/)
  assert.match(main, /modeValue == "calibration"/)
  assert.match(main, /modeValue == "real"/)
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

test('publica presencia MQTT periodica separada del estado del robot', () => {
  assert.match(mqttConfigExample, /#define TOPIC_ESP32_PRESENCE "system\/" MQTT_DEVICE_ID "\/presence\/esp32"/)
  assert.match(main, /constexpr unsigned long MQTT_PRESENCE_MS = 5000/)
  assert.match(main, /void publishPresence\(bool force\)/)
  assert.match(main, /mqttClient\.publish\(TOPIC_ESP32_PRESENCE, payload\.c_str\(\), true\)/)
  assert.match(main, /publishPresence\(true\)/)
  assert.match(main, /mqttClient\.loop\(\);[\s\S]*publishPresence\(\)/)
})

test('payload MQTT permite comandos largos con arrays de puntos', () => {
  assert.match(main, /constexpr size_t MAX_COMMAND_LENGTH = 2048/)
})

test('mapPointToPose usa la base para el eje X del lienzo', () => {
  const body = functionBody(main, 'ServoPose mapPointToPose(const PathPoint& point) {', 'void handleEmotionCommand(const String& json, bool fromMqtt) {')
  assert.match(body, /BASE_SERVO_CONFIG\.minAngle/)
  assert.match(body, /BASE_SERVO_CONFIG\.maxAngle/)
  assert.match(body, /safeX,[\s\S]*PATH_MIN_X,[\s\S]*PATH_MAX_X/)
  assert.match(body, /return \{[\s\S]*constrain\(base/)
})

test('ServoPose incluye base y moveToPoseSafe interpola los cuatro servos', () => {
  const motorsHeader = readFileSync(new URL('../arduino/main/src/core/motors.h', import.meta.url), 'utf8')
  assert.match(motorsHeader, /struct ServoPose \{\s*int base;\s*int shoulder;\s*int elbow;\s*int wrist;\s*\}/)
  const move = functionBody(motors, 'bool moveToPoseSafe(const ServoPose& target, int speed) {', 'bool runPoseSequence(')
  assert.match(move, /constrain\(target\.base, BASE_SERVO_CONFIG\.minAngle, BASE_SERVO_CONFIG\.maxAngle\)/)
  assert.doesNotMatch(move, /if \(speed >= SAFE_MAX_SPEED\)/)
  assert.match(move, /abs\(safeTarget\.base - pose\.base\)/)
  assert.match(motors, /int degreesPerStepForSpeed\(int speed\)/)
  assert.match(move, /const int steps = max\(1, \(maxDelta \+ degreesPerStep - 1\) \/ degreesPerStep\)/)
  assert.match(move, /start\.base \+ \(\(safeTarget\.base - start\.base\) \* step\)/)
})

test('al finalizar una obra vuelve a HOME con el pincel levantado', () => {
  const execute = functionBody(main, 'bool executeRealPathCommand(const String& json, const String& type) {', 'bool moveMoodcamPose(')
  assert.match(execute, /if \(type == "paint_sequence_end"\) \{\s*liftBrush\(\);/)
  assert.match(execute, /BASE_SERVO_CONFIG\.homeAngle/)
  assert.match(execute, /SHOULDER_SERVO_CONFIG\.homeAngle/)
  assert.match(execute, /ELBOW_SERVO_CONFIG\.homeAngle/)
  assert.match(execute, /WRIST_SERVO_CONFIG\.homeAngle/)
  assert.match(execute, /moveToPoseSafe\(homePose, REAL_SPEED_TRANSIT_DEFAULT\)/)
})

test('moveToPoseSafe libera MQTT entre pasos via callback en lugar de delay bloqueante', () => {
  const motorsHeader = readFileSync(new URL('../arduino/main/src/core/motors.h', import.meta.url), 'utf8')
  assert.match(motorsHeader, /typedef void \(\*MotionTickCallback\)\(unsigned long durationMs\)/)
  assert.match(motorsHeader, /void setMotionTickCallback\(MotionTickCallback callback\)/)
  const move = functionBody(motors, 'bool moveToPoseSafe(const ServoPose& target, int speed) {', 'bool runPoseSequence(')
  assert.match(move, /waitWithMotionTick\(stepWaitMs\)/)
  assert.doesNotMatch(move, /delay\(stepDelayForSpeed/)
  assert.match(main, /setMotionTickCallback\(serviceMotionTick\)/)
  assert.match(main, /void serviceMotionTick\(unsigned long durationMs\)/)
  assert.match(main, /while \(millis\(\) - start < durationMs\)[\s\S]*mqttClient\.loop\(\)/)
})

test('al pasar a modo real sincroniza la pose interna con los angulos comandados', () => {
  const motorsHeader = readFileSync(new URL('../arduino/main/src/core/motors.h', import.meta.url), 'utf8')
  assert.match(motorsHeader, /void syncPoseToCommandedAngles\(\)/)
  assert.match(motors, /void syncPoseToCommandedAngles\(\) \{[\s\S]*baseJoint\.commandedAngle/)
  const handler = functionBody(main, 'void handleOperatingModeCommand(const String& json, bool fromMqtt) {', 'void handleCalibrationCommand(const String& json, const String& type) {')
  assert.match(handler, /if \(!isCalibrationMode\(\)\) \{\s*syncPoseToCommandedAngles\(\);/)
})

test('aplica protecciones especificas para el servo SG90 de la muneca y el codo extendido', () => {
  assert.match(main, /REAL_SPEED_STROKE_DEFAULT = 80/)
  assert.match(main, /REAL_SPEED_CONTACT_DEFAULT = 80/)
  assert.match(main, /REAL_SPEED_TRANSIT_DEFAULT = 80/)
  assert.match(main, /WRIST_REAL_MAX_SPEED = 80/)
  assert.match(main, /WRIST_SIGNIFICANT_DELTA_DEG = 5/)
  assert.match(main, /ELBOW_EXTENSION_THRESHOLD_DEG = 110/)
  assert.match(main, /ELBOW_EXTENSION_SPEED_PENALTY = 3/)
  const execute = functionBody(main, 'bool executeRealPathCommand(const String& json, const String& type) {', 'RealCommandProfile buildRealCommandProfile(const String& type, const String& json) {')
  assert.match(execute, /abs\(target\.wrist - previousPose\.wrist\) > WRIST_SIGNIFICANT_DELTA_DEG/)
  assert.match(execute, /dynamicSpeed = min\(dynamicSpeed, WRIST_REAL_MAX_SPEED\)/)
  assert.match(execute, /target\.elbow > ELBOW_EXTENSION_THRESHOLD_DEG/)
  assert.match(execute, /dynamicSpeed - ELBOW_EXTENSION_SPEED_PENALTY/)
})

test('modo real usa FIFO acotado y publica backpressure para el AI Bridge', () => {
  assert.match(main, /constexpr size_t REAL_COMMAND_QUEUE_CAPACITY = 32/)
  assert.match(main, /struct QueuedRealCommand/)
  assert.match(main, /QueuedRealCommand realCommandQueue\[REAL_COMMAND_QUEUE_CAPACITY\]/)
  assert.match(main, /bool enqueueRealCommand\(const String& json, const String& type\)/)
  assert.match(main, /void serviceRealCommandQueue\(\)/)
  assert.match(main, /void clearRealCommandQueue\(\)/)
  assert.match(main, /publishQueueStatus\("queue_full"/)
  assert.match(main, /\\"queue_depth\\":/)
  assert.match(main, /\\"queue_full\\":/)
  assert.match(main, /clearRealCommandQueue\(\)[\s\S]*publishStopped/)
  assert.match(main, /mqttClient\.loop\(\);[\s\S]*publishPresence\(\);[\s\S]*serviceRealCommandQueue\(\)/)
})
