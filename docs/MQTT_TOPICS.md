# Convencion MQTT

Este documento fija la convencion de topics para Web App, AI Bridge, ESP32 y simulador. La fuente tecnica del mapa de topics es `packages/contracts/mqttContract.js`; cualquier topic nuevo debe entrar primero ahi para que web, bridge, scripts y tests compartan el mismo nombre.

## Principios

- Todos los topics operativos incluyen `{deviceId}` como segundo nivel: `{dominio}/{deviceId}/...`.
- El `deviceId` identifica la instalacion o robot logico compartido por Web App, AI Bridge y ESP32.
- Los dominios actuales son `moodcam`, `ai`, `robot` y `system`.
- `presence` significa latido/vida del componente. No debe mezclar estado de negocio.
- `status` significa estado funcional del dominio: estado de app, robot o calibracion.
- `error` concentra fallos operativos que otros componentes deben poder ver.
- Los payloads JSON usan `snake_case` para campos compartidos: `type`, `device_id`, `session_id`, `timestamp`.

## Topics actuales

| Topic | Publica | Consume | QoS | Retain | Uso |
| --- | --- | --- | --- | --- | --- |
| `moodcam/{deviceId}/session/start` | Web App | AI Bridge | 1 | No | Inicio de sesion de captura: artista, movilidad, calibracion y modo conversacion. |
| `moodcam/{deviceId}/emotion/face` | Web App | AI Bridge, ESP32 | 0 | No | Muestras faciales instantaneas. Incluye `trigger: "change"` o `trigger: "heartbeat"`. |
| `moodcam/{deviceId}/session/summary` | Web App | AI Bridge | 1 | No | Resumen final que dispara la decision artistica. |
| `moodcam/{deviceId}/status` | Web App | MQTT Explorer / diagnostico | 1 | Si | Estado online/offline de la Web App via publicacion directa y LWT. |
| `ai/{deviceId}/stroke_plan` | AI Bridge, Web App en modo manual | Web App, smoke scripts | 1 | No | Plan artistico validado. |
| `robot/{deviceId}/command` | AI Bridge, Web App en calibracion/manual | ESP32, simulador, smoke scripts | 1 | No | Comandos artisticos y comandos seguros de calibracion. |
| `robot/{deviceId}/status` | ESP32, simulador | Web App, smoke scripts | 0 | No | Estado funcional del robot y respuestas de calibracion. |
| `system/{deviceId}/error` | AI Bridge, ESP32, simulador | Web App, smoke scripts | 1 para Bridge / 0 para ESP32-sim | No | Errores de sistema, fallback de IA y fallos de robot. |

## Topics de presencia

Estos topics publican latidos periodicos y permiten comprobar vida de componentes en MQTT Explorer.

| Topic | Publica | Frecuencia | QoS | Retain | Uso |
| --- | --- | --- | --- | --- | --- |
| `system/{deviceId}/presence/web` | Web App | 5 s | 0 | Si | Latido de la app navegador. |
| `system/{deviceId}/presence/ai-bridge` | AI Bridge | 5 s | 0 | Si | Latido del proceso Node que decide planes. |
| `system/{deviceId}/presence/esp32` | ESP32 real | 5 s | 0 | Si | Latido del firmware real, con estado WiFi/MQTT. |
| `system/{deviceId}/presence/simulator` | Simulador ESP32 | 5 s | 0 | Si | Latido del simulador local. |

Payload online/heartbeat:

```json
{
  "type": "presence",
  "device_id": "device1",
  "component": "ai-bridge",
  "status": "online",
  "timestamp": 1781690000000,
  "uptime_ms": 123456,
  "interval_ms": 5000
}
```

Payload LWT/offline:

```json
{
  "type": "presence",
  "device_id": "device1",
  "component": "ai-bridge",
  "status": "offline",
  "timestamp": 1781690000000,
  "reason": "lwt"
}
```

Regla de salud: un componente se considera caido si no actualiza su presencia durante 3 intervalos esperados.

## Coherencia a mantener

- No crear topics sin `{deviceId}`.
- No publicar latidos en `robot/{deviceId}/status`; ahi deben quedar estados funcionales del robot.
- No usar `moodcam/{deviceId}/emotion/face` como presencia de la Web App; ese topic representa telemetria emocional.
- Usar `moodcam/{deviceId}/status` como estado online/offline de la Web App y `system/{deviceId}/presence/web` para latido periodico.
- Evitar mezclar comandos artisticos y errores: comandos en `robot/{deviceId}/command`, errores en `system/{deviceId}/error`.