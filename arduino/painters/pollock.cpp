#include "pollock.h"

#include "../core/brush.h"
#include "../core/motors.h"
#include "../core/safety.h"

namespace {
void runPollockPattern(const ServoPose poses[], size_t count, int speed, int intensity, int durationMs, int pressure) {
  MotionParameters p = sanitizeMotionParameters(speed, intensity, durationMs, pressure);
  p.speed = min(p.speed, 65);
  setBrushPressureSafe(p.pressure);
  runPoseSequence(poses, count, p.speed, p.durationMs);
  liftBrush();
}
}

// Salpicadura simulada: varias marcas cortas, nunca lanza pintura fisicamente.
void pollockSplash(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 6, 18);
  const ServoPose poses[] = {{90, 90, 90}, {90 + span, 84, 96}, {86, 90 + span, 84}, {90 - span, 96, 92}, {94, 90 - span, 88}};
  runPollockPattern(poses, 5, speed, intensity, durationMs, pressure);
}

// Goteo simulado con recorrido descendente lento y controlado.
void pollockDrip(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 24);
  const ServoPose poses[] = {{82, 90 - span, 90}, {86, 90, 90}, {90, 90 + span, 90}};
  runPollockPattern(poses, 3, min(speed, 45), intensity, durationMs, pressure);
}

// Lineas pseudoaleatorias predefinidas; no usa coordenadas libres.
void pollockRandomLines(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 8, 22);
  const ServoPose poses[] = {{90 - span, 82, 96}, {96, 90 + span, 82}, {90 + span, 86, 100}, {84, 90 - span, 88}};
  runPollockPattern(poses, 4, speed, intensity, durationMs, pressure);
}

// Sacudida artistica simulada con amplitud y velocidad especialmente limitadas.
void pollockEnergeticShake(int speed, int intensity, int durationMs, int pressure) {
  const int span = map(constrain(intensity, 0, 100), 0, 100, 4, 12);
  const ServoPose poses[] = {{90 - span, 88, 92}, {90 + span, 92, 88}, {90 - span, 92, 92}, {90 + span, 88, 88}};
  runPollockPattern(poses, 4, min(speed, 50), min(intensity, 70), durationMs, pressure);
}

void pollockLoopPath(int speed, int intensity, int durationMs, int pressure) {
  pollockRandomLines(speed, intensity, durationMs, pressure);
}

void pollockControlledDrip(int speed, int intensity, int durationMs, int pressure) {
  pollockDrip(speed, intensity, durationMs, pressure);
}

void pollockSimulatedSplash(int speed, int intensity, int durationMs, int pressure) {
  pollockSplash(speed, intensity, durationMs, pressure);
}

void pollockLayeredWeb(int speed, int intensity, int durationMs, int pressure) {
  pollockRandomLines(speed, intensity, durationMs, pressure);
}

void pollockAllOverPass(int speed, int intensity, int durationMs, int pressure) {
  pollockEnergeticShake(speed, intensity, durationMs, pressure);
}
