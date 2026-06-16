# Server

Esta carpeta contiene la parte backend local de E-motion.

## Piezas principales

| Ruta | Uso |
| --- | --- |
| `index.js` | Backend local usado por `npm run dev`. |
| `ai-bridge/` | Proceso que escucha HiveMQ y publica planes artisticos. |
| `esp32-simulator/` | Simulador para probar sin ESP32 real. |
| `validator.js` | Valida decisiones antes de convertirlas en comandos. |
| `decision_schema.json` | Esquema de decisiones artisticas. |

Los topics y payloads MQTT compartidos viven en `packages/contracts`.

## Comandos

```bash
npm run dev
npm run ai:bridge
npm run robot:simulator
npm run demo:robot
```

## Configuracion

Usar `.env.example` como referencia. No guardar claves reales en Git.

HiveMQ es el broker MQTT recomendado para las demos y pruebas con ESP32.