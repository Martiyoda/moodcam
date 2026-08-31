// Implementacion activa de los motores usada por main.ino.
// Cada movimiento termina pasando por los limites y estados de seguridad.
#include "motors.h"

// Implementa el control de los cuatro servos y la interpolación no bloqueante.

#include <ESP32Servo.h>
#include <string.h>

#include "safety.h"

namespace {
Servo baseServo;
Servo shoulderServo;
Servo elbowServo;
Servo wristServo;

struct CalibrationJoint {
  const RobotServoConfig* config;
  Servo* servo;
  int commandedAngle;
  bool attached;
};

CalibrationJoint baseJoint = {&BASE_SERVO_CONFIG, &baseServo, BASE_SERVO_CONFIG.homeAngle, false};
CalibrationJoint shoulderJoint = {&SHOULDER_SERVO_CONFIG, &shoulderServo, SHOULDER_SERVO_CONFIG.homeAngle, false};
CalibrationJoint elbowJoint = {&ELBOW_SERVO_CONFIG, &elbowServo, ELBOW_SERVO_CONFIG.homeAngle, false};
CalibrationJoint wristJoint = {&WRIST_SERVO_CONFIG, &wristServo, WRIST_SERVO_CONFIG.homeAngle, false};

CalibrationJoint* calibrationJoints[] = {&baseJoint, &shoulderJoint, &elbowJoint, &wristJoint};
constexpr size_t CALIBRATION_JOINT_COUNT = sizeof(calibrationJoints) / sizeof(calibrationJoints[0]);

struct CalibrationMotion {
  CalibrationJoint* joint;
  int targetAngle;
  int direction;
  unsigned long stepIntervalMs;
  unsigned long lastStepAt;
  bool active;
};

CalibrationMotion calibrationMotion = {nullptr, 0, 0, 0, 0, false};
bool positionKnown = false;

ServoPose pose = {
  BASE_SERVO_CONFIG.homeAngle,
  SHOULDER_SERVO_CONFIG.homeAngle,
  ELBOW_SERVO_CONFIG.homeAngle,
  WRIST_SERVO_CONFIG.homeAngle
};
bool finalArmAttached = false;
MotionTickCallback motionTickCallback = nullptr;

bool validPin(int pin) {
  return pin >= 0;
}

bool finalArmReady() {
  return FINAL_ARM_MODE
    && FINAL_ARM_EXPLICITLY_CONFIGURED
    && BASE_SERVO_CONFIG.enabled
    && SHOULDER_SERVO_CONFIG.enabled
    && ELBOW_SERVO_CONFIG.enabled
    && WRIST_SERVO_CONFIG.enabled;
}

CalibrationJoint* calibrationJointByName(const char* servoName) {
  if (servoName == nullptr) {
    return nullptr;
  }
  for (size_t index = 0; index < CALIBRATION_JOINT_COUNT; index++) {
    if (strcmp(calibrationJoints[index]->config->name, servoName) == 0) {
      return calibrationJoints[index];
    }
  }
  return nullptr;
}

int stepDelayForSpeed(int speed) {
  return map(constrain(speed, SAFE_MIN_SPEED, SAFE_MAX_SPEED), SAFE_MIN_SPEED, SAFE_MAX_SPEED, 28, 8);
}

int degreesPerStepForSpeed(int speed) {
  return map(constrain(speed, SAFE_MIN_SPEED, SAFE_MAX_SPEED), SAFE_MIN_SPEED, SAFE_MAX_SPEED, 1, 4);
}

void writePose(const ServoPose& nextPose) {
  pose = nextPose;
  if (!finalArmAttached) {
    return;
  }
  baseServo.write(pose.base);
  shoulderServo.write(pose.shoulder);
  elbowServo.write(pose.elbow);
  wristServo.write(pose.wrist);
}

void waitWithMotionTick(unsigned long durationMs) {
  if (motionTickCallback != nullptr) {
    motionTickCallback(durationMs);
    return;
  }
  delay(durationMs);
}
}

