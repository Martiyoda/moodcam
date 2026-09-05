// Interfaz de seguridad del firmware activo.
// Estas funciones son la ultima barrera antes de mover el hardware.
#pragma once

#include <Arduino.h>

// Limites globales editables. Se aplican antes de ejecutar cualquier trazo.
constexpr int SAFE_MIN_SPEED = 1;
constexpr int SAFE_MAX_SPEED = 50;
constexpr int SAFE_MIN_INTENSITY = 0;
constexpr int SAFE_MAX_INTENSITY = 85;
constexpr int SAFE_MIN_DURATION_MS = 250;
constexpr int SAFE_MAX_DURATION_MS = 10000;

struct MotionParameters {
  int speed;
  int intensity;
  int durationMs;
};

void beginSafety();
void requestEmergencyStop();
void clearEmergencyStop();
bool isEmergencyStopped();
MotionParameters sanitizeMotionParameters(int speed, int intensity, int durationMs);
bool waitSafely(unsigned long durationMs);
