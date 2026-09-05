export function bridgeReadiness({ bridgePresence, calibrationLocked, aiPlan, aiChunk, hasEmotionSummary, sessionActive }) {
  if (calibrationLocked) return { label: 'bloqueado por movimiento', state: 'idle' }

  const bridgeStatus = bridgePresence?.payload?.status
  const openaiConfigured = bridgePresence?.payload?.openai_configured === true

  if (!bridgePresence) return { label: 'sin presencia', state: 'idle' }
  if (bridgeStatus !== 'online') return { label: 'no disponible', state: 'error' }
  if (!openaiConfigured) return { label: 'OpenAI no configurado', state: 'error' }
  if (aiChunk) return { label: `chunk ${aiChunk.payload?.window_index ?? '?'}`, state: 'ok' }
  if (aiPlan) return { label: `plan ${aiPlan.payload?.plan_id || aiPlan.payload?.id || 'recibido'}`, state: 'ok' }
  if (sessionActive) return { label: 'esperando chunks', state: 'pending' }
  if (hasEmotionSummary) return { label: 'esperando plan', state: 'pending' }
  return { label: 'esperando resumen', state: 'ok' }
}

export function cameraReadiness({ modelsLoaded, cameraActive, loading, error }) {
  if (error) return { label: 'no disponible', state: 'error' }
  if (loading) return { label: 'cargando modelos', state: 'pending' }
  if (cameraActive) return { label: 'activa', state: 'ok' }
  if (modelsLoaded) return { label: 'lista', state: 'ok' }
  return { label: 'sin inicializar', state: 'idle' }
}

export function voiceReadiness({ voiceAvailable, voiceEnabled, voiceStatus, sessionActive }) {
  if (!voiceAvailable) return { label: 'desactivada', state: 'idle' }
  if (!voiceEnabled) return { label: 'desactivada', state: 'idle' }
  if (voiceStatus === 'error') return { label: 'error micro', state: 'error' }
  if (voiceStatus === 'listening') return { label: 'escuchando', state: 'ok' }
  if (voiceStatus === 'ended') return { label: 'analizada', state: 'ok' }
  return { label: sessionActive ? 'iniciando' : 'lista', state: sessionActive ? 'pending' : 'ok' }
}