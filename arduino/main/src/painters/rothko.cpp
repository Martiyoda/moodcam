#include "rothko.h"

#include "../core/brush.h"
#include "../core/motors.h"
#include "../core/safety.h"

namespace {
void runRothkoPattern(const ServoPose poses[], size_t count, int speed, int intensity, int durationMs, int pressure) {
  MotionParameters p = sanitizeMotionParameters(speed, intensity, durationMs, pressure);
  p.speed = min(p.speed, 48);
  setBrushPressureSafe(p.pressure);
  runPoseSequence(poses, count, p.speed, p.durationMs);
  liftBrush();
}
}

// Construye un bloque mediante pasadas horizontales largas y estables.
void rothkoBlock(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 10, 28);
  const ServoPose poses[] = {{90 - span, 82, 90}, {90 + span, 82, 90}, {90 + span, 94, 90}, {90 - span, 94, 90}, {90 - span, 106, 90}, {90 + span, 106, 90}};
  runRothkoPattern(poses, 6, speed, intensity, durationMs, pressure);
}

// Repite una capa horizontal con un pequeno desplazamiento.
void rothkoLayer(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 10, 26);
  const ServoPose poses[] = {{90 - span, 88, 90}, {90 + span, 88, 90}, {90 + span, 96, 90}, {90 - span, 96, 90}};
  runRothkoPattern(poses, 4, speed, intensity, durationMs, pressure);
}

// Rectangulo lento con esquinas interpoladas por la capa segura de motores.
void rothkoSlowRectangle(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 22);
  const ServoPose poses[] = {{90 - span, 84, 90}, {90 + span, 84, 90}, {90 + span, 104, 90}, {90 - span, 104, 90}, {90 - span, 84, 90}};
  runRothkoPattern(poses, 5, min(speed, 38), intensity, durationMs, pressure);
}

// Mezcla suave simulada mediante pasadas paralelas de baja velocidad.
void rothkoSoftBlend(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 20);
  const ServoPose poses[] = {{90 - span, 88, 88}, {90 + span, 88, 92}, {90 - span, 94, 92}, {90 + span, 94, 88}};
  runRothkoPattern(poses, 4, min(speed, 34), intensity, durationMs, min(pressure, 45));
}

void rothkoLayeredField(int speed, int intensity, int durationMs, int pressure) {
  rothkoLayer(speed, intensity, durationMs, pressure);
}

void rothkoSoftBlock(int speed, int intensity, int durationMs, int pressure) {
  rothkoBlock(speed, intensity, durationMs, pressure);
}

void rothkoTwoFieldComposition(int speed, int intensity, int durationMs, int pressure) {
  rothkoBlock(speed, intensity, durationMs, pressure);
}

void rothkoHorizontalWash(int speed, int intensity, int durationMs, int pressure) {
  rothkoLayer(speed, intensity, durationMs, pressure);
}

void rothkoSoftEdge(int speed, int intensity, int durationMs, int pressure) {
  rothkoSoftBlend(speed, intensity, durationMs, pressure);
}
