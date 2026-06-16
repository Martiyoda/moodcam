# CODEX CONTEXT - E-motion

## Objetivo del proyecto

E-motion detecta emociones mediante camara y voz, permite seleccionar un pintor y prepara un flujo futuro para traducir una emocion en movimientos aprobados de un brazo robotico. En la fase actual solo se permite calibracion angular segura por MQTT. No se debe pintar.

## Estado de Git

- Branch activa esperada: `demo-final-pitch`.
- La branch parte actualmente del mismo commit que `main`: `09b9201 Add ESP32 MQTT servo test firmware`.
- Existen cambios de firmware y web sin commit. Deben conservarse y revisarse antes de crear cualquier commit.
- No cambiar a `main` ni descartar cambios locales.

## Arquitectura

```text
Web E-motion (React/Vite)
  -> MQTT por WebSocket
  -> HiveMQ
  -> ESP32 recibe robot/test
  -> firmware valida y mueve una articulacion
  -> robot/status o robot/error
  -> la web actualiza el panel
```

Flujo artistico futuro, actualmente bloqueado:

```text
emotion/input
  -> AI Bridge decide stroke_id
  -> server/validator.js valida stroke_id
  -> robot/command
  -> ESP32 ejecuta solo con FINAL_ARM_MODE y calibracion explicita
```

## Componentes principales

- `src/`: web React E-motion.
- `src/components/RobotCalibrationPanel.jsx`: panel angular del brazo.
- `src/hooks/useMqtt.js`: conexion, publicaciones y suscripciones MQTT.
- `src/lib/armCalibration.js`: mapa, limites y constructores seguros de comandos.
- `server/`: backend local, validacion, AI Bridge y simulador ESP32.
- `arduino/main/`: firmware ESP32 actual.
- `arduino/main/src/robot_config.h`: modos, pines y limites por servo.
- `arduino/main/src/core/motors.cpp`: estado angular en RAM e interpolacion no bloqueante.
- `strokes/`: trazos aprobados y mapeos futuros.
- `research/`: investigacion de pintores.
- `tests/` y `src/lib/*.test.js`: pruebas automatizadas.
- `docs/ROBOT_SETUP.md`: operacion segura actual.
- `docs/FUTURE_FINAL_ARM.md`: fases posteriores.

## Mapa fisico definitivo

| Servo | GPIO | Limites provisionales | HOME logico |
| --- | ---: | ---: | ---: |
| Base | 26 | 80-110 grados | 90 |
| Hombro | 25 | 80-110 grados | 90 |
| Codo | 33 | 80-110 grados | 90 |
| Muneca | 32 | 80-110 grados | 90 |
| Pincel | -1 | Desactivado | No aplica |

No cambiar estos pines sin confirmacion fisica explicita.

## Modos actuales

```cpp
#define DEMO_MODE true
#define SAFE_TEST_MODE true
#define CALIBRATION_MODE true
#define FINAL_ARM_MODE false
```

`CALIBRATION_MODE` requiere `SAFE_TEST_MODE`. Con calibracion activa se bloquean `emotion_test`, `hardware_test`, `pose_test`, `stroke_id`, `base_function`, pincel y movimientos artisticos.

## MQTT de calibracion

- Comandos: `robot/test`.
- Estados: `robot/status`.
- Errores: `robot/error`.

Comandos permitidos:

- `start_calibration`
- `jog`
- `set_angle`
- `get_joint_state`
- `stop`
- `release_servos`

La web construye estos JSON automaticamente. HiveMQ sigue siendo el transporte interno, pero el operador no necesita usar el Web Client.

## Reglas de seguridad implementadas

