import mqtt from 'mqtt'

// Abrimos una conexión entre Moodcam y HiveMQ
const client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt')

client.on('connect', () => {
  console.log('MQTT conectado')
})

export default client