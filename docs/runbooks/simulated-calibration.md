# Calibracion Simulada Sin ESP32

Este runbook permite probar el panel de calibracion aunque no tengas placa ESP32 ni brazo robotico.

## Arranque

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run demo:robot
```

Abrir:

```txt
http://127.0.0.1:5173/
```

## Configuracion web

1. Abrir configuracion.
2. Activar MQTT.
3. Usar el broker `wss://broker.hivemq.com:8884/mqtt` o tu HiveMQ Cloud.
4. Confirmar que el estado MQTT aparece conectado.
5. Entrar en el paso `Calibracion`.

## Prueba recomendada

1. Pulsar `Actualizar estado`.
2. Confirmar HOME e iniciar calibracion.
3. Probar `+1°` en Base.
4. Probar `set_angle` en Hombro a 95 grados.
5. Pulsar STOP.
6. Pulsar `Liberar servos`.

## Resultado esperado

- El panel recibe mensajes en `robot/status`.
- La posicion pasa de desconocida a conocida tras iniciar calibracion.
- Los grados cambian como angulos ordenados.
- STOP responde sin necesitar hardware real.
- `release_servos` vuelve a marcar posicion desconocida.

## Limitacion

La simulacion no confirma movimiento fisico real. Solo valida contratos MQTT, UI y flujo de calibracion.