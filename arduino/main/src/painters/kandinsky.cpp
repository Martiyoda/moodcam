#include "kandinsky.h"

#include "../core/brush.h"
#include "../core/motors.h"
#include "../core/safety.h"

namespace {
void runKandinskyPattern(const ServoPose poses[], size_t count, int speed, int intensity, int durationMs, int pressure) {
  const MotionParameters p = sanitizeMotionParameters(speed, intensity, durationMs, pressure);
  setBrushPressureSafe(p.pressure);
  runPoseSequence(poses, count, p.speed, p.durationMs);
  liftBrush();
}
}

// Lineas geometricas con amplitud regulada por la intensidad.
void kandinskyLines(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 28);
  const ServoPose poses[] = {{90 - span, 82, 90}, {90 + span, 98, 90}};
  runKandinskyPattern(poses, 2, speed, intensity, durationMs, pressure);
}

// Aproxima un circulo mediante una secuencia finita de poses suaves.
void kandinskyCircles(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 22);
  const ServoPose poses[] = {
    {90, 90 - span, 90}, {90 + span, 90, 96}, {90, 90 + span, 90},
    {90 - span, 90, 84}, {90, 90 - span, 90}
  };
  runKandinskyPattern(poses, 5, speed, intensity, durationMs, pressure);
}

// Zigzag geometrico con cambios de direccion desacelerados por la capa de motores.
void kandinskyZigZag(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 7, 20);
  const ServoPose poses[] = {{90 - span, 82, 88}, {90 + span, 92, 96}, {90 - span, 102, 84}, {90 + span, 112, 92}};
  runKandinskyPattern(poses, 4, speed, intensity, durationMs, pressure);
}

// Mezcla corta de linea, angulo y arco para composiciones abstractas.
void kandinskyGeometricMix(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 24);
  const ServoPose poses[] = {{90 - span, 86, 90}, {90, 76, 100}, {90 + span, 90, 90}, {90, 104, 80}, {90 - span, 86, 90}};
  runKandinskyPattern(poses, 5, speed, intensity, durationMs, pressure);
}

void kandinskyGeometricRhythm(int speed, int intensity, int durationMs, int pressure) {
  kandinskyGeometricMix(speed, intensity, durationMs, pressure);
}

void kandinskyContrastMarks(int speed, int intensity, int durationMs, int pressure) {
  kandinskyZigZag(speed, intensity, durationMs, pressure);
}

void kandinskyArcs(int speed, int intensity, int durationMs, int pressure) {
  kandinskyCircles(speed, intensity, durationMs, pressure);
}
