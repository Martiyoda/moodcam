# Arquitectura E-motion

E-motion tiene cuatro piezas principales:

1. Web: captura camara y voz, muestra la experiencia y publica datos por MQTT.
2. Backend local: crea sesiones OpenAI Realtime cuando se usa voz guiada.
3. AI Bridge: escucha sesiones por HiveMQ y genera un plan artistico con OpenAI o fallback local.
4. Arduino/ESP32: recibe comandos seguros y publica estado o errores.

Los topics y payloads MQTT compartidos estan en `packages/contracts/mqttContract.js`.

## Flujo principal

```txt
Persona
  -> Web E-motion
  -> HiveMQ
  -> AI Bridge
  -> HiveMQ
  -> ESP32 o simulador
```

## Modo recomendado

Para clase y desarrollo, el modo recomendado es local:

```bash
npm run dev
npm run demo:robot
npm run demo:session
```

HiveMQ se mantiene externo para que la web, el ordenador de desarrollo y la ESP32 puedan comunicarse aunque no esten en la misma red local.

## Estado actual del robot

La fase actual es calibracion segura por angulos. El robot todavia no debe pintar.

El sketch actual de Arduino esta en `arduino/main/main.ino`.

La configuracion de pines, modos y limites esta en `arduino/main/src/robot_config.h`.

## Documentos relacionados

- `docs/RUN_LOCAL_AND_DEPLOY.md`: como arrancar el sistema.
- `docs/ROBOT_SETUP.md`: calibracion y seguridad del brazo.
- `docs/FUTURE_HEYGEN_AVATAR.md`: propuesta futura para avatar guiado, fuera del flujo operativo actual.
- `docs/runbooks/README.md`: procedimientos paso a paso.
- `docs/research/README.md`: notas de voz, pintores y contenido creativo.
- `docs/mvp-ai-bridge.md`: topics MQTT y contrato del AI Bridge.
- `packages/contracts/README.md`: contrato compartido MQTT.
- `docs/handoff/CURRENT_STATUS.md`: estado actual de desarrollo.