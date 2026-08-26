# Explicacion completa de Inner Synergy

## 1. Que hace el proyecto

Inner Synergy convierte la lectura emocional de una persona en una obra fisica realizada por un brazo robotico ESP32/Arduino.

El flujo principal es:

```text
Persona
  -> Web React / Moodcam
  -> MQTT / HiveMQ
  -> AI Bridge Node
  -> OpenAI o fallback local
  -> artEngine
  -> MQTT
  -> ESP32 / Arduino
  -> Servos y pincel sobre A4
```

La regla mas importante del sistema es:

```text
OpenAI decide la intencion artistica.
artEngine genera la geometria.
El ESP32 valida y ejecuta el movimiento fisico seguro.
```

La vision general y las instrucciones de arranque estan en [README.md](../README.md) y [AGENTS.md](../AGENTS.md).

## 2. Partes del proyecto

| Parte | Responsabilidad | Archivo principal |
| --- | --- | --- |
| Web | Camara, emociones, voz, pintor y estado | [src/App.jsx](../src/App.jsx) |
| Deteccion facial | Analisis local del rostro | [src/hooks/useFaceDetection.js](../src/hooks/useFaceDetection.js) |
| Voz | Analisis de tono, transcripcion y fusion | [src/hooks/useVoiceDetector.js](../src/hooks/useVoiceDetector.js) |
| MQTT web | Conexion, publicacion y suscripcion | [src/hooks/useMqtt.js](../src/hooks/useMqtt.js) |
| Contrato | Topics y estructuras compartidas | [packages/contracts/mqttContract.js](../packages/contracts/mqttContract.js) |
| AI Bridge | Coordina MQTT, OpenAI y robot | [server/ai-bridge/index.js](../server/ai-bridge/index.js) |
| Decision IA | OpenAI, validacion y fallback | [server/ai-bridge/providers/artDecisionProvider.js](../server/ai-bridge/providers/artDecisionProvider.js) |
| Art Engine | Colores, parametros, trazos y comandos | [src/lib/artEngine.js](../src/lib/artEngine.js) |
| Recetas | Limites y reglas de cada pintor | [src/lib/painterRecipes.js](../src/lib/painterRecipes.js) |
| Publicador robot | Convierte un plan en secuencia MQTT | [server/ai-bridge/providers/robotCommandPublisher.js](../server/ai-bridge/providers/robotCommandPublisher.js) |
| Firmware | Cola, seguridad, servos y ejecucion | [arduino/main/main.ino](../arduino/main/main.ino) |
| Configuracion fisica | Pines y limites de servos | [arduino/main/src/robot_config.h](../arduino/main/src/robot_config.h) |

## 3. Arranque

El proyecto usa React 19, Vite, Node.js, Express y MQTT. Los comandos estan en [package.json](../package.json).

```bash
npm install
npm run dev
npm run ai:bridge
```

La web se sirve normalmente en `http://127.0.0.1:5173` y el servidor Express en `http://127.0.0.1:8787`.

Vite redirige `/api` al servidor Express mediante [vite.config.js](../vite.config.js).

Variables importantes:

- `OPENAI_API_KEY`: habilita la decision artistica con OpenAI.
- `OPENAI_DECISION_MODEL`: modelo de decision, por defecto `gpt-4.1-mini`.
- `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE` y `OPENAI_TRANSCRIBE_MODEL`: configuracion de conversacion Realtime.
- `MQTT_URL`: broker MQTT WebSocket.
- `MQTT_DEVICE_ID`: identificador comun de web, bridge y ESP32.
- `MQTT_COMMAND_DELAY_MS`: pausa entre comandos del robot.

## 4. Paso a paso de una sesion

### Paso 1: el usuario selecciona el pintor

La interfaz permite seleccionar uno de estos artistas:

- `kandinsky`: geometria musical.
- `pollock`: accion y salpicadura.
- `rothko`: campos de color.
- `alma-thomas`: patron y mosaico.

La seleccion se guarda en el estado de [src/App.jsx](../src/App.jsx). Los datos descriptivos estan en `ARTISTS`, dentro de [src/lib/artEngine.js](../src/lib/artEngine.js), y las reglas ejecutables estan en [src/lib/painterRecipes.js](../src/lib/painterRecipes.js).

