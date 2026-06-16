export const CONVERSATION_MODES = {
  voice_detector: {
    id: 'voice_detector',
    label: 'Voz + rostro MVP',
    statusLabel: 'Micrófono',
    description: 'Captura micrófono, transcript si el navegador lo permite, tono básico y emoción facial.',
  },
  none: {
    id: 'none',
    label: 'Solo visual',
    statusLabel: 'Sin voz',
    description: 'Captura cámara y emociones sin activar micrófono.',
  },
  webrtc: {
    id: 'webrtc',
    label: 'WebRTC directo',
    statusLabel: 'Voz en vivo',
    description: 'Reservado para conversación OpenAI Realtime en vivo.',
  },
  speech_tts: {
    id: 'speech_tts',
    label: 'Voz a texto + TTS',
    statusLabel: 'STT/TTS',
    description: 'Reservado para transcripción, respuesta de IA y síntesis de voz.',
  },
  predefined: {
    id: 'predefined',
    label: 'Diálogos predefinidos',
    statusLabel: 'Guion',
    description: 'Reservado para audios o mensajes cerrados por pintor.',
  },
}

export const DEFAULT_CONVERSATION_MODE = 'voice_detector'

export function getConversationMode(modeId = DEFAULT_CONVERSATION_MODE) {
  return CONVERSATION_MODES[modeId] || CONVERSATION_MODES[DEFAULT_CONVERSATION_MODE]
}
