#include "safety.h"

namespace {
volatile bool emergencyStopped = true;
}

// Inicia el sistema bloqueado. El usuario debe armarlo de forma explicita.
void beginSafety() {
  emergencyStopped = true;
}

// Detiene inmediatamente cualquier secuencia que consulte el estado de seguridad.
void requestEmergencyStop() {
  emergencyStopped = true;
}

// Solo debe llamarse despues de comprobar hardware, espacio y alimentacion.
void clearEmergencyStop() {
  emergencyStopped = false;
}

bool isEmergencyStopped() {
  return emergencyStopped;
}

// Recorta todos los parametros recibidos a limites globales conservadores.
MotionParameters sanitizeMotionParameters(int speed, int intensity, int durationMs, int pressure) {
  return {
    constrain(speed, SAFE_MIN_SPEED, SAFE_MAX_SPEED),
    constrain(intensity, SAFE_MIN_INTENSITY, SAFE_MAX_INTENSITY),
    constrain(durationMs, SAFE_MIN_DURATION_MS, SAFE_MAX_DURATION_MS),
    constrain(pressure, SAFE_MIN_PRESSURE, SAFE_MAX_PRESSURE)
  };
}

// Espera en fragmentos pequenos para poder reaccionar al paro de emergencia.
bool waitSafely(unsigned long durationMs) {
  const unsigned long startedAt = millis();
  while (millis() - startedAt < durationMs) {
    if (isEmergencyStopped()) {
      return false;
    }
    delay(10);
  }
  return true;
}

