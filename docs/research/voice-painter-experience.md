# Experiencia de voz y pintores

## Estado actual

Ya existe base funcional para:

- Detección facial con `useFaceDetection`.
- Micrófono con `useVoiceDetector`.
- Speech-to-text de navegador cuando `SpeechRecognition` está disponible.
- Análisis de tono básico con Web Audio: volumen, energía, pausas y ritmo estimado.
- Análisis textual por palabras clave.
- Fusión aproximada de texto, tono y rostro.
- Selección de respuesta y vídeo placeholder por pintor/emoción.

No es diagnóstico médico ni psicológico. La emoción calculada solo sirve para adaptar la experiencia artística.

## Módulos

| Módulo | Rol |
|---|---|
| `PainterSelector` | Selección de pintor, actualmente wrapper del selector visual existente. |
| `PainterVideoManager` | Muestra el área tipo llamada y placeholders para futuros vídeos HeyGen. |
| `useVoiceDetector` | Orquesta permiso de micrófono, speech-to-text, análisis tonal y muestras de voz. |
| `speechToTextProvider` | Provider de Web Speech API con fallback explícito si no hay soporte. |
| `audioToneAnalyzer` | Métricas de voz: intensidad, RMS, peak, pausas y speaking. |
| `emotionTextAnalyzer` | Palabras clave y colores mencionados. |
| `faceEmotionProvider` | Mapea emociones faciales existentes a categorías simples. |
| `emotionFusionService` | Combina texto, tono y rostro. |
| `painterResponseSelector` | Elige texto y vídeo placeholder según pintor + emoción. |

## Categorías simples

El MVP devuelve una de estas categorías:

- `alegre`
- `tranquilo`
- `triste`
- `nervioso`
- `cansado`
- `confundido`
- `neutro`

Internamente se conservan ids en inglés (`joyful`, `calm`, etc.) y se mapean a emociones artísticas compatibles con `artEngine` (`happy`, `neutral`, `sad`, `fear`, `surprise`).

## Estructura de pintor

Cada pintor tiene:

- `id`
- `name`
- `description`
- `style`
- `styleLabel`
- `avatar`
- `openingLine`
- `questions`
- `heygenNotes`
- `videos`
- `responses`

Los vídeos apuntan por ahora a rutas placeholder:

```txt
/painters/placeholders/{painterId}/{emotion}.mp4
```

Cuando existan vídeos HeyGen reales, se pueden subir a `public/painters/...` o cambiar las rutas en `src/lib/painterProfiles.js`.

Los guiones temporales estan documentados en [heygen-painter-scripts.md](heygen-painter-scripts.md) y tambien viven en `src/lib/painterProfiles.js` para que la app muestre exactamente el texto previsto para los clips.

## Flujo MVP

1. Usuario selecciona pintor.
2. Moodcam muestra una interfaz tipo llamada con placeholder HeyGen.
3. El pintor muestra una pregunta base.
4. Usuario responde por voz.
5. `useVoiceDetector` intenta transcript y siempre analiza tono si el micrófono está permitido.
6. Se fusiona voz + rostro.
7. Se elige respuesta y ruta de vídeo según emoción simple.
8. La emoción fusionada alimenta el AI Bridge y el plan artístico.
