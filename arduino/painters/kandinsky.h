#pragma once

void kandinskyLines(int speed, int intensity, int durationMs, int pressure);
void kandinskyCircles(int speed, int intensity, int durationMs, int pressure);
void kandinskyZigZag(int speed, int intensity, int durationMs, int pressure);
void kandinskyGeometricMix(int speed, int intensity, int durationMs, int pressure);

// Alias de tipos usados por las recetas JSON existentes.
void kandinskyGeometricRhythm(int speed, int intensity, int durationMs, int pressure);
void kandinskyContrastMarks(int speed, int intensity, int durationMs, int pressure);
void kandinskyArcs(int speed, int intensity, int durationMs, int pressure);
