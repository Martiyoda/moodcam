import { useState } from 'react'

const SECTIONS = [
  {
    key: 'detector',
    title: '🔍 Detector Facial',
    description: 'Controla cómo se detectan los rostros en la imagen.',
    params: [
      { key: 'face.detector.minConfidence', label: 'Confianza mínima', type: 'range', min: 0.1, max: 1, step: 0.05, description: 'Umbral para aceptar un rostro detectado. Más alto = menos falsos positivos.' },
      { key: 'face.detector.maxDetected', label: 'Máx. rostros', type: 'range', min: 1, max: 5, step: 1, description: 'Número máximo de rostros a detectar simultáneamente.' },
      { key: 'face.detector.iouThreshold', label: 'IoU Threshold', type: 'range', min: 0.01, max: 0.9, step: 0.01, description: 'Overlap mínimo entre detecciones antes de descartar duplicados (NMS).' },
      { key: 'face.detector.rotation', label: 'Corrección de rotación', type: 'toggle', description: 'Mejora detección en ángulos extremos pero reduce rendimiento.' },
      { key: 'face.detector.skipFrames', label: 'Skip frames', type: 'range', min: 0, max: 100, step: 1, description: 'Frames máximos reutilizando bounding boxes del caché.' },
      { key: 'face.detector.skipTime', label: 'Skip time (ms)', type: 'range', min: 0, max: 5000, step: 100, description: 'Milisegundos máximos sin re-ejecutar el detector.' },
    ]
  },
  {
    key: 'emotion',
    title: '🎭 Emociones',
    description: 'Ajustes del modelo de clasificación de emociones.',
    params: [
      { key: 'face.emotion.minConfidence', label: 'Confianza mínima', type: 'range', min: 0.01, max: 0.8, step: 0.01, description: 'Umbral para incluir una emoción en los resultados. Más alto = menos ruido/flickering.' },
      { key: 'face.emotion.skipFrames', label: 'Skip frames', type: 'range', min: 0, max: 100, step: 1, description: 'Frames que reutiliza el resultado cacheado sin re-ejecutar el modelo.' },
      { key: 'face.emotion.skipTime', label: 'Skip time (ms)', type: 'range', min: 0, max: 5000, step: 100, description: 'Tiempo máximo sin re-ejecutar el modelo de emoción.' },
    ]
  },
  {
    key: 'smoothing',
    title: '📊 Suavizado',
    description: 'Media móvil exponencial aplicada sobre las emociones detectadas para reducir saltos.',
    params: [
      { key: 'smoothing.enabled', label: 'Activar suavizado', type: 'toggle', description: 'Aplica interpolación temporal a los scores de emociones.' },
      { key: 'smoothing.factor', label: 'Factor de suavizado', type: 'range', min: 0.05, max: 0.95, step: 0.05, description: 'Peso de los datos nuevos (0.05 = muy suave, 0.95 = casi sin suavizado).' },
    ]
  },
  {
    key: 'filter',
    title: '🖼 Filtros de Imagen',
    description: 'Preprocesamiento aplicado antes de la inferencia (GPU, latencia ~0).',
    params: [
      { key: 'filter.equalization', label: 'Ecualización', type: 'toggle', description: 'Ecualización de histograma. Mejora detección con iluminación variable.' },
      { key: 'filter.autoBrightness', label: 'Auto-brillo', type: 'toggle', description: 'Ajusta el brillo automáticamente según la escena.' },
      { key: 'filter.sharpness', label: 'Nitidez', type: 'range', min: 0, max: 1, step: 0.05, description: 'Mejora bordes. Útil con cámaras de baja calidad.' },
      { key: 'filter.brightness', label: 'Brillo', type: 'range', min: -1, max: 1, step: 0.05, description: 'Ajuste manual de brillo.' },
      { key: 'filter.contrast', label: 'Contraste', type: 'range', min: -1, max: 1, step: 0.05, description: 'Ajuste manual de contraste.' },
      { key: 'filter.blur', label: 'Desenfoque', type: 'range', min: 0, max: 15, step: 1, description: 'Radio de desenfoque en px. Reduce ruido en imágenes ruidosas.' },
    ]
  },
  {
    key: 'cache',
    title: '⚡ Caché y Rendimiento',
    description: 'Controla el sistema de caché de frames que habilita el skip de modelos.',
    params: [
      { key: 'cacheSensitivity', label: 'Sensibilidad de caché', type: 'range', min: 0, max: 1, step: 0.05, description: 'Cuánto debe cambiar la escena para invalidar el caché. 0 = desactivado, 1 = muy permisivo.' },
    ]
  },
]

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function RangeParam({ param, value, onChange }) {
  const displayValue = Number.isInteger(param.step) ? value : value.toFixed(2)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{param.label}</label>
        <span className="text-xs font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md">{displayValue}</span>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => onChange(param.key, Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-gray-700 accent-sky-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:hover:bg-sky-400 [&::-webkit-slider-thumb]:transition-colors"
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{param.min}</span>
        <span>{param.max}</span>
      </div>
    </div>
  )
}

