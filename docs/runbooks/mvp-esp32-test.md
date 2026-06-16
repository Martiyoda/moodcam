# Prueba MVP: Moodcam + HiveMQ + AI Bridge + ESP32

## Objetivo

Validar el flujo completo antes de conectar motores reales:

```txt
Moodcam web -> HiveMQ -> AI Bridge/OpenAI -> HiveMQ -> ESP32 o simulador
```

La ESP32 no decide arte. Solo recibe comandos normalizados y publica estado.

## Preparacion

1. Instalar dependencias:

```bash
npm install
```

2. Revisar `.env.local`:

```txt
OPENAI_API_KEY=...
MQTT_DEVICE_ID=device1
MQTT_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_ROBOT_COMMAND_TOPIC=robot/test
MQTT_COMMAND_DELAY_MS=60
ESP32_SIMULATOR_DELAY_MS=80
```

3. Si usas una instancia HiveMQ Cloud privada, cambia `MQTT_URL`, `MQTT_USERNAME` y `MQTT_PASSWORD`.

## Prueba sin camara

Terminal 1:

```bash
npm run demo:robot
```

Terminal 2:

```bash
npm run demo:session
```

Resultado esperado:

- `demo:session` muestra `Plan recibido`.
- El simulador muestra llamadas `moveTo(...)`, `setBrush(...)` y `setSpeed(...)`.
- Se publica al menos un `robot/{deviceId}/status`.

## Prueba con web

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run demo:robot
```

En la web:

1. Abrir `http://127.0.0.1:5173`.
2. Abrir configuracion.
3. Activar MQTT y confirmar:
   - broker `wss://broker.hivemq.com:8884/mqtt` o HiveMQ Cloud privado.
   - device id igual al worker, por ejemplo `device1`.
4. Elegir pintor.
5. Iniciar captura.
6. Hablar durante la conversacion.
7. Finalizar o esperar 60 segundos.
8. Confirmar `Plan IA recibido` y `Robot status`.

## Topics a monitorizar

```txt
moodcam/{deviceId}/session/start
moodcam/{deviceId}/emotion/face
moodcam/{deviceId}/session/summary
ai/{deviceId}/stroke_plan
robot/{deviceId}/command
robot/{deviceId}/status
system/{deviceId}/error
```

## Contrato minimo para ESP32

La ESP32 de la prueba actual debe escuchar:

```txt
robot/test
```

Y publicar:

```txt
robot/{deviceId}/status
```

Comando tipo:

```json
{
  "type": "stroke",
  "plan_id": "plan-123",
  "sequence_index": 8,
  "sequence_total": 42,
  "speed": 70,
  "pressure": 45,
  "paint_id": "yellow",
  "points": [
    { "x": 100, "y": 80, "z": 30, "brush": 0 },
    { "x": 100, "y": 80, "z": 8, "brush": 1 }
  ]
}
```

Estados esperados:

```txt
idle
loading_paint
painting
rinsing
drying
resting
error
```

## Seguridad fisica

- Probar primero sin pincel.
- Probar despues con pincel seco.
- Confirmar que A4, pinturas, agua y toalla estan en coordenadas reales.
- Mantener `z.up` suficientemente alto antes de conectar pintura.
- Si un comando sale de limites, la ESP32 debe publicar `error` y no mover motores.

## Pendiente hardware

- Elegir motores finales.
- Decidir driver y cinemática real.
- Mapear coordenadas normalizadas `x/y/z` a pasos o angulos.
- Implementar homing y parada de emergencia.
