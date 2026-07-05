const emotionColors = {

    happy: "yellow",
    sad: "blue",
    angry: "red",
    surprise: "orange",
    fear: "purple"

}

export function getEmotionColor(emotion)
{
    return emotionColors[emotion] || "black"
}