# Arduino / ESP32

Esta carpeta contiene la parte Arduino del proyecto E-motion.

## Sketch oficial actual

El sketch que se debe usar ahora es:

```txt
arduino/main/main.ino
```

Ese sketch implementa la calibracion segura por MQTT.

El sketch de la fase anterior esta archivado en:

```txt
arduino/legacy/serial-painter/main.ino
```

Se conserva solo como referencia.

## Configuracion local

La configuracion de red y MQTT se crea a partir de:

```txt
arduino/main/src/config.example.h
```

Cada ordenador debe crear su propio `config.h`. No guardar credenciales reales en Git.

## Pines, modos y limites

La fuente de verdad esta en:

```txt
arduino/main/src/robot_config.h
```

No cambiar pines, limites ni modos sin una prueba fisica acordada.

## Compilar

Desde la carpeta `project`:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main
```

## Uso seguro actual

El modo actual es calibracion angular. No activar pintura, pincel, poses ni `FINAL_ARM_MODE` hasta completar la calibracion fisica.

Leer antes de conectar o mover el brazo:

```txt
docs/ROBOT_SETUP.md
```