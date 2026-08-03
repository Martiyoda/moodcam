# Protocolo de puesta en marcha del modo real

Documento operativo para validar el brazo robot fisico (3D printed, 4 servos)
antes y durante el primer arranque del modo real del firmware Inner Synergy.

> Este protocolo se ejecuta **una sola vez** despues de cualquier cambio que
> afecte al hardware o al firmware (reflasheo, cambio de servo, sustitucion
> de la fuente de alimentacion). Si tienes dudas en cualquier paso, **para**.

---

## Componentes y supuestos

- ESP32 corriendo `arduino/main/main.ino` con:
  - `CALIBRATION_MODE=true`
  - `SAFE_TEST_MODE=true`
  - Modo operativo conmutable en runtime via MQTT (`set_operating_mode`).
- Brazo articulado 3D:
  - Hombro -> codo: 230 mm
  - Codo -> muneca: 180 mm
  - Diametro superior de la base: 110 mm
- Servos:
  - **Base, hombro, codo**: BQ Zum Kit Advanced (clase Futaba S3003, ~3.5 kg·cm).
  - **Muneca**: Tower Pro SG90 9g (~1.8 kg·cm, engranajes plasticos finos).
  - **Pincel**: aun no configurado fisicamente (`BRUSH_OUTPUT_ENABLED=false`).
- Lienzo objetivo: A4 horizontal (297 x 210 mm), origen del lienzo alineado
  con el frente del brazo.

---

## 0. Pre-flight fisico (antes de enchufar nada)

- [ ] Brazo despejado, sin objetos a menos de 50 cm de su radio de trabajo.
- [ ] Servos firmemente atornillados. Comprueba la union hombro -> codo,
      que es la que mas par recibe.
- [ ] **Fuente externa dedicada de 5 V / >= 3 A** para los servos. Masa
      comun con el ESP32. **No alimentes los servos desde el pin 5 V del
      ESP32**: provocara brown-outs durante strokes.
- [ ] Cableado verificado:
  - BASE -> GPIO 26
  - SHOULDER -> GPIO 25
  - ELBOW -> GPIO 33
  - WRIST -> GPIO 32
- [ ] Cable de senal corto y separado de las lineas de potencia. Si tienes
      ruido EMI, anade ferritas o reduce longitud.
- [ ] Pincel desmontado o sustituido por un peso testigo ligero (< 10 g)
      en el extremo. El servo de pincel sigue deshabilitado por firmware.
- [ ] **Acceso fisico al cable de alimentacion de los servos**. Si algo va
      mal: corta esa alimentacion, no la del ESP32.

### Referencia de posiciones Moodcam

Las posiciones fisicas validadas en el brazo historico estan preservadas en
[`arduino/main/src/legacy_moodcam_pose_reference.h`](../arduino/main/src/legacy_moodcam_pose_reference.h).
Incluyen reposo, cuatro pinturas, agua con agitado de muneca, toalla con
toques y trazos base. Son una referencia de migracion, no una configuracion
ejecutable: no se incluyen en el firmware activo ni se aceptan desde MQTT.

Antes de usar una estacion historica, confirmar mediante `jog` que el
cableado, direccion de giro y limites del brazo final coinciden. Los limites
actuales son mas conservadores que los angulos historicos; no los amplias sin
registrar la validacion fisica correspondiente.

---

## 1. Validacion en modo calibracion

El firmware arranca por defecto en modo calibracion. No requiere reflasheo
si la build actual ya esta cargada.

### 1.1. HOME logico

- [ ] **Alimentacion de servos APAGADA**. Mueve el brazo manualmente a
      HOME (4 servos centrados visualmente ~90 grados).
- [ ] Enciende alimentacion de servos.
- [ ] Desde la web, panel "Robot calibracion": pulsa
      `start_calibration` con `assume_home=true`.
- [ ] Espera la respuesta `joint_state` con `position_known=true`.

### 1.2. Test por servo

Para cada servo, en este orden: **base, shoulder, elbow, wrist**:

- [ ] `jog +/- 1 grado` -> movimiento minimo, sin chirrido. Si chirria,
      para y revisa montaje.
- [ ] `jog +/- 5 grados` -> movimiento limpio.
- [ ] `set_angle` al `minAngle` y al `maxAngle` del rango configurado
      (`duration_ms = 3000`):
  - base: 75 / 115
  - shoulder: 65 / 125
  - elbow: 65 / 125
  - wrist: 70 / 120
