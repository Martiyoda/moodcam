# AI Bridge

El AI Bridge conecta las sesiones emocionales de E-motion con un plan artistico.

## Que hace

1. Escucha mensajes de sesion en HiveMQ.
2. Recibe resumen de emociones, voz y pintor elegido.
3. Genera un plan con OpenAI si hay clave configurada.
4. Usa fallback local si no hay clave o si OpenAI falla.
5. Publica el plan, un resumen artistico breve y los comandos para robot o simulador.

## Arranque local

```bash
npm run ai:bridge
```

Para demo completa con simulador:

```bash
npm run demo:robot
```

## Topics principales

| Topic | Uso |
| --- | --- |
| `moodcam/{deviceId}/session/start` | Inicio de sesion. |
| `moodcam/{deviceId}/emotion/face` | Emociones faciales durante la sesion. |
| `moodcam/{deviceId}/session/summary` | Resumen final de sesion. |
| `ai/{deviceId}/stroke_plan` | Plan artistico publicado, incluyendo `summary` y comandos robot. |
| `robot/{deviceId}/command` | Comandos para simulador o robot. |
| `system/{deviceId}/error` | Errores del bridge. |

## Variables habituales

```txt
OPENAI_API_KEY=
OPENAI_DECISION_MODEL=gpt-4.1-mini
MQTT_DEVICE_ID=device1
MQTT_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_USERNAME=
MQTT_PASSWORD=
```

Sin `OPENAI_API_KEY`, el bridge sigue funcionando con fallback local.

El client id MQTT del bridge se deriva del device id como `emotion-ai-bridge-{deviceId}`. Esto hace visible la conexion en el broker y evita dos bridges activos para el mismo robot.

## Resumen publicado

Cada plan incluye `summary` con tres campos para la interfaz final:

```json
{
	"summary": {
		"title": "Alegria en estilo Kandinsky",
		"text": "AI Bridge interpreta alegria con un matiz de sorpresa...",
		"movement": "El brazo trabajara con velocidad 82, presion 52..."
	}
}
```

`artistic_summary` se mantiene como alias del mismo objeto para compatibilidad con pruebas y vistas anteriores.