#include "alma_thomas.h"

#include "../core/brush.h"
#include "../core/motors.h"
#include "../core/safety.h"

namespace {
void runAlmaPattern(const ServoPose poses[], size_t count, int speed, int intensity, int durationMs, int pressure) {
  const MotionParameters p = sanitizeMotionParameters(speed, intensity, durationMs, pressure);
  setBrushPressureSafe(p.pressure);
  runPoseSequence(poses, count, p.speed, p.durationMs);
  liftBrush();
}
}

// Simula puntos mediante contactos breves en posiciones cercanas y seguras.
void almaDots(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 5, 14);
  const ServoPose poses[] = {{90 - span, 86, 90}, {90, 86, 90}, {90 + span, 86, 90}, {90 - span, 98, 90}, {90, 98, 90}, {90 + span, 98, 90}};
  runAlmaPattern(poses, 6, speed, intensity, durationMs, pressure);
}

// Mosaico pequeno y ordenado con variaciones de posicion limitadas.
void almaMosaic(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 6, 16);
  const ServoPose poses[] = {{90 - span, 84, 88}, {90, 86, 92}, {90 + span, 84, 88}, {90 + span, 98, 92}, {90, 96, 88}, {90 - span, 98, 92}};
  runAlmaPattern(poses, 6, speed, intensity, durationMs, pressure);
}

// Repite marcas cortas con separacion regular.
void almaRepeatedMarks(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 6, 18);
  const ServoPose poses[] = {{90 - span, 88, 86}, {90 - span / 3, 90, 94}, {90 + span / 3, 88, 86}, {90 + span, 90, 94}};
  runAlmaPattern(poses, 4, speed, intensity, durationMs, pressure);
}

// Ritmo cromatico representado por una secuencia circular de marcas.
void almaColorRhythm(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 7, 18);
  const ServoPose poses[] = {{90, 90 - span, 90}, {90 + span, 90, 94}, {90, 90 + span, 90}, {90 - span, 90, 86}, {90, 90 - span, 90}};
  runAlmaPattern(poses, 5, speed, intensity, durationMs, pressure);
}

void almaThomasColorBars(int speed, int intensity, int durationMs, int pressure) {
  almaRepeatedMarks(speed, intensity, durationMs, pressure);
}

void almaThomasDensityWave(int speed, int intensity, int durationMs, int pressure) {
  almaColorRhythm(speed, intensity, durationMs, pressure);
}

void almaThomasVerticalStripes(int speed, int intensity, int durationMs, int pressure) {
  almaRepeatedMarks(speed, intensity, durationMs, pressure);
}

void almaThomasConcentricPattern(int speed, int intensity, int durationMs, int pressure) {
  almaColorRhythm(speed, intensity, durationMs, pressure);
}

void almaThomasMosaic(int speed, int intensity, int durationMs, int pressure) {
  almaMosaic(speed, intensity, durationMs, pressure);
}