### Paso 2: se prepara la camara

[src/hooks/useFaceDetection.js](../src/hooks/useFaceDetection.js) carga los modelos de [public/models](../public/models) usando `@vladmandic/human`.

Cuando se activa la camara:

1. El navegador solicita permiso.
2. Se obtiene el video con `getUserMedia`.
3. Human detecta un rostro.
4. El modelo devuelve puntuaciones de emocion.
5. Se aplica suavizado exponencial.
6. La UI muestra la emocion dominante.

El procesamiento facial es local. No se envia imagen ni video por MQTT.

Las emociones se convierten a cuatro emociones fisicas en [src/lib/emotionCategories.js](../src/lib/emotionCategories.js):

```text
happy/surprise -> happy -> amarillo
angry/disgust -> angry -> rojo
sad/fear -> sad -> violeta
neutral/calm -> neutral -> azul
```

Una muestra puede ser:

```json
{
  "timestamp": 1760000000000,
  "detection_time": "2026-08-24T12:00:00.000Z",
  "dominant": "happy",
  "emotions": {
    "happy": 0.72,
    "neutral": 0.28
  }
}
```

La web toma muestras aproximadamente cada 650 ms.

### Paso 3: se activa la voz opcional

La voz solo se permite con consentimiento y cuando el AI Bridge publica una presencia con `openai_configured: true`.

[src/hooks/useVoiceDetector.js](../src/hooks/useVoiceDetector.js) analiza localmente:

- Intensidad.
- RMS y pico de audio.
- Si la persona esta hablando.
- Palabras por minuto.
- Transcripcion del navegador.
- Palabras de emocion y color.

Ejemplo de muestra de voz:

```json
{
  "intensity": 64,
  "rms": 0.29,
  "peak": 0.51,
  "speaking": true,
  "words_per_minute": 130,
  "transcript_fragment": "Quiero amarillo y azul",
  "emotions": {
    "happy": 0.55,
    "neutral": 0.35,
    "angry": 0.1
  },
  "colors": ["yellow", "blue"],
  "keywords": ["quiero"]
}
```

[src/lib/voiceEngine.js](../src/lib/voiceEngine.js) fusiona texto y tono. La voz tiene estas reglas principales:

```text
texto: 65 %
tono: 35 %
```

Durante la sesion se puede fusionar despues:

```text
cara: 60 %
voz: 40 %
```

MQTT nunca transporta el audio. Solo puede viajar una transcripcion temporal y sus resumenes.

### Paso 4: se publica `session_start`

Al pulsar iniciar, [src/App.jsx](../src/App.jsx) crea un identificador mediante `createSessionId()` y publica el inicio usando [src/hooks/useMqtt.js](../src/hooks/useMqtt.js).

El constructor esta en [packages/contracts/mqttContract.js](../packages/contracts/mqttContract.js).

Ejemplo:

```json
{
  "type": "session_start",
  "session_id": "session-device1-1760000000000",
  "device_id": "device1",
  "artist_id": "kandinsky",
  "artist_name": "Kandinsky",
  "mobility": 88,
  "conversation_mode": "face_only",
  "calibration": {
    "canvas": {
      "originX": 0,
      "originY": 0,
      "width": 297,
      "height": 210,
      "margin": 12
    },
    "z": {
      "up": 30,
      "paint": 8,
      "dip": 2
    }
  },
  "timestamp": 1760000000000
}
```

### Paso 5: se capturan muestras y se forman ventanas

La sesion por defecto dura 60 segundos. Las ventanas se publican aproximadamente en:

```text
7.5 s, 15 s, 22.5 s, 30 s,
37.5 s, 45 s, 52.5 s y 60 s
```

La planificacion esta en `SESSION_WINDOW_SCHEDULE_MS`, dentro de [src/App.jsx](../src/App.jsx).

Cada ventana solo incluye las muestras nuevas desde la ventana anterior. Se calcula:

- `face_summary`.
- `voice_summary`.
- `combined_summary`.
- `transcript_delta`.
- Pintor y receta.
- Calibracion.
- Movilidad.

