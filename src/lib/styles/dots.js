export function generateDots(layer)
{
    const points = [];

    const totalPoints = Math.max(1, layer.percentage);

    for (let i = 0; i < totalPoints; i++)
    {
        points.push({

            x: +(Math.random() * 30).toFixed(2),

            y: +(Math.random() * 21).toFixed(2),

            color: layer.color,

            emotion: layer.emotion

        });
    }

    return points;
}