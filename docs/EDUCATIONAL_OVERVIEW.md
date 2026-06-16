# Guia Educativa

E-motion une emocion, arte y robotica en una experiencia sencilla de explicar:

1. Una persona habla y aparece ante la camara.
2. La web detecta emociones en rostro y voz.
3. El sistema resume la emocion y el pintor elegido.
4. El AI Bridge genera un plan artistico.
5. La ESP32 recibe comandos seguros por MQTT.

## Idea clave

La web no mueve directamente el brazo. La web envia datos; el AI Bridge decide; la ESP32 ejecuta solo comandos permitidos.

## Piezas del proyecto

| Pieza | Que hace |
| --- | --- |
| Web | Camara, voz, seleccion de pintor y panel de calibracion. |
| Backend local | Ayuda a crear sesiones OpenAI cuando se usa voz guiada. |
| HiveMQ | Broker MQTT compartido entre web, bridge y ESP32. |
| AI Bridge | Convierte una sesion emocional en un plan artistico. |
| Arduino/ESP32 | Controla servos y publica estados o errores. |

## Glosario minimo

- MQTT: sistema de mensajes usado para comunicar web, bridge y ESP32.
- HiveMQ: broker MQTT externo recomendado para simplificar conexiones.
- AI Bridge: proceso que escucha emociones y publica planes artisticos.
- Servo: motor que mueve una articulacion del brazo.
- Stroke: receta o trazo artistico aprobado.
- HOME: posicion fisica de referencia del brazo.

## Estado actual

El proyecto esta en fase de calibracion segura. La parte web y el flujo MQTT estan avanzados, pero el brazo real aun debe calibrarse antes de pintar.

La experiencia de voz y los guiones de pintores estan documentados en `docs/research/`.