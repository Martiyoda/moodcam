## Plan: Reducir tiempo de secado

TL;DR: reducir el secado a 5 ciclos de movimiento con la toalla y usar esperas de 40 ms por medio ciclo. Esto reduce el número de movimientos a la mitad y las pausas explícitas de 60 ms a 40 ms, manteniendo la misma pose para no alterar la cobertura mecánica del cepillo.

**Pasos**
1. En `arduino/main/main.ino`, dentro de `dryMoodcamBrush`, sustituir el número de ciclos actual por una constante específica del secado con valor 5.
2. Sustituir el valor literal de espera de 60 ms por una constante específica del secado con valor 40 ms.
3. Actualizar `tests/firmware_calibration.test.js` para comprobar que la implementación activa usa 5 ciclos y 40 ms, conservando la pose de la toalla.
4. Ejecutar la prueba focalizada de calibración/firmware y, si el proyecto lo permite, el conjunto de tests JavaScript relacionado.
5. Verificar en hardware que el cepillo completa los 5 ciclos sin perder contacto ni dejar residuos; medir el tiempo real porque el cálculo de las esperas explícitas no incluye el movimiento de los servos ni el retorno a HOME.

**Archivos relevantes**
- `arduino/main/main.ino`: dueño del tiempo de secado real, función `dryMoodcamBrush`.
- `tests/firmware_calibration.test.js`: prueba existente de pose, ciclos y secuencia de limpieza/secado.
- `src/lib/artEngine.js` y `server/ai-bridge/providers/artDecisionProvider.js`: solo se revisan para confirmar que no requieren cambios; `dry_brush` no transporta duración.
- `packages/contracts/mqttContract.js`: no se modifica porque el tiempo lo controla el firmware.

**Verificación**
1. Ejecutar el test focalizado de `tests/firmware_calibration.test.js`.
2. Ejecutar el conjunto de tests del proyecto si la prueba focalizada pasa.
3. Hacer una prueba física en el robot y confirmar que los 5 ciclos limpian correctamente y que la reducción de espera no degrada el resultado.

**Decisiones**
- Interpretar la petición actual como 5 ciclos de secado y 40 ms por espera.
- Reducir los ciclos de 10 a 5 cambia el número de movimientos; se acepta porque es una petición explícita.
- No tocar `duration_ms`, `commandDelayMs`, `src` ni `server`; no controlan este secado.
- El tiempo total observado incluirá los movimientos de los servos y el retorno a HOME, por lo que no será igual a una simple suma de pausas.

**Fuera de alcance**
- Parametrizar el secado desde la interfaz web o el AI bridge.
- Cambiar límites genéricos de seguridad o perfiles de movimiento no relacionados.