void beginMotors() {
  finalArmAttached = false;
  positionKnown = false;
  calibrationMotion.active = false;
  for (size_t index = 0; index < CALIBRATION_JOINT_COUNT; index++) {
    calibrationJoints[index]->attached = false;
    calibrationJoints[index]->commandedAngle = calibrationJoints[index]->config->homeAngle;
  }

  Serial.println("Motors: arranque detached; posicion fisica desconocida.");
  if (CALIBRATION_MODE && SAFE_TEST_MODE) {
    Serial.println("Motors: CALIBRATION_MODE activo. Requiere start_calibration con assume_home=true.");
  }
  if (!FINAL_ARM_MODE) {
    Serial.println("Motors: FINAL_ARM_MODE=false, movimientos complejos desactivados.");
    return;
  }
  if (!motorsConfigured()) {
    Serial.println("Motors: modo final no configurado; salidas persistentes desactivadas.");
    return;
  }

  baseServo.attach(BASE_SERVO_CONFIG.pin);
  shoulderServo.attach(SHOULDER_SERVO_CONFIG.pin);
  elbowServo.attach(ELBOW_SERVO_CONFIG.pin);
  wristServo.attach(WRIST_SERVO_CONFIG.pin);
  finalArmAttached = true;
  writePose(pose);
}

bool motorsConfigured() {
  return finalArmReady()
    && MOTOR_OUTPUT_ENABLED
    && validPin(BASE_SERVO_CONFIG.pin)
    && validPin(SHOULDER_SERVO_CONFIG.pin)
    && validPin(ELBOW_SERVO_CONFIG.pin)
    && validPin(WRIST_SERVO_CONFIG.pin);
}

const RobotServoConfig* robotServoConfigByName(const char* servoName) {
  if (servoName == nullptr) {
    return nullptr;
  }
  for (size_t index = 0; index < ROBOT_SERVO_COUNT; index++) {
    if (strcmp(ROBOT_SERVOS[index].name, servoName) == 0) {
      return &ROBOT_SERVOS[index];
    }
  }
  return nullptr;
}

const RobotServoConfig* robotServoConfigByPin(int servoPin) {
  for (size_t index = 0; index < ROBOT_SERVO_COUNT; index++) {
    if (ROBOT_SERVOS[index].pin == servoPin) {
      return &ROBOT_SERVOS[index];
    }
  }
  return nullptr;
}

bool hardwareTestConfigured(int servoPin) {
  const RobotServoConfig* servo = robotServoConfigByPin(servoPin);
  return SAFE_TEST_MODE
    && !CALIBRATION_MODE
    && MOTOR_OUTPUT_ENABLED
    && servo != nullptr
    && servo->enabled
    && validPin(servo->pin);
}

bool runSingleServoHardwareTest(int servoPin, const char* servoName, int angle, int durationMs) {
  const RobotServoConfig* servo = robotServoConfigByPin(servoPin);
  if (!hardwareTestConfigured(servoPin)) {
    Serial.println("Hardware test rechazado: no disponible mientras CALIBRATION_MODE esta activo.");
    return false;
  }
  if (isEmergencyStopped()) {
    Serial.println("Hardware test rechazado: parada de emergencia activa.");
    return false;
  }

  const int safeAngle = constrain(angle, servo->minAngle, servo->maxAngle);
  const int safeDuration = constrain(durationMs, 1, TEST_SERVO_MAX_DURATION_MS);
  const int homeAngle = constrain(servo->homeAngle, servo->minAngle, servo->maxAngle);

  Servo localServo;
  localServo.attach(servo->pin);
  localServo.write(homeAngle);
  delay(200);
  localServo.write(safeAngle);
  delay(safeDuration);
  localServo.write(homeAngle);
  delay(250);
  localServo.detach();
  return true;
}

bool startCalibrationAssumingHome() {
  if (!CALIBRATION_MODE || !SAFE_TEST_MODE || calibrationMotion.active) {
    return false;
  }
  for (size_t index = 0; index < CALIBRATION_JOINT_COUNT; index++) {
    if (calibrationJoints[index]->attached) {
      Serial.println("Calibration: start rechazado; libera los servos antes de reasumir HOME.");
      return false;
    }
  }
  for (size_t index = 0; index < CALIBRATION_JOINT_COUNT; index++) {
    calibrationJoints[index]->commandedAngle = calibrationJoints[index]->config->homeAngle;
  }
  positionKnown = true;
  Serial.println("Calibration: HOME confirmado logicamente; no se ha producido movimiento.");
  return true;
}

