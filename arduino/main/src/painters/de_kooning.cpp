#include "de_kooning.h"

#include "../core/brush.h"
#include "../core/motors.h"
#include "../core/safety.h"

namespace {
void runDeKooningPattern(const ServoPose poses[], size_t count, int speed, int intensity, int durationMs, int pressure) {
  MotionParameters p = sanitizeMotionParameters(speed, intensity, durationMs, pressure);
  p.speed = min(p.speed, 62);
  setBrushPressureSafe(p.pressure);
  runPoseSequence(poses, count, p.speed, p.durationMs);
  liftBrush();
}
}

// Gesto amplio construido con poses conocidas y amplitud limitada.
void deKooningGesture(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 22);
  const ServoPose poses[] = {{90 - span, 84, 96}, {90, 100, 82}, {90 + span, 86, 100}, {96, 104, 86}};
  runDeKooningPattern(poses, 4, speed, intensity, durationMs, pressure);
}

// Curvas expresivas con transiciones interpoladas.
void deKooningCurves(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 20);
  const ServoPose poses[] = {{90 - span, 90, 88}, {86, 90 - span, 98}, {90 + span, 90, 92}, {94, 90 + span, 82}, {90 - span, 90, 88}};
  runDeKooningPattern(poses, 5, speed, intensity, durationMs, pressure);
}

// Trazo visualmente agresivo, pero mecanicamente limitado en velocidad y amplitud.
void deKooningAggressiveStroke(int speed, int intensity, int durationMs, int pressure) {
  const int safeIntensity = min(intensity, 72);
  const int span = map(constrain(safeIntensity, 0, 100), 0, 100, 7, 18);
  const ServoPose poses[] = {{90 - span, 84, 96}, {90 + span, 96, 84}, {90 - span, 104, 92}, {90 + span, 86, 88}};
  runDeKooningPattern(poses, 4, min(speed, 50), safeIntensity, durationMs, min(pressure, 50));
}

// Superpone una segunda secuencia sobre una primera trayectoria gestual.
void deKooningLayeredStroke(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 20);
  const ServoPose poses[] = {{90 - span, 86, 90}, {90 + span, 96, 94}, {90 - span, 100, 86}, {90 + span, 90, 90}};
  runDeKooningPattern(poses, 4, speed, intensity, durationMs, pressure);
}

void deKooningSweep(int speed, int intensity, int durationMs, int pressure) {
  deKooningGesture(speed, intensity, durationMs, pressure);
}

void deKooningLayeredCurve(int speed, int intensity, int durationMs, int pressure) {
  deKooningCurves(speed, intensity, durationMs, pressure);
}

void deKooningAngularGesture(int speed, int intensity, int durationMs, int pressure) {
  deKooningAggressiveStroke(speed, intensity, durationMs, pressure);
}

void deKooningFragmentedOutline(int speed, int intensity, int durationMs, int pressure) {
  deKooningAggressiveStroke(speed, intensity, durationMs, pressure);
}

void deKooningRepaintPass(int speed, int intensity, int durationMs, int pressure) {
  deKooningLayeredStroke(speed, intensity, durationMs, pressure);
}
