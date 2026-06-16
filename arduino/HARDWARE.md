# Hardware Arduino / ESP32

## Mapa actual

| Articulacion | GPIO | Estado |
| --- | ---: | --- |
| Base | 26 | Calibrable |
| Hombro | 25 | Calibrable |
| Codo | 33 | Calibrable |
| Muneca | 32 | Calibrable |
| Pincel | -1 | Desactivado |

Los limites actuales son provisionales: 80-110 grados con HOME logico en 90.

La fuente de verdad tecnica esta en `arduino/main/src/robot_config.h`.

## Estado de seguridad

El arranque actual deja los servos detached y la posicion fisica como desconocida.

Antes de iniciar calibracion, colocar o confirmar fisicamente HOME.

## Advertencias

- Los angulos mostrados son angulos ordenados, no mediciones reales.
- `release_servos` puede dejar caer partes del brazo por gravedad.
- STOP detiene el movimiento y mantiene los servos activos adjuntos.
- No activar pincel ni pintura durante esta fase.

## Documentacion operativa

El procedimiento completo esta en:

```txt
docs/ROBOT_SETUP.md
```