# Seguimiento del proyecto

Este documento es el registro operativo de Inner Synergy. Cada tarea debe tener un responsable, un criterio de cierre verificable y una fecha de actualización cuando cambie de estado.

## Estados

- `Pendiente`: todavía no iniciada.
- `En curso`: tiene trabajo activo.
- `Bloqueado`: depende de material, hardware, información o una decisión externa.
- `Completado`: dispone de la evidencia indicada en el criterio de cierre.

## Tareas activas

| Estado | Área | Tarea | Criterio de cierre o evidencia | Responsable | Actualización |
| --- | --- | --- | --- | --- | --- |
| Pendiente | Dosier WRO | Completar las fuentes de investigación | Referencias APA simplificadas con autor o entidad, título, URL y fecha de consulta en `Proyecto WRO.md` | Equipo | 2026-07-28 |
| Pendiente | Dosier WRO | Registrar consultas a expertos o docentes | Nombre o función, institución, fecha y tema incorporados en la sección 7.3 | Equipo | 2026-07-28 |
| Pendiente | Dosier WRO | Añadir fotografías y planos reales del prototipo | Material acreditado en la sección 5.6 y anexos | Equipo | 2026-07-28 |
| Pendiente | Validación física | Realizar y registrar una prueba completa de pintura | Registro con configuración, resultado, incidencias y confirmación de seguridad | Martí y Xavi | 2026-07-28 |
| Bloqueado | Firmware | Compilar el firmware para ESP32 | Salida correcta de `arduino-cli compile --fqbn esp32:esp32:esp32 arduino/main` | Martí y Xavi | Requiere `arduino-cli` y entorno ESP32 |
| Pendiente | Calidad | Decidir si se reduce el tamaño del bundle web | División de código aplicada o decisión técnica documentada tras revisar el aviso de Vite | Víctor | 2026-07-28 |
| Pendiente | Pruebas web | Evaluar pruebas de interfaz para consentimiento de voz | Prueba automatizada o decisión documentada de mantener validación manual | Víctor | 2026-07-28 |

## Registro de tareas completadas

| Fecha | Área | Resultado | Evidencia |
| --- | --- | --- | --- |
| 2026-07-28 | Marca | Renombrado público a Inner Synergy sin romper el contrato MQTT heredado | Búsqueda sin referencias a `E-motion` o `e-motion`; se mantienen identificadores técnicos compatibles |
| 2026-07-28 | Privacidad | Consentimiento explícito solo para la voz; la cámara procesa la detección localmente | `src/App.jsx`, `AGENTS.md` y `Proyecto WRO.md` actualizados |
| 2026-07-28 | Integración IA | La voz solo se habilita cuando MQTT está conectado y el AI Bridge anuncia OpenAI configurado | Presencia MQTT `openai_configured` y gating en `src/App.jsx` |
| 2026-07-28 | Validación software | Calidad, pruebas y compilación de producción correctas | `npm run lint`, `npm run test` con 64 pruebas y `npm run build` |

## Forma de actualización

1. Actualizar una fila existente antes de crear una nueva.
2. Cambiar el estado solo cuando exista la evidencia indicada.
3. Añadir incidencias o decisiones relevantes en la descripción de la tarea o en un enlace a la documentación correspondiente.
4. No marcar como completada una prueba física sin registro de la ejecución y supervisión humana.