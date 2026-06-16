import { getPainterProfile, getPainterVideo } from './painterProfiles.js'

export function selectPainterResponse({ painterId, emotion = 'neutral' }) {
  const painter = getPainterProfile(painterId)
  const response = painter.responses.find((item) => item.emotion === emotion)
    || painter.responses.find((item) => item.emotion === 'neutral')
  const video = getPainterVideo(painterId, response?.emotion || emotion)

  return {
    painter,
    emotion: response?.emotion || 'neutral',
    text: response?.text || 'Voy a observar tu emoción y convertirla en trazos.',
    script: response?.script || '',
    actionCue: response?.actionCue || '',
    video,
  }
}