El constructor es `buildSessionWindowPayload()` en [packages/contracts/mqttContract.js](../packages/contracts/mqttContract.js).

Ejemplo:

```json
{
  "type": "emotion_window",
  "session_id": "session-device1-1760000000000",
  "device_id": "device1",
  "window_index": 2,
  "window_start_ms": 15000,
  "window_end_ms": 22500,
  "is_final_window": false,
  "artist_id": "pollock",
  "artist_recipe_id": "pollock-wro-v1",
  "artist_recipe_version": "1.0.0",
  "face_samples": [],
  "face_summary": [
    { "emotion": "happy", "percentage": 70 },
    { "emotion": "angry", "percentage": 30 }
  ],
  "voice_samples": [],
  "voice_summary": {
    "main_emotions": [],
    "color_preferences": ["yellow"],
    "keywords": [],
    "sample_count": 0
  },
  "combined_summary": [
    { "emotion": "happy", "percentage": 70 },
    { "emotion": "angry", "percentage": 30 }
  ],
  "transcript_delta": [],
  "calibration": {},
  "mobility": 88,
  "voice_consent": false,
  "conversation_mode": "face_only",
  "timestamp": 1760000000000
}
```

### Paso 6: MQTT transporta los datos

HiveMQ es el broker. Los componentes no se conectan directamente entre si: publican y se suscriben a topics.

La fuente de verdad es [packages/contracts/mqttContract.js](../packages/contracts/mqttContract.js).

Topics principales:

| Topic | Direccion | Contenido |
| --- | --- | --- |
| `moodcam/{deviceId}/session/start` | Web -> Bridge | Inicio de sesion |
| `moodcam/{deviceId}/emotion/face` | Web -> Bridge | Emocion facial reciente |
| `moodcam/{deviceId}/session/window` | Web -> Bridge | Ventana de 5 segundos |
| `moodcam/{deviceId}/session/summary` | Web -> Bridge | Resumen completo |
| `moodcam/{deviceId}/session/end` | Web -> Bridge | Fin de sesion |
| `ai/{deviceId}/stroke_plan` | Bridge -> Web | Plan global |
| `ai/{deviceId}/stroke_chunk` | Bridge -> Web | Resultado de una ventana |
| `robot/{deviceId}/command` | Bridge -> ESP32 | Comando fisico |
| `robot/{deviceId}/status` | ESP32 -> Bridge/Web | Estado y cola |
| `system/{deviceId}/error` | Bridge/ESP32 -> Web | Error o advertencia |
| `system/{deviceId}/presence/web` | Web -> Broker | Presencia web |
| `system/{deviceId}/presence/ai-bridge` | Bridge -> Broker | Presencia del bridge |
| `system/{deviceId}/presence/esp32` | ESP32 -> Broker | Presencia del robot |

`deviceId` debe ser igual en web, AI Bridge y firmware. Asi se evita mezclar dos brazos o dos sesiones.

### Paso 7: el AI Bridge recibe la ventana

El proceso esta en [server/ai-bridge/index.js](../server/ai-bridge/index.js).

Al conectarse:

1. Se conecta a MQTT.
2. Publica presencia retenida cada 5 segundos.
3. Indica `openai_configured`.
4. Se suscribe a inicio, emociones, ventanas, resumen, fin y estado del robot.
5. Guarda temporalmente la informacion de cada sesion.

Al recibir `session/window`:

1. Recupera artista y receta.
2. Calcula las emociones principales.
3. Comprueba la capacidad de la cola del robot.
4. Llama a OpenAI si hay API key.
5. Si no hay key o la respuesta falla, usa fallback local.
6. Genera un chunk con `generateArtChunk()`.
7. Publica el chunk.
8. Publica los comandos al ESP32.

Al recibir `session/summary`, genera el plan global con `generateArtPlan()`.

Al recibir `session/end`, genera el chunk final de limpieza, secado y reposo.

### Paso 8: OpenAI decide la intencion, no las coordenadas

La decision artistica esta en [server/ai-bridge/providers/artDecisionProvider.js](../server/ai-bridge/providers/artDecisionProvider.js).

