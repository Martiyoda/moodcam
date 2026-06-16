import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useFaceDetection from './hooks/useFaceDetection'
import useMqtt from './hooks/useMqtt'
import useVoiceDetector from './hooks/useVoiceDetector'
import CameraView from './components/CameraView'
import EmotionDisplay from './components/EmotionDisplay'
import SettingsModal from './components/SettingsModal'
import PainterSelector from './components/PainterSelector'
import ArtPlanPanel from './components/ArtPlanPanel'
import ConversationPanel from './components/ConversationPanel'
import VoiceEmotionPanel from './components/VoiceEmotionPanel'
import RobotCalibrationPanel from './components/RobotCalibrationPanel'
import PainterVideoManager from './components/PainterVideoManager'
import DemoReadinessPanel from './components/DemoReadinessPanel'
import { calculateEmotionSummary, generateArtPlan, getArtistById } from './lib/artEngine'
import { DEFAULT_CONVERSATION_MODE, getConversationMode } from './lib/conversationModes'
import { calibrationTopicsFromMap, createSessionId } from './lib/mqttContract'
import { getPainterProfile } from './lib/painterProfiles'
import { selectPainterResponse } from './lib/painterResponseSelector'
import {
  DEFAULT_ROBOT_CALIBRATION,
  combineEmotionSummaries,
} from './lib/voiceEngine'