function ToggleParam({ param, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-gray-300">{param.label}</label>
      <button
        onClick={() => onChange(param.key, !value)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-sky-500' : 'bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function TextParam({ label, value, onChange, placeholder, type = 'text', description }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
      />
      {description && <p className="text-[11px] text-gray-600">{description}</p>}
    </div>
  )
}

const MQTT_STATUS_MAP = {
  disconnected: { label: 'Desconectado', color: 'bg-gray-500' },
  connecting: { label: 'Conectando...', color: 'bg-yellow-500 animate-pulse' },
  connected: { label: 'Conectado', color: 'bg-green-500' },
  error: { label: 'Error', color: 'bg-red-500' },
}

export default function SettingsModal({ isOpen, onClose, config, onConfigChange, onReset, mqttConfig, onMqttConfigChange, onMqttReset, mqttStatus, mqttError }) {
  const [expandedSection, setExpandedSection] = useState('emotion')

  if (!isOpen) return null

  const handleChange = (key, value) => {
    onConfigChange(key, value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">⚙️ Configuración de Detección</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ajusta los parámetros para afinar la detección de emociones</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.key

            return (
              <div key={section.key} className="border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white">{section.title}</span>
                    {!isExpanded && (
                      <span className="block text-xs text-gray-500 mt-0.5">{section.description}</span>
                    )}
                  </div>
                  <span className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-800/50 pt-3">
                    <p className="text-xs text-gray-500 mb-2">{section.description}</p>
                    {section.params.map((param) => {
                      const value = getNestedValue(config, param.key)

                      return (
                        <div key={param.key}>
                          {param.type === 'range' ? (
                            <RangeParam param={param} value={value ?? param.min} onChange={handleChange} />
                          ) : (
                            <ToggleParam param={param} value={value ?? false} onChange={handleChange} />
                          )}
                          <p className="text-[11px] text-gray-600 mt-1">{param.description}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Sección MQTT */}
          {mqttConfig && (
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'mqtt' ? null : 'mqtt')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="text-left flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">📡 MQTT</span>
                  {mqttStatus && (
                    <span className={`w-2 h-2 rounded-full ${MQTT_STATUS_MAP[mqttStatus]?.color || 'bg-gray-500'}`} />
                  )}
                  {expandedSection !== 'mqtt' && (
                    <span className="text-xs text-gray-500">
                      {MQTT_STATUS_MAP[mqttStatus]?.label || 'Desconectado'}
                    </span>
                  )}
                </div>
                <span className={`text-gray-500 transition-transform duration-200 ${expandedSection === 'mqtt' ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {expandedSection === 'mqtt' && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-800/50 pt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Publica el estado emocional en un broker MQTT vía WebSocket. Estrategia híbrida: envía al cambiar la emoción dominante o cada N segundos como heartbeat.
                  </p>

                  {/* Estado de conexión */}
                  <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                    <span className={`w-2.5 h-2.5 rounded-full ${MQTT_STATUS_MAP[mqttStatus]?.color || 'bg-gray-500'}`} />
                    <span className="text-xs text-gray-300">{MQTT_STATUS_MAP[mqttStatus]?.label || 'Desconectado'}</span>
                    {mqttError && <span className="text-xs text-red-400 ml-auto truncate max-w-[200px]">{mqttError}</span>}
                  </div>

                  {/* Toggle activar */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Activar MQTT</label>
                    <button
                      onClick={() => onMqttConfigChange('enabled', !mqttConfig.enabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${mqttConfig.enabled ? 'bg-sky-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${mqttConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600">Habilita o deshabilita la conexión MQTT.</p>

                  <TextParam
                    label="URL del broker"
                    value={mqttConfig.brokerUrl}
                    onChange={(v) => onMqttConfigChange('brokerUrl', v)}
                    placeholder="wss://broker.example.com:8884/mqtt"
                    description="URL WebSocket del broker MQTT. Debe usar wss:// si la app se sirve por HTTPS."
                  />

                  <TextParam
                    label="Topic base"
                    value={mqttConfig.topicBase}
                    onChange={(v) => onMqttConfigChange('topicBase', v)}
                    placeholder="moodcam/device1"
                    description="Topic raíz. Se publicará en {topic}/emotion y {topic}/status."
                  />

                  <TextParam
                    label="Usuario"
                    value={mqttConfig.username}
                    onChange={(v) => onMqttConfigChange('username', v)}
                    placeholder="(opcional)"
                    description="Usuario para autenticación (dejar vacío si no se requiere)."
                  />

                  <TextParam
                    label="Contraseña"
                    value={mqttConfig.password}
                    onChange={(v) => onMqttConfigChange('password', v)}
                    placeholder="(opcional)"
                    type="password"
                    description="Contraseña para autenticación (dejar vacío si no se requiere)."
                  />

                  {/* Intervalo heartbeat */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Intervalo heartbeat (ms)</label>
                      <span className="text-xs font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md">{mqttConfig.interval}</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={10000}
                      step={500}
                      value={mqttConfig.interval}
                      onChange={(e) => onMqttConfigChange('interval', Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                        bg-gray-700 accent-sky-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:hover:bg-sky-400 [&::-webkit-slider-thumb]:transition-colors"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>500</span>
                      <span>10000</span>
                    </div>
                    <p className="text-[11px] text-gray-600">Tiempo máximo entre publicaciones. Si la emoción dominante no cambia, se envía un heartbeat tras este intervalo.</p>
                  </div>

                  {/* Botón reset MQTT */}
                  <button
                    onClick={onMqttReset}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    🔄 Restaurar defaults MQTT
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            🔄 Restaurar defaults
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all"
            style={{ background: 'linear-gradient(to right, #1378BC, #249BD7)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
