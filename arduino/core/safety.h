#pragma once

#include <Arduino.h>

// Limites globales editables. Se aplican antes de ejecutar cualquier trazo.
constexpr int SAFE_MIN_SPEED = 1;
constexpr int SAFE_MAX_SPEED = 80;
constexpr int SAFE_MIN_INTENSITY = 0;
constexpr int SAFE_MAX_INTENSITY = 85;
constexpr int SAFE_MIN_DURATION_MS = 250;
constexpr int SAFE_MAX_DURATION_MS = 10000;
constexpr int SAFE_MIN_PRESSURE = 0;
constexpr int SAFE_MAX_PRESSURE = 60;

struct MotionParameters {
  int speed;
  int intensity;
  int durationMs;
  int pressure;
};

void beginSafety();
void requestEmergencyStop();
void clearEmergencyStop();
bool isEmergencyStopped();
MotionParameters sanitizeMotionParameters(int speed, int intensity, int durationMs, int pressure);
bool waitSafely(unsigned long durationMs);

