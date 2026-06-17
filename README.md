# E-motion

Proyecto que transforma emocion detectada en la web en un plan artistico y comandos para un brazo fisico ESP32/Arduino.

## Objetivo operativo

Flujo unico soportado:

Web -> MQTT (HiveMQ) -> AI Bridge -> MQTT -> Brazo fisico

No hay modo simulador ni capa de avatar/video.

## Estructura minima

- src/: interfaz web (camara, emocion, calibracion y control).
- server/: backend local y AI Bridge.
- arduino/main/: firmware del brazo.
- packages/contracts/: contrato MQTT compartido.
- strokes/: recetas artisticas validadas.
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

- OPENAI_API_KEY: clave para generar plan artistico en AI Bridge.
- MQTT_URL: URL websocket del broker MQTT.
- MQTT_DEVICE_ID: identificador unico del dispositivo.
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

1. Seleccionar pintor.
2. Iniciar camara.
3. Iniciar captura emocional.
4. Esperar resumen de emocion.
5. Revisar plan artistico.
6. Enviar plan al brazo.
7. Supervisar estado MQTT y respuesta del robot.

## Contrato MQTT esencial

Topics base por device id:

- moodcam/{deviceId}/session/start
- moodcam/{deviceId}/emotion/face
- moodcam/{deviceId}/session/summary
- ai/{deviceId}/stroke_plan
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
3. Recepcion de plan artistico tras session summary.
4. Brazo responde en robot/{deviceId}/status.

## Troubleshooting rapido

No conecta MQTT:

- Revisar MQTT_URL, credenciales y puerto websocket.
- Verificar que deviceId coincide en todos los componentes.

No llega plan artistico:

- Revisar OPENAI_API_KEY y logs de AI Bridge.
- Confirmar que se publica session/summary.

Brazo no se mueve:

- Revisar alimentacion y puerto serie del ESP32.
- Revisar topic robot/{deviceId}/command y status.
- Ejecutar calibracion antes de pintar.

## Notas de mantenimiento

- Este repositorio mantiene una unica documentacion operativa en este archivo.
- Cualquier cambio de flujo, contrato MQTT o seguridad debe actualizar este README en la misma tarea.
