const emotionStyles = {

    happy: "dots",
    sad: "line",
    angry: "zigzag",
    surprise: "burst",
    fear: "spiral",
    disgust: "curve",
    neutral: "rest"

}

export function getEmotionStyle(emotion)
{
    return emotionStyles[emotion] || "rest"
}