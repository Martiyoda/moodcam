// Elige la respuesta textual apropiada para el pintor seleccionado.
// La decision visual queda separada de la geometria que genera artEngine.
import { getPainterProfile } from './painterProfiles.js'

export function selectPainterResponse({ painterId, emotion = 'neutral' }) {
  const painter = getPainterProfile(painterId)
  const response = painter.responses.find((item) => item.emotion === emotion)
    || painter.responses.find((item) => item.emotion === 'neutral')

  return {
    painter,
    emotion: response?.emotion || 'neutral',
    text: response?.text || 'Voy a observar tu emoción y convertirla en trazos.',
  }
}