- Tras reinicio: servos detached y `positionKnown=false`.
- `start_calibration` requiere `assume_home:true` y no mueve el brazo.
- El operador debe colocar o confirmar fisicamente HOME antes de iniciar.
- Solo se mueve un servo por comando.
- `jog` solo admite `-5`, `-1`, `1` o `5`.
- Los limites provisionales son 80-110 grados y no se recortan silenciosamente.
- `set_angle` exige `duration_ms` entre 200 y 5000.
- La interpolacion usa `millis()` y no bloquea STOP.
- Durante un movimiento solo se aceptan STOP y consulta de estado.
- STOP conserva el ultimo angulo ordenado y mantiene los servos adjuntos.
- `release_servos` solo se admite parado y puede provocar caida por gravedad.
- Los angulos son ordenes guardadas en RAM, no mediciones fisicas.
- El pincel esta desactivado y no debe recibir `attach()`.
- `FINAL_ARM_MODE=false` impide movimientos complejos.

## Web actual

- Camara y deteccion facial local con `@vladmandic/human`.
- Captura de voz, tono y SpeechRecognition cuando el navegador lo soporta.
- Seleccion de pintor.
- Cliente MQTT/HiveMQ integrado.
- Panel angular con estado MQTT, disponibilidad ESP32, HOME, jog, angulo directo, STOP, liberacion y logs.
- Mientras se abre o activa la calibracion, se bloquean captura emocional hacia MQTT, AI Bridge y envio artistico.
- El panel cartesiano antiguo ya no se muestra, aunque parte de su configuracion permanece internamente para no romper el generador futuro.

## Firmware actual

- WiFi y MQTT se configuran localmente mediante `arduino/main/src/config.h`.
- El firmware escucha calibracion en `robot/test`.
- Publica respuestas en `robot/status` y errores en `robot/error`.
- Mantiene el ultimo angulo ordenado en RAM.
- Informa el primer attach de cada servo.
- Compila para `esp32:esp32:esp32`.

## Medidas fisicas conocidas

- Base de metacrilato: 42 x 29,7 cm.
- Lienzo A4: 21 x 29,7 cm.
- Zona aproximada del robot: 13 x 13 cm.
- Origen futuro: centro del eje giratorio de la base, `(0,0)`.

No hay coordenadas cartesianas, cinematica inversa ni conversion automatica de estas medidas en la fase actual.

## Pendiente

- Calibrar fisicamente HOME y limites de cada servo.
- Confirmar funcionamiento mecanico individual de base, hombro, codo y muneca.
- Sustituir limites provisionales por limites reales.
- Definir y probar poses despues de calibrar articulaciones.
- Implementar persistencia NVS solo cuando el formato sea estable.
- Montar y calibrar el pincel por separado.
- Validar movimientos coordinados sin pintura.
- Conectar `stroke_id` unicamente a movimientos aprobados.
- Activar `FINAL_ARM_MODE` solo tras completar el checklist fisico.

Poses futuras previstas: HOME, REST, CANVAS_CENTER, esquinas del lienzo, PAINT_1..N, WATER, BRUSH_CLEAN y BRUSH_WIPE. No estan implementadas.

## Verificacion actual

En la preparacion de esta entrega:

- `npm test`: 45 pruebas superadas.
- `npm run build`: correcto; solo advertencia por bundle JavaScript mayor de 500 kB.
- `arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main`: correcto.
- Firmware: 1.023.599 bytes de flash, 78%; variables globales 48.060 bytes, 14%.

## Credenciales

No incluir ni leer como documentacion:

- `.env`
- `.env.local`
- `arduino/main/src/config.h`

Usar exclusivamente `.env.example` y `arduino/main/src/config.example.h` como plantillas. Nunca escribir credenciales reales en archivos versionados.

## Instruccion para la siguiente sesion de Codex

Antes de modificar nada:

1. Leer este documento, `CURRENT_STATUS.md` y `docs/ROBOT_SETUP.md`.
2. Ejecutar `git branch --show-current` y `git status`.
3. No descartar cambios existentes.
4. No cambiar pines, modos o limites sin confirmacion del propietario.
5. No hacer commit hasta que se confirme la calibracion fisica.
6. Mantener el AI Bridge apagado mientras se calibra el brazo.

