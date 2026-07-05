import mqtt from "mqtt";

const client = mqtt.connect(
    "wss://6a2904749cd54c2d9d727a3a85a645b5.s1.eu.hivemq.cloud:8884/mqtt",
    {
        username: "esp32",
        password: "Esplubot32"
    }
);

client.on("connect", () => {
    console.log("MQTT conectado");
});

export function publishPoints(points)
{
    console.log("publishPoints llamado");
    console.log(points);
    if (!client.connected)
    {
        console.log("MQTT no conectado");
        return;
    }

    points.forEach((point, index) => {

        setTimeout(() => {

            const mensaje =
                `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

            console.log("Enviando:", mensaje);

            client.publish("robot/servo1", mensaje);

        }, index * 300);

    });

}