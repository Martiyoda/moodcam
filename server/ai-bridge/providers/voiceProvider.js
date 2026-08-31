// Normaliza la parte de voz que llega al bridge y la convierte en una senal
// compatible con los modos de conversacion usados por la experiencia web.
import { DEFAULT_CONVERSATION_MODE, getConversationMode } from '../../../src/lib/conversationModes.js'

export function resolveVoiceProvider(modeId = DEFAULT_CONVERSATION_MODE) {
  const mode = getConversationMode(modeId)
  return {
    mode,
    enabled: mode.id !== 'none',
    summary: {
      mode: mode.id,
      label: mode.label,
      deferred: mode.id !== 'none',
    },
  }
}