const SESSION_MS = 60_000
const FACE_SAMPLE_INTERVAL_MS = 650

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
    lastSystemError,
    lastCalibrationStatus,
    lastCalibrationError,
    lastCalibrationCommand,
    publishFaceEmotion,
    publishSessionStart,
    publishSessionSummary,
    publishArtPlan,
    publishRobotCommands,
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

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const [remainingMs, setRemainingMs] = useState(SESSION_MS)
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

  const faceSamplesRef = useRef([])
  const voiceSamplesRef = useRef([])
  const transcriptRef = useRef([])
  const lastFaceSampleRef = useRef(0)

  const selectedArtistInfo = useMemo(() => getArtistById(selectedArtist), [selectedArtist])
  const selectedPainterProfile = useMemo(() => getPainterProfile(selectedArtist), [selectedArtist])
  const conversationMode = useMemo(() => getConversationMode(conversationModeId), [conversationModeId])
  const calibrationLocked = currentStep === 4 || armCalibrationState.active
  const liveFaceSummary = useMemo(() => calculateEmotionSummary(faceEmotionSamples), [faceEmotionSamples])
  const displayedFaceSummary = faceSummary.length ? faceSummary : liveFaceSummary
  const fallbackArtPlan = useMemo(() => {
    if (combinedEmotionSummary.length === 0) return null
    return generateArtPlan({
      mainEmotions: combinedEmotionSummary,
      artistId: selectedArtist,
      mobility,
      calibration: robotCalibration,
      colorPreferences: voiceSummary.color_preferences,
      voiceSummary,
    })
  }, [combinedEmotionSummary, mobility, robotCalibration, selectedArtist, voiceSummary])
  const aiArtPlan = lastAiPlan?.payload?.robot_commands ? lastAiPlan.payload : null
  const artPlan = aiArtPlan || fallbackArtPlan
  const planSource = aiArtPlan ? 'ai_bridge' : 'local_fallback'
  const painterResponse = useMemo(() => selectPainterResponse({
    painterId: selectedArtist,
    emotion: latestVoiceSample?.dominant || combinedEmotionSummary[0]?.simple_emotion || 'neutral',
  }), [combinedEmotionSummary, latestVoiceSample, selectedArtist])

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

  const finishSession = useCallback(() => {
    const nextFaceSummary = calculateEmotionSummary(faceSamplesRef.current)
    const fusedEmotion = buildVoiceFusion(emotions)
    const nextVoiceSummary = {
      ...voiceSummary,
      main_emotions: fusedEmotion.art_summary,
      fused_emotion: fusedEmotion,
    }
    const nextCombinedSummary = fusedEmotion.art_summary?.length
      ? fusedEmotion.art_summary
      : combineEmotionSummaries(nextFaceSummary, nextVoiceSummary)

    stopVoiceDetection()
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
        conversationMode: conversationMode.id,
      })
    }

    setActionMessage(nextCombinedSummary.length > 0
      ? 'Sesión enviada al AI Bridge. Esperando plan IA por HiveMQ.'
      : 'No hay suficientes datos de emoción. Repite la conversación con cámara y micrófono activos.')
    if (nextCombinedSummary.length > 0) setCurrentStep(3)
  }, [
    buildVoiceFusion,
    conversationMode.id,
    emotions,
    mobility,
    publishSessionSummary,
    robotCalibration,
    selectedArtistInfo,
    sessionId,
    stopVoiceDetection,
    voiceSummary,
  ])

  useEffect(() => {
    if (!sessionActive || !sessionStartedAt) return undefined

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, SESSION_MS - (Date.now() - sessionStartedAt))
      setRemainingMs(remaining)
      if (remaining <= 0) finishSession()
    }, 250)

    return () => window.clearInterval(timer)
  }, [finishSession, sessionActive, sessionStartedAt])

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
    faceSamplesRef.current = []
    const nextSessionId = createSessionId(mqttConfig.deviceId)
    setSessionId(nextSessionId)

    let ready = cameraActive
    if (!ready) ready = await startCamera()
    if (!ready) return

    if (conversationMode.id === 'voice_detector') {
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
      conversationMode: conversationMode.id,
    })

    setRemainingMs(SESSION_MS)
    setSessionStartedAt(Date.now())
    setSessionActive(true)
    setCurrentStep(2)
  }, [
    cameraActive,
    conversationMode.id,
    mobility,
    mqttConfig.deviceId,
    publishSessionStart,
    robotCalibration,
    selectedArtistInfo,
    startCamera,
    startVoiceDetection,
    calibrationLocked,
  ])

  const handleResetExperience = useCallback(() => {
    resetVoiceDetection()
    faceSamplesRef.current = []
    voiceSamplesRef.current = []
    transcriptRef.current = []
    lastFaceSampleRef.current = 0
    setSessionActive(false)
    setSessionStartedAt(null)
    setRemainingMs(SESSION_MS)
    setFaceEmotionSamples([])
    setFaceSummary([])
    setCombinedEmotionSummary([])
    setActionMessage(null)
    setSessionId(null)
  }, [resetVoiceDetection])

  const handleStopCamera = useCallback(() => {
    handleResetExperience()
    stopCamera()
  }, [handleResetExperience, stopCamera])

  const handleSendPlan = useCallback(() => {
    if (calibrationLocked) {
      setActionMessage('El envío artístico está bloqueado mientras la calibración del brazo está activa.')
      return
    }
    if (!artPlan || combinedEmotionSummary.length === 0) return

    const sent = planSource === 'ai_bridge'
      ? publishRobotCommands(artPlan)
      : [
        publishSessionSummary({
          sessionId,
          artist: selectedArtistInfo,
          faceSummary: displayedFaceSummary,
          voiceSummary,
          combinedSummary: combinedEmotionSummary,
          transcript,
          calibration: robotCalibration,
          mobility,
          conversationMode: conversationMode.id,
        }),
        publishArtPlan(artPlan),
        publishRobotCommands(artPlan),
      ].every(Boolean)

    setActionMessage(sent
      ? `${planSource === 'ai_bridge' ? 'Plan IA reenviado' : 'Fallback local enviado'} por MQTT: ${artPlan.robot_commands.length} comandos.`
      : 'Activa MQTT y espera a que el estado sea conectado antes de enviar al robot.')
  }, [
    artPlan,
    combinedEmotionSummary,
    conversationMode.id,
    displayedFaceSummary,
    mobility,
    planSource,
    publishArtPlan,
    publishRobotCommands,
    publishSessionSummary,
    robotCalibration,
    selectedArtistInfo,
    sessionId,
    transcript,
    voiceSummary,
    calibrationLocked,
  ])

  const handleCalibrationStateChange = useCallback((nextState) => {
    setArmCalibrationState(nextState)
  }, [])

  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const calibrationTopics = calibrationTopicsFromMap(mqttConfig.topics)
  const robotStatusPayload = lastRobotStatus?.payload
  const canOpenStep = useCallback((step) => {
    if (step <= 2) return true
    if (step === 3) return displayedFaceSummary.length > 0 || voiceSamples.length > 0 || combinedEmotionSummary.length > 0
    if (step === 4) return true
    if (step === 5) return combinedEmotionSummary.length > 0 && !calibrationLocked
    return false
  }, [calibrationLocked, combinedEmotionSummary.length, displayedFaceSummary.length, voiceSamples.length])
  const goToStep = useCallback((step) => {
    if (!canOpenStep(step)) return
    if (step === 4 && sessionActive) {
      stopVoiceDetection()
      setSessionActive(false)
      setSessionStartedAt(null)
      setRemainingMs(SESSION_MS)
      setActionMessage('Captura detenida sin enviar al AI Bridge. Calibración angular activa.')
    }
    setCurrentStep(step)
  }, [canOpenStep, sessionActive, stopVoiceDetection])
  const activeStep = sessionActive ? 2 : currentStep

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
            <img src="/e-motion-wordmark.png" alt="E-motion" className="h-12 w-auto max-w-[210px] rounded-md object-contain shadow-md" />
          </div>
          <p className="text-xs text-zinc-500 mt-1">captura emocional · AI Bridge · robot A4</p>
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
            onClick={() => setSettingsOpen(true)}
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

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 space-y-5">
        <StepStrip active={activeStep} currentStep={currentStep} canOpenStep={canOpenStep} onSelect={goToStep} />
        <DemoReadinessPanel
          mqttStatus={connectionStatus}
          aiPlan={lastAiPlan}
          robotStatus={lastCalibrationStatus || lastRobotStatus}
          voiceStatus={voiceStatus}
          painter={selectedPainterProfile}
          sessionActive={sessionActive}
          calibrationActive={calibrationLocked}
          calibrationMoving={armCalibrationState.moving}
        />

        {currentStep === 1 && (
          <Screen title="1. Elegir pintor" description="Primero se selecciona el artista que definirá cómo se moverá y pintará el brazo.">
            <PainterSelector selectedArtist={selectedArtist} onSelect={setSelectedArtist} />
            <ScreenActions>
              <button onClick={() => setCurrentStep(2)} className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-colors">
                Continuar a captura
              </button>
            </ScreenActions>
          </Screen>
        )}

        {currentStep === 2 && (
          <Screen title={`2. Capturar emoción con ${selectedArtistInfo.name}`} description="Moodcam toma muestras faciales y publica la sesión para que el AI Bridge decida el plan.">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-5">
              <div className="space-y-4">
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
                <PainterVideoManager
                  painter={selectedPainterProfile}
                  response={painterResponse}
                  emotionLabel={latestVoiceSample?.label || combinedEmotionSummary[0]?.label}
                />
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                  <ConversationPanel
                    artist={selectedArtistInfo}
                    status={voiceStatus}
                    error={voiceError}
                    transcript={transcript}
                    mode={conversationMode}
                    remainingSeconds={remainingSeconds}
                    sessionActive={sessionActive}
                    onStart={handleStartSession}
                    onFinish={finishSession}
                    onReset={handleResetExperience}
                    disabled={!modelsLoaded || loading}
                  />
                </div>
              </div>
            </div>
            <ScreenActions>
              <button onClick={() => setCurrentStep(1)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">Anterior</button>
              <button onClick={() => goToStep(3)} disabled={!canOpenStep(3)} className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors">Ver emociones</button>
            </ScreenActions>
          </Screen>
        )}

        {currentStep === 3 && (
          <Screen title="3. Ver emociones detectadas" description="Aquí se comparan rostro, voz y resultado combinado antes de generar el dibujo.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Rostro</h2>
                <EmotionDisplay emotions={emotions} dominant={dominant} age={age} gender={gender} />
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <VoiceEmotionPanel latestSample={latestVoiceSample} summary={voiceSummary} combinedSummary={combinedEmotionSummary} faceSummary={displayedFaceSummary} />
              </div>
            </div>
            <ScreenActions>
              <button onClick={() => setCurrentStep(2)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">Anterior</button>
              <button onClick={() => setCurrentStep(4)} className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-colors">Calibrar A4</button>
            </ScreenActions>
          </Screen>
        )}

        {currentStep === 4 && (
          <Screen title="4. Calibración del brazo" description="Mueve una articulación cada vez y consulta su ángulo ordenado sin escribir mensajes MQTT manualmente.">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <RobotCalibrationPanel
                mqttStatus={connectionStatus}
                lastStatus={lastCalibrationStatus}
                lastError={lastCalibrationError}
                lastCommand={lastCalibrationCommand}
                topics={calibrationTopics}
                onSend={publishCalibrationCommand}
                onCalibrationStateChange={handleCalibrationStateChange}
              />
            </div>
            <ScreenActions>
              <button onClick={() => setCurrentStep(3)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">Anterior</button>
              <button onClick={() => goToStep(5)} disabled={!canOpenStep(5)} className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors">Continuar</button>
            </ScreenActions>
          </Screen>
        )}

        {currentStep === 5 && (
          <Screen title="5. Enviar a ESP32" description="Revisa el plan recibido desde el AI Bridge o el fallback local y reenvía la secuencia si hace falta.">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <ArtPlanPanel plan={artPlan} planSource={planSource} mqttEnabled={mqttConfig.enabled} mqttStatus={connectionStatus} robotStatus={robotStatusPayload} onSend={handleSendPlan} disabled={calibrationLocked} />
            </div>
            <ScreenActions>
              <button onClick={() => setCurrentStep(4)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">Anterior</button>
            </ScreenActions>
          </Screen>
        )}

        {(actionMessage || lastPublished || lastError || lastSystemError || lastAiPlan) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
            {actionMessage && <p>{actionMessage}</p>}
            {lastAiPlan && <p>Plan IA recibido: {lastAiPlan.payload?.id || lastAiPlan.payload?.plan_id || 'sin id'}</p>}
            {lastPublished && <p>Último MQTT: {lastPublished.topic}</p>}
            {lastSystemError && <p className="text-amber-300">Sistema: {formatSystemError(lastSystemError.payload)}</p>}
            {lastError && <p className="text-red-300">MQTT: {lastError}</p>}
          </div>
        )}
      </main>

      <footer className="py-3 text-center text-xs text-zinc-600 border-t border-zinc-800">
        {`Topics: moodcam/${mqttConfig.deviceId}/session · ai/${mqttConfig.deviceId}/stroke_plan · robot/${mqttConfig.deviceId}/command`}
      </footer>

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

function StepStrip({ active, currentStep, canOpenStep, onSelect }) {
  const steps = ['Pintor', 'Captura', 'Emociones', 'Calibración', 'ESP32']

  return (
    <div className="grid grid-cols-5 gap-2">
      {steps.map((step, index) => {
        const number = index + 1
        const current = number === active
        const done = number < active
        const open = canOpenStep(number)

        return (
          <button
            key={step}
            onClick={() => onSelect(number)}
            disabled={!open}
            className={`rounded-lg border px-2 py-2 text-center text-xs transition-colors disabled:cursor-not-allowed ${
              current || currentStep === number
                ? 'border-amber-400 bg-amber-400/10 text-white'
                : done
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : open
                    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600'
                    : 'border-zinc-900 bg-zinc-950/50 text-zinc-700'
            }`}
          >
            <span className="block text-[10px]">{number}</span>
            <span className="font-semibold">{step}</span>
          </button>
        )
      })}
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

function ScreenActions({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-800 pt-4">
      {children}
    </div>
  )
}

function formatSystemError(payload) {
  if (typeof payload === 'string') return payload
  return payload?.message || payload?.error || JSON.stringify(payload)
}

export default App
