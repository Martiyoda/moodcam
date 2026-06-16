#include "brush.h"

#include <ESP32Servo.h>

#include "safety.h"

namespace {
Servo brushServo;
bool attached = false;
int brushAngle = BRUSH_LIFTED_ANGLE;
}

// Conecta el servo del pincel solo cuando se haya habilitado y asignado un pin.
void beginBrush() {
  attached = BRUSH_OUTPUT_ENABLED && BRUSH_SERVO_PIN >= 0;
  if (!attached) {
    Serial.println("Brush: modo seguro, salida fisica desactivada.");
    return;
  }
  brushServo.attach(BRUSH_SERVO_PIN);
  liftBrush();
}

bool brushConfigured() {
  return BRUSH_OUTPUT_ENABLED && BRUSH_SERVO_PIN >= 0;
}

// Convierte la presion conceptual limitada en un angulo tambien limitado.
void setBrushPressureSafe(int pressure) {
  if (isEmergencyStopped()) {
    liftBrush();
    return;
  }
  const int safePressure = constrain(pressure, SAFE_MIN_PRESSURE, SAFE_MAX_PRESSURE);
  brushAngle = map(
    safePressure,
    SAFE_MIN_PRESSURE,
    SAFE_MAX_PRESSURE,
    BRUSH_MIN_CONTACT_ANGLE,
    BRUSH_MAX_CONTACT_ANGLE
  );
  if (attached) {
    brushServo.write(brushAngle);
  }
}

void liftBrush() {
  brushAngle = BRUSH_LIFTED_ANGLE;
  if (attached) {
    brushServo.write(brushAngle);
  }
}

void stopBrush() {
  liftBrush();
}

