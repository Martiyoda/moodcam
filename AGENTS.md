# AGENTS.md

Contexto operativo para agentes de IA que trabajen en E-motion. Este archivo complementa al README: aqui van las reglas, mapas mentales y verificaciones que un agente necesita para cambiar el proyecto sin romper el flujo fisico.

## Vision del proyecto

E-motion transforma emocion detectada en navegador en una decision artistica y comandos seguros para un brazo robotico ESP32/Arduino. El flujo soportado es unico:

```text
Web React -> MQTT -> AI Bridge Node -> MQTT -> ESP32/Arduino -> brazo fisico
```

No hay modo simulador que compita con el flujo real. El avatar 2D conversacional forma parte de la experiencia web; el avatar 3D queda como mejora futura. Si necesitas probar sin hardware, usa scripts de smoke/dry-run y fallbacks locales, pero no introduzcas una ruta funcional alternativa que sustituya al brazo fisico.

El objetivo tecnico principal es mantener alineados estos tres mundos:

- Web: captura emocion facial/voz con consentimiento, selecciona pintor, publica ventanas de sesion y muestra avatar, chunks, plan/estado.
- AI Bridge: consume eventos MQTT, decide directivas artisticas con OpenAI cuando hay credenciales y usa fallback local seguro cuando no las hay.
- Firmware: ejecuta calibracion y comandos reales dentro de limites mecanicos, publicando estado, errores y presencia.

## Stack y comandos

- Runtime: Node.js 18+ con ES modules (`"type": "module"`).
- Frontend: React 19 + Vite.
- Backend local: Express para sesiones OpenAI Realtime.
- MQTT: paquete `mqtt`, broker WebSocket por defecto `wss://broker.hivemq.com:8884/mqtt`.
- Firmware: ESP32/Arduino con `PubSubClient` y configuracion local en `arduino/main/src/config.h`.

Comandos principales desde la raiz:

```bash
npm install
npm run dev
npm run dev:client
npm run dev:server
npm run ai:bridge
npm run demo:session
npm run robot:bringup
npm run test:emotion-bridge
npm run test:publish-emotion
npm run lint
npm run test
npm run build
```

Validacion recomendada despues de cambios de codigo JS/React/Node:

```bash
npm run lint
npm run test
npm run build
```

Para cambios acotados, ejecuta primero el test mas cercano y luego amplia si el cambio cruza fronteras. El comando global de tests usa `node --test "src/lib/*.test.js" "server/**/*.test.js" "tests/*.js"`.