OpenAI recibe JSON procesado con:

- Artista.
- Emociones.
- Preferencias de color.
- Palabras clave.
- Transcripcion reciente.
- Movilidad.
- Receta del artista.

La peticion usa `https://api.openai.com/v1/responses` y un esquema JSON estricto.

Para un plan global, OpenAI devuelve:

```json
{
  "primary_emotion": "happy",
  "secondary_emotion": "angry",
  "mobility": 88,
  "color_preferences": ["yellow", "red"],
  "style_directive": "Usar energia y contraste con trazos seguros."
}
```

Para un chunk devuelve:

```json
{
  "primary_emotion": "angry",
  "secondary_emotion": "happy",
  "mobility": 90,
  "palette_slots": ["red", "yellow"],
  "gestures": ["flick", "loop"],
  "randomness": 75,
  "style_directive": "Aumentar el gesto y mantener ritmo diagonal."
}
```

OpenAI no puede crear:

- Coordenadas.
- Puntos fisicos.
- Angulos de servos.
- Comandos arbitrarios.

La respuesta se normaliza y filtra en `normalizeDecision()` y `normalizeChunkDecision()`.

Por ejemplo, un gesto no incluido en la receta se elimina. Los colores se limitan a los cuatro colores fisicos.

### Paso 9: fallback local

Si `OPENAI_API_KEY` no existe o OpenAI devuelve una respuesta invalida, el bridge usa el motor local:

```text
generateArtPlan()
generateArtChunk()
```

El resultado se marca con:

```json
{
  "decision_source": "local_fallback"
}
```

Tambien se publica una advertencia en `system/{deviceId}/error`:

```json
{
  "type": "ai_bridge_error",
  "severity": "warning",
  "fallback": true,
  "message": "OPENAI_API_KEY no configurada."
}
```

Por tanto, OpenAI mejora la decision, pero el sistema sigue pudiendo generar una obra sin OpenAI.

## 5. OpenAI Realtime y la conversacion

Esta es una integracion separada de la decision artistica.

Los archivos son:

- [server/index.js](../server/index.js)
- [src/hooks/useRealtimePainter.js](../src/hooks/useRealtimePainter.js)
- [src/lib/conversationModes.js](../src/lib/conversationModes.js)

El navegador crea una conexion WebRTC y obtiene una oferta SDP. Despues envia:

```text
POST /api/realtime/session?artist=kandinsky
```

El servidor Express:

1. Comprueba `OPENAI_API_KEY`.
2. Recibe el SDP del navegador.
3. Selecciona las instrucciones del artista.
4. Crea una sesion Realtime con OpenAI.
5. Devuelve la respuesta SDP.

La sesion Realtime puede hablar en español, hacer preguntas breves y actuar como guia artistico. No debe dar instrucciones tecnicas al robot.

La ruta normal de captura de `App.jsx` utiliza actualmente `useVoiceDetector`; `useRealtimePainter` prepara la conversacion Realtime en vivo.

## 6. Recetas de pintores

Las recetas estan en [src/lib/painterRecipes.js](../src/lib/painterRecipes.js).

Cada receta contiene:

- Identificador y version.
- Artista y estilo.
- Gestos permitidos.
- Zonas preferidas.
- Rangos de densidad, velocidad y presion.
- Reglas de color por emocion.
- Estrategia de limpieza.
- Limites de payload y puntos.

Los colores fisicos son:

```json
[
  { "id": "blue", "label": "Azul", "hex": "#2563eb" },
  { "id": "violet", "label": "Violeta", "hex": "#7c3aed" },
  { "id": "red", "label": "Rojo", "hex": "#dc2626" },
  { "id": "yellow", "label": "Amarillo", "hex": "#facc15" }
]
```

### Kandinsky

```json
{
  "style": "geometric",
  "allowed_gestures": ["circle", "triangle", "line", "arc", "spiral", "open_arc"],
  "preferred_zones": ["center", "upper_left", "lower_right"],
  "density_range": [35, 75],
  "speed_range": [35, 78],
  "pressure_range": [28, 58]
}
```

Usa formas geometricas y cambios de color controlados.

