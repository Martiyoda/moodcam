# START HERE - E-motion

## Que es E-motion

E-motion es un sistema que combina una web de captura emocional, MQTT/HiveMQ, un AI Bridge y un brazo robotico controlado por ESP32. La fase actual esta centrada en calibrar manualmente cada articulacion por angulos ordenados. El robot todavia no pinta ni ejecuta movimientos artisticos.

## Que abrir primero

1. Abre esta carpeta en un editor como Visual Studio Code o Codex.
2. Lee `docs/handoff/CURRENT_STATUS.md`.
3. Revisa `docs/ROBOT_SETUP.md` antes de conectar o mover el brazo.
4. Comprueba la branch y los cambios pendientes antes de editar.

```bash
git branch --show-current
git status
```

La branch esperada en esta entrega es `demo-final-pitch`. El working tree contiene cambios deliberadamente sin commit.

## Instalar dependencias

Requisitos minimos para la web:

- Node.js 20.19 o superior, o Node.js 22.12 o superior.
- npm.
- Un navegador moderno, preferiblemente Chrome.

Desde la raiz del proyecto:

```bash
npm install
```

No se incluye `node_modules`; debe instalarse en el nuevo ordenador.

## Iniciar la web

```bash
npm run dev
```

Abrir:

```text
http://127.0.0.1:5173/
```

El comando inicia Vite y el backend local. El AI Bridge se inicia por separado solo cuando se necesite:

```bash
npm run ai:bridge
```

No iniciar el AI Bridge durante la calibracion fisica del brazo.

## Configuracion local

- `.env.example` es una plantilla sin credenciales.
- `arduino/main/src/config.example.h` es una plantilla sin credenciales.
- `.env`, `.env.local` y `arduino/main/src/config.h` no se incluyen en la transferencia.
- Cada ordenador debe crear sus archivos locales a partir de las plantillas y mantenerlos fuera de Git.

## Estado rapido del robot

| Articulacion | GPIO | Estado |
| --- | ---: | --- |
| Base | 26 | Calibrable |
| Hombro | 25 | Calibrable |
| Codo | 33 | Calibrable |
| Muneca | 32 | Calibrable |
| Pincel | -1 | Desactivado |

```cpp
DEMO_MODE = true
SAFE_TEST_MODE = true
CALIBRATION_MODE = true
FINAL_ARM_MODE = false
```

## Siguiente tarea recomendada

Realizar la calibracion fisica, una articulacion cada vez, desde el panel web. Confirmar HOME fisicamente, encontrar limites mecanicos conservadores y anotar los angulos ordenados. No implementar poses, NVS, pincel ni trazos hasta terminar y validar esta calibracion.

