#include "motors.h"

#include <ESP32Servo.h>

#include "safety.h"

namespace {
Servo shoulderServo;
Servo elbowServo;
Servo wristServo;
ServoPose pose = {90, 90, 90};
bool attached = false;

bool validPin(int pin) {
  return pin >= 0;
}

int stepDelayForSpeed(int speed) {
  return map(constrain(speed, SAFE_MIN_SPEED, SAFE_MAX_SPEED), SAFE_MIN_SPEED, SAFE_MAX_SPEED, 35, 6);
}

void writePose(const ServoPose& nextPose) {
  pose = nextPose;
  if (!attached) {
    return;
  }
  shoulderServo.write(pose.shoulder);
  elbowServo.write(pose.elbow);
  wristServo.write(pose.wrist);
}
}

// Conecta los servos unicamente cuando la salida fisica y los tres pines estan configurados.
void beginMotors() {
  attached = false;
  if (!motorsConfigured()) {
    Serial.println("Motors: modo seguro, salidas fisicas desactivadas.");
    return;
  }

  shoulderServo.attach(SHOULDER_SERVO_PIN);
  elbowServo.attach(ELBOW_SERVO_PIN);
  wristServo.attach(WRIST_SERVO_PIN);
  attached = true;
  writePose(pose);
}

bool motorsConfigured() {
  return MOTOR_OUTPUT_ENABLED
    && validPin(SHOULDER_SERVO_PIN)
    && validPin(ELBOW_SERVO_PIN)
    && validPin(WRIST_SERVO_PIN);
}

// Interpola hasta una pose limitada. Nunca salta directamente a un angulo lejano.
bool moveToPoseSafe(const ServoPose& target, int speed) {
  if (isEmergencyStopped()) {
    return false;
  }

  const ServoPose safeTarget = {
    constrain(target.shoulder, SHOULDER_MIN_ANGLE, SHOULDER_MAX_ANGLE),
    constrain(target.elbow, ELBOW_MIN_ANGLE, ELBOW_MAX_ANGLE),
    constrain(target.wrist, WRIST_MIN_ANGLE, WRIST_MAX_ANGLE)
  };
  const int maxDelta = max(
    abs(safeTarget.shoulder - pose.shoulder),
    max(abs(safeTarget.elbow - pose.elbow), abs(safeTarget.wrist - pose.wrist))
  );
  const ServoPose start = pose;
  const int steps = max(1, maxDelta);

  for (int step = 1; step <= steps; step++) {
    if (isEmergencyStopped()) {
      stopMotors();
      return false;
    }
    const ServoPose nextPose = {
      start.shoulder + ((safeTarget.shoulder - start.shoulder) * step) / steps,
      start.elbow + ((safeTarget.elbow - start.elbow) * step) / steps,
      start.wrist + ((safeTarget.wrist - start.wrist) * step) / steps
    };
    writePose(nextPose);
    delay(stepDelayForSpeed(speed));
  }
  return true;
}

// Ejecuta una lista finita de poses y reparte la duracion entre ellas.
bool runPoseSequence(const ServoPose poses[], size_t poseCount, int speed, int durationMs) {
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
  moveToPoseSafe({90, 90, 90}, 20);
}

void stopMotors() {
  if (!attached) {
    return;
  }
  shoulderServo.write(pose.shoulder);
  elbowServo.write(pose.elbow);
  wristServo.write(pose.wrist);
}

ServoPose currentPose() {
  return pose;
}

