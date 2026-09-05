// Pagina de ajustes locales de la experiencia, como MQTT y preferencias de captura.
// Guardar estos valores no significa guardar imagenes, audio ni emociones.
import { useState } from 'react'
import RobotCalibrationPanel from './RobotCalibrationPanel'

const SECTIONS = [
  {
    key: 'session',
    title: 'Sesión',
    description: 'Controla la duración de la captura emocional.',
    params: [
      { key: 'session.captureSeconds', label: 'Duración de captura (s)', type: 'range', min: 10, max: 120, step: 5, description: 'Tiempo de observación antes de mostrar el resumen emocional.' },
    ],
  },
  {
    key: 'detector',
    title: 'Detector Facial',
    description: 'Controla cómo se detecta el rostro en la imagen.',
    params: [
      { key: 'face.detector.minConfidence', label: 'Confianza mínima', type: 'range', min: 0.1, max: 1, step: 0.05, description: 'Umbral para aceptar un rostro detectado. Más alto = menos falsos positivos.' },
    ],
  },
  {
    key: 'emotion',
    title: 'Emociones',
    description: 'Ajustes del modelo de clasificación de emociones.',
    params: [
      { key: 'face.emotion.minConfidence', label: 'Confianza mínima', type: 'range', min: 0.01, max: 0.8, step: 0.01, description: 'Umbral para incluir una emoción en los resultados. Más alto = menos ruido/flickering.' },
    ],
  },
  {
    key: 'smoothing',
    title: 'Suavizado',
    description: 'Media móvil exponencial aplicada sobre las emociones detectadas para reducir saltos.',
    params: [
      { key: 'smoothing.enabled', label: 'Activar suavizado', type: 'toggle', description: 'Aplica interpolación temporal a los scores de emociones.' },
      { key: 'smoothing.factor', label: 'Factor de suavizado', type: 'range', min: 0.05, max: 0.95, step: 0.05, description: 'Peso de los datos nuevos (0.05 = muy suave, 0.95 = casi sin suavizado).' },
    ],
  },
  {
    key: 'filter',
    title: 'Filtros de Imagen',
    description: 'Preprocesamiento aplicado antes de la inferencia (GPU, latencia ~0).',
    params: [
      { key: 'filter.equalization', label: 'Ecualización', type: 'toggle', description: 'Ecualización de histograma. Mejora detección con iluminación variable.' },
      { key: 'filter.autoBrightness', label: 'Auto-brillo', type: 'toggle', description: 'Ajusta el brillo automáticamente según la escena.' },
    ],
  },
]

