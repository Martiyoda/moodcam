# ESP32 Simulator

Simula una ESP32 conectada a HiveMQ.

## Que simula

- Comandos artisticos en `robot/{deviceId}/command`.
- Estados del robot en `robot/{deviceId}/status`.
- Calibracion angular en `robot/test`.
- Respuestas de calibracion en `robot/status` y `robot/error`.

## Arranque

```bash
npm run robot:simulator
```

Para demo junto al AI Bridge:

```bash
npm run demo:robot
```

## Calibracion simulada

El simulador mantiene angulos internos para:

- base
- shoulder
- elbow
- wrist

Comandos soportados:

- `start_calibration`
- `jog`
- `set_angle`
- `get_joint_state`
- `stop`
- `release_servos`

Ver tambien `docs/runbooks/simulated-calibration.md`.