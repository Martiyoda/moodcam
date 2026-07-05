import { getEmotionColor } from "./EmotionColors"
import { getEmotionStyle } from "./EmotionStyles"

export function createEmotionPlan(emotion1, percentage1, emotion2, percentage2)
{

    return {

        layer1: {

            emotion: emotion1,

            percentage: Math.round(percentage1 * 100),

            color: getEmotionColor(emotion1),

            style: getEmotionStyle(emotion1)

        },

        layer2: {

            emotion: emotion2,

            percentage: Math.round(percentage2 * 100),

            color: getEmotionColor(emotion2),

            style: getEmotionStyle(emotion2)

        }

    }

}

/*console.log("========== PLAN ==========");

console.log(layer1);

console.log(layer2);

console.log("==========================");*/