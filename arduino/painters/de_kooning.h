#pragma once

void deKooningGesture(int speed, int intensity, int durationMs, int pressure);
void deKooningCurves(int speed, int intensity, int durationMs, int pressure);
void deKooningAggressiveStroke(int speed, int intensity, int durationMs, int pressure);
void deKooningLayeredStroke(int speed, int intensity, int durationMs, int pressure);

// Alias de tipos usados por las recetas JSON existentes.
void deKooningSweep(int speed, int intensity, int durationMs, int pressure);
void deKooningLayeredCurve(int speed, int intensity, int durationMs, int pressure);
void deKooningAngularGesture(int speed, int intensity, int durationMs, int pressure);
void deKooningFragmentedOutline(int speed, int intensity, int durationMs, int pressure);
void deKooningRepaintPass(int speed, int intensity, int durationMs, int pressure);
