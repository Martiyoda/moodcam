// Declaraciones publicas del pincel para que el firmware pueda usarlo sin conocer
// los detalles internos de su implementacion.
#pragma once

#include <Arduino.h>

// Mantener false y el pin en -1 hasta calibrar el mecanismo del pincel.
constexpr bool BRUSH_OUTPUT_ENABLED = false;
constexpr int BRUSH_SERVO_PIN = -1;
constexpr int BRUSH_LIFTED_ANGLE = 45;
constexpr int BRUSH_MIN_CONTACT_ANGLE = 55;
constexpr int BRUSH_MAX_CONTACT_ANGLE = 100;

void beginBrush();
bool brushConfigured();
void setBrushPressureSafe(int pressure);
void liftBrush();
void stopBrush();

