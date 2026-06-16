#pragma once

void pollockSplash(int speed, int intensity, int durationMs, int pressure);
void pollockDrip(int speed, int intensity, int durationMs, int pressure);
void pollockRandomLines(int speed, int intensity, int durationMs, int pressure);
void pollockEnergeticShake(int speed, int intensity, int durationMs, int pressure);

// Alias de tipos usados por las recetas JSON existentes.
void pollockLoopPath(int speed, int intensity, int durationMs, int pressure);
void pollockControlledDrip(int speed, int intensity, int durationMs, int pressure);
void pollockSimulatedSplash(int speed, int intensity, int durationMs, int pressure);
void pollockLayeredWeb(int speed, int intensity, int durationMs, int pressure);
void pollockAllOverPass(int speed, int intensity, int durationMs, int pressure);
