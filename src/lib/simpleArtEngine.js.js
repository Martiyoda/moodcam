export function generateSimpleArtPlan(emotion) {

  switch (emotion) {

    case 'happy':
      return {
        mood: 'happy',
        commands: [
          'SOFT',
          'RIGHT_CURVE',
          'SOFT'
        ]
      }

    case 'sad':
      return {
        mood: 'sad',
        commands: [
          'LEFT_CURVE',
          'REST'
        ]
      }

    case 'angry':
      return {
        mood: 'angry',
        commands: [
          'STRONG',
          'LEFT_CURVE',
          'RIGHT_CURVE',
          'STRONG'
        ]
      }

    case 'surprise':
      return {
        mood: 'surprise',
        commands: [
          'RIGHT_CURVE',
          'LEFT_CURVE',
          'RIGHT_CURVE'
        ]
      }

    default:
      return {
        mood: 'neutral',
        commands: [
          'REST'
        ]
      }
  }
}