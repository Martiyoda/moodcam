// Pantalla operativa principal: coordina cámara, voz, sesión MQTT, pintor y estado del robot.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useFaceDetection from './hooks/useFaceDetection'
import useMqtt from './hooks/useMqtt'
import useVoiceDetector from './hooks/useVoiceDetector'
import { useVoiceConversation } from './components/Avatar/hooks/useVoiceConversation'
import { VOICE_RELAY_HEALTH_URL } from './components/Avatar/constants'
import CameraView from './components/CameraView'
import EmotionDisplay from './components/EmotionDisplay'
import SettingsPage from './components/SettingsPage'
import PainterSelector from './components/PainterSelector'
import ConversationPanel from './components/ConversationPanel'
import VoiceEmotionPanel from './components/VoiceEmotionPanel'
import DemoReadinessPanel from './components/DemoReadinessPanel'
import { calculateEmotionSummary, getArtistById } from './lib/artEngine'
import { DEFAULT_CONVERSATION_MODE, getConversationMode } from './lib/conversationModes'
import { calibrationTopicsFromMap, createSessionId } from './lib/mqttContract'
import { getPainterProfile } from './lib/painterProfiles'
import { getPainterRecipe } from './lib/painterRecipes'
import { dominantPhysicalEmotion } from './lib/emotionCategories'
import { mapFaceEmotionToPhysical } from './lib/faceEmotionProvider'
import {
  DEFAULT_ROBOT_CALIBRATION,
  combineEmotionSummaries,
  summarizeVoiceEmotion,
} from './lib/voiceEngine'

const DEFAULT_SESSION_MS = 60_000
const SESSION_WINDOW_SCHEDULE_MS = [7500, 15000, 22500, 30000, 37500, 45000, 52500, 60000]
const FACE_SAMPLE_INTERVAL_MS = 650
const VOICE_CAPTURE_ENABLED = true
// Ajustar este valor si cambia la duracion de la introduccion del avatar.
const AVATAR_INTRODUCTION_DELAY_MS = 20_000

