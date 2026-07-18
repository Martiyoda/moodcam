import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useFaceDetection from './hooks/useFaceDetection'
import useMqtt from './hooks/useMqtt'
import useVoiceDetector from './hooks/useVoiceDetector'
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
import {
  DEFAULT_ROBOT_CALIBRATION,
  combineEmotionSummaries,
  summarizeVoiceEmotion,
} from './lib/voiceEngine'

const DEFAULT_SESSION_MS = 30_000
const SESSION_WINDOW_MS = 5_000
const FACE_SAMPLE_INTERVAL_MS = 650
const VOICE_CAPTURE_ENABLED = true

function App() {
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

  const [showSettingsPage, setShowSettingsPage] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
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

  const selectedArtistInfo = useMemo(() => getArtistById(selectedArtist), [selectedArtist])
  const selectedPainterProfile = useMemo(() => getPainterProfile(selectedArtist), [selectedArtist])
  const selectedPainterRecipe = useMemo(() => getPainterRecipe(selectedArtist), [selectedArtist])
  const conversationMode = useMemo(() => getConversationMode(conversationModeId), [conversationModeId])
  const voiceCaptureActive = VOICE_CAPTURE_ENABLED && voiceConsentGranted
  const calibrationLocked = armCalibrationState.moving
  const captureDurationSeconds = Math.max(1, Number(detectionConfig.session?.captureSeconds) || 30)
  const captureDurationMs = captureDurationSeconds * 1000
  const liveFaceSummary = useMemo(() => calculateEmotionSummary(faceEmotionSamples), [faceEmotionSamples])
  const displayedFaceSummary = faceSummary.length ? faceSummary : liveFaceSummary

  useEffect(() => {
    faceSamplesRef.current = faceEmotionSamples
  }, [faceEmotionSamples])

  useEffect(() => {
    voiceSamplesRef.current = voiceSamples
  }, [voiceSamples])

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
    if (calibrationLocked) return
    if (emotions && dominant) {
      publishFaceEmotion({
        sessionId,
        artistId: selectedArtist,
        emotions,
        dominant,
        calibration: robotCalibration,
        mobility,
        sampleCount: faceSamplesRef.current.length,
        sessionActive,
      })
    }
  }, [calibrationLocked, dominant, emotions, mobility, publishFaceEmotion, robotCalibration, selectedArtist, sessionActive, sessionId])

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
        dominant,
        emotions,
      },
    ])
  }, [dominant, emotions, sessionActive])

  const publishEmotionWindow = useCallback(({ isFinalWindow = false, windowEndMs = null } = {}) => {
    if (!sessionId || !sessionStartedAt) return false

    const elapsedMs = windowEndMs ?? Math.max(0, Date.now() - sessionStartedAt)
    const windowIndex = Math.max(0, Math.ceil(elapsedMs / SESSION_WINDOW_MS) - 1)
    if (windowIndex <= lastPublishedWindowIndexRef.current) return false


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
      windowIndex,
      windowStartMs: Math.max(0, windowIndex * SESSION_WINDOW_MS),
      windowEndMs: Math.min(captureDurationMs, Math.max(elapsedMs, (windowIndex + 1) * SESSION_WINDOW_MS)),
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
      lastPublishedWindowIndexRef.current = windowIndex
      lastWindowFaceCursorRef.current = faceSamplesRef.current.length
      lastWindowVoiceCursorRef.current = voiceSamplesRef.current.length
      lastWindowTranscriptCursorRef.current = transcriptRef.current.length
    }

    return published
  }, [captureDurationMs, conversationMode.id, mobility, publishSessionWindow, robotCalibration, selectedArtistInfo, selectedPainterRecipe.id, selectedPainterRecipe.version, sessionId, sessionStartedAt, voiceCaptureActive])

  const finishSession = useCallback(() => {
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
    publishEmotionWindow({ isFinalWindow: true, windowEndMs: captureDurationMs })
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
      totalWindows: Math.ceil(captureDurationMs / SESSION_WINDOW_MS),
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
      if (elapsed >= (lastPublishedWindowIndexRef.current + 1) * SESSION_WINDOW_MS + SESSION_WINDOW_MS) {
        publishEmotionWindow()
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [captureDurationMs, finishSession, publishEmotionWindow, sessionActive, sessionStartedAt])

  const handleStartSession = useCallback(async () => {
    if (calibrationLocked) {
      setActionMessage('La captura emocional está bloqueada mientras la calibración del brazo está activa.')
      return
    }
    setActionMessage(null)
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

    let ready = cameraActive
    if (!ready) ready = await startCamera()
    if (!ready) return

    if (voiceCaptureActive && conversationMode.id === 'voice_detector') {
      const started = await startVoiceDetection()
      if (!started) {
        setActionMessage('No se pudo activar el micrófono. La sesión puede continuar solo con rostro si lo deseas.')
      }
    }

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
  }, [
    cameraActive,
    conversationMode.id,
    captureDurationMs,
    mobility,
    mqttConfig.deviceId,
    publishSessionStart,
    robotCalibration,
    selectedArtistInfo,
    startCamera,
    startVoiceDetection,
    calibrationLocked,
    resetVoiceDetection,
    voiceCaptureActive,
  ])

  const handleResetExperience = useCallback(() => {
    resetVoiceDetection()
    faceSamplesRef.current = []
    voiceSamplesRef.current = []
    transcriptRef.current = []
    lastFaceSampleRef.current = 0
    lastWindowFaceCursorRef.current = 0
    lastWindowVoiceCursorRef.current = 0
    lastWindowTranscriptCursorRef.current = 0
    lastPublishedWindowIndexRef.current = -1
    setSessionActive(false)
    setSessionStartedAt(null)
    setRemainingMs(captureDurationMs)
    setFaceEmotionSamples([])
    setFaceSummary([])
    setCombinedEmotionSummary([])
    setActionMessage(null)
    setSessionId(null)
  }, [captureDurationMs, resetVoiceDetection])

  const handleStopCamera = useCallback(() => {
    handleResetExperience()
    stopCamera()
  }, [handleResetExperience, stopCamera])

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
  const captureProgress = combinedEmotionSummary.length > 0
    ? 100
    : sessionActive
      ? Math.max(0, Math.min(100, ((captureDurationMs - remainingMs) / captureDurationMs) * 100))
      : 0
  const calibrationTopics = calibrationTopicsFromMap(mqttConfig.topics)
  const robotStatusPayload = lastRobotStatus?.payload

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="py-4 px-4 flex items-center justify-between border-b border-zinc-800">
        <a
          href="/proyecto"
          className="h-10 px-3 hidden sm:inline-flex items-center justify-center rounded-lg text-xs font-semibold text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Proyecto
        </a>
        <a
          href="/proyecto"
          className="w-10 h-10 sm:hidden flex items-center justify-center rounded-lg text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Proyecto"
          aria-label="Proyecto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 19.5V6.75A2.75 2.75 0 016.75 4h10.5A2.75 2.75 0 0120 6.75V19.5l-4-2-4 2-4-2-4 2z" />
          </svg>
        </a>
        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl sm:text-2xl font-semibold tracking-[0.18em] uppercase text-white">Inner Synergy</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">emoción · arte generativo · pintura A4</p>
        </div>
        <div className="flex items-center gap-1">
          {mqttConfig.enabled && (
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                connectionStatus === 'connected' ? 'bg-emerald-500' :
                connectionStatus === 'connecting' ? 'bg-amber-400 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-zinc-500'
              }`}
              title={`MQTT: ${connectionStatus}`}
            />
          )}
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
            <DemoReadinessPanel
              mqttStatus={connectionStatus}
              aiPlan={lastAiPlan}
              aiChunk={lastAiChunk}
              hasEmotionSummary={combinedEmotionSummary.length > 0}
              robotStatus={lastCalibrationStatus || lastRobotStatus}
              voiceStatus={voiceStatus}
              voiceEnabled={voiceCaptureActive}
              painter={selectedPainterProfile}
              sessionActive={sessionActive}
              calibrationActive={false}
              calibrationLocked={calibrationLocked}
              calibrationMoving={armCalibrationState.moving}
            />

          <Screen title="Crea una obra dinámica" description={voiceCaptureActive ? 'Elige un estilo, captura rostro y voz, y deja que AI Bridge genere chunks en tiempo real.' : 'Elige un estilo, captura el rostro y deja que AI Bridge genere chunks en tiempo real.'}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-5">
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                  <PainterSelector selectedArtist={selectedArtist} onSelect={handleSelectArtist} />
                </div>
                <CameraView videoRef={videoRef} canvasRef={canvasRef} cameraActive={cameraActive} />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      disabled={!modelsLoaded || loading}
                      className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-cyan-300 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-200 transition-colors"
                    >
                      {loading ? 'Cargando modelos...' : 'Iniciar cámara'}
                    </button>
                  ) : (
                    <button onClick={handleStopCamera} className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-red-500 hover:bg-red-400 text-white transition-colors">
                      Detener
                    </button>
                  )}
                  <button
                    onClick={handleStartSession}
                    disabled={!modelsLoaded || loading || sessionActive}
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
                  >
                    Iniciar captura
                  </button>
                </div>
                {error && <div className="bg-red-950/40 border border-red-700 text-red-200 rounded-lg p-3 text-sm text-center">{error}</div>}
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                  <ConversationPanel
                    artist={selectedArtistInfo}
                    status={voiceStatus}
                    error={voiceError}
                    transcript={transcript}
                    mode={conversationMode}
                    voiceEnabled={voiceCaptureActive}
                    voiceAvailable={VOICE_CAPTURE_ENABLED}
                    voiceConsentGranted={voiceConsentGranted}
                    onVoiceConsentChange={setVoiceConsentGranted}
                    remainingSeconds={remainingSeconds}
                    captureDurationSeconds={captureDurationSeconds}
                    progress={captureProgress}
                    sessionActive={sessionActive}
                    captureComplete={combinedEmotionSummary.length > 0}
                    onReset={handleResetExperience}
                  />
                </div>
                {combinedEmotionSummary.length > 0 ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                    <VoiceEmotionPanel
                      latestSample={latestVoiceSample}
                      summary={voiceSummary}
                      combinedSummary={combinedEmotionSummary}
                      faceSummary={displayedFaceSummary}
                      title="Resumen de emociones"
                      description={`Lectura capturada durante ${captureDurationSeconds} segundos.`}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Emoción en vivo</h2>
                    <EmotionDisplay emotions={emotions} dominant={dominant} age={age} gender={gender} />
                  </div>
                )}
                <DynamicArtworkStatus aiChunk={lastAiChunk} aiPlan={lastAiPlan} robotStatus={robotStatusPayload} sessionActive={sessionActive} />
              </div>
            </div>
          </Screen>

            {(actionMessage || lastPublished || lastError || lastSystemError || lastAiPlan) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
                {actionMessage && <p>{actionMessage}</p>}
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

function Screen({ title, description, children }) {
  return (
    <section className="min-h-[calc(100vh-220px)] rounded-lg border border-zinc-800 bg-zinc-950/30 p-4 md:p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-zinc-500 mt-1">{description}</p>
      </div>
      {children}
    </section>
  )
}

function DynamicArtworkStatus({ aiChunk, aiPlan, robotStatus, sessionActive }) {
  const queueDepth = Number(robotStatus?.queue_depth)
  const hasQueueDepth = Number.isFinite(queueDepth)

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
        <StatusMetric label="Ventana" value={aiChunk?.payload?.window_index ?? '-'} />
        <StatusMetric label="Comandos" value={aiChunk?.payload?.command_count ?? '-'} />
        <StatusMetric label="Cola robot" value={hasQueueDepth ? `${queueDepth}/${robotStatus.queue_capacity ?? '?'}` : robotStatus?.queue_full ? 'llena' : '-'} />
      </div>
      {aiPlan && (
        <p className="text-xs text-zinc-500">Plan compatible recibido: {aiPlan.payload?.id || aiPlan.payload?.plan_id || 'sin id'}</p>
      )}
    </div>
  )
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

export default App
