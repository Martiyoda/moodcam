# E-motion MVP: AI Bridge + HiveMQ + ESP32

## Flujo

1. E-motion selecciona pintor, inicia una captura visual y publica `moodcam/{deviceId}/session/start`.
2. Mientras la camara detecta emociones, E-motion publica `moodcam/{deviceId}/emotion/face`.
3. Al terminar la captura, E-motion publica `moodcam/{deviceId}/session/summary`.
4. El AI Bridge escucha HiveMQ, decide el plan con OpenAI si hay `OPENAI_API_KEY`, o usa `artEngine` como fallback.
5. El AI Bridge publica el plan en `ai/{deviceId}/stroke_plan` y la secuencia en `robot/{deviceId}/command`.
6. La ESP32 o el simulador ejecuta comandos y publica `robot/{deviceId}/status`.

## Procesos locales

```bash
npm run dev              # web + backend local
npm run ai:bridge        # AI Bridge MQTT/OpenAI
npm run robot:simulator  # Simulador de receptor ESP32
npm run demo:robot       # AI Bridge + simulador ESP32 en una terminal
npm run demo:session     # Sesion MQTT falsa para smoke test
```

HiveMQ se usa como broker externo recomendado para simplificar la comunicacion entre ordenador, web y ESP32.

## Variables

```bash
OPENAI_API_KEY=
OPENAI_DECISION_MODEL=gpt-4.1-mini
MQTT_DEVICE_ID=device1
MQTT_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_COMMAND_DELAY_MS=60
ESP32_SIMULATOR_DELAY_MS=80
```

El AI Bridge usa un client id MQTT estable derivado del device id: `emotion-ai-bridge-{deviceId}`. Si se arranca dos veces para el mismo device, el broker desconectara una de las sesiones y se evita duplicar decisiones o comandos.

## Topics

| Topic | Publica | Consume |
|---|---|---|
| `moodcam/{deviceId}/session/start` | Moodcam | AI Bridge |
| `moodcam/{deviceId}/emotion/face` | Moodcam | AI Bridge |
| `moodcam/{deviceId}/session/summary` | Moodcam | AI Bridge |
| `ai/{deviceId}/stroke_plan` | AI Bridge | Moodcam |
| `robot/{deviceId}/command` | AI Bridge / Moodcam resend | ESP32 |
| `robot/{deviceId}/status` | ESP32 | Moodcam |
| `system/{deviceId}/error` | AI Bridge | Moodcam |

## Contrato ESP32

El firmware no decide arte. Solo interpreta comandos:

```json
{
  "type": "stroke",
  "plan_id": "plan-123",
  "sequence_index": 4,
  "sequence_total": 20,
  "speed": 70,
  "pressure": 45,
  "paint_id": "yellow",
  "points": [
    { "x": 100, "y": 80, "z": 30, "brush": 0 },
    { "x": 100, "y": 80, "z": 8, "brush": 1 }
  ]
}
```

Estados esperados: `idle`, `loading_paint`, `painting`, `rinsing`, `drying`, `resting`, `error`.

La capa de motores queda abstraída detrás de:

```cpp
moveTo(x, y, z);
setBrush(active);
setSpeed(value);
```

## Voz

La voz queda desacoplada mediante `ConversationMode`:

- `voice_detector`: MVP actual, micrófono + speech-to-text de navegador si está disponible + tono básico.
- `none`: modo solo visual sin micrófono.
- `webrtc`: llamada OpenAI Realtime futura.
- `speech_tts`: voz a texto + TTS futura.
- `predefined`: audios o diálogos cerrados por pintor.

El contrato MQTT ya incluye `conversation_mode` y `voice_summary` para que se pueda añadir voz sin cambiar el flujo principal.
