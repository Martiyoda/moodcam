#pragma once

#include <Arduino.h>

#define DEMO_MODE true
#define SAFE_TEST_MODE true
#define CALIBRATION_MODE true
#define FINAL_ARM_MODE false
#define FINAL_ARM_EXPLICITLY_CONFIGURED false

static_assert(!CALIBRATION_MODE || SAFE_TEST_MODE, "CALIBRATION_MODE requires SAFE_TEST_MODE");

constexpr int MAX_DURATION_MS = 1000;
constexpr int CALIBRATION_MIN_DURATION_MS = 200;
constexpr int CALIBRATION_MAX_DURATION_MS = 5000;
constexpr int TEST_SERVO_CENTER_ANGLE = 90;
constexpr int DEFAULT_SAFE_SPEED = 20;

enum RobotServoId {
  SERVO_BASE,
  SERVO_SHOULDER,
  SERVO_ELBOW,
  SERVO_WRIST,
  SERVO_BRUSH
};

struct RobotServoConfig {
  RobotServoId id;
  const char* name;
  int pin;
  bool enabled;
  int minAngle;
  int maxAngle;
  int homeAngle;
  int safeSpeed;
};

// Definitive physical pin map. Limits remain conservative until calibration.
constexpr RobotServoConfig BASE_SERVO_CONFIG = {
  SERVO_BASE, "base", 26, true, 75, 115, 90, DEFAULT_SAFE_SPEED
};

constexpr RobotServoConfig SHOULDER_SERVO_CONFIG = {
  SERVO_SHOULDER, "shoulder", 25, true, 65, 125, 90, DEFAULT_SAFE_SPEED
};

constexpr RobotServoConfig ELBOW_SERVO_CONFIG = {
  SERVO_ELBOW, "elbow", 33, true, 65, 125, 90, DEFAULT_SAFE_SPEED
};

constexpr RobotServoConfig WRIST_SERVO_CONFIG = {
  SERVO_WRIST, "wrist", 32, true, 70, 120, 90, DEFAULT_SAFE_SPEED
};

constexpr RobotServoConfig BRUSH_SERVO_CONFIG = {
  SERVO_BRUSH, "brush", -1, false, 0, 0, 0, DEFAULT_SAFE_SPEED
};

constexpr RobotServoConfig ROBOT_SERVOS[] = {
  BASE_SERVO_CONFIG,
  SHOULDER_SERVO_CONFIG,
  ELBOW_SERVO_CONFIG,
  WRIST_SERVO_CONFIG,
  BRUSH_SERVO_CONFIG
};

constexpr size_t ROBOT_SERVO_COUNT = sizeof(ROBOT_SERVOS) / sizeof(ROBOT_SERVOS[0]);

constexpr int BASE_SERVO_PIN = BASE_SERVO_CONFIG.pin;
constexpr int SHOULDER_SERVO_PIN = SHOULDER_SERVO_CONFIG.pin;
constexpr int ELBOW_SERVO_PIN = ELBOW_SERVO_CONFIG.pin;
constexpr int WRIST_SERVO_PIN = WRIST_SERVO_CONFIG.pin;

constexpr bool MOTOR_OUTPUT_ENABLED = DEMO_MODE || SAFE_TEST_MODE || FINAL_ARM_MODE;
constexpr int TEST_SERVO_MAX_DURATION_MS = MAX_DURATION_MS;