### Pollock

```json
{
  "style": "action",
  "allowed_gestures": ["splatter", "flick", "loop", "drip", "broken_line"],
  "preferred_zones": ["full_canvas", "diagonal_path"],
  "density_range": [55, 90],
  "speed_range": [55, 90],
  "pressure_range": [24, 52]
}
```

Permite mas aleatoriedad, densidad y movimiento.

### Rothko

```json
{
  "style": "field",
  "allowed_gestures": ["block", "wash", "horizon", "soft_edge"],
  "preferred_zones": ["upper_band", "center_band", "lower_band"],
  "density_range": [20, 50],
  "speed_range": [22, 55],
  "pressure_range": [35, 62]
}
```

Usa bloques lentos y amplios.

### Alma Thomas

```json
{
  "style": "mosaic",
  "allowed_gestures": ["dash", "mosaic", "short_arc", "column", "ring"],
  "preferred_zones": ["columns", "radial_pattern", "center"],
  "density_range": [45, 82],
  "speed_range": [34, 68],
  "pressure_range": [28, 50]
}
```

Usa pinceladas repetidas, columnas y patrones.

`getRecipeColorsForEmotion()` obtiene los colores de la receta para una emocion. `recipeToPromptContext()` crea la version reducida que se envia a OpenAI.

## 7. Como funciona artEngine

El motor esta en [src/lib/artEngine.js](../src/lib/artEngine.js).

### `generateArtPlan()`

Genera un plan global a partir de:

```js
{
  mainEmotions,
  artistId,
  mobility,
  calibration,
  colorPreferences,
  voiceSummary
}
```

El proceso es:

1. Obtener el artista.
2. Obtener los dos perfiles emocionales principales.
3. Obtener la receta.
4. Obtener colores fisicos validos.
5. Seleccionar una paleta.
6. Calcular velocidad.
7. Calcular presion.
8. Calcular densidad.
9. Calcular aleatoriedad.
10. Seleccionar formas.
11. Crear trazos.
12. Proyectar los puntos al A4.
13. Crear comandos del robot.

Las formulas combinan emocion, artista y movilidad:

```text
velocidad = emocion * 45 % + artista * 35 % + movilidad * 20 %
presion = emocion * 55 % + artista * 45 %
densidad = emocion * 45 % + artista * 35 % + movilidad * 20 %
aleatoriedad = emocion * 45 % + artista * 35 % + movilidad * 20 %
```

El plan completo tiene como maximo 8 trazos porque:

```js
MAX_SESSION_STROKES = 8
```

### `generateArtChunk()`

Genera la parte correspondiente a una ventana. Normalmente produce un trazo y comprueba cuantos trazos se han completado.

Tambien respeta:

- `max_points_per_stroke`.
- Gestos permitidos.
- Colores fisicos.
- Rangos de la receta.
- Presupuesto maximo de trazos.
- Semilla determinista.

Los chunks intermedios no terminan en reposo ni limpian siempre el pincel, porque la obra continua en la ventana siguiente.

### Generacion de puntos

El espacio logico inicial mide:

```text
220 x 160
```

Formas implementadas:

- `circle`: puntos circulares.
- `spiral`: espiral.
- `triangle`: poligono triangular.
- `arc` y `open_arc`: arcos.
- `block`, `wash`, `horizon`: barridos rectangulares.
- `dash`, `mosaic`, `column`, `ring`: patrones cortos.
- `splatter`, `flick`, `loop`, `drip`: accion irregular.
- `gesture`, `curve`, `broken_line`: recorrido gestual.

Un trazo empieza con el pincel arriba, baja durante la pintura y vuelve a subir:

```json
[
  { "x": 80, "y": 50, "z": 28, "brush": 0 },
  { "x": 80, "y": 50, "z": 8, "brush": 1 },
  { "x": 120, "y": 80, "z": 8, "brush": 1 },
  { "x": 120, "y": 80, "z": 28, "brush": 0 }
]
```

Despues `projectPointToCanvas()` convierte el espacio logico al A4 calibrado:

```text
220 x 160 -> 297 x 210 mm
```

