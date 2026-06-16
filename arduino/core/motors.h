#pragma once

#include <Arduino.h>

// Mantener false y los pines en -1 hasta conocer el cableado real.
constexpr bool MOTOR_OUTPUT_ENABLED = false;
constexpr int SHOULDER_SERVO_PIN = -1;
constexpr int ELBOW_SERVO_PIN = -1;
constexpr int WRIST_SERVO_PIN = -1;

// Limites iniciales conservadores. Deben calibrarse para el brazo real.
constexpr int SHOULDER_MIN_ANGLE = 25;
constexpr int SHOULDER_MAX_ANGLE = 155;
constexpr int ELBOW_MIN_ANGLE = 30;
constexpr int ELBOW_MAX_ANGLE = 150;
constexpr int WRIST_MIN_ANGLE = 30;
constexpr int WRIST_MAX_ANGLE = 150;

struct ServoPose {
  int shoulder;
  int elbow;
  int wrist;
};

void beginMotors();
bool motorsConfigured();
bool moveToPoseSafe(const ServoPose& target, int speed);
bool runPoseSequence(const ServoPose poses[], size_t poseCount, int speed, int durationMs);
void returnToNeutral();
void stopMotors();
ServoPose currentPose();

