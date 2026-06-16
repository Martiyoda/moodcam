# TEAM GUIDE - E-motion

## Explicacion sencilla

La web E-motion se conecta a HiveMQ y envia ordenes seguras a una ESP32. El panel de calibracion permite mover base, hombro, codo y muneca sin escribir JSON manualmente. El objetivo inmediato es descubrir los limites fisicos y HOME de cada servo. Todavia no se pinta.

## Primer arranque

```bash
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173/` y entrar en el paso `Calibracion`.

## Que puedes tocar

- Interfaz y textos del panel, manteniendo sus reglas de seguridad.
- Tests de la web, backend y firmware.
- Documentacion.
- Archivos `.example` sin credenciales reales.
- Logs y presentacion del estado MQTT/ESP32.
- Codigo de calibracion solo cuando el cambio este probado y acordado.

## Que no debes tocar sin confirmacion

- Pines: base 26, hombro 25, codo 33 y muneca 32.
- `FINAL_ARM_MODE=false`.
- Limites de servo hasta medirlos fisicamente.
- Pincel, que debe continuar desactivado.
- Trazos artisticos, poses, NVS o cinematica inversa.
- Logica que bloquea `stroke_id`, `base_function`, `emotion_test` y `pose_test` durante calibracion.
- Comportamiento de STOP y `release_servos`.
- Cambios pendientes existentes de otra persona.

## Como trabajar sin romper el proyecto

1. Copia el proyecto al disco; no trabajes desde el pendrive.
2. Comprueba `git branch --show-current` y `git status` antes de editar.
3. Trabaja en `demo-final-pitch` salvo instruccion contraria.
4. No uses `git reset --hard` ni descartes cambios sin revisar.
5. Haz cambios pequenos y ejecuta `npm test` y `npm run build`.
6. Si tocas firmware, compila con:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main
```

7. Para pruebas fisicas, empieza con el brazo sujeto y sin pincel.
8. Coloca fisicamente HOME antes de confirmar HOME en la web.
9. Mueve un grado cada vez cerca de un limite mecanico.
10. STOP mantiene los servos adjuntos; `release_servos` puede dejar caer el brazo.

## Configuracion privada

Crea archivos locales a partir de:

- `.env.example` -> `.env.local` cuando sea necesario.
- `arduino/main/src/config.example.h` -> `arduino/main/src/config.h`.

No subas ni copies credenciales a documentos, commits, capturas o mensajes.

## Comandos utiles

```bash
npm test
npm run build
npm run dev
git branch --show-current
git status
```

El AI Bridge se inicia con `npm run ai:bridge`, pero debe permanecer apagado durante la calibracion fisica.