Los margenes, origen y alturas Z proceden de la calibracion.

## 8. Estructura de un plan

Un plan global contiene datos artisticos, geometria y comandos:

```json
{
  "type": "stroke_plan",
  "id": "plan-1760000000000",
  "plan_id": "plan-1760000000000",
  "session_id": "session-device1-1760000000000",
  "device_id": "device1",
  "artist": "kandinsky",
  "artist_name": "Kandinsky",
  "style": "geometric",
  "main_emotion": "happy",
  "secondary_emotion": "neutral",
  "colors": ["yellow", "blue"],
  "palette": [
    { "name": "yellow", "hex": "#facc15", "paint_id": "yellow" }
  ],
  "speed": 65,
  "pressure": 42,
  "density": 60,
  "randomness": 35,
  "canvas": {
    "width": 297,
    "height": 210,
    "unit": "mm",
    "orientation": "horizontal-a4"
  },
  "strokes": [],
  "robot_commands": [],
  "decision_source": "openai",
  "validated_by": "artEngine"
}
```

`validated_by: "artEngine"` documenta que la geometria fue generada y validada localmente, no inventada por OpenAI.

Un chunk se publica mediante `buildStrokeChunkPayload()` y contiene, entre otros campos:

```json
{
  "type": "stroke_chunk",
  "session_id": "session-device1-1760000000000",
  "device_id": "device1",
  "chunk_id": "session-device1-1760000000000-window-2-chunk-1",
  "window_index": 2,
  "chunk_index": 1,
  "chunk_total": 1,
  "artist_id": "kandinsky",
  "decision_source": "openai",
  "directives": {
    "palette_slots": ["yellow", "blue"],
    "gestures": ["circle"],
    "randomness": 40
  },
  "robot_commands": [],
  "command_count": 0,
  "summary": {}
}
```

## 9. De plan a comandos MQTT

[server/ai-bridge/providers/robotCommandPublisher.js](../server/ai-bridge/providers/robotCommandPublisher.js) utiliza `createRobotCommandSequence()` del contrato compartido.

La secuencia se envuelve con:

```text
paint_sequence_start
comandos del plan
paint_sequence_end
```

Cada comando conserva:

- `plan_id`.
- `session_id`.
- Artista.
- `chunk_id`.
- Indice de secuencia.
- Total de comandos.
- Timestamp.

Ejemplo de trazo:

```json
{
  "type": "stroke",
  "plan_id": "plan-123",
  "session_id": "session-device1-123",
  "artist": "kandinsky",
  "sequence_index": 3,
  "sequence_total": 8,
  "paint_id": "yellow",
  "speed": 60,
  "pressure": 40,
  "points": [
    { "x": 100, "y": 80, "z": 30, "brush": 0 },
    { "x": 110, "y": 90, "z": 8, "brush": 1 },
    { "x": 130, "y": 100, "z": 8, "brush": 1 },
    { "x": 130, "y": 100, "z": 30, "brush": 0 }
  ]
}
```

El bridge publica el plan o chunk en su topic AI y cada comando en `robot/{deviceId}/command`, normalmente con QoS 1.

## 10. Limpieza y secado del pincel

El secado actual se refiere al pincel, no al papel.

Cuando cambia el color:

1. El brazo va al agua.
2. Agita el pincel.
3. Vuelve a subir.
4. Va a la toalla.
5. Realiza movimientos de secado.
6. Carga la pintura nueva.

Al cerrar la sesion:

1. Enjuaga el pincel.
2. Lo seca en la toalla.
3. Lleva el brazo a reposo.

La logica de alto nivel esta en `createRobotCommands()`, `createBrushCleaningCommands()`, `createWaterCommands()` y `createTowelCommands()` de [src/lib/artEngine.js](../src/lib/artEngine.js).

La ejecucion fisica esta en `rinseMoodcamBrush()`, `dryMoodcamBrush()`, `loadMoodcamPaint()` y `executeMoodcamStationCommand()` de [arduino/main/main.ino](../arduino/main/main.ino).

El firmware usa actualmente:

```text
WATER_SHAKE_REPETITIONS = 7
DRY_TOWEL_REPETITIONS = 5
```

