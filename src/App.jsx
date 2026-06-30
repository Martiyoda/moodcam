import { useEffect, useState } from 'react'
import useFaceDetection from './hooks/useFaceDetection'
import useMqtt from './hooks/useMqtt'
import CameraView from './components/CameraView'
import EmotionDisplay from './components/EmotionDisplay'
import SettingsModal from './components/SettingsModal'
import { generateSimpleArtPlan } from './lib/simpleArtEngine.js'
import { generateArtPlan } from './lib/artEngine'
import client from './lib/mqttClient'
import { useVoiceConversation } from './components/Avatar/hooks/useVoiceConversation.js'
import VideoLoop from './components/Avatar/VideoLoop'

const EMOTION_LABELS = {
  happy: 'Alegría',
  sad: 'Tristeza',
  angry: 'Enfado',
  neutral: 'Calma',
  fear: 'Miedo',
  disgust: 'Disgusto',
  surprise: 'Sorpresa',
}

const STATUS_STYLES = {
  connected: 'bg-emerald-400 shadow-emerald-400/60',
  connecting: 'bg-amber-400 shadow-amber-400/60 animate-pulse',
  error: 'bg-rose-400 shadow-rose-400/60',
  disconnected: 'bg-slate-500 shadow-slate-500/30',
}

function formatEmotionName(emotion) {
  if (!emotion) return 'Sin datos'
  return EMOTION_LABELS[emotion] || emotion
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.round(value * 100)
}

