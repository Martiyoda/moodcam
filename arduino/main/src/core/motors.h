#pragma once

// API de motores: conexión de servos, calibración, interpolación y poses seguras.

#include <Arduino.h>
#include "../robot_config.h"

struct ServoPose {
  int base;
  int shoulder;
  int elbow;
  int wrist;
};

struct JointCommandState {
  int base;
  int shoulder;
  int elbow;
  int wrist;
  bool positionKnown;
  bool moving;
};

// Hook opcional para servir MQTT/WiFi mientras moveToPoseSafe interpola
// pasos largos en modo real. Si no se registra, se usa delay() bloqueante.
typedef void (*MotionTickCallback)(unsigned long durationMs);

void beginMotors();
bool motorsConfigured();
const RobotServoConfig* robotServoConfigByName(const char* servoName);
const RobotServoConfig* robotServoConfigByPin(int servoPin);
bool hardwareTestConfigured(int servoPin);
bool runSingleServoHardwareTest(int servoPin, const char* servoName, int angle, int durationMs);
bool startCalibrationAssumingHome();
bool calibrationPositionKnown();
bool calibrationMotionActive();
bool calibrationJointAttached(const char* servoName);
int calibrationCommandedAngle(const char* servoName);
bool startCalibrationMove(const char* servoName, int targetAngle, int durationMs);
bool updateCalibrationMotion(const char*& completedServo, int& completedAngle);
bool stopCalibrationMotion(const char*& stoppedServo, int& stoppedAngle);
bool releaseCalibrationServos();
JointCommandState calibrationJointState();
bool moveToPoseSafe(const ServoPose& target, int speed);
bool runPoseSequence(const ServoPose poses[], size_t poseCount, int speed, int durationMs);
void returnToNeutral();
void stopMotors();
ServoPose currentPose();
void setMotionTickCallback(MotionTickCallback callback);
void syncPoseToCommandedAngles();