Compilacion orientativa del firmware:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main
```

## Variables de entorno

Base local:

```bash
cp .env.example .env
```

El servidor carga `.env.local` y `.env` sin sobreescribir variables ya presentes. Variables clave:

- `OPENAI_API_KEY`: habilita OpenAI en AI Bridge y Realtime API.
- `OPENAI_DECISION_MODEL`: modelo de decision artistica, default `gpt-4.1-mini`.
- `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`, `OPENAI_TRANSCRIBE_MODEL`: conversacion de voz web.
- `MOODCAM_API_PORT`: puerto de Express local, default `8787`.
- `MQTT_URL` o `MQTT_BROKER_URL`: broker MQTT websocket.
- `MQTT_DEVICE_ID` o `MOODCAM_DEVICE_ID`: pivote de todos los topics.
- `MQTT_USERNAME`, `MQTT_PASSWORD`: credenciales opcionales del broker.
- `MQTT_COMMAND_DELAY_MS`: pausa entre comandos publicados al robot, clamp `0..5000`, default `60`.
- Overrides opcionales de topics: `MQTT_SESSION_START_TOPIC`, `MQTT_FACE_EMOTION_TOPIC`, `MQTT_SESSION_SUMMARY_TOPIC`, `MQTT_SESSION_WINDOW_TOPIC`, `MQTT_SESSION_END_TOPIC`, `MQTT_STROKE_PLAN_TOPIC`, `MQTT_STROKE_CHUNK_TOPIC`, `MQTT_ROBOT_COMMAND_TOPIC`, `MQTT_ROBOT_STATUS_TOPIC`, `MQTT_SYSTEM_ERROR_TOPIC`, `MQTT_MOODCAM_STATUS_TOPIC`, `MQTT_WEB_PRESENCE_TOPIC`, `MQTT_BRIDGE_PRESENCE_TOPIC`, `MQTT_ESP32_PRESENCE_TOPIC`.

Nunca escribas secretos reales en archivos versionados. `arduino/main/src/config.h` debe quedarse local; usa `config.example.h` como plantilla.

## Mapa del repositorio

- `src/`: app web React.
- `src/App.jsx`: orquesta una pantalla unica de seleccion de pintor, camara, voz, MQTT, sesion y estado dinamico de chunks.
- `src/hooks/useFaceDetection.js`: deteccion facial/emocional en navegador.
- `src/hooks/useVoiceDetector.js`: captura de voz y fusion emocional.
- `src/hooks/useMqtt.js`: conexion MQTT web, presencia, publicacion de eventos y recepcion de plan/estado/error.
- `src/lib/mqttContract.js`: reexport del contrato compartido para frontend.
- `src/lib/artEngine.js`: generador local de planes, paletas, trazos y comandos de robot.
- `src/lib/voiceEngine.js`: calibracion por defecto y fusion de emociones voz/cara.
- `src/lib/armCalibration.js`: configuracion web de calibracion del brazo.
- `server/index.js`: API local Express para OpenAI Realtime (`/api/health`, `/api/realtime/session`).
- `server/ai-bridge/`: proceso MQTT que decide planes y publica comandos.
- `server/ai-bridge/providers/artDecisionProvider.js`: OpenAI/fallback local para planes artisticos.
- `server/ai-bridge/providers/robotCommandPublisher.js`: publica plan y secuencia de comandos al robot.
- `server/validator.js`, `server/load_strokes.js`, `strokes/`: validador y recetas historicas/auxiliares.
- `packages/contracts/mqttContract.js`: fuente de verdad de topics, payloads, client ids y secuencias de comandos.
- `arduino/main/main.ino`: firmware activo del ESP32.
- `arduino/main/src/robot_config.h`: pines, limites y flags de modo seguro/final.
- `arduino/main/src/config.example.h`: plantilla de WiFi/MQTT para firmware.
- `arduino/main/src/core/`: motores, pincel y seguridad.
- `docs/real-mode-bringup.md`: protocolo fisico para activar y validar modo real.
- `examples/` y `scripts/`: sesiones MQTT, smoke tests y bring-up.

## Contrato MQTT

La fuente de verdad es `packages/contracts/mqttContract.js`. No dupliques strings de topics en nuevos modulos si puedes importar helpers.

Topics por `deviceId` normalizado:

- `moodcam/{deviceId}/session/start`
- `moodcam/{deviceId}/emotion/face`
- `moodcam/{deviceId}/session/summary`
- `moodcam/{deviceId}/session/window`
- `moodcam/{deviceId}/session/end`
- `ai/{deviceId}/stroke_plan`
- `ai/{deviceId}/stroke_chunk`
- `robot/{deviceId}/command`
- `robot/{deviceId}/status`
- `system/{deviceId}/error`
- `moodcam/{deviceId}/status`
- `system/{deviceId}/presence/web`
- `system/{deviceId}/presence/ai-bridge`
- `system/{deviceId}/presence/esp32`

Reglas:

- Mantener el mismo `deviceId` entre web, AI Bridge y firmware.
- Usar JSON valido y campos `snake_case` en payloads MQTT.
- Usar `createTopicMap`, `topicFor`, `createMqttClientId`, `createSessionId`, builders de payload y `createRobotCommandSequence`.
- Si cambias topics, actualiza contrato, README, tests y firmware/configuracion relacionada.
- La web publica presencia retenida cada 5 s; el bridge publica presencia retenida cada 5 s; el firmware publica presencia ESP32 por topic separado.
- El firmware publica `queue_depth`, `queue_capacity`, `queue_full` y `queue_executing` en `robot/status`; el AI Bridge los usa para pausar ventanas cuando la FIFO se llena.

Secuencia de comandos de robot:

```text
paint_sequence_start -> comandos robot_commands[] envueltos con indices -> paint_sequence_end
```

Cada comando envuelto debe conservar `plan_id`, `session_id`, `artist`, `sequence_index`, `sequence_total` y `timestamp`.

## Flujo web

La UI esta centrada en una sesion artistica:

1. Una sola pantalla operativa combina seleccion de pintor, camara, consentimiento de voz, captura y estado de obra dinamica.
2. Camara y voz opcional con consentimiento explicito (`VOICE_CAPTURE_ENABLED = true`, pero el usuario debe activar microfono).
3. Publicacion de `session_start` al iniciar captura.
4. Captura de muestras de cara cada aproximadamente `650 ms` durante la sesion.
5. Publicacion de `session/window` cada `SESSION_WINDOW_MS = 5000`, con resumen de cara, voz si hay consentimiento, transcript delta y receta de pintor.
6. Recepcion de `ai/{deviceId}/stroke_chunk` y visualizacion del ultimo chunk, ventana, comandos y cola de robot en UI.
7. Al finalizar, publicacion de ventana final, `session/end` y `session_summary` compatible.
8. No hay paso final separado para mostrar la obra: la obra se genera por chunks durante la captura.

Notas para agentes frontend:

- No agregues controles avanzados de baja utilidad a la operacion normal si no son imprescindibles.
- Mantener visibles estado MQTT, errores del sistema, ultimo chunk y estado/calibracion del robot.
- La configuracion MQTT de la web se persiste en `localStorage` bajo `moodcam-mqtt-config`.
- Si cambias payloads publicados desde la web, actualiza tests de contrato y el bridge.

## AI Bridge y decision artistica

El AI Bridge se arranca con:

```bash
npm run ai:bridge
```

Comportamiento:

- Se conecta a MQTT con client id `emotion-ai-bridge-{deviceId}`.
- Se suscribe a `session/start`, `emotion/face` y `session/summary`.
- Se suscribe tambien a `session/window`, `session/end` y `robot/status`.
- Recuerda la sesion, ultima ventana, chunks publicados y ultimo estado de robot por `session_id`.
- Al recibir `session_summary`, llama a `decideArtPlan`.
- Al recibir `session/window`, llama a `decideArtChunk`; si `robot/status` indica `queue_full` o `queue_depth` alto, pausa esa ventana y publica error de bridge no-fallback.
- Al recibir `session/end`, publica chunk final de limpieza/reposo.
- Si `OPENAI_API_KEY` existe, pide una decision JSON estructurada a OpenAI Responses API.
- Si falta la key o OpenAI falla/devuelve algo invalido, usa fallback local con `generateArtPlan`.
- Publica el plan en `ai/{deviceId}/stroke_plan` con QoS 1.
- Publica chunks en `ai/{deviceId}/stroke_chunk` con QoS 1.
- Publica todos los comandos en `robot/{deviceId}/command` con QoS 1 y pausa `MQTT_COMMAND_DELAY_MS`.
- Si uso fallback por error, publica `ai_bridge_error` en `system/{deviceId}/error` con `fallback: true`.

La respuesta OpenAI no debe inventar coordenadas fisicas. Solo decide emocion primaria/secundaria, movilidad, colores y directiva de estilo; `artEngine` genera y valida la geometria A4.

## Planes artisticos y pintores

`src/lib/artEngine.js` define emociones, pintores y generacion de trayectorias.

Pintores soportados:

- `kandinsky`: geometria musical.
- `pollock`: accion y salpicadura.
- `rothko`: campos de color.
- `alma-thomas`: patron/mosaico.
- `de-kooning`: gesto intenso.

En la UI de presentacion solo deben mostrarse los cuatro pintores con receta WRO (`kandinsky`, `pollock`, `rothko`, `alma-thomas`). `de-kooning` puede existir como compatibilidad tecnica, pero no debe aparecer en el selector principal.

Emociones soportadas:

- `happy`, `neutral`, `sad`, `angry`, `fear`, `disgust`, `surprise`.

El plan contiene, entre otros campos:

- `id`/`plan_id`, `session_id`, `device_id`.
- `artist`, `artist_name`, `style`.
- `main_emotion`, `secondary_emotion`, `main_emotions`.
- `palette`, `colors`, `speed`, `pressure`, `density`, `randomness`.
- `canvas` A4 horizontal en mm.
- `calibration` con lienzo, Z, descanso, agua, toalla y pinturas.
- `strokes` y `robot_commands`.
- `decision_source`: `openai` o `local_fallback`.
- `summary`/`artistic_summary` para UI.

No cambies la escala de coordenadas sin revisar firmware: el generador proyecta a A4 `297 x 210 mm`, y el firmware valida path dentro de `PATH_MIN/MAX`.

## Firmware y brazo fisico

Firmware activo:

```text
arduino/main/main.ino
```

Principios de seguridad:

- El firmware arranca en modo calibracion si `CALIBRATION_MODE=true`.
- `set_operating_mode` permite cambiar entre `calibration` y `real` en runtime.
- Durante movimiento de calibracion activo solo se permiten `stop`, `get_joint_state` y `set_operating_mode`; otros comandos devuelven `robot_busy`.
- `STOP` detiene movimiento sin detach; `release_servos` detacha y marca posicion desconocida.
- La interpolacion de calibracion es no bloqueante.
- En modo real, `MotionTickCallback` deja servir MQTT/presencia entre pasos de `moveToPoseSafe`.
- En modo real, los comandos se encolan en una FIFO acotada (`REAL_COMMAND_QUEUE_CAPACITY = 8`) y se drenan desde `loop()`, no dentro del callback MQTT.
- `stop` activa parada de emergencia, limpia la FIFO y publica `queue_cleared`; para rearmar, enviar `set_operating_mode` a `real` tras confirmacion humana.
- `MAX_COMMAND_LENGTH` esta en `2048`; no generes arrays de puntos enormes.
- El servo de muneca SG90 tiene protecciones de velocidad; el codo extendido penaliza velocidad.
- El pincel fisico puede estar deshabilitado por configuracion; revisa `robot_config.h` antes de asumir salida real.

Comandos de calibracion permitidos desde web/contrato:

- `start_calibration`
- `jog`
- `set_angle`
- `get_joint_state`
- `stop`
- `release_servos`
- `set_operating_mode`

Comandos reales esperados incluyen tipos generados por `artEngine`, como `move_to_paint`, `dip_paint`, `move_to_water`, `rinse_brush`, `dry_brush`, `stroke` y `move_to_rest`.

Antes de tocar modo real o limites de servo, lee `docs/real-mode-bringup.md`. Cambios de pines, limites, HOME, geometria, servo map o flags finales deben actualizar tambien tests en `tests/firmware_calibration.test.js` y, si aplica, `src/lib/armCalibration.js`.

## Seguridad fisica obligatoria

Trata cualquier comando al robot como potencialmente fisico. Antes de recomendar o ejecutar pruebas con hardware:

- Confirmar area despejada y supervision humana directa.
- Confirmar fuente externa dedicada para servos y masa comun con ESP32.
- Confirmar HOME fisico/logico antes de secuencias largas.
- Usar `jog` incremental antes de `set_angle` agresivo.
- No aumentar rangos, velocidad, presion o densidad sin explicar riesgo y actualizar pruebas.
- Parar ante ruido, bloqueo, calentamiento, brown-out o trayectoria anomala.
- Ante fallo fisico, cortar alimentacion de servos antes que la del ESP32.

No crees automatismos que pasen a modo real o ejecuten pintura completa sin confirmacion humana clara.

## Estilo de codigo

- JavaScript/JSX con ES modules.
- Usar comillas simples y evitar punto y coma, siguiendo el estilo existente.
- Mantener funciones pequenas y helpers puros cuando sea posible.
- No introducir TypeScript salvo que se migre de forma deliberada.
- No duplicar el contrato MQTT en varios sitios.
- Mantener nombres de payload MQTT en `snake_case`.
- Mantener nombres React/componentes en el estilo existente (`PascalCase` para componentes, hooks `use...`).
- Evitar comentarios obvios; agregar comentarios solo para seguridad fisica, decisiones no triviales o limites de hardware.
- No guardar secretos, credenciales WiFi, API keys ni tokens.

ESLint actual:

- Ignora `dist`, `node_modules` y `moodcam-main/**`.
- Aplica `@eslint/js` recomendado y reglas de Vite React Refresh.
- `no-unused-vars` permite variables que empiezan por mayuscula o `_`.
- `react-hooks/set-state-in-effect` esta desactivado.

## Pruebas y validacion por area

Cambios en contrato MQTT:

```bash
npm run test -- src/lib/mqttContract.test.js
npm run test
```

Si el comando anterior no acepta argumento en tu shell/script, usa el comando global `npm run test`.

Cambios en planes artisticos o voz:

```bash
npm run test
npm run build
```

Cambios en AI Bridge:

```bash
npm run test
npm run lint
```

Cambios frontend visuales o de flujo:

```bash
npm run lint
npm run build
```

Cambios firmware/configuracion robot:

```bash
npm run test
arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main
```

Si `arduino-cli` no esta disponible, indica explicitamente que no se pudo compilar firmware y conserva `npm run test` como validacion minima de invariantes estaticas.

## Procedimiento para cambios comunes

### Cambiar topics o payloads MQTT

1. Editar `packages/contracts/mqttContract.js`.
2. Actualizar reexport/consumo en `src/lib/mqttContract.js` si aplica.
3. Actualizar `src/hooks/useMqtt.js`, `server/ai-bridge/config.js` o firmware solo si el contrato lo exige.
4. Actualizar tests de contrato.
5. Actualizar README si cambia el contrato publico.

### Cambiar generacion de arte

1. Editar `src/lib/artEngine.js` o perfiles relacionados.
2. Verificar que `robot_commands` conserva comandos entendidos por firmware.
3. Mantener coordenadas dentro de A4 y puntos razonables para `MAX_COMMAND_LENGTH`.
4. Probar fallback local sin OpenAI.

### Cambiar decision OpenAI

1. Mantener schema estricto en `artDecisionProvider.js`.
2. No permitir que OpenAI controle coordenadas ni comandos directos al robot.
3. Normalizar/clamp de valores antes de generar plan.
4. Mantener fallback local y publicacion de error de bridge.

### Cambiar calibracion o modo real

1. Leer `docs/real-mode-bringup.md` completo.
2. Cambiar firmware y UI/calibracion web en paralelo cuando haya desalineacion.
3. Actualizar `tests/firmware_calibration.test.js`.
4. No ampliar limites sin razon fisica documentada.

## Operacion diaria esperada

Para desarrollo completo:

```bash
npm run dev
npm run ai:bridge
```

Abrir `http://127.0.0.1:5173`.

Estado sano:

- Web disponible.
- MQTT conectado en ajustes.
- AI Bridge online y publicando presencia.
- ESP32 publicando presencia y/o `robot/{deviceId}/status`.
- Tras una sesion, llega plan en `ai/{deviceId}/stroke_plan`.
- El robot recibe comandos en `robot/{deviceId}/command` solo cuando hay supervision.

## Troubleshooting rapido

- MQTT no conecta: revisar URL, protocolo `ws/wss`, puerto, path `/mqtt`, credenciales y `deviceId`.
- No llega plan: revisar `OPENAI_API_KEY`, logs de bridge, publicacion de `session_summary` y coincidencia de `session_id`.
- Hay fallback local: puede ser esperado si no hay key; revisar `system/{deviceId}/error` para razon.
- Brazo no se mueve: revisar alimentacion externa, puerto serie, topic `robot/{deviceId}/command`, modo operativo y calibracion.
- Error `robot_busy`: hay movimiento activo; solo enviar `stop` o esperar `movement_completed`.
- Error por payload largo: reducir puntos por comando o fragmentar trayectoria.

## Reglas para agentes

- Preferir cambios pequenos y verificables.
- No tocar hardware real, limites fisicos o modo real sin preservar rutas de parada y pruebas.
- No introducir dependencias nuevas si el patron existente resuelve el problema.
- No reescribir README o UI completa cuando el cambio sea de contrato/logica.
- Si modificas flujo, contrato MQTT o seguridad del brazo, actualiza README y este archivo en la misma tarea.
- Antes de finalizar, ejecutar la validacion mas cercana posible y reportar cualquier comando que no se pudo correr.