bool calibrationPositionKnown() {
  return positionKnown;
}

bool calibrationMotionActive() {
  return calibrationMotion.active;
}

bool calibrationJointAttached(const char* servoName) {
  CalibrationJoint* joint = calibrationJointByName(servoName);
  return joint != nullptr && joint->attached;
}

int calibrationCommandedAngle(const char* servoName) {
  CalibrationJoint* joint = calibrationJointByName(servoName);
  return joint == nullptr ? -1 : joint->commandedAngle;
}

bool startCalibrationMove(const char* servoName, int targetAngle, int durationMs) {
  CalibrationJoint* joint = calibrationJointByName(servoName);
  if (!CALIBRATION_MODE || !SAFE_TEST_MODE || !positionKnown || calibrationMotion.active || joint == nullptr) {
    return false;
  }
  if (!joint->config->enabled || !validPin(joint->config->pin)) {
    return false;
  }
  if (targetAngle < joint->config->minAngle || targetAngle > joint->config->maxAngle) {
    return false;
  }
  if (durationMs < CALIBRATION_MIN_DURATION_MS || durationMs > CALIBRATION_MAX_DURATION_MS) {
    return false;
  }

  const int previousAngle = joint->commandedAngle;
  if (!joint->attached) {
    joint->servo->attach(joint->config->pin);
    joint->servo->write(previousAngle);
    joint->attached = true;
  }

  Serial.print("Calibration move: servo=");
  Serial.print(joint->config->name);
  Serial.print(" gpio=");
  Serial.print(joint->config->pin);
  Serial.print(" previous=");
  Serial.print(previousAngle);
  Serial.print(" target=");
  Serial.println(targetAngle);

  if (targetAngle == previousAngle) {
    return true;
  }

  const int steps = abs(targetAngle - previousAngle);
  calibrationMotion.joint = joint;
  calibrationMotion.targetAngle = targetAngle;
  calibrationMotion.direction = targetAngle > previousAngle ? 1 : -1;
  calibrationMotion.stepIntervalMs = max(1UL, static_cast<unsigned long>(durationMs) / steps);
  calibrationMotion.lastStepAt = millis();
  calibrationMotion.active = true;
  return true;
}

bool updateCalibrationMotion(const char*& completedServo, int& completedAngle) {
  completedServo = nullptr;
  completedAngle = -1;
  if (!calibrationMotion.active || calibrationMotion.joint == nullptr) {
    return false;
  }

  const unsigned long now = millis();
  if (now - calibrationMotion.lastStepAt < calibrationMotion.stepIntervalMs) {
    return false;
  }
  calibrationMotion.lastStepAt = now;

  CalibrationJoint* joint = calibrationMotion.joint;
  joint->commandedAngle += calibrationMotion.direction;
  joint->servo->write(joint->commandedAngle);

  if (joint->commandedAngle == calibrationMotion.targetAngle) {
    calibrationMotion.active = false;
    completedServo = joint->config->name;
    completedAngle = joint->commandedAngle;
    calibrationMotion.joint = nullptr;
    return true;
  }
  return false;
}

bool stopCalibrationMotion(const char*& stoppedServo, int& stoppedAngle) {
  stoppedServo = nullptr;
  stoppedAngle = -1;
  if (calibrationMotion.active && calibrationMotion.joint != nullptr) {
    stoppedServo = calibrationMotion.joint->config->name;
    stoppedAngle = calibrationMotion.joint->commandedAngle;
  }
  calibrationMotion.active = false;
  calibrationMotion.joint = nullptr;
  Serial.println("Calibration: STOP; servos adjuntos para sostener el brazo.");
  return true;
}

bool releaseCalibrationServos() {
  if (calibrationMotion.active) {
    return false;
  }
  for (size_t index = 0; index < CALIBRATION_JOINT_COUNT; index++) {
    if (calibrationJoints[index]->attached) {
      calibrationJoints[index]->servo->detach();
      calibrationJoints[index]->attached = false;
    }
  }
  positionKnown = false;
  Serial.println("Calibration: servos liberados; riesgo de caida por gravedad; posicion desconocida.");
  return true;
}

