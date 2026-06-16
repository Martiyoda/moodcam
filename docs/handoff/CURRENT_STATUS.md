# CURRENT STATUS - 11 June 2026

## Git

- Branch actual: `demo-final-pitch`.
- Commit base: `09b9201 Add ESP32 MQTT servo test firmware`.
- Hay cambios sin commit en firmware, web, tests y documentacion.
- No se ha creado ningun commit para la calibracion ni para este handoff.

Cambios pendientes principales:

- Firmware de calibracion MQTT no bloqueante.
- Configuracion central de modos y servos.
- Panel web angular integrado con MQTT.
- Bloqueo de AI Bridge y movimientos artisticos durante calibracion.
- Tests de calibracion de firmware y web.
- Documentacion de robot, futuro brazo y transferencia.

## Tests y compilacion

- `npm test`: 45/45 pruebas superadas.
- Build Vite: correcto.
- Advertencia no bloqueante: bundle JavaScript mayor de 500 kB.
- Firmware ESP32: compila correctamente para `esp32:esp32:esp32`.
- Uso de firmware: 1.023.599 bytes de flash (78%).
- Variables globales: 48.060 bytes (14%).

## Firmware

```cpp
DEMO_MODE = true
SAFE_TEST_MODE = true
CALIBRATION_MODE = true
FINAL_ARM_MODE = false
```

| Servo | GPIO | Estado |
| --- | ---: | --- |
| Base | 26 | Habilitado para calibracion |
| Hombro | 25 | Habilitado para calibracion |
| Codo | 33 | Habilitado para calibracion |
| Muneca | 32 | Habilitado para calibracion |
| Pincel | -1 | Desactivado |

Topics:

- Comandos: `robot/test`.
- Estados: `robot/status`.
- Errores: `robot/error`.

Comandos: `start_calibration`, `jog`, `set_angle`, `get_joint_state`, `stop` y `release_servos`.

Tras reiniciar, la posicion es desconocida y los servos arrancan detached. Los angulos mostrados son angulos ordenados, no mediciones fisicas.

## Web

- E-motion funciona con React, Vite y Tailwind.
- Camara, deteccion facial, voz, seleccion de pintor y MQTT estan implementados.
- HiveMQ continua siendo el canal interno.
- El panel de calibracion angular publica y recibe automaticamente.
- STOP y actualizar estado permanecen disponibles durante movimiento.
- AI Bridge y envio artistico quedan aislados durante calibracion.
- El panel fue revisado en escritorio y movil.

## Estado fisico

- Calibracion fisica todavia pendiente.
- HOME real no confirmado en esta entrega.
- Limites 80-110 grados son provisionales.
- Poses no guardadas.
- NVS no implementado.
- Coordenadas cartesianas y cinematica inversa no implementadas.
- Movimientos artisticos bloqueados.
- Pincel desactivado.

Medidas conocidas:

- Base de metacrilato: 42 x 29,7 cm.
- Lienzo A4: 21 x 29,7 cm.
- Zona del robot: aproximadamente 13 x 13 cm.
- Origen futuro: centro del eje de la base `(0,0)`.

## Proximo paso

Conectar la ESP32 y realizar calibracion fisica desde la web, articulacion por articulacion. Confirmar HOME de forma manual, probar jog de 1 grado, registrar limites mecanicos conservadores y comprobar STOP. No activar pincel, poses, NVS, trazos ni `FINAL_ARM_MODE`.