En chunks intermedios se desactiva la limpieza final para que la obra continue. El chunk de `session_end` siempre incluye limpieza, secado y reposo.

## 11. Firmware y brazo

El firmware activo esta en [arduino/main/main.ino](../arduino/main/main.ino).

Tiene dos modos:

```text
calibration
real
```

### Modo calibracion

Permite:

- `start_calibration`.
- `jog`.
- `set_angle`.
- `get_joint_state`.
- `stop`.
- `release_servos`.
- `set_operating_mode`.

Exige confirmar fisicamente HOME antes de mover y limita los incrementos de `jog`.

### Modo real

Acepta comandos como:

- `paint_sequence_start`.
- `paint_sequence_end`.
- `move_to_paint`.
- `dip_paint`.
- `move_to_water`.
- `rinse_brush`.
- `move_to_towel`.
- `dry_brush`.
- `move_to_rest`.
- `stroke`.

El firmware recibe JSON, comprueba el tipo, valida puntos, mete el comando en una FIFO y lo ejecuta desde `loop()`.

### Limites

Los limites de los servos estan en [arduino/main/src/robot_config.h](../arduino/main/src/robot_config.h):

```text
base:     0..180
shoulder: 60..165
elbow:    35..150
wrist:    0..120
```

Los puntos del lienzo se validan en:

```text
X: 0..297 mm
Y: 0..210 mm
Z: 0..35 mm
```

El firmware rechaza coordenadas invalidas, comandos desconocidos, comandos de obra en calibracion, movimientos fuera de rango y colas llenas.

Para la puesta en marcha fisica hay que seguir [docs/real-mode-bringup.md](real-mode-bringup.md).

## 12. Cola y estados

El robot publica estados como:

```json
{
  "status": "queued",
  "command_type": "stroke",
  "queue_depth": 5,
  "queue_capacity": 32,
  "queue_full": false,
  "queue_executing": true
}
```

El AI Bridge observa esos estados para aplicar backpressure. Antes de publicar mas comandos espera a que exista capacidad.

Si se recibe `stop`:

1. Se detiene el movimiento.
2. Se limpia la FIFO.
3. Se publica `queue_cleared`.
4. Se mantiene la parada de emergencia hasta rearmar con confirmacion.

La web recibe estados, chunks, planes y errores en [src/hooks/useMqtt.js](../src/hooks/useMqtt.js).

## 13. Final de sesion

Cuando termina la captura:

1. La web publica la ventana final.
2. Publica `session_summary`.
3. Publica `session_end`.
4. El bridge crea un chunk final.
5. El robot limpia el pincel.
6. El robot lo seca.
7. El brazo vuelve a reposo.

Ejemplo de `session_end`:

```json
{
  "type": "session_end",
  "session_id": "session-device1-1760000000000",
  "device_id": "device1",
  "artist_id": "kandinsky",
  "total_windows": 8,
  "duration_ms": 60000,
  "reason": "completed",
  "mobility": 88
}
```

El chunk final se crea en `createSessionEndChunk()` de [server/ai-bridge/providers/artDecisionProvider.js](../server/ai-bridge/providers/artDecisionProvider.js):

```json
{
  "chunk_id": "session-device1-1760000000000-session-end",
  "close_session": true,
  "robot_commands": [
    { "type": "move_to_water" },
    { "type": "rinse_brush" },
    { "type": "move_to_towel" },
    { "type": "dry_brush" },
    { "type": "move_to_rest" }
  ]
}
```

## 14. Contratos JSON disponibles

Los constructores y validadores estan centralizados en [packages/contracts/mqttContract.js](../packages/contracts/mqttContract.js):

- `buildSessionStartPayload()`.
- `buildFaceEmotionPayload()`.
- `buildSessionSummaryPayload()`.
- `buildSessionWindowPayload()`.
- `buildSessionEndPayload()`.
- `buildStrokeChunkPayload()`.
- `wrapRobotCommand()`.
- `createRobotCommandSequence()`.
- `parseJsonMessage()`.

Esto evita que web, bridge y firmware utilicen nombres o topics distintos.