function App() {
  // Cada hook se ocupa de una fuente distinta de informacion. App los coordina:
  // camara y voz producen senales, MQTT las comparte y la pantalla muestra el estado.
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
    lastPublished,
    lastRobotStatus,
    lastAiPlan,
    lastAiChunk,
    lastSystemError,
    lastCalibrationStatus,
    lastCalibrationError,
    lastCalibrationCommand,
    publishFaceEmotion,
    clearSessionState,
    publishSessionStart,
    publishSessionSummary,
    publishSessionWindow,
    publishSessionEnd,
    publishCalibrationCommand,
  } = useMqtt()

  const {
    status: voiceStatus,
    error: voiceError,
    transcript,
    voiceSamples,
    latestVoiceSample,
    summary: voiceSummary,
    start: startVoiceDetection,
    stop: stopVoiceDetection,
    reset: resetVoiceDetection,
    buildFusion: buildVoiceFusion,
  } = useVoiceDetector()

  const {
    connectionStatus: avatarConnectionStatus,
    error: avatarError,
    isSpeaking: avatarIsSpeaking,
    startConversation,
    stopConversation,
  } = useVoiceConversation()

  const [showSettingsPage, setShowSettingsPage] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionPreparing, setSessionPreparing] = useState(false)
  const [introductionStartedAt, setIntroductionStartedAt] = useState(null)
  const [introductionRemainingMs, setIntroductionRemainingMs] = useState(AVATAR_INTRODUCTION_DELAY_MS)
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const [remainingMs, setRemainingMs] = useState(DEFAULT_SESSION_MS)
  const [faceEmotionSamples, setFaceEmotionSamples] = useState([])
  const [faceSummary, setFaceSummary] = useState([])
  const [combinedEmotionSummary, setCombinedEmotionSummary] = useState([])
  const [selectedArtist, setSelectedArtist] = useState('kandinsky')
  const [mobility] = useState(88)
  const [robotCalibration] = useState(DEFAULT_ROBOT_CALIBRATION)
  const [actionMessage, setActionMessage] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [conversationModeId] = useState(DEFAULT_CONVERSATION_MODE)
  const [armCalibrationState, setArmCalibrationState] = useState({ active: false, moving: false })
  const [voiceConsentGranted, setVoiceConsentGranted] = useState(false)
  const [avatarRelayStatus, setAvatarRelayStatus] = useState('checking')

  const faceSamplesRef = useRef([])
  const voiceSamplesRef = useRef([])
  const transcriptRef = useRef([])
  const emotionsRef = useRef(null)
  const voiceSummaryRef = useRef(voiceSummary)
  const lastFaceSampleRef = useRef(0)
  const lastWindowFaceCursorRef = useRef(0)
  const lastWindowVoiceCursorRef = useRef(0)
  const lastWindowTranscriptCursorRef = useRef(0)
  const lastPublishedWindowIndexRef = useRef(-1)
  const captureSectionRef = useRef(null)
  const preparationIdRef = useRef(0)

  const selectedArtistInfo = useMemo(() => getArtistById(selectedArtist), [selectedArtist])
  const selectedPainterProfile = useMemo(() => getPainterProfile(selectedArtist), [selectedArtist])
  const selectedPainterRecipe = useMemo(() => getPainterRecipe(selectedArtist), [selectedArtist])
  const conversationMode = useMemo(() => getConversationMode(conversationModeId), [conversationModeId])
  const voiceAvailable = VOICE_CAPTURE_ENABLED
  const voiceCaptureActive = voiceAvailable && voiceConsentGranted
  const calibrationLocked = armCalibrationState.moving
  const captureDurationSeconds = Math.max(1, Number(detectionConfig.session?.captureSeconds) || 60)
  const captureDurationMs = captureDurationSeconds * 1000
  const liveFaceSummary = useMemo(() => calculateEmotionSummary(faceEmotionSamples), [faceEmotionSamples])
  const displayedFaceSummary = faceSummary.length ? faceSummary : liveFaceSummary
  const physicalFaceEmotions = useMemo(() => mapFaceEmotionToPhysical(emotions || {}), [emotions])
  const physicalDominant = useMemo(() => dominantPhysicalEmotion(physicalFaceEmotions), [physicalFaceEmotions])

  // Las refs guardan la version mas reciente para callbacks que pueden ejecutarse
  // despues de un render. Asi una ventana MQTT no usa una copia antigua de los datos.
  useEffect(() => {
    faceSamplesRef.current = faceEmotionSamples
  }, [faceEmotionSamples])

  useEffect(() => {
    voiceSamplesRef.current = voiceSamples
  }, [voiceSamples])

  useEffect(() => {
    const controller = new AbortController()

    fetch(VOICE_RELAY_HEALTH_URL, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const health = await response.json()
        setAvatarRelayStatus(health.configured ? 'ready' : 'error')
      })
      .catch((healthError) => {
        if (healthError.name !== 'AbortError') setAvatarRelayStatus('error')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    emotionsRef.current = emotions
  }, [emotions])

  useEffect(() => {
    voiceSummaryRef.current = voiceSummary
  }, [voiceSummary])

  useEffect(() => {
    if (sessionActive || combinedEmotionSummary.length > 0) return
    setRemainingMs(captureDurationMs)
  }, [captureDurationMs, combinedEmotionSummary.length, sessionActive])

  useEffect(() => {
    // La emocion facial puede publicarse durante la sesion, pero nunca mientras
    // el brazo esta ocupado calibrandose: calibrar tiene prioridad fisica.
    if (calibrationLocked) return
    if (emotions && dominant) {
      publishFaceEmotion({
        sessionId,
        artistId: selectedArtist,
        emotions: physicalFaceEmotions,
        dominant: physicalDominant,
        calibration: robotCalibration,
        mobility,
        sampleCount: faceSamplesRef.current.length,
        sessionActive,
      })
    }
  }, [calibrationLocked, dominant, emotions, mobility, physicalDominant, physicalFaceEmotions, publishFaceEmotion, robotCalibration, selectedArtist, sessionActive, sessionId])

  useEffect(() => {
    if (!sessionActive || !emotions || !dominant) return

    const now = Date.now()
    if (now - lastFaceSampleRef.current < FACE_SAMPLE_INTERVAL_MS) return
    lastFaceSampleRef.current = now

    setFaceEmotionSamples((currentSamples) => [
      ...currentSamples,
      {
        timestamp: now,
        detection_time: new Date(now).toISOString(),
        dominant: physicalDominant,
        emotions: physicalFaceEmotions,
      },
    ])
  }, [dominant, emotions, physicalDominant, physicalFaceEmotions, sessionActive])

  const publishEmotionWindow = useCallback(({ isFinalWindow = false, windowIndex, windowStartMs, windowEndMs } = {}) => {
    // Una ventana es un resumen de un periodo, no una fotografia ni una grabacion.
    // Los cursores evitan publicar dos veces la misma muestra.
    if (!sessionId || !sessionStartedAt) return false

    const elapsedMs = windowEndMs ?? Math.max(0, Date.now() - sessionStartedAt)
    const nextWindowIndex = windowIndex ?? SESSION_WINDOW_SCHEDULE_MS.findIndex((milestoneMs) => elapsedMs >= milestoneMs)
    if (nextWindowIndex < 0 || nextWindowIndex <= lastPublishedWindowIndexRef.current) return false
    const nextWindowStartMs = windowStartMs ?? (nextWindowIndex === 0 ? 0 : SESSION_WINDOW_SCHEDULE_MS[nextWindowIndex - 1])
    const nextWindowEndMs = Math.min(captureDurationMs, windowEndMs ?? SESSION_WINDOW_SCHEDULE_MS[nextWindowIndex])


    const faceSamples = faceSamplesRef.current.slice(lastWindowFaceCursorRef.current)
    const voiceWindowSamples = voiceSamplesRef.current.slice(lastWindowVoiceCursorRef.current)
    const transcriptDelta = transcriptRef.current.slice(lastWindowTranscriptCursorRef.current)
    const nextFaceSummary = calculateEmotionSummary(faceSamples)
    const nextVoiceSummary = voiceCaptureActive
      ? summarizeVoiceEmotion(voiceWindowSamples, transcriptDelta)
      : { main_emotions: [], sample_count: 0, color_preferences: [], keywords: [] }
    const nextCombinedSummary = voiceCaptureActive && (voiceWindowSamples.length || transcriptDelta.length)
      ? combineEmotionSummaries(nextFaceSummary, nextVoiceSummary)
      : nextFaceSummary

    const published = publishSessionWindow({
      sessionId,
      windowIndex: nextWindowIndex,
      windowStartMs: nextWindowStartMs,
      windowEndMs: nextWindowEndMs,
      isFinalWindow,
      artist: selectedArtistInfo,
      artistRecipeId: selectedPainterRecipe.id,
      artistRecipeVersion: selectedPainterRecipe.version,
      faceSamples,
      faceSummary: nextFaceSummary,
      voiceSamples: voiceCaptureActive ? voiceWindowSamples : [],
      voiceSummary: nextVoiceSummary,
      combinedSummary: nextCombinedSummary,
      transcriptDelta,
      calibration: robotCalibration,
      mobility,
      voiceConsent: voiceCaptureActive,
      conversationMode: voiceCaptureActive ? conversationMode.id : 'face_only',
    })

    if (published) {
      lastPublishedWindowIndexRef.current = nextWindowIndex
      lastWindowFaceCursorRef.current = faceSamplesRef.current.length
      lastWindowVoiceCursorRef.current = voiceSamplesRef.current.length
      lastWindowTranscriptCursorRef.current = transcriptRef.current.length
    }

    return published
  }, [captureDurationMs, conversationMode.id, mobility, publishSessionWindow, robotCalibration, selectedArtistInfo, selectedPainterRecipe.id, selectedPainterRecipe.version, sessionId, sessionStartedAt, voiceCaptureActive])

  const finishSession = useCallback(() => {
    // Al terminar reunimos lo que queda pendiente y enviamos una ultima ventana
    // para que el bridge pueda cerrar la obra aunque el temporizador no coincida.
    const nextFaceSummary = calculateEmotionSummary(faceSamplesRef.current)
    const currentVoiceSummary = voiceSummaryRef.current
    const fusedEmotion = voiceCaptureActive ? buildVoiceFusion(emotionsRef.current) : null
    const nextVoiceSummary = voiceCaptureActive
      ? {
        ...currentVoiceSummary,
        main_emotions: fusedEmotion.art_summary,
        fused_emotion: fusedEmotion,
      }
      : {
        ...currentVoiceSummary,
        main_emotions: [],
        simple_emotion: 'disabled',
        label: 'voz desactivada',
        confidence: 0,
      }
    const nextCombinedSummary = voiceCaptureActive && fusedEmotion.art_summary?.length
      ? fusedEmotion.art_summary
      : voiceCaptureActive
        ? combineEmotionSummaries(nextFaceSummary, nextVoiceSummary)
        : nextFaceSummary

    stopVoiceDetection()
    stopConversation()
    stopCamera()
    publishEmotionWindow({
      isFinalWindow: true,
      windowIndex: SESSION_WINDOW_SCHEDULE_MS.length - 1,
      windowStartMs: SESSION_WINDOW_SCHEDULE_MS.at(-2),
      windowEndMs: captureDurationMs,
    })
    setSessionActive(false)
    setRemainingMs(0)
    setFaceSummary(nextFaceSummary)
    setCombinedEmotionSummary(nextCombinedSummary)

    if (nextCombinedSummary.length > 0) {
      publishSessionSummary({
        sessionId,
        artist: selectedArtistInfo,
        faceSummary: nextFaceSummary,
        voiceSummary: nextVoiceSummary,
        combinedSummary: nextCombinedSummary,
        transcript: transcriptRef.current,
        calibration: robotCalibration,
        mobility,
        conversationMode: voiceCaptureActive ? conversationMode.id : 'face_only',
      })
    }

    publishSessionEnd({
      sessionId,
      artist: selectedArtistInfo,
      totalWindows: SESSION_WINDOW_SCHEDULE_MS.length,
      durationMs: captureDurationMs,
      reason: nextCombinedSummary.length > 0 ? 'completed' : 'insufficient_emotion_data',
      calibration: robotCalibration,
      mobility,
    })

    setActionMessage(nextCombinedSummary.length > 0
      ? 'Lectura emocional enviada por ventanas. La obra dinámica continúa desde los chunks del AI Bridge.'
      : `No hay suficientes datos de emoción. Repite la captura con cámara${voiceCaptureActive ? ' y micrófono' : ''} activos.`)
  }, [
    buildVoiceFusion,
    conversationMode.id,
    captureDurationMs,
    mobility,
    publishEmotionWindow,
    publishSessionEnd,
    publishSessionSummary,
    robotCalibration,
    selectedArtistInfo,
    sessionId,
    stopConversation,
    stopCamera,
    stopVoiceDetection,
    voiceCaptureActive,
  ])

  useEffect(() => {
    if (!sessionActive || !sessionStartedAt) return undefined

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - sessionStartedAt
      const remaining = Math.max(0, captureDurationMs - elapsed)
      setRemainingMs(remaining)
      if (remaining <= 0) {
        finishSession()
        return
      }
      const nextWindowIndex = lastPublishedWindowIndexRef.current + 1
      if (elapsed >= SESSION_WINDOW_SCHEDULE_MS[nextWindowIndex]) {
        publishEmotionWindow({
          windowIndex: nextWindowIndex,
          windowStartMs: nextWindowIndex === 0 ? 0 : SESSION_WINDOW_SCHEDULE_MS[nextWindowIndex - 1],
          windowEndMs: SESSION_WINDOW_SCHEDULE_MS[nextWindowIndex],
        })
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [captureDurationMs, finishSession, publishEmotionWindow, sessionActive, sessionStartedAt])

  useEffect(() => {
    if (!sessionPreparing || !introductionStartedAt) return undefined

    const timer = window.setInterval(() => {
      setIntroductionRemainingMs(Math.max(0, AVATAR_INTRODUCTION_DELAY_MS - (Date.now() - introductionStartedAt)))
    }, 250)

    return () => window.clearInterval(timer)
  }, [introductionStartedAt, sessionPreparing])

  const handleStopSession = useCallback(() => {
    if (sessionPreparing) {
      preparationIdRef.current += 1
      setSessionPreparing(false)
      setIntroductionStartedAt(null)
      setIntroductionRemainingMs(AVATAR_INTRODUCTION_DELAY_MS)
      stopVoiceDetection()
      stopConversation()
      stopCamera()
      setActionMessage('Presentación cancelada.')
      return
    }

    finishSession()
  }, [finishSession, sessionPreparing, stopCamera, stopConversation, stopVoiceDetection])

  const handleStartSession = useCallback(async () => {
    if (calibrationLocked) {
      setActionMessage('La captura emocional está bloqueada mientras la calibración del brazo está activa.')
      return
    }
    const preparationId = preparationIdRef.current + 1
    preparationIdRef.current = preparationId
    setSessionPreparing(true)
    setIntroductionStartedAt(Date.now())
    setIntroductionRemainingMs(AVATAR_INTRODUCTION_DELAY_MS)
    setActionMessage(null)
    clearSessionState()
    setFaceEmotionSamples([])
    setFaceSummary([])
    setCombinedEmotionSummary([])
    lastFaceSampleRef.current = 0
    lastWindowFaceCursorRef.current = 0
    lastWindowVoiceCursorRef.current = 0
    lastWindowTranscriptCursorRef.current = 0
    lastPublishedWindowIndexRef.current = -1
    faceSamplesRef.current = []
    resetVoiceDetection()
    const nextSessionId = createSessionId(mqttConfig.deviceId)
    setSessionId(nextSessionId)

    requestAnimationFrame(() => {
      captureSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    let ready = cameraActive
    if (!ready) ready = await startCamera()
    if (preparationId !== preparationIdRef.current) {
      stopCamera()
      return
    }
    if (!ready) {
      setSessionPreparing(false)
      return
    }

    if (voiceCaptureActive && conversationMode.id === 'voice_detector') {
      const started = await startVoiceDetection()
      if (preparationId !== preparationIdRef.current) {
        stopVoiceDetection()
        return
      }
      if (!started) {
        setActionMessage('No se pudo activar el micrófono. La sesión puede continuar solo con rostro si lo deseas.')
      }
    }

    if (voiceCaptureActive) {
      try {
        await startConversation()
        if (preparationId !== preparationIdRef.current) {
          stopConversation()
          return
        }
      } catch (avatarError) {
        if (preparationId !== preparationIdRef.current) return
        console.error('No se pudo iniciar la conversación del avatar:', avatarError)
        setActionMessage('La sesión continúa sin conversación del avatar.')
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, AVATAR_INTRODUCTION_DELAY_MS))
  if (preparationId !== preparationIdRef.current) return

    publishSessionStart({
      sessionId: nextSessionId,
      artist: selectedArtistInfo,
      mobility,
      calibration: robotCalibration,
      conversationMode: voiceCaptureActive ? conversationMode.id : 'face_only',
    })

    setRemainingMs(captureDurationMs)
    setSessionStartedAt(Date.now())
    setSessionActive(true)
    setSessionPreparing(false)
  }, [
    cameraActive,
    conversationMode.id,
    captureDurationMs,
    mobility,
    mqttConfig.deviceId,
    clearSessionState,
    publishSessionStart,
    robotCalibration,
    selectedArtistInfo,
    startCamera,
    startVoiceDetection,
    calibrationLocked,
    resetVoiceDetection,
    startConversation,
    stopCamera,
    stopConversation,
    stopVoiceDetection,
    voiceCaptureActive,
  ])

  const handleCalibrationStateChange = useCallback((nextState) => {
    setArmCalibrationState(nextState)
  }, [])

  const handleSelectArtist = useCallback((artistId) => {
    if (sessionActive) {
      setActionMessage('Termina o reinicia la captura antes de cambiar de pintor.')
      return
    }
    setSelectedArtist(artistId)
  }, [sessionActive])

  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const introductionRemainingSeconds = Math.ceil(introductionRemainingMs / 1000)
  const captureProgress = combinedEmotionSummary.length > 0
    ? 100
    : sessionActive
      ? Math.max(0, Math.min(100, ((captureDurationMs - remainingMs) / captureDurationMs) * 100))
      : 0
  const calibrationTopics = calibrationTopicsFromMap(mqttConfig.topics)
  const robotStatusPayload = lastRobotStatus?.payload

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="grid grid-cols-3 items-center border-b border-zinc-800 px-4 py-4">
        <div className="col-start-2 text-center shrink-0">
            <div className="flex items-center justify-center gap-2">
              <img src="/logo-esplubot.png" alt="Esplubot" className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900 p-1" />
              <span className="text-xl font-semibold tracking-[0.18em] uppercase text-white sm:text-2xl">Moodcam</span>
          </div>
            <p className="mt-1 text-xs text-zinc-500">Inner Synergy · emoción · arte generativo · pintura A4</p>
            <p className="text-xs text-zinc-500">by Esplubot Natzaret</p>
        </div>
        <div className="col-start-3 flex items-center justify-self-end gap-1">
          <button
            onClick={() => setShowSettingsPage(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Configuración"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <main className={`flex-1 w-full mx-auto p-4 space-y-5 ${showSettingsPage ? 'max-w-7xl' : 'max-w-6xl'}`}>
        {showSettingsPage ? (
          <SettingsPage
            config={detectionConfig}
            onConfigChange={updateConfig}
            onReset={resetConfig}
            mqttConfig={mqttConfig}
            onMqttConfigChange={updateMqttConfig}
            onMqttReset={resetMqttConfig}
            mqttStatus={connectionStatus}
            mqttError={lastError}
            robotCalibrationProps={{
              mqttStatus: connectionStatus,
              lastStatus: lastCalibrationStatus,
              lastError: lastCalibrationError,
              lastCommand: lastCalibrationCommand,
              topics: calibrationTopics,
              onSend: publishCalibrationCommand,
              onCalibrationStateChange: handleCalibrationStateChange,
            }}
            onBack={() => setShowSettingsPage(false)}
          />
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <PainterSelector selectedArtist={selectedArtist} onSelect={handleSelectArtist} />
                </div>
                <button
                  onClick={sessionActive || sessionPreparing ? handleStopSession : handleStartSession}
                  disabled={!sessionActive && !sessionPreparing && (!modelsLoaded || loading || calibrationLocked)}
                  className={`min-h-12 shrink-0 px-8 rounded-lg font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    sessionActive || sessionPreparing
                      ? 'bg-red-500 text-white hover:bg-red-400'
                      : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                  }`}
                >
                  {sessionActive || sessionPreparing ? 'Detener' : loading ? 'Cargando modelos...' : 'Iniciar'}
                </button>
              </div>

              <VoiceConsentPanel
                voiceAvailable={voiceAvailable}
                voiceConsentGranted={voiceConsentGranted}
                sessionActive={sessionActive || sessionPreparing}
                onVoiceConsentChange={setVoiceConsentGranted}
              />

              {error && <div className="bg-red-950/40 border border-red-700 text-red-200 rounded-lg p-3 text-sm text-center">{error}</div>}

              <div ref={captureSectionRef} className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.55fr)] gap-4 xl:items-start">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 md:p-4">
                  <CameraView videoRef={videoRef} canvasRef={canvasRef} cameraActive={cameraActive} />
                  <CaptureTimer
                    remainingSeconds={remainingSeconds}
                    captureDurationSeconds={captureDurationSeconds}
                    progress={captureProgress}
                    sessionActive={sessionActive}
                    sessionPreparing={sessionPreparing}
                    introductionRemainingSeconds={introductionRemainingSeconds}
                    captureComplete={combinedEmotionSummary.length > 0}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(360px,1fr)_minmax(230px,0.6fr)] xl:items-start">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                    <ConversationPanel
                      artist={selectedArtistInfo}
                      status={voiceStatus}
                      error={voiceError}
                      transcript={transcript}
                      mode={conversationMode}
                      voiceEnabled={voiceCaptureActive}
                      captureComplete={combinedEmotionSummary.length > 0}
                      avatarConnectionStatus={avatarConnectionStatus}
                      avatarIsSpeaking={avatarIsSpeaking}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Emociones predominantes</h2>
                      <EmotionDisplay emotions={physicalFaceEmotions} dominant={physicalDominant} age={age} gender={gender} />
                    </div>

                    <VoiceCaptureStatus
                      enabled={voiceCaptureActive}
                      status={voiceStatus}
                      error={voiceError}
                      latestSample={latestVoiceSample}
                      transcript={transcript}
                    />
                  </div>
                </div>
              </div>

              {combinedEmotionSummary.length > 0 && (
                <section className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 md:p-5">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-amber-100">Experiencia finalizada</h2>
                    <p className="mt-1 text-sm text-amber-50/80">Gracias por compartir este momento. Este es el resumen de las emociones capturadas durante la experiencia.</p>
                  </div>
                  <VoiceEmotionPanel
                    latestSample={latestVoiceSample}
                    summary={voiceSummary}
                    combinedSummary={combinedEmotionSummary}
                    faceSummary={displayedFaceSummary}
                    title="Resumen emocional"
                  />
                </section>
              )}

              <DynamicArtworkStatus aiChunk={lastAiChunk} aiPlan={lastAiPlan} robotStatus={robotStatusPayload} sessionActive={sessionActive} />

              <DemoReadinessPanel
                mqttStatus={connectionStatus}
                aiPlan={lastAiPlan}
                aiChunk={lastAiChunk}
                hasEmotionSummary={combinedEmotionSummary.length > 0}
                robotStatus={lastCalibrationStatus || lastRobotStatus}
                voiceStatus={voiceStatus}
                voiceEnabled={voiceCaptureActive}
                avatarConnectionStatus={avatarConnectionStatus}
                avatarRelayStatus={avatarRelayStatus}
                painter={selectedPainterProfile}
                sessionActive={sessionActive}
                calibrationActive={false}
                calibrationLocked={calibrationLocked}
                calibrationMoving={armCalibrationState.moving}
              />
            </section>

            {(actionMessage || lastPublished || lastError || lastSystemError || lastAiPlan || avatarRelayStatus !== 'checking' || avatarConnectionStatus !== 'Disconnected' || avatarError) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
                {actionMessage && <p>{actionMessage}</p>}
                {avatarRelayStatus === 'ready' && avatarConnectionStatus === 'Disconnected' && <p>Avatar: servicio disponible</p>}
                {avatarRelayStatus === 'error' && <p className="text-red-300">Avatar: relay no disponible o sin configurar</p>}
                {avatarConnectionStatus !== 'Disconnected' && <p>Avatar: {avatarStatusLabel(avatarConnectionStatus, avatarIsSpeaking)}</p>}
                {avatarError && <p className="text-red-300">Avatar: {avatarError}</p>}
                {lastAiPlan && <p>Propuesta artística recibida: {lastAiPlan.payload?.id || lastAiPlan.payload?.plan_id || 'sin id'}</p>}
                {lastAiChunk && <p>Chunk dinámico recibido: {lastAiChunk.payload?.chunk_id || lastAiChunk.payload?.id || 'sin id'}</p>}
                {lastPublished && <p>Último MQTT: {lastPublished.topic}</p>}
                {lastSystemError && <p className="text-amber-300">Sistema: {formatSystemError(lastSystemError.payload)}</p>}
                {lastError && <p className="text-red-300">MQTT: {lastError}</p>}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="py-3 text-center text-xs text-zinc-600 border-t border-zinc-800">
        {`Topics: moodcam/${mqttConfig.deviceId}/session · ai/${mqttConfig.deviceId}/stroke_chunk · robot/${mqttConfig.deviceId}/command`}
      </footer>
    </div>
  )
}

function DynamicArtworkStatus({ aiChunk, aiPlan, robotStatus, sessionActive }) {
  const queueDepth = Number(robotStatus?.queue_depth)
  const hasQueueDepth = Number.isFinite(queueDepth)
  const windowIndex = Number(aiChunk?.payload?.window_index)
  const packageLabel = Number.isInteger(windowIndex) ? `${windowIndex + 1}/8` : '-'
  const strokeCount = Array.isArray(aiChunk?.payload?.robot_commands)
    ? aiChunk.payload.robot_commands.filter((command) => command.type === 'stroke').length
    : '-'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Obra dinámica</h2>
        <p className="text-xs text-gray-500 mt-1">
          {sessionActive ? 'Generando trazos por ventanas de emoción.' : 'Inicia una captura para recibir chunks del AI Bridge.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatusMetric label="Último chunk" value={aiChunk?.payload?.chunk_id || aiChunk?.payload?.id || 'pendiente'} />
        <StatusMetric label="Paquete" value={packageLabel} />
        <StatusMetric label="Trazos" value={strokeCount} />
        <StatusMetric label="Cola robot" value={hasQueueDepth ? `${queueDepth}/${robotStatus.queue_capacity ?? '?'}` : robotStatus?.queue_full ? 'llena' : '-'} />
      </div>
      {aiPlan && (
        <p className="text-xs text-zinc-500">Plan compatible recibido: {aiPlan.payload?.id || aiPlan.payload?.plan_id || 'sin id'}</p>
      )}
    </div>
  )
}

function VoiceConsentPanel({ voiceAvailable, voiceConsentGranted, sessionActive, onVoiceConsentChange }) {
  if (!voiceAvailable) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-500">
        La captura de voz estará disponible cuando el servicio artístico con IA esté preparado.
      </div>
    )
  }

  return (
    <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={voiceConsentGranted}
        disabled={sessionActive}
        onChange={(event) => onVoiceConsentChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-amber-300 disabled:opacity-40"
      />
      <span>
        <span className="block font-semibold text-zinc-100">Activar captura de voz</span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
          Al activar la voz, su transcripción temporal puede enviarse a OpenAI para ayudar a crear la obra. No guardamos ni enviamos audio o vídeo. Sin voz, la sesión usa solo la cámara.
        </span>
      </span>
    </label>
  )
}

function VoiceCaptureStatus({ enabled, status, error, latestSample, transcript }) {
  const intensity = latestSample?.intensity ?? 0
  const label = enabled ? voiceCaptureLabel(status) : 'desactivada'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Captura de voz</h2>
        <span className="rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-300">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatusMetric label="Intensidad" value={enabled ? `${intensity}%` : '-'} />
        <StatusMetric label="Transcript" value={enabled ? `${transcript.length} entradas` : '-'} />
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}

function CaptureTimer({ remainingSeconds, captureDurationSeconds, progress, sessionActive, sessionPreparing, introductionRemainingSeconds, captureComplete }) {
  const progressValue = Math.max(0, Math.min(100, progress || 0))
  const progressStyle = sessionActive
    ? { animation: `capture-progress-fill ${captureDurationSeconds}s linear forwards` }
    : { transform: `scaleX(${progressValue / 100})` }
  const isIntroduction = sessionPreparing && !sessionActive
  const label = isIntroduction ? 'Tiempo de presentación' : 'Tiempo de captura'
  const timeValue = isIntroduction
    ? `${introductionRemainingSeconds}s`
    : captureComplete ? '0s' : sessionActive ? `${remainingSeconds}s` : `${captureDurationSeconds}s`

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-2xl font-semibold text-zinc-100">{timeValue}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full w-full origin-left bg-linear-to-r from-cyan-300 via-amber-300 to-rose-400" style={progressStyle} />
      </div>
    </div>
  )
}

function voiceCaptureLabel(status) {
  if (status === 'listening' || status === 'live') return 'escuchando'
  if (status === 'starting' || status === 'connecting') return 'iniciando'
  if (status === 'ended') return 'analizada'
  if (status === 'error') return 'error'
  return 'lista'
}

function StatusMetric({ label, value }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
      <span className="block text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="mt-1 block truncate text-sm font-semibold text-zinc-200">{value}</span>
    </div>
  )
}

function formatSystemError(payload) {
  if (typeof payload === 'string') return payload
  return payload?.message || payload?.error || JSON.stringify(payload)
}

function avatarStatusLabel(status, isSpeaking) {
  if (status === 'Connecting') return 'conectando'
  if (status === 'Connected') return isSpeaking ? 'conectado y hablando' : 'conectado'
  return 'desconectado'
}

export default App