- [ ] Verifica **visualmente** que el brazo no encuentra tope mecanico
      antes de alcanzar esos extremos. Si lo hace, anota el angulo real y
      reduce el rango en [arduino/main/src/robot_config.h](../arduino/main/src/robot_config.h) (y en
      [src/lib/armCalibration.js](../src/lib/armCalibration.js) para mantener sincronia con la web).

### 1.3. Release y comprobacion de par estatico

- [ ] `release_servos`.
- [ ] Observa: el brazo debe sostenerse en HOME al menos 3 segundos sin
      desplomarse. Si cae, el par del hombro es insuficiente o la pose
      inicial es inadecuada. **No entres a modo real** hasta resolverlo.

### Gate de paso a real

- Los 4 servos responden al rango completo sin ruidos.
- No hay topes mecanicos dentro del rango configurado.
- El brazo se sostiene en HOME con los servos sueltos.

---

## 2. Habilitar modo real en el firmware

Una sola sesion de flasheo despues de la validacion del paso 1.

En [arduino/main/src/robot_config.h](../arduino/main/src/robot_config.h):

```cpp
#define FINAL_ARM_MODE true
#define FINAL_ARM_EXPLICITLY_CONFIGURED true
```

Mantén `CALIBRATION_MODE=true` y `SAFE_TEST_MODE=true`. Esto hace que el
arranque siga en modo calibracion seguro y que la conmutacion a real se
haga en runtime desde la web, sin nuevos reflasheos.

- [ ] Flashea.
- [ ] En la consola serie verifica:
  - `FINAL_ARM_MODE: true`
  - `operating_mode: calibration`

---

## 3. Primer cambio a modo real

Desde la web:

- [ ] Repite los pasos 1.1 y 1.2 (la calibracion logica es obligatoria
      despues de cualquier reflasheo).
- [ ] Pulsa "Cambiar a modo real" en el panel del robot y confirma el
      doble prompt.
- [ ] Debes ver en el feed:
  - `status: operating_mode_changed mode=real ...`
  - `joint_state` con los angulos actuales (los mismos que dejo
    calibracion; sin saltos).
- [ ] **Test de quietud**: 10 segundos sin enviar comandos. El brazo no
      debe vibrar ni reposicionarse por su cuenta. Si vibra, hay un servo
      con senal inestable -> revisa masa comun y fuente.

---

## 4. Tres movimientos minimos asistidos por script

El script `scripts/real-mode-bringup.mjs` publica los 3 comandos en orden,
espera el ack y el `real_command_executed` del firmware, y pide
confirmacion humana entre paso y paso.

### Ejecucion

```bash
npm run robot:bringup
```

Variables relevantes (leidas de `.env` y de la env):

- `MQTT_URL` o `MQTT_BROKER_URL` (default: `wss://broker.hivemq.com:8884/mqtt`).
- `MQTT_USERNAME`, `MQTT_PASSWORD` (si el broker los requiere).
- `MQTT_DEVICE_ID` o `MOODCAM_DEVICE_ID` (default `device1`).
- `MQTT_ROBOT_COMMAND_TOPIC` (opcional, sobreescribe el calculado por
  `createTopicMap`).

Flags:

- `--device-id <id>` para fijar `deviceId` desde la linea de comandos.
- `--dry-run` para simular el flujo sin publicar comandos reales (util
  para verificar conectividad y suscripciones antes de mover el brazo).

### Comandos publicados

#### 4.1 Punto central, brush arriba (transit)
```json
{
  "type": "move_to_rest",
  "points": [{"x": 148, "y": 105, "z": 35, "brush": 0}],
  "speed": 10,
  "duration_ms": 2000
}
```
**Observa**: movimiento suave de base+hombro+codo+muneca a la pose central.
Sin oscilaciones al final. Tiempo total ~2 s.

#### 4.2 Desplazamiento lateral (base)
```json
{
  "type": "move_to_paint",
  "points": [{"x": 120, "y": 105, "z": 35, "brush": 0}],
  "speed": 10,
  "duration_ms": 2000
}
```
**Observa**: la base gira ~3 grados, el resto apenas cambia.

#### 4.3 Trazo corto (3 puntos en Y)
```json
{
  "type": "stroke",
  "points": [
    {"x": 148, "y": 90,  "z": 20, "brush": 0},
    {"x": 148, "y": 105, "z": 20, "brush": 0},
    {"x": 148, "y": 120, "z": 20, "brush": 0}
  ],
  "speed": 15,
  "duration_ms": 3000
}
```
**Observa**: la base se queda quieta, hombro+codo abren progresivamente,
muneca casi sin moverse. Confirma que durante la ejecucion **sigue
llegando `presence`** del ESP32 (el firmware sirve MQTT entre pasos de
interpolacion gracias al `MotionTickCallback`).