Los tests de contrato estan en [src/lib/mqttContract.test.js](../src/lib/mqttContract.test.js), los tests de decisiones en [server/ai-bridge/artDecisionProvider.test.js](../server/ai-bridge/artDecisionProvider.test.js), y las pruebas de firmware en [tests/firmware_calibration.test.js](../tests/firmware_calibration.test.js).

## 15. Pruebas y smoke tests

Comandos recomendados:

```bash
npm run lint
npm run test
npm run build
```

Para probar MQTT y el bridge sin una sesion completa se puede usar:

```bash
npm run demo:session
```

El script correspondiente esta en [scripts/mqtt-smoke-session.mjs](../scripts/mqtt-smoke-session.mjs). Publica una sesion de demostracion y verifica que aparecen plan, comandos y estado.

Para la puesta en marcha real existe:

```bash
npm run robot:bringup
```

El protocolo seguro esta en [docs/real-mode-bringup.md](real-mode-bringup.md).

## 16. Mapa rapido: donde buscar cada cosa

| Necesidad | Archivo |
| --- | --- |
| Pantalla principal y ciclo de sesion | [src/App.jsx](../src/App.jsx) |
| Camara y modelos faciales | [src/hooks/useFaceDetection.js](../src/hooks/useFaceDetection.js) |
| Fusion emocional | [src/lib/emotionCategories.js](../src/lib/emotionCategories.js) y [src/lib/voiceEngine.js](../src/lib/voiceEngine.js) |
| Voz y transcripcion | [src/hooks/useVoiceDetector.js](../src/hooks/useVoiceDetector.js) |
| Conexion MQTT de la web | [src/hooks/useMqtt.js](../src/hooks/useMqtt.js) |
| Topics y JSON MQTT | [packages/contracts/mqttContract.js](../packages/contracts/mqttContract.js) |
| Conexion MQTT del bridge | [server/ai-bridge/index.js](../server/ai-bridge/index.js) |
| Configuracion del bridge | [server/ai-bridge/config.js](../server/ai-bridge/config.js) |
| Decision OpenAI y fallback | [server/ai-bridge/providers/artDecisionProvider.js](../server/ai-bridge/providers/artDecisionProvider.js) |
| Publicacion de comandos | [server/ai-bridge/providers/robotCommandPublisher.js](../server/ai-bridge/providers/robotCommandPublisher.js) |
| Conversacion OpenAI Realtime | [server/index.js](../server/index.js) y [src/hooks/useRealtimePainter.js](../src/hooks/useRealtimePainter.js) |
| Perfiles de emociones, pintores y geometria | [src/lib/artEngine.js](../src/lib/artEngine.js) |
| Recetas y colores fisicos | [src/lib/painterRecipes.js](../src/lib/painterRecipes.js) |
| Calibracion web | [src/lib/armCalibration.js](../src/lib/armCalibration.js) |
| Firmware activo | [arduino/main/main.ino](../arduino/main/main.ino) |
| Pines y limites de servos | [arduino/main/src/robot_config.h](../arduino/main/src/robot_config.h) |
| Configuracion WiFi/MQTT del ESP32 | [arduino/main/src/config.example.h](../arduino/main/src/config.example.h) |
| Protocolo fisico | [docs/real-mode-bringup.md](real-mode-bringup.md) |
| Documentacion de arquitectura WRO | [docs/Proyecto WRO.md](Proyecto%20WRO.md) |

## 17. Resumen en una frase por componente

- **Web:** detecta y resume emociones, selecciona artista y publica ventanas.
- **MQTT/HiveMQ:** transporta JSON entre componentes.
- **OpenAI:** propone la intencion artistica dentro de un esquema limitado.
- **AI Bridge:** coordina decisiones, validacion, fallback y publicacion.
- **Recetas:** limitan colores, gestos, rangos y volumen de cada pintor.
- **artEngine:** transforma directivas en trazos A4 y comandos seguros.
- **ESP32:** valida, encola y ejecuta los movimientos reales.
- **Limpieza:** enjuaga y seca el pincel al cambiar de color o terminar.
- **Estado:** vuelve desde robot al bridge y a la web para mostrar cola, errores y presencia.
