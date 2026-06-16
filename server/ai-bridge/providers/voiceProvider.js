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