const MQTT_STATUS_MAP = {
  disconnected: { label: 'Desconectado', color: 'bg-gray-500' },
  connecting: { label: 'Conectando...', color: 'bg-yellow-500 animate-pulse' },
  connected: { label: 'Conectado', color: 'bg-green-500' },
  error: { label: 'Error', color: 'bg-red-500' },
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function RangeParam({ param, value, onChange }) {
  const displayValue = Number.isInteger(param.step) ? value : Number(value).toFixed(2)

  return (
    <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-300">{param.label}</label>
        <span className="text-xs font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md">{displayValue}</span>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(event) => onChange(param.key, Number(event.target.value))}
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
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <label className="text-sm font-medium text-gray-300">{param.label}</label>
      <button
        type="button"
        onClick={() => onChange(param.key, !value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${value ? 'bg-sky-500' : 'bg-gray-600'}`}
        aria-pressed={Boolean(value)}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`}
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
      />
      {description && <p className="text-[11px] text-gray-600">{description}</p>}
    </div>
  )
}

export default function SettingsPage({ config, onConfigChange, onReset, mqttConfig, onMqttConfigChange, onMqttReset, mqttStatus, mqttError, robotCalibrationProps, onBack }) {
  const [activeSection, setActiveSection] = useState('session')
  const navigationSections = [
    ...SECTIONS,
    mqttConfig && { key: 'mqtt', title: 'MQTT', description: 'Bridge, topics y estado del robot.' },
    robotCalibrationProps && { key: 'robot', title: 'Robot y calibración', description: 'Preparación técnica del brazo.' },
  ].filter(Boolean)
  const activeMetadata = navigationSections.find((section) => section.key === activeSection) || navigationSections[0]
  const activeConfigSection = SECTIONS.find((section) => section.key === activeMetadata.key)

  const handleChange = (key, value) => {
    onConfigChange(key, value)
  }

  return (
    <section className="min-h-[calc(100vh-180px)] rounded-lg border border-zinc-800 bg-zinc-950/30 p-4 md:p-5 space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Configuración</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Ajustes de detección y robot</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">Ajusta captura, modelos, rendimiento, MQTT y calibración desde una página dedicada.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Volver
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="overflow-x-auto lg:overflow-visible" aria-label="Áreas de configuración">
          <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
            {navigationSections.map((section) => {
              const selected = activeMetadata.key === section.key

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`w-48 shrink-0 rounded-lg border p-3 text-left transition-colors lg:w-full ${
                    selected
                      ? 'border-sky-400 bg-sky-400/10 text-white'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-semibold">{section.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{section.description}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-5">
          <div className="mb-5 border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-white">{activeMetadata.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{activeMetadata.description}</p>
          </div>

          {activeConfigSection && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeConfigSection.params.map((param) => {
                const value = getNestedValue(config, param.key)

                return (
                  <div key={param.key} className="space-y-2">
                    {param.type === 'range' ? (
                      <RangeParam param={param} value={value ?? param.min} onChange={handleChange} />
                    ) : (
                      <ToggleParam param={param} value={value ?? false} onChange={handleChange} />
                    )}
                    <p className="text-xs text-gray-600">{param.description}</p>
                  </div>
                )
              })}
            </div>
          )}

          {activeMetadata.key === 'mqtt' && mqttConfig && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-800/50 p-3">
                <span className={`h-2.5 w-2.5 rounded-full ${MQTT_STATUS_MAP[mqttStatus]?.color || 'bg-gray-500'}`} />
                <span className="text-sm text-gray-300">{MQTT_STATUS_MAP[mqttStatus]?.label || 'Desconectado'}</span>
                {mqttError && <span className="min-w-0 truncate text-xs text-red-400 md:ml-auto">{mqttError}</span>}
              </div>

              <div className="space-y-2">
                <ToggleParam
                  param={{ key: 'enabled', label: 'Activar MQTT' }}
                  value={mqttConfig.enabled}
                  onChange={() => onMqttConfigChange('enabled', !mqttConfig.enabled)}
                />
                <p className="text-xs text-gray-600">Habilita o deshabilita la conexión MQTT.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextParam label="URL del broker" value={mqttConfig.brokerUrl} onChange={(value) => onMqttConfigChange('brokerUrl', value)} placeholder="wss://broker.example.com:8884/mqtt" description="URL WebSocket del broker MQTT. Debe usar wss:// si la app se sirve por HTTPS." />
                <TextParam label="Device ID" value={mqttConfig.deviceId} onChange={(value) => onMqttConfigChange('deviceId', value)} placeholder="device1" description="Identificador compartido por Moodcam, AI Bridge y ESP32." />
                <TextParam label="Usuario MQTT" value={mqttConfig.username} onChange={(value) => onMqttConfigChange('username', value)} placeholder="Usuario del broker" description="Déjalo vacío si el broker no requiere autenticación." />
                <TextParam label="Contraseña MQTT" type="password" value={mqttConfig.password} onChange={(value) => onMqttConfigChange('password', value)} placeholder="Contraseña del broker" description="Se guarda junto con la configuración local del navegador." />
              </div>

              <p className="text-xs text-gray-600">
                Los topics MQTT se generan automaticamente a partir del Device ID para simplificar la configuracion.
              </p>

              <button type="button" onClick={onMqttReset} className="text-xs text-gray-500 transition-colors hover:text-gray-300">
                Restaurar defaults MQTT
              </button>
            </div>
          )}

          {activeMetadata.key === 'robot' && robotCalibrationProps && (
            <RobotCalibrationPanel {...robotCalibrationProps} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
        <button type="button" onClick={onReset} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
          Restaurar defaults
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(to right, #1378BC, #249BD7)' }}
        >
          Volver a la experiencia
        </button>
      </div>
    </section>
  )
}
