# Examples

Esta carpeta contiene ejemplos y pruebas manuales para entender el flujo.

## Archivos

| Archivo | Uso |
| --- | --- |
| `input_emotion_example.json` | Ejemplo de entrada emocional. |
| `output_decision_example.json` | Ejemplo de decision esperada. |
| `emotion_to_hardware_test.mjs` | Prueba local de emocion a hardware/simulacion. |
| `publish_emotion_input.mjs` | Publica una entrada de emocion por MQTT. |

## Comandos utiles

```bash
npm run test:emotion-bridge
npm run test:publish-emotion
```

Para la demo completa se recomienda usar:

```bash
npm run demo:robot
npm run demo:session
```