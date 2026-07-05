/*export function generateSimpleArtPlan(emotion) {

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
}*/

import { createEmotionPlan } from "./EmotionPlan";
import { generateDots } from "./styles/dots.js";

/*export function generateSimpleArtPlan(emotion1, percentage1, emotion2, percentage2)
{
    const plan = createEmotionPlan(emotion1, percentage1, emotion2, percentage2);

    let points = [];

    const plan = createEmotionPlan(emotion1, percentage1, emotion2, percentage2);

    return generateDots(plan.layer1);

    // Capa 1 --> Emotion 1
    switch (plan.layer1.style)
    {
        case "dots":
            points.push(...generateDots(plan.layer1));
            break;
    }

    // Capa 2  --> Emotion 2
    switch (plan.layer2.style)
    {
        case "dots":
            points.push(...generateDots(plan.layer2));
            break;
    }

    return points;
}*/

export function generateSimpleArtPlan()
{
    return generateDots({
        percentage: 10,
        color: "yellow",
        emotion: "happy"
    });
}