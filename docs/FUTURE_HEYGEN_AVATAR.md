# Propuesta futura: avatar guiado con HeyGen

## Estado actual

HeyGen no forma parte de la interfaz operativa actual. La experiencia principal debe funcionar sin videos, avatares ni guiones generados: selecciona un pintor, captura emoción, genera un plan artístico y envía comandos al ESP32.

El material de guion y respuestas por pintor se conserva como referencia creativa, pero no debe aparecer como requisito, estado de sistema ni paso visible del MVP.

## Objetivo de la mejora

La integración con HeyGen podría añadir una capa narrativa para demostraciones: un avatar del pintor elegido guía la conversación, hace una pregunta breve y responde a la emoción detectada antes de que el robot pinte.

Esta capa no debe modificar el contrato emocional ni los comandos del robot. Debe comportarse como presentación opcional sobre el flujo existente.

## Alcance recomendado

1. Mostrar avatar y voz/video sólo en un modo de experiencia extendida.
2. Mantener la captura emocional y el envío al brazo independientes del estado de HeyGen.
3. Usar guiones cortos por pintor y emoción, sin imitar voces o identidades reales.
4. Marcar claramente errores de video como no bloqueantes.
5. Evitar que el panel de estado muestre videos como `OK` si son placeholders.

## Criterios para reactivarlo

- Existe integración real con proveedor de avatar, no sólo placeholders.
- La demo principal ya es comprensible sin esta capa.
- Los tiempos de carga del avatar no interrumpen captura, plan artístico ni movimiento del robot.
- El equipo decide que la experiencia necesita una guía narrativa, no sólo visualización directa de cámara, emoción y brazo.