JointCommandState calibrationJointState() {
  return {
    baseJoint.commandedAngle,
    shoulderJoint.commandedAngle,
    elbowJoint.commandedAngle,
    wristJoint.commandedAngle,
    positionKnown,
    calibrationMotion.active
  };
}

bool moveToPoseSafe(const ServoPose& target, int speed) {
  if (!motorsConfigured()) {
    Serial.println("Movimiento complejo rechazado: FINAL_ARM_MODE no activo o no calibrado.");
    return false;
  }
  if (isEmergencyStopped()) {
    return false;
  }

  const ServoPose safeTarget = {
    constrain(target.base, BASE_SERVO_CONFIG.minAngle, BASE_SERVO_CONFIG.maxAngle),
    constrain(target.shoulder, SHOULDER_SERVO_CONFIG.minAngle, SHOULDER_SERVO_CONFIG.maxAngle),
    constrain(target.elbow, ELBOW_SERVO_CONFIG.minAngle, ELBOW_SERVO_CONFIG.maxAngle),
    constrain(target.wrist, WRIST_SERVO_CONFIG.minAngle, WRIST_SERVO_CONFIG.maxAngle)
  };
  const int maxDelta = max(
    abs(safeTarget.base - pose.base),
    max(
      abs(safeTarget.shoulder - pose.shoulder),
      max(abs(safeTarget.elbow - pose.elbow), abs(safeTarget.wrist - pose.wrist))
    )
  );
  const ServoPose start = pose;
  const int degreesPerStep = degreesPerStepForSpeed(speed);
  const int steps = max(1, (maxDelta + degreesPerStep - 1) / degreesPerStep);
  const unsigned long stepWaitMs = stepDelayForSpeed(speed);

  for (int step = 1; step <= steps; step++) {
    if (isEmergencyStopped()) {
      stopMotors();
      return false;
    }
    const ServoPose nextPose = {
      start.base + ((safeTarget.base - start.base) * step) / steps,
      start.shoulder + ((safeTarget.shoulder - start.shoulder) * step) / steps,
      start.elbow + ((safeTarget.elbow - start.elbow) * step) / steps,
      start.wrist + ((safeTarget.wrist - start.wrist) * step) / steps
    };
    writePose(nextPose);
    waitWithMotionTick(stepWaitMs);
  }
  return true;
}

bool runPoseSequence(const ServoPose poses[], size_t poseCount, int speed, int durationMs) {
  if (!FINAL_ARM_MODE) {
    Serial.println("Secuencia rechazada: FINAL_ARM_MODE=false.");
    return false;
  }
  if (poses == nullptr || poseCount == 0 || isEmergencyStopped()) {
    return false;
  }

  const int safeDuration = constrain(durationMs, SAFE_MIN_DURATION_MS, SAFE_MAX_DURATION_MS);
  const unsigned long pausePerPose = max(1UL, static_cast<unsigned long>(safeDuration) / poseCount);
  for (size_t index = 0; index < poseCount; index++) {
    if (!moveToPoseSafe(poses[index], speed) || !waitSafely(pausePerPose)) {
      return false;
    }
  }
  return true;
}

void returnToNeutral() {
  moveToPoseSafe({BASE_SERVO_CONFIG.homeAngle, 90, 90, 90}, 20);
}

void setMotionTickCallback(MotionTickCallback callback) {
  motionTickCallback = callback;
}

void syncPoseToCommandedAngles() {
  // Alinea la pose interna con los angulos comandados por calibracion
  // para que el primer moveToPoseSafe del modo real no genere un salto
  // brusco partiendo de la pose logica anterior.
  pose = {
    baseJoint.commandedAngle,
    shoulderJoint.commandedAngle,
    elbowJoint.commandedAngle,
    wristJoint.commandedAngle
  };
}

void stopMotors() {
  const char* stoppedServo = nullptr;
  int stoppedAngle = -1;
  stopCalibrationMotion(stoppedServo, stoppedAngle);
}

ServoPose currentPose() {
  return pose;
}