### Gate de exito

- Los 3 comandos completan y publican `real_command_executed`.
- La `presence` MQTT del ESP32 no se interrumpe durante los strokes.
- Sin ruidos nuevos ni calentamiento perceptible.

---

## 5. Diagnostico rapido

| Sintoma | Causa probable | Accion |
|---|---|---|
| Servo zumba sin moverse | Tope mecanico o falta de corriente | Reducir rango en `robot_config.h` o subir amperaje de la fuente |
| Salto brusco al entrar a modo real | Pose interna desincronizada | Repetir `start_calibration` antes de cambiar de modo (el firmware ya sincroniza, este sintoma deberia desaparecer tras el ultimo refactor) |
| Stroke parece interrumpirse a mitad | Brown-out del ESP32 por consumo de servos | Confirmar fuente dedicada y masa comun |
| Muneca chirria en strokes con Z variable | SG90 saturado por velocidad | Reducir `WRIST_REAL_MAX_SPEED` en `main.ino` |
| `real_mode_disabled_in_build` | Build sin `FINAL_ARM_MODE=true` | Reflashear con flags del paso 2 |
| `Movimiento complejo rechazado: FINAL_ARM_MODE no activo o no calibrado.` | `motorsConfigured()` falsa | Comprobar `FINAL_ARM_EXPLICITLY_CONFIGURED=true` y que todos los servos tengan `enabled=true` |
| Borde del A4 inalcanzable | Mapeo lineal con alcance insuficiente | Restringe el area pintable a la zona segura del brazo (futuro: implementar IK real) |
| `payload vacio o demasiado largo` en el log del firmware | Comando con `points` muy grande | Confirmado: `MAX_COMMAND_LENGTH=2048`. Si todavia ocurre, fragmenta el path |

---

## 6. Cuando parar de inmediato

- Cualquier ruido nuevo (clack, ratchet) del hombro o codo.
- Calentamiento perceptible de cualquier servo en menos de 1 minuto.
- Caida de tension visible en el ESP32 (reinicios espontaneos).
- El brazo se queda "rigido" sin responder a `stop`.

En cualquiera de estos casos:

1. **Corta la alimentacion de los servos** (no la del ESP32).
2. Envia `{"type":"stop"}` por MQTT desde la web para limpiar el estado
   logico del firmware.
3. Revisa el log serie y/o el feed MQTT antes de reintentar.

---

## 7. Implementacion tecnica que respalda este protocolo

Los siguientes refactors recientes son los que permiten que el modo real
sea fisicamente seguro con el brazo actual:

- **Base usada en modo real**: `ServoPose` incluye `int base` y
  `mapPointToPose` mapea X del lienzo a la rotacion de la base
  ([arduino/main/main.ino](../arduino/main/main.ino), [arduino/main/src/core/motors.cpp](../arduino/main/src/core/motors.cpp)).
- **Sync de pose en cambio de modo**: `syncPoseToCommandedAngles()`
  alinea la pose interna con los angulos comandados de calibracion para
  evitar saltos al primer movimiento real.
- **Servicio MQTT durante strokes**: `MotionTickCallback` permite que
  `moveToPoseSafe` ceda CPU a `mqttClient.loop()` y `publishPresence()`
  entre pasos de interpolacion.
- **Proteccion SG90 (muneca)**: `WRIST_REAL_MAX_SPEED=12` y
  `WRIST_SIGNIFICANT_DELTA_DEG=5` limitan la velocidad efectiva cuando la
  muneca debe recorrer varios grados.
- **Proteccion del hombro con codo extendido**: penalizacion de
  velocidad cuando `elbow > ELBOW_EXTENSION_THRESHOLD_DEG (110)`.
- **Payload MQTT generoso**: `MAX_COMMAND_LENGTH=2048` evita rechazos
  silenciosos en comandos con arrays `points` largos.
- **Damping de borde y de alcance**: si el punto esta a < 18 mm de
  borde del lienzo, o si la relacion alcance/diagonal del lienzo es
  > 1.08, la velocidad se reduce.

Los limites y rangos de calibracion estan sincronizados entre firmware y
web ([arduino/main/src/robot_config.h](../arduino/main/src/robot_config.h) <-> [src/lib/armCalibration.js](../src/lib/armCalibration.js)).
Si modificas uno, modifica el otro y ejecuta `npm test` antes de
flashear.
