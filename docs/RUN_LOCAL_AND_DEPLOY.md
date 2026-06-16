# Arranque Local y Despliegue Opcional

El modo principal para este proyecto es local. Es el camino mas sencillo para clase, pruebas y desarrollo.

## Arranque local

Desde la carpeta `project`:

```bash
npm install
npm run dev
```

Abrir:

```txt
http://127.0.0.1:5173/
```

Este comando inicia la web y el backend local usado por la experiencia.

## Demo con AI Bridge y simulador

En una terminal:

```bash
npm run demo:robot
```

En otra terminal:

```bash
npm run demo:session
```

Esto permite probar el flujo por HiveMQ sin conectar la ESP32 real.

El runbook detallado esta en `docs/runbooks/mvp-esp32-test.md`.

Para probar el panel de calibracion sin ESP32, usar `docs/runbooks/simulated-calibration.md`.

## Broker MQTT

Usar HiveMQ como broker externo recomendado.

Ventaja practica: la ESP32 puede conectarse al mismo broker aunque no este en la misma red local que el ordenador.

## ESP32 real

La ESP32 se configura y carga desde `arduino/main`.

Antes de mover servos, leer:

```txt
docs/ROBOT_SETUP.md
```

## Despliegue opcional

La web se puede publicar externamente si se quiere compartir la demo. No es necesario para trabajar en local ni para la calibracion.

Mantener siempre las claves y credenciales fuera del codigo versionado.