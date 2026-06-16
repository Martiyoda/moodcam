# Future Final Arm

## Estado actual

La calibracion actual solo descubre limites y referencias mediante grados ordenados de cada servo:

- Base: GPIO 26.
- Hombro: GPIO 25.
- Codo: GPIO 33.
- Muneca: GPIO 32.
- Pincel: sin pin y desactivado.

No hay persistencia NVS, coordenadas, cinematica inversa, poses guardadas ni movimiento coordinado.

## Referencia fisica futura

- Base de metacrilato: 42 x 29,7 cm.
- Lienzo A4: 21 x 29,7 cm.
- Zona del robot: aproximadamente 13 x 13 cm.
- Origen futuro: centro del eje giratorio de la base `(0,0)`.

Las posiciones se obtendran primero calibrando manualmente grados de servos. Las futuras poses previstas son HOME, REST, centro y esquinas del lienzo, pinturas, agua, limpieza y secado del pincel. Ninguna se implementa en esta fase.

## Antes del brazo completo

1. Validar cada articulacion con `jog` y `set_angle`.
2. Registrar limites mecanicos reales y HOME sin tension.
3. Ajustar `min_angle`, `max_angle`, `home_angle` y `safe_speed`.
4. Implementar y validar poses sin pincel ni pintura.
5. Anadir persistencia solo despues de estabilizar el formato de calibracion.
6. Montar y calibrar el pincel por separado.
7. Probar movimientos coordinados sin pintura.
8. Mantener `FINAL_ARM_MODE=false` hasta completar todas las pruebas.

## Flujo futuro

```text
moodcam/{deviceId}/emotion/face
-> AI Bridge decide stroke_id
-> validator.js valida stroke_id
-> robot/{deviceId}/command
-> ESP32 ejecuta solo con FINAL_ARM_MODE activo y calibracion explicita
```

En la fase actual `stroke_id`, `base_function`, pincel y trazos artisticos permanecen bloqueados.
