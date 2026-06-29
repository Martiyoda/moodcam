# 🎭 Moodcam por Esplubot

**Aplicación web de detección de emociones en tiempo real mediante IA y tu webcam.**

Moodcam utiliza modelos de aprendizaje automático que se ejecutan completamente en el navegador para detectar rostros y analizar emociones en tiempo real — sin procesamiento en servidor, sin que tus datos salgan de tu dispositivo.

> [English version](README.md) · [Versió en català](README.ca.md)

---

## ✨ Características

- **Detección facial en tiempo real** — Detecta rostros del flujo de la webcam usando los modelos BlazeFace y FaceMesh.
- **Reconocimiento de emociones** — Clasifica 7 emociones (feliz, triste, enfadado, sorprendido, asustado, disgustado, neutral) con porcentajes de confianza.
- **Malla facial superpuesta** — Dibuja polígonos de la malla facial en una capa canvas sobre el vídeo en directo.
- **100% en el cliente** — Toda la inferencia ocurre localmente en el navegador mediante TensorFlow.js (a través de la librería `@vladmandic/human`). No se envían imágenes ni datos a ningún servidor.
- **Interfaz responsiva** — Diseño en dos columnas en escritorio, una columna en móvil. Construido con Tailwind CSS v4.
- **Telemetría MQTT** — Publica opcionalmente el estado emocional en un broker MQTT vía WebSocket. Estrategia híbrida: envía al cambiar la emoción dominante o como heartbeat periódico.
- **Desplegable en Vercel** — Incluye `vercel.json` con cabeceras de caché agresivas para los archivos de modelos.

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | [React 19](https://react.dev/) |
| **Herramienta de build** | [Vite 7](https://vite.dev/) |
| **Estilos** | [Tailwind CSS 4](https://tailwindcss.com/) (vía `@tailwindcss/vite`) |
| **IA / ML** | [@vladmandic/human 3.x](https://github.com/vladmandic/human) (envuelve TensorFlow.js) |
| **MQTT** | [mqtt.js](https://github.com/mqttjs/MQTT.js) (MQTT sobre WebSocket) |
| **Linting** | ESLint 9 con configuración plana, plugins de React Hooks y React Refresh |
| **Despliegue** | [Vercel](https://vercel.com/) |

## 📁 Estructura del Proyecto

```
moodcam/
├── public/
│   ├── logo-esplubot.png          # Logo / favicon de la app
│   └── models/                    # Archivos de modelos ML pre-entrenados
│       ├── blazeface.{json,bin}   # Modelo de detección facial
│       ├── facemesh.{json,bin}    # Modelo de malla facial / landmarks
│       ├── emotion.{json,bin}     # Modelo de clasificación de emociones
│       └── faceres.{json,bin}     # Modelo de descripción facial (edad/género)
├── src/
│   ├── main.jsx                   # Punto de entrada React (StrictMode)
│   ├── App.jsx                    # Layout principal: cabecera, cámara, panel de emociones, pie de página
│   ├── index.css                  # Importación de Tailwind CSS
│   ├── components/
│   │   ├── CameraView.jsx         # Vídeo + canvas superpuesto con indicador en vivo
│   │   └── EmotionDisplay.jsx     # Emoción dominante, barras de emociones
│   └── hooks/
│       ├── useFaceDetection.js    # Hook principal: carga de modelos, cámara, bucle de detección
│       └── useMqtt.js             # Conexión MQTT, publicación híbrida, LWT
├── index.html                     # Shell HTML (lang="es")
├── vite.config.js                 # Plugins Vite + React + Tailwind
├── eslint.config.js               # Configuración plana de ESLint
├── vercel.json                    # Configuración de despliegue en Vercel con cabeceras de caché
└── package.json
```

## 🏗 Arquitectura

### Pipeline de Detección

1. **Carga de modelos** — Al montar el componente, `useFaceDetection` crea una instancia singleton de `Human`, carga los modelos desde `/models` y los precalienta (warmup).
2. **Acceso a la cámara** — Cuando el usuario pulsa "Iniciar Cámara", el hook solicita `getUserMedia` con la cámara frontal a 640×480.
3. **Bucle de detección** — Una vez que el vídeo empieza a reproducirse, un bucle `requestAnimationFrame` llama continuamente a `human.detect(video)`, que ejecuta BlazeFace → FaceMesh → Clasificación de emociones.
4. **Dibujado** — La malla facial detectada se dibuja sobre un `<canvas>` superpuesto usando `human.draw.face()` con renderizado de polígonos.
5. **Actualización de estado** — Las puntuaciones de emociones y la emoción dominante se envían al estado de React y son renderizados por `EmotionDisplay`.

### Decisiones de Diseño Clave

- **Patrón singleton** para la instancia de `Human` que evita re-descargar los modelos en cada re-render.
- **Efecto espejo** — Tanto el vídeo como el canvas usan `scaleX(-1)` para que la cámara actúe como un espejo.
- **Un solo rostro** — `maxDetected: 1` mantiene la inferencia rápida procesando solo un rostro.
- **Adaptación al frame-rate** — Usa `requestAnimationFrame` para que la velocidad de detección se adapte a las capacidades del dispositivo.

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** ≥ 18
- **npm** (o cualquier gestor de paquetes compatible)
- Un dispositivo con **webcam** y un navegador moderno (Chrome, Firefox, Edge, Safari)

### Instalación

```bash
git clone <url-del-repositorio>
cd moodcam
npm install
```

### Desarrollo

```bash
npm run dev
```

Se abre en `http://localhost:5173`. Haz clic en **"📷 Iniciar Cámara"**, concede permisos de cámara y observa cómo se detectan tus emociones en directo.

### Build para Producción

```bash
npm run build
npm run preview   # previsualizar el build de producción localmente
```

### Desplegar en Vercel

```bash
npx vercel
```

El `vercel.json` incluido configura el comando de build, el directorio de salida y establece `Cache-Control: public, max-age=31536000, immutable` en todos los archivos de modelos bajo `/models/`.

## ⚙️ Configuración de Detección

La app incluye un panel de configuración (icono ⚙️ en la cabecera) que permite ajustar todos los parámetros de detección en tiempo real. Los cambios se aplican instantáneamente sin recargar modelos y se **guardan automáticamente en `localStorage`**, de modo que tu configuración preferida se restaura en la siguiente visita.

### 🔍 Detector Facial

Parámetros que controlan cómo se localizan los rostros en el fotograma de vídeo.

| Parámetro | Default | Rango | Descripción |
|---|---|---|---|
| **Confianza mín.** | `0.50` | 0.10 – 1.00 | Puntuación mínima para aceptar un rostro detectado. Valores más altos reducen falsos positivos (ej. objetos confundidos con caras) pero pueden perder rostros parcialmente visibles. |
| **Máx. rostros** | `1` | 1 – 5 | Número máximo de rostros a detectar simultáneamente. Mantenerlo en 1 ofrece el mejor rendimiento. |
| **IoU Threshold** | `0.10` | 0.01 – 0.90 | Umbral de Intersection over Union para Non-Maximum Suppression. Controla cuánto pueden solaparse dos bounding boxes antes de descartar el más débil. Valores más bajos son más agresivos eliminando duplicados. |
| **Corrección de rotación** | `off` | on / off | Habilita detección facial multi-ángulo. Mejora la precisión con cabezas inclinadas pero aumenta significativamente el tiempo de procesamiento. |
| **Skip frames** | `99` | 0 – 100 | Frames consecutivos máximos en los que el detector puede reutilizar bounding boxes del caché en lugar de re-ejecutarse. Funciona junto con la sensibilidad de caché. |
| **Skip time (ms)** | `2500` | 0 – 5000 | Tiempo máximo en milisegundos que el detector puede reutilizar resultados cacheados. Tras este tiempo se fuerza una nueva detección independientemente de los skip frames. |

### 🎭 Emociones

Parámetros del modelo de clasificación de emociones que se ejecuta sobre cada rostro detectado.

| Parámetro | Default | Rango | Descripción |
|---|---|---|---|
| **Confianza mín.** | `0.30` | 0.01 – 0.80 | Puntuación mínima para incluir una emoción en los resultados. **Es el parámetro más impactante para la estabilidad.** Valores más altos filtran emociones de baja confianza que causan parpadeo entre estados. |
| **Skip frames** | `99` | 0 – 100 | Frames máximos que el modelo de emoción puede reutilizar su resultado previo del caché. Valores altos reducen carga de CPU/GPU pero hacen las actualizaciones menos responsivas. |
| **Skip time (ms)** | `1500` | 0 – 5000 | Tiempo máximo antes de forzar al modelo de emoción a re-ejecutarse. Valores bajos dan actualizaciones más rápidas; valores altos producen lecturas más estables (pero con mayor retardo). |

### 📊 Suavizado

Media móvil exponencial (EMA) personalizada aplicada sobre los scores de emociones crudos para reducir saltos abruptos. Esta no es una funcionalidad nativa de `@vladmandic/human` — está implementada en el hook de detección de la app.

Fórmula: `suavizado = α × crudo + (1 − α) × anterior`

| Parámetro | Default | Rango | Descripción |
|---|---|---|---|
| **Activar suavizado** | `on` | on / off | Activa/desactiva la interpolación temporal de puntuaciones de emociones. |
| **Factor de suavizado (α)** | `0.25` | 0.05 – 0.95 | Peso dado a la nueva lectura cruda. **Valores bajos** (ej. 0.10) producen resultados muy suaves y lentos en cambiar. **Valores altos** (ej. 0.80) siguen los datos crudos de cerca con mínimo retardo. |

### 🖼 Filtros de Imagen

Preprocesamiento acelerado por GPU aplicado al fotograma de vídeo antes de la inferencia (latencia casi nula vía WebGL).

| Parámetro | Default | Rango | Descripción |
|---|---|---|---|
| **Ecualización** | `on` | on / off | Ecualización de histograma de la imagen de entrada y regiones faciales recortadas. **Recomendado para condiciones de iluminación variable** — normaliza la distribución de brillo para que el modelo reciba inputs más consistentes. |
| **Auto-brillo** | `on` | on / off | Ajusta el brillo automáticamente según la escena. Solo activo cuando el caché de frames está habilitado (sensibilidad de caché > 0). |
| **Nitidez** | `0.00` | 0.00 – 1.00 | Filtro de realce de bordes. Valores bajos (0.1–0.3) pueden ayudar con webcams borrosas. Valores altos pueden amplificar el ruido. |
| **Brillo** | `0.00` | −1.00 – 1.00 | Ajuste manual de brillo. Negativo oscurece, positivo aclara. |
| **Contraste** | `0.00` | −1.00 – 1.00 | Ajuste manual de contraste. Negativo reduce el contraste, positivo lo aumenta. |
| **Desenfoque** | `0` | 0 – 15 | Radio de desenfoque gaussiano en píxeles. Puede reducir ruido en cámaras con grano, pero demasiado perjudicará la precisión de detección. |

### ⚡ Caché y Rendimiento

| Parámetro | Default | Rango | Descripción |
|---|---|---|---|
| **Sensibilidad de caché** | `0.70` | 0.00 – 1.00 | Controla cuánto debe cambiar la escena entre frames para invalidar el caché y forzar una re-detección. `0` desactiva el caché por completo (cada frame se procesa). Valores más altos permiten más saltos de frames cuando la escena es estable, reduciendo el uso de CPU/GPU. Este parámetro **habilita** el mecanismo de skip frames/time en todos los sub-modelos. |

### 💾 Persistencia

Todos los ajustes se guardan automáticamente en **`localStorage`** bajo la clave `moodcam-detection-config`. Al reabrir la app, tu configuración anterior se restaura. Al pulsar "🔄 Restaurar defaults" se restablecen todos los valores y se eliminan los datos guardados.

### 🎯 Consejos de Ajuste Recomendados

Para obtener las lecturas de emociones más estables, prueba esta combinación:

1. **Confianza mín. emociones** → `0.30`–`0.40` (elimina ruido)
2. **Suavizado** → activado, factor `0.15`–`0.25` (amortigua cambios rápidos)
3. **Ecualización** → activada (normaliza la iluminación)
4. **Desenfoque** → `1`–`2` (si tu cámara tiene ruido)

## 🔒 Privacidad

Todo el procesamiento ocurre **completamente en tu navegador**. Ningún fotograma de vídeo, imagen o resultado de detección se transmite nunca a un servidor. Los modelos de ML son archivos estáticos que se sirven junto con la aplicación.

**Nota sobre MQTT:** Cuando MQTT está activado, solo se publican la etiqueta de la emoción detectada, las puntuaciones de confianza y una marca de tiempo en el broker configurado. Nunca se envían imágenes ni datos de vídeo. MQTT está desactivado por defecto.

## 📡 Telemetría MQTT

Moodcam puede publicar opcionalmente el estado emocional detectado en un broker MQTT vía WebSocket, permitiendo la integración con dashboards, dispositivos IoT, domótica o cualquier sistema compatible con MQTT.

### Funcionamiento

La publicación sigue una **estrategia híbrida**:

1. **Por cambio** — Se publica un mensaje inmediatamente cuando cambia la emoción dominante (ej. "happy" → "surprised").
2. **Heartbeat** — Si la emoción dominante no cambia, se envía un heartbeat tras un intervalo configurable (por defecto: 2 segundos).

Esto minimiza el tráfico asegurando que los suscriptores siempre tengan datos actualizados.

### Topics

| Topic | QoS | Retain | Descripción |
|---|---|---|---|
| `{topicBase}/emotion` | 0 | No | Payload de datos emocionales (publicado por cambio o heartbeat) |
| `{topicBase}/status` | 1 | Sí | Estado online/offline. Usa MQTT Last Will and Testament (LWT) para notificación automática de desconexión. |

### Payload de Emoción

```json
{
  "dominant": "happy",
  "confidence": 0.87,
  "emotions": {
    "happy": 0.87,
    "neutral": 0.10,
    "surprised": 0.03
  },
  "trigger": "change",
  "timestamp": 1719500000000
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `dominant` | string | La emoción con la mayor puntuación de confianza. |
| `confidence` | number | Puntuación de confianza (0–1) de la emoción dominante. |
| `emotions` | object | Todas las emociones por encima del umbral de confianza mín. con sus puntuaciones. |
| `trigger` | string | `"change"` si la emoción dominante acaba de cambiar, `"heartbeat"` si es una actualización periódica. |
| `timestamp` | number | Marca de tiempo Unix en milisegundos. |

### Configuración

Todos los ajustes MQTT están disponibles en el panel de configuración bajo **📡 MQTT** y se persisten en `localStorage` bajo la clave `moodcam-mqtt-config`.

| Parámetro | Default | Descripción |
|---|---|---|
| **Activar MQTT** | `off` | Habilita o deshabilita la conexión MQTT. |
| **URL del broker** | `wss://broker.emqx.io:8084/mqtt` | URL WebSocket del broker MQTT. Debe usar `wss://` cuando la app se sirve por HTTPS. |
| **Topic base** | `moodcam/device1` | Topic raíz. Los mensajes se publican en `{base}/emotion` y `{base}/status`. |
| **Usuario** | *(vacío)* | Usuario para autenticación en el broker (dejar vacío si no se requiere). |
| **Contraseña** | *(vacío)* | Contraseña para autenticación en el broker (dejar vacío si no se requiere). |
| **Intervalo heartbeat (ms)** | `2000` | Tiempo máximo entre publicaciones. Si la emoción dominante no cambia, se envía un heartbeat tras este intervalo. Rango: 500–10 000 ms. |

### Requisitos del Broker

- Debe soportar **MQTT sobre WebSocket** (puertos 8083 para `ws://` o 8084/8884 para `wss://`).
- Para apps servidas por HTTPS, el broker **debe** usar `wss://` (TLS).

#### Recomendado: HiveMQ Cloud (gratis)

[HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) ofrece un plan **gratuito permanente** (hasta 100 conexiones, 10 GB/mes) ideal para uso educativo:

1. Regístrate en [hivemq.cloud](https://console.hivemq.cloud/) y crea un clúster gratuito.
2. Ve a **Access Management** y crea credenciales (usuario y contraseña).
3. Copia la URL del clúster (ej. `xxxxxx.s1.eu.hivemq.cloud`).
4. En los ajustes MQTT de Moodcam, pega la URL — la app añadirá automáticamente `wss://` y `:8884/mqtt` si faltan.
5. Introduce el usuario y contraseña que creaste.
6. Activa MQTT y ya estás conectado.

Sin infraestructura que gestionar, TLS incluido y capacidad suficiente para un aula o taller.

#### Alternativa: Docker Mosquitto con WebSocket

```yaml
# docker-compose.yml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
```

```conf
# mosquitto.conf
listener 1883
listener 9001
protocol websockets
allow_anonymous true
```

### 🧪 Verificación con MQTT Explorer

[MQTT Explorer](https://mqtt-explorer.com/) es un cliente gráfico gratuito y multiplataforma que permite visualizar en tiempo real todos los mensajes que llegan a un broker. Es la forma más fácil de verificar que Moodcam está publicando correctamente:

1. Descarga e instala [MQTT Explorer](https://mqtt-explorer.com/).
2. Conéctate a tu broker (ej. `mqtt://localhost:1883` o `wss://broker.emqx.io:8084/mqtt`).
3. Activa MQTT en los ajustes de Moodcam e inicia la cámara.
4. En MQTT Explorer deberías ver los topics `moodcam/device1/status` (con `"online"`) y `moodcam/device1/emotion` actualizándose con cada cambio de emoción o heartbeat.

Es especialmente útil para **depurar problemas de conexión**, inspeccionar la estructura del payload JSON y confirmar que el LWT (`"offline"`) se dispara correctamente al cerrar la app.

## 📖 Glosario

| Término | Definición |
|---|---|
| **IA (Inteligencia Artificial)** | Tecnología que permite a los ordenadores realizar tareas que normalmente requieren inteligencia humana, como reconocer rostros o emociones. |
| **Aprendizaje Automático (ML)** | Rama de la IA donde los ordenadores aprenden patrones a partir de datos (en este caso, miles de imágenes de rostros) en lugar de ser programados explícitamente. |
| **Modelo** | Un archivo que contiene el "conocimiento aprendido" del entrenamiento. Moodcam usa varios modelos: uno para encontrar rostros, otro para mapear puntos faciales y otro para clasificar emociones. |
| **Inferencia** | El proceso de pasar datos nuevos (la imagen de tu webcam) a un modelo para obtener una predicción (ej. "feliz 82%"). |
| **TensorFlow.js** | Una librería de Google que permite ejecutar modelos de ML directamente en el navegador web usando la CPU o GPU de tu dispositivo. |
| **@vladmandic/human** | La librería de código abierto que usa Moodcam. Envuelve TensorFlow.js y proporciona detección facial, reconocimiento de emociones y otras capacidades listas para usar. |
| **BlazeFace** | Un modelo ligero que localiza rápidamente rostros en una imagen y devuelve sus bounding boxes (coordenadas rectangulares). |
| **FaceMesh** | Un modelo que identifica más de 468 puntos de referencia en un rostro (ojos, nariz, boca, mandíbula, etc.), formando una malla detallada. |
| **Bounding Box** | El rectángulo dibujado alrededor de un rostro detectado, definido por su posición y tamaño en la imagen. |
| **Puntuación de confianza** | Un número de 0 a 1 (mostrado como 0%–100%) que indica cuán seguro está el modelo de su predicción. Mayor = más certeza. |
| **IoU (Intersection over Union)** | Una medida del solapamiento entre dos bounding boxes. Se usa para eliminar detecciones duplicadas del mismo rostro. |
| **NMS (Non-Maximum Suppression)** | Un algoritmo que elimina detecciones redundantes superpuestas, conservando solo la más fuerte. |
| **Suavizado / EMA** | Media Móvil Exponencial — técnica que mezcla la lectura actual con las anteriores para reducir saltos bruscos y producir resultados más estables. |
| **Caché** | Almacén temporal de resultados de detección previos. Cuando la escena no ha cambiado mucho, se reutilizan los resultados cacheados para ahorrar procesamiento. |
| **Skip Frames** | Número de fotogramas de vídeo consecutivos en los que el sistema puede reutilizar resultados cacheados en lugar de ejecutar el modelo de nuevo. |
| **Ecualización** | Técnica de procesamiento de imagen que redistribuye los niveles de brillo para mejorar el contraste, especialmente útil con iluminación desigual. |
| **WebGL** | Tecnología del navegador que permite a la GPU (tarjeta gráfica) acelerar cálculos, haciendo los filtros de imagen y la inferencia ML más rápidos. |
| **localStorage** | Funcionalidad del navegador que almacena pequeñas cantidades de datos (como tus ajustes) en tu dispositivo, persistiendo entre recargas de página y reinicios del navegador. |
| **Webcam** | La cámara integrada o externa de tu dispositivo. Moodcam la usa para capturar vídeo en directo para su análisis. |
| **Lado del cliente (client-side)** | Procesamiento que ocurre enteramente en tu dispositivo (en el navegador), en contraposición a enviarse a un servidor remoto. |
| **MQTT** | Un protocolo de mensajería ligero diseñado para dispositivos IoT. Moodcam lo usa para publicar opcionalmente las emociones detectadas en un broker, que las distribuye a cualquier cliente suscrito. |
| **Broker MQTT** | Un servidor que recibe mensajes de publicadores (como Moodcam) y los reenvía a los suscriptores. Ejemplos: Mosquitto, EMQX, HiveMQ. |
| **WebSocket** | Un protocolo que permite comunicación bidireccional entre un navegador y un servidor sobre una conexión única y persistente. Moodcam usa WebSocket para conectarse a brokers MQTT desde el navegador. |
| **LWT (Last Will and Testament)** | Funcionalidad MQTT donde el broker publica automáticamente un mensaje pre-configurado (ej. "offline") si un cliente se desconecta inesperadamente, para que los suscriptores lo sepan. |
| **QoS (Quality of Service)** | Niveles de garantía de entrega en MQTT: QoS 0 = como mucho una vez (fire and forget), QoS 1 = al menos una vez, QoS 2 = exactamente una vez. Moodcam usa QoS 0 para datos de emociones y QoS 1 para mensajes de estado. |
| **Topic** | Una cadena de dirección MQTT (ej. `moodcam/device1/emotion`) que organiza mensajes en canales. Los publicadores envían a un topic; los suscriptores escuchan en un topic. |
| **Heartbeat** | Un mensaje periódico enviado incluso cuando nada ha cambiado, para confirmar que el emisor sigue activo y conectado. |
