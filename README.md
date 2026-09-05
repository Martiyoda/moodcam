# Inner Synergy

Proyecto para presentar en la WRO 2026 (categoria Future Innovators) que transforma señales emocionales en una propuesta artistica y comandos seguros para un brazo fisico ESP32/Arduino.

## Vision general del proyecto

Inner Synergy es un sistema de extremo a extremo con tres capas:

1. Capa web (Moodcam y experiencia): analiza emocion facial en navegador, usa voz solo con consentimientos explicitos, publica ventanas de sesion y muestra avatar/chunks/plan.
2. Capa de decision (AI Bridge): recibe ventanas y resumen emocional por MQTT, genera directivas seguras con OpenAI o fallback local y publica chunks/comandos.
3. Capa fisica (ESP32/Arduino): encola y ejecuta movimientos del brazo dentro de limites seguros, reportando estado, profundidad de cola y errores.

El objetivo no es solo detectar emociones, sino convertirlas en una secuencia de acciones fisicas reproducibles y seguras.


## Objetivo operativo

Flujo unico soportado:

Web -> MQTT (HiveMQ) -> AI Bridge -> MQTT -> Brazo fisico

No hay modo simulador que sustituya al brazo fisico. Moodcam es el nombre tecnico del modulo web de captura. La experiencia web incluye un avatar 2D; el avatar 3D queda como mejora futura.

## Como funciona de extremo a extremo

1. El usuario selecciona un pintor y arranca captura emocional en la web.
2. La web publica `session_start`, ventanas `session/window` cada 5 s, `session_end` y mantiene `session_summary` por compatibilidad.
3. AI Bridge consume cada ventana, decide directivas artisticas seguras y genera chunks de trazos sin permitir que OpenAI controle coordenadas fisicas.
4. Cada chunk se publica en MQTT y se traduce en comandos FIFO para el robot.
5. El firmware encola comandos reales, ejecuta uno a uno y publica estado, `queue_depth`, `queue_full` y errores.
6. La web monitoriza estado del sistema en tiempo real.

## Estructura minima

- src/: interfaz web (camara, emocion, calibracion y control).
- server/: backend local y AI Bridge.
- arduino/main/: firmware del brazo.
- packages/contracts/: contrato MQTT compartido.
- examples/: utilidades de prueba por MQTT.

## Requisitos

- Node.js 18+
- npm
- ESP32/Arduino con firmware del proyecto
- Broker MQTT accesible (por defecto HiveMQ)

## Instalacion

1. Entrar en project.
2. Instalar dependencias.
3. Crear entorno local.

Comandos:

npm install
cp .env.example .env

## Variables de entorno clave

- OPENAI_API_KEY: habilita la decision artistica con OpenAI en AI Bridge. Sin ella, el bridge usa fallback local y la captura de voz permanece desactivada.
- OPENAI_DECISION_MODEL: modelo de decision artistica; por defecto `gpt-4.1-mini`.
- OPENAI_REALTIME_MODEL, OPENAI_REALTIME_VOICE y OPENAI_TRANSCRIBE_MODEL: configuracion preparada para conversaciones Realtime; no forman parte del flujo de voz activo.
- MQTT_URL: URL websocket del broker MQTT.
- MQTT_DEVICE_ID: identificador unico del dispositivo; por defecto `device1`.
- MQTT_USERNAME y MQTT_PASSWORD: solo si tu broker las exige.
- MQTT_COMMAND_DELAY_MS: separacion entre comandos enviados al robot.

## Arranque diario

Terminal 1 (web + backend local):

npm run dev

Terminal 2 (AI Bridge):

npm run ai:bridge

Abrir:

http://127.0.0.1:5173

## Flujo de uso

La aplicacion usa una sola pantalla operativa:

1. Confirmar que una persona adulta responsable autoriza la sesion.
2. Seleccionar pintor.
3. Activar camara.
4. Activar voz solo cuando el AI Bridge confirme que OpenAI esta configurado. La transcripcion temporal puede enviarse a OpenAI para orientar la obra; no se envia ni guarda audio o video. Sin voz, la sesion usa solo camara.
5. Iniciar captura emocional.
6. Durante la sesion, la web publica ventanas y AI Bridge genera chunks dinamicos para la obra.
7. Supervisar ultimo chunk, estado MQTT, respuesta del robot y profundidad FIFO.

## Privacidad y consentimiento

- La deteccion facial se procesa en el navegador. MQTT no transporta imagen ni audio.
- Si se activa voz tras los consentimientos requeridos, Moodcam crea una transcripcion temporal. El AI Bridge puede enviar fragmentos recientes a OpenAI para obtener directivas artisticas cuando `OPENAI_API_KEY` esta configurada.
- La aplicacion no conserva imagenes, audio, transcripciones ni resumenes emocionales al terminar la sesion.
- Inner Synergy no diagnostica emociones ni sustituye el acompanamiento profesional.

## Pasos seguidos para crear el proyecto

Esta es la secuencia de implementacion del proyecto completo, desde la base hasta el MVP actual:

1. Definicion del problema y alcance
- Objetivo: transformar emocion en una accion artistica ejecutable por un brazo.
- Restriccion principal: priorizar seguridad fisica y trazabilidad tecnica.

2. Construccion del frontend base
- Se creo la app React para captura de camara, lectura emocional y flujo operativo en una sola pantalla.
- Se integraron modelos de deteccion facial/emocional en navegador.

3. Capa de comunicacion MQTT
- Se definio contrato compartido de topics y payloads.
- Se implemento publicacion desde web y suscripcion de estado del robot.

