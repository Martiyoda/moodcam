# Mapeo emocional de trazos

`emotion_mapping.json` define intenciones artísticas normalizadas para adaptar posteriormente las recetas de cada pintor. No contiene coordenadas, ángulos de servo ni comandos Arduino.

Los archivos JSON de esta carpeta son recetas artisticas aprobadas. El backend las usa para validar decisiones antes de enviar comandos al simulador o a la ESP32.

En la fase actual estas recetas no significan que el brazo pueda pintar fisicamente. Primero deben completarse la calibracion, los limites reales y las pruebas seguras del Arduino.

## Archivos principales

| Archivo | Uso |
| --- | --- |
| `emotion_mapping.json` | Mapeo conceptual entre emociones y parametros artisticos. |
| `kandinsky.json` | Recetas aprobadas para Kandinsky. |
| `pollock.json` | Recetas aprobadas para Pollock. |
| `rothko.json` | Recetas aprobadas para Rothko. |
| `alma_thomas.json` | Recetas aprobadas para Alma Thomas. |
| `de_kooning.json` | Recetas aprobadas para De Kooning. |

## Regla de seguridad

El sistema no debe aceptar funciones o campos inventados por la IA. Las decisiones se validan contra estas recetas antes de producir comandos.

## Cambios de movimiento según emoción

| Emoción | Velocidad | Intensidad | Presión conceptual | Duración por segmento | Comportamiento visual y robótico seguro |
|---|---:|---:|---:|---:|---|
| Alegría | 72 | 78 | 38 | 900 ms | Movimientos abiertos, ascendentes y rítmicos; círculos y arcos amplios con colores vivos. |
| Tristeza | 28 | 36 | 34 | 1800 ms | Recorridos lentos, descendentes y separados; líneas largas y capas suaves con colores fríos. |
| Rabia | 78 | 92 | 58 | 650 ms | Diagonales y segmentos tensos; alta energía visual con velocidad reducida antes de cada cambio de dirección. |
| Calma | 34 | 30 | 30 | 2100 ms | Curvas suaves, líneas paralelas y campos lentos; movimiento continuo y previsible. |
| Miedo | 52 | 64 | 32 | 700 ms | Marcas cortas, interrupciones y pequeños zigzags controlados; amplitud limitada. |
| Sorpresa | 74 | 82 | 34 | 750 ms | Cambios de escala, líneas radiales y arcos inesperados elegidos entre primitivas validadas. |
| Neutral | 48 | 48 | 34 | 1300 ms | Movimiento equilibrado, espaciado regular y contraste moderado; perfil seguro de fallback. |

## Reglas de interpretación

- `speed`, `intensity` y `pressure` utilizan una escala artística de `0` a `100`.
- `duration_ms` representa la duración recomendada de una primitiva o segmento, no de la pintura completa.
- La presión es conceptual hasta instalar y calibrar un mecanismo capaz de controlarla.
- La rabia y la sorpresa pueden tener energía alta, pero no permiten aceleraciones, coordenadas o cambios de dirección sin validar.
- Todos los movimientos deberán convertirse más adelante mediante recetas por pintor, límites del lienzo, calibración y una prueba en seco.
- La paleta física permitida es: rojo, amarillo, naranja, azul, violeta y negro.
