# Contracts

Contratos compartidos entre web, server, AI Bridge y simulador.

## MQTT

`mqttContract.js` define:

- Topics MQTT.
- Payloads de sesion y emocion.
- Comandos de calibracion permitidos.
- Secuencias de comandos para robot o simulador.

## Regla

Si cambia un topic o payload, actualizar primero este paquete y despues los tests.

La ruta antigua `src/lib/mqttContract.js` se mantiene como reexport para no romper imports de la web.