4. Capa de decision artistica (AI Bridge)
- Se creo backend Node para consumir resumen emocional por MQTT.
- Se implemento decision con OpenAI y fallback seguro en caso de error.

5. Sistema de estilos y recetas
- Se modelaron pintores, estilos y recetas de trazo en JSON.
- Se conecto la seleccion artistica a comandos ejecutables por firmware.

6. Firmware y control de brazo
- Se implemento firmware ESP32/Arduino con comandos de calibracion y ejecucion.
- Se fijaron limites y politicas de seguridad para evitar movimientos peligrosos.

7. Integracion extremo a extremo
- Se conecto web -> bridge -> firmware sobre MQTT con un deviceId comun.
- Se validaron estados, errores y ciclo completo de sesion artistica.

8. Construccion del brazo robotico
- Se diseno y fabrico un brazo robotico mediante impresion 3D.
- El brazo se construyo con 4 articulaciones: base, hombro, codo y muneca.

## Decisiones tecnicas clave

- Contrato MQTT centralizado en packages/contracts para evitar desalineacion entre web, bridge y firmware.
- Device ID como pivote de todos los topics para aislar sesiones/dispositivos.
- Prompt del AI Bridge mantenido como archivo de texto externo para trazabilidad.
- Seguridad del brazo priorizada frente a automatismos agresivos.

## Contrato MQTT esencial

Topics base por device id:

- moodcam/{deviceId}/session/start
- moodcam/{deviceId}/emotion/face
- moodcam/{deviceId}/session/summary
- moodcam/{deviceId}/session/window
- moodcam/{deviceId}/session/end
- ai/{deviceId}/stroke_plan
- ai/{deviceId}/stroke_chunk
- robot/{deviceId}/command
- robot/{deviceId}/status
- system/{deviceId}/error
- moodcam/{deviceId}/status
- system/{deviceId}/presence/web
- system/{deviceId}/presence/ai-bridge
- system/{deviceId}/presence/esp32

Reglas:

- Mantener deviceId consistente entre web, bridge y firmware.
- Publicar JSON valido en snake_case cuando aplique.
- No cambiar topics sin actualizar contrato compartido.
- `robot/{deviceId}/status` puede incluir `queue_depth`, `queue_capacity`, `queue_full` y `queue_executing`; AI Bridge usa esos campos para backpressure.
- La presencia retenida de `system/{deviceId}/presence/ai-bridge` incluye `openai_configured`; la web la usa para habilitar voz solo cuando puede emplearse para la decision artistica.

## Parametros de interfaz que se mantienen

En configuracion web:

- Duracion de captura (session.captureSeconds).
- Confianza minima detector facial.
- Confianza minima emocion.
- Suavizado (activar y factor).
- Ecualizacion y auto-brillo.
- MQTT: activar, URL del broker y device id.
- Panel de calibracion del brazo.

Se han eliminado de la interfaz opciones avanzadas de baja utilidad para operacion normal.

## Seguridad del brazo (obligatorio)

Antes de mover:

1. Confirmar area despejada.
2. Confirmar limites de articulaciones cargados en firmware.
3. Verificar HOME fisico antes de secuencias largas.
4. Usar calibracion incremental (jog) antes de set_angle agresivo.

Durante pruebas:

- No ejecutar movimientos fuera de limites.
- Parar inmediatamente ante ruido, bloqueo o trayectoria anomala.
- Mantener supervision directa del brazo en todo momento.

## Firmware

Firmware activo en:

arduino/main/main.ino

Compilacion orientativa:

arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main

## Scripts disponibles

- npm run dev
- npm run dev:client
- npm run dev:server
- npm run ai:bridge
- npm run demo:session
- npm run test:emotion-bridge
- npm run test:publish-emotion
- npm run test
- npm run lint
- npm run build
- npm run preview

## Pruebas y verificacion

Comprobacion recomendada despues de cambios:

npm run lint
npm run test
npm run build

Verificacion operativa minima:

1. MQTT conectado desde la web.
2. AI Bridge conectado y publicando presencia.
3. Recepcion de chunks dinamicos tras publicar ventanas de sesion.
4. Brazo responde en robot/{deviceId}/status con estado de cola.

## Troubleshooting rapido

No conecta MQTT:

- Revisar MQTT_URL, credenciales y puerto websocket.
- Verificar que deviceId coincide en todos los componentes.

No llegan chunks dinamicos:

- Revisar OPENAI_API_KEY y logs de AI Bridge.
- Confirmar que se publican `session/window` y `session/end`.

Brazo no se mueve:

- Revisar alimentacion y puerto serie del ESP32.
- Revisar topic robot/{deviceId}/command y status.
- Ejecutar calibracion antes de pintar.

## Estado esperado tras arrancar

Checklist rapido:

1. Web disponible en http://127.0.0.1:5173.
2. MQTT en estado conectado desde ajustes.
3. AI Bridge activo y sin errores de credenciales.
4. Llegan mensajes de estado del robot en robot/{deviceId}/status.
5. Durante una sesion, aparecen chunks en ai/{deviceId}/stroke_chunk.
6. La UI muestra ultimo chunk y cola del robot sin requerir una pantalla final de obra.

## Notas de mantenimiento

- [AGENTS.md](AGENTS.md) contiene el contexto para agentes y [docs/real-mode-bringup.md](docs/real-mode-bringup.md) es el protocolo fisico supervisado.
- Cualquier cambio de flujo, consentimiento, contrato MQTT o seguridad debe actualizar la documentacion afectada en la misma tarea.
