#pragma once

void rothkoBlock(int speed, int intensity, int durationMs, int pressure);
void rothkoLayer(int speed, int intensity, int durationMs, int pressure);
void rothkoSlowRectangle(int speed, int intensity, int durationMs, int pressure);
void rothkoSoftBlend(int speed, int intensity, int durationMs, int pressure);

// Alias de tipos usados por las recetas JSON existentes.
void rothkoLayeredField(int speed, int intensity, int durationMs, int pressure);
void rothkoSoftBlock(int speed, int intensity, int durationMs, int pressure);
void rothkoTwoFieldComposition(int speed, int intensity, int durationMs, int pressure);
void rothkoHorizontalWash(int speed, int intensity, int durationMs, int pressure);
void rothkoSoftEdge(int speed, int intensity, int durationMs, int pressure);