function App() {
  const {
    isRecording,
    connectionStatus: voiceConnectionStatus,
    isSpeaking,
    toggleConversation,
    clearError,
  } = useVoiceConversation()

  const {
    videoRef,
    canvasRef,
    modelsLoaded,
    cameraActive,
    emotions,
    dominant,
    age,
    gender,
    error,
    loading,
    startCamera,
    stopCamera,
    detectionConfig,
    updateConfig,
    resetConfig,
  } = useFaceDetection()

  const {
    mqttConfig,
    updateMqttConfig,
    resetMqttConfig,
    connectionStatus,
    lastError,
    publishEmotion,
  } = useMqtt()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [artPlan, setArtPlan] = useState(null)
  const [samplesCaptured, setSamplesCaptured] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (emotions && dominant) {
      publishEmotion(emotions, dominant)
    }
  }, [emotions, dominant, publishEmotion])

  useEffect(() => {
    if (!cameraActive) {
      setElapsedSeconds(0)
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [cameraActive])

  useEffect(() => {
    if (!cameraActive) {
      setSamplesCaptured(0)
      return
    }

    if (emotions) {
      setSamplesCaptured((current) => current + 1)
    }
  }, [cameraActive, emotions])

  const runSimpleArtPlan = () => {
    const plan = generateSimpleArtPlan(dominant)

    plan.commands.forEach((command, index) => {
      window.setTimeout(() => {
        client.publish('robot/arm', command)
      }, index * 1500)
    })
  }

  const sendEmotionPose = () => {
    if (dominant === 'happy') {
      client.publish('robot/arm', 'SOFT')
    } else if (dominant === 'sad') {
      client.publish('robot/arm', 'LEFT_CURVE')
    } else if (dominant === 'angry') {
      client.publish('robot/arm', 'STRONG')
    } else {
      client.publish('robot/arm', 'REST')
    }
  }

  const sendEmotionCommand = () => {
    if (dominant === 'happy') {
      client.publish('robot/servo1', 'RIGHT')
    } else if (dominant === 'sad') {
      client.publish('robot/servo1', 'LEFT')
    } else {
      client.publish('robot/servo1', 'STOP')
    }
  }

  const sendLeft = () => {
    client.publish('robot/servo1', 'LEFT')
  }

  const sendRight = () => {
    client.publish('robot/servo1', 'RIGHT')
  }

  const sendStop = () => {
    client.publish('robot/servo1', 'STOP')
  }

  const testArtEngine = () => {
    const plan = generateArtPlan({
      mainEmotions: [
        {
          emotion: dominant || 'happy',
          percentage: formatPercent(emotions?.[dominant] ?? 1),
        },
      ],
      artistId: 'pollock',
      mobility: 80,
    })

    setArtPlan(plan)
  }

  const sortedEmotions = emotions
    ? Object.entries(emotions).sort(([, a], [, b]) => b - a)
    : []

  const topEmotions = sortedEmotions.slice(0, 2)
  const dominantPercent = dominant ? formatPercent(emotions?.[dominant]) : 0
  const detectionActive = cameraActive && !!dominant
  const statusText = mqttConfig.enabled
    ? 'MQTT configurado. Al terminar se enviarán las 2 emociones con mayor porcentaje a moodcam/emotion.'
    : 'Activa MQTT en configuración para publicar automáticamente la emoción dominante.'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2b44_0%,_#0d1220_38%,_#070b14_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between text-slate-300">
          <div className="w-12" />
          <div className="flex items-center gap-3">
            <img
              src="/logo-esplubot.png"
              alt="Esplubot"
              className="h-10 w-10 rounded-full bg-slate-900/70 p-1 shadow-lg shadow-sky-950/50"
            />
            <div className="text-center">
              <h1 className="text-lg font-semibold tracking-[0.28em] text-slate-100 uppercase">
                Moodcam
              </h1>
              <p className="text-xs text-slate-500">by Esplubot</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Configuración"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <section className="rounded-[30px] border border-white/6 bg-[#101722]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/6 bg-[#161d29] p-4">
                  <div className="overflow-hidden rounded-2xl">
                    <VideoLoop
                      connectionStatus={voiceConnectionStatus}
                      isSpeaking={isSpeaking}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={cameraActive ? stopCamera : startCamera}
                    disabled={!cameraActive && (!modelsLoaded || loading)}
                    className="rounded-2xl bg-[linear-gradient(90deg,_#2a7edb,_#2491f0)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(36,145,240,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cameraActive
                      ? 'Detener cámara'
                      : loading
                        ? 'Cargando modelos...'
                        : 'Iniciar cámara'}
                  </button>

                  <button
                    onClick={() => {
                      clearError()
                      toggleConversation()
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    {isRecording ? 'Detener avatar' : 'Activar avatar'}
                  </button>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/6 bg-[#171e2a] p-5">
                <div className="rounded-[26px] border border-white/6 bg-[#161d29] p-4">
                  <CameraView
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    cameraActive={cameraActive}
                  />
                </div>
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Estado de ánimo
                  </h2>
                  <div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs text-slate-300">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shadow-lg ${STATUS_STYLES[connectionStatus] || STATUS_STYLES.disconnected}`}
                    />
                    {mqttConfig.enabled ? connectionStatus : 'MQTT apagado'}
                  </div>
                </div>

                <EmotionDisplay
                  emotions={emotions}
                  dominant={dominant}
                  age={age}
                  gender={gender}
                />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/6 bg-[#131a26] p-5">
              <p className="text-sm text-slate-300">{statusText}</p>

              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="h-11 flex-1 overflow-hidden rounded-full bg-[#273349] shadow-inner shadow-black/30">
                  <div
                    className="flex h-full items-center justify-center rounded-full bg-[linear-gradient(90deg,_#2569b0,_#2d95e6)] text-sm font-semibold text-white transition-all"
                    style={{ width: `${Math.max(dominantPercent, detectionActive ? 12 : 4)}%` }}
                  >
                    {cameraActive
                      ? `Detectando... ${elapsedSeconds}s`
                      : 'Esperando inicio'}
                  </div>
                </div>

                <button
                  onClick={runSimpleArtPlan}
                  className="whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 lg:px-0 lg:py-0"
                >
                  Probar ArtEngine Simple
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Muestras
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">{samplesCaptured}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Tiempo
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">{elapsedSeconds}s</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Emoción 1
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatEmotionName(topEmotions[0]?.[0])} {formatPercent(topEmotions[0]?.[1])}%
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Emoción 2
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatEmotionName(topEmotions[1]?.[0])} {formatPercent(topEmotions[1]?.[1])}%
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-[#0f1520] px-4 py-4">
                <p className="text-base text-slate-100">
                  {cameraActive
                    ? `Detectando emociones... ${samplesCaptured} muestras guardadas.`
                    : 'La cámara está parada. Inicia la detección para comenzar a capturar emociones.'}
                </p>

                <div className="mt-4 grid gap-2 text-sm text-slate-400">
                  <p>Broker: {mqttConfig.brokerUrl || 'No configurado'}</p>
                  <p>Recurso: {mqttConfig.topicBase}/emotion</p>
                  <p>Estado voz: {voiceConnectionStatus}</p>
                  <p>Avatar: {isSpeaking ? 'Hablando' : isRecording ? 'Escuchando' : 'Inactivo'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-white/6 bg-[#131a26] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Acciones rápidas
                  </h3>
                  <span className="text-xs text-slate-500">Control de pruebas</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <button
                    onClick={testArtEngine}
                    className="rounded-2xl bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Probar ArtEngine
                  </button>
                  <button
                    onClick={sendEmotionCommand}
                    className="rounded-2xl bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Enviar emoción
                  </button>
                  <button
                    onClick={sendEmotionPose}
                    className="rounded-2xl bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Enviar al brazo
                  </button>
                  <button
                    onClick={sendLeft}
                    className="rounded-2xl bg-[#1d6f4f] px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    LEFT
                  </button>
                  <button
                    onClick={sendStop}
                    className="rounded-2xl bg-[#6c2d39] px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    STOP
                  </button>
                  <button
                    onClick={sendRight}
                    className="rounded-2xl bg-[#275f9b] px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    RIGHT
                  </button>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/6 bg-[#131a26] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Resumen artístico
                </h3>

                {artPlan ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <p>Pintor: {artPlan.artist_name}</p>
                    <p>Velocidad: {artPlan.speed}</p>
                    <p>Presión: {artPlan.pressure}</p>
                    <p>Trazos: {artPlan.strokes.length}</p>
                    <p>Comandos: {artPlan.robot_commands.length}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Ejecuta una prueba para ver aquí el plan generado.
                  </p>
                )}

                {(error || lastError) && (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                    {error || lastError}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="pt-5 text-center text-xs text-slate-500">
          Moodcam by Esplubot · Powered by @vladmandic/human
        </footer>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={detectionConfig}
        onConfigChange={updateConfig}
        onReset={resetConfig}
        mqttConfig={mqttConfig}
        onMqttConfigChange={updateMqttConfig}
        onMqttReset={resetMqttConfig}
        mqttStatus={connectionStatus}
        mqttError={lastError}
      />
    </div>
  )
}

export default App