# E-motion Robot Setup

## Mapa fisico definitivo

| Servo | GPIO | Limites provisionales | HOME logico |
| --- | ---: | ---: | ---: |
| Base | 26 | 80-110 | 90 |
| Hombro | 25 | 80-110 | 90 |
| Codo | 33 | 80-110 | 90 |
| Muneca | 32 | 80-110 | 90 |
| Pincel | -1 | Desactivado | - |

Los grados guardados por el firmware son angulos ordenados. No son una medicion fisica ni confirman que el servo haya alcanzado esa posicion.

## Modos

```cpp
#define DEMO_MODE true
#define SAFE_TEST_MODE true
#define CALIBRATION_MODE true
#define FINAL_ARM_MODE false
```

`CALIBRATION_MODE` solo puede compilar activo junto con `SAFE_TEST_MODE`. Mientras esta activo:

- No se ejecutan `hardware_test`, `emotion_test` ni `pose_test`.
- No se aceptan `stroke_id` ni `base_function`.
- No se ejecutan pincel, trazos, poses o movimientos coordinados.
- Tras cada reinicio todos los servos estan detached y `position_known=false`.

## Topics MQTT

- Comandos: `robot/{deviceId}/command` mediante `TOPIC_ROBOT_COMMAND`.
- Estados: `robot/{deviceId}/status`.
- Errores: `system/{deviceId}/error`.

## Identificadores MQTT

- `MQTT_DEVICE_ID` identifica el robot dentro de los topics funcionales compartidos con la web y el AI Bridge, por ejemplo `robot/{deviceId}/command`.
- `MQTT_CLIENT_ID` identifica solo la conexion ante el broker MQTT. No decide ningun topic funcional y debe ser unico por cliente conectado.
- La convencion del proyecto es derivar el client id como `emotion-{rol}-{deviceId}`. La web y herramientas puntuales anaden un sufijo aleatorio para permitir varias pestanas o ejecuciones simultaneas.

| Cliente | Client id |
| --- | --- |
| ESP32 real | `emotion-esp32-{deviceId}` |
| AI Bridge | `emotion-ai-bridge-{deviceId}` |
| Web | `emotion-web-{deviceId}-{random}` |
| Simulador ESP32 | `emotion-simulator-{deviceId}` |
| Smoke tests y publicadores manuales | `emotion-{rol}-{deviceId}-{random}` |

En el firmware, `MQTT_CLIENT_ID` se deriva de `MQTT_DEVICE_ID`:

```cpp
#define MQTT_DEVICE_ID "device1"
#define MQTT_CLIENT_ID "emotion-esp32-" MQTT_DEVICE_ID
```

## Inicio obligatorio

Antes de enviar `start_calibration`:

1. Coloca o confirma fisicamente todo el brazo en la posicion HOME conocida.
2. Comprueba que hacerlo es seguro y que ningun eje puede caer o golpear la estructura.
3. Envia:

```json
{"type":"start_calibration","assume_home":true}
```

El comando registra 90 grados como referencia logica para cada articulacion y marca `position_known=true`. No hace `attach()` ni `write()`, por lo que no produce movimiento.

No se puede volver a asumir HOME mientras quede algun servo adjunto. Primero debe usarse `release_servos`, recolocar fisicamente el brazo y repetir el inicio.

## Movimiento incremental

```json
{"type":"jog","servo":"base","delta":1}
```

Solo se admiten `-5`, `-1`, `1` y `5`. Si el resultado queda fuera de 80-110, se rechaza sin mover. Cada grado solicitado usa 250 ms, por lo que un jog de 5 grados dura aproximadamente 1250 ms.

## Angulo concreto

```json
{"type":"set_angle","servo":"shoulder","angle":95,"duration_ms":500}
```

- `angle` debe estar dentro de los limites configurados.
- `duration_ms` debe estar entre 200 y 5000.
- Solo se mueve una articulacion por comando.
- La interpolacion es no bloqueante y avanza grado a grado.
- En el primer uso de una articulacion se publica `servo_attaching` antes del `attach()`, indicando servo, GPIO y angulo logico asumido.
- Los servos utilizados permanecen adjuntos para sostener el brazo.

Mientras existe movimiento solo se aceptan `stop` y `get_joint_state`. Cualquier otro comando devuelve `robot_busy` en `system/{deviceId}/error`.

## Consultar estado

```json
{"type":"get_joint_state"}
```

Respuesta de ejemplo:

```json
{
  "status":"joint_state",
  "base":90,
  "shoulder":90,
  "elbow":90,
  "wrist":90,
  "position_known":true,
  "moving":false,
  "angles_are_commanded":true
}
```

## STOP

Por MQTT:

```json
{"type":"stop"}
```

Por Serial:

```text
STOP
```

STOP cancela la interpolacion, conserva el ultimo angulo ordenado y mantiene adjuntos los servos activos para evitar que hombro o codo caigan. No vuelve a HOME.

## Liberar servos

```json
{"type":"release_servos"}
```

Solo se acepta cuando no hay movimiento. Hace `detach()` de todas las articulaciones, marca `position_known=false` y publica una advertencia de posible caida por gravedad.

## Base fisica

- Metacrilato: 42 x 29,7 cm.
- Lienzo A4: 21 x 29,7 cm.
- Zona aproximada del robot: 13 x 13 cm.
- Origen futuro: centro del eje giratorio de la base `(0,0)`.

Estas medidas son solo referencia. Esta fase no implementa coordenadas cartesianas, cinemática inversa ni guardado de poses.

`arduino/main/src/config.h` contiene la configuracion local de red y sigue ignorado por Git.
