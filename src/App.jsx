import { useState, useEffect } from 'react'
import useFaceDetection from './hooks/useFaceDetection'
import useMqtt from './hooks/useMqtt'
import CameraView from './components/CameraView'
import EmotionDisplay from './components/EmotionDisplay'
import SettingsModal from './components/SettingsModal'
import {generateSimpleArtPlan} from './lib/simpleArtEngine.js'
import { generateArtPlan } from './lib/artEngine'
// Creamos la conexión entre moodcam y HiveMQ
import client from './lib/mqttClient'


// Es el componente principal de la aplicación, el cerebro de toda la página. React (http://localhost:5173) ejecuta App()
// Lo que aparece en el return es lo que se visualiza
function App() {

  // Función de prueba para describir movimientos con el brazo
const runSimpleArtPlan = () => {

  const plan =
    generateSimpleArtPlan(dominant)

  plan.commands.forEach((command, index) => {

    setTimeout(() => {

      client.publish(
        'robot/arm',
        command
      )

    }, index * 1500)

  })

}
  
  // Creamos una función donde poder asociar las emociones con posiciones en concreto del brazo
  const sendEmotionPose = () => {

  if (dominant === 'happy') {

    client.publish('robot/arm','SOFT')

  }
  else if (dominant === 'sad') {

    client.publish('robot/arm','LEFT_CURVE')

  }
  else if (dominant === 'angry') {

    client.publish('robot/arm','STRONG')

  }
  else {

    client.publish('robot/arm','REST')

  }

}  
  
  // Creamos función para poder asociar la emoción con algún movimiento de los motores
  const sendEmotionCommand = () => {

  console.log("Emoción detectada:", dominant)

  if (dominant === "happy") {

    client.publish("robot/servo1","RIGHT")

    console.log("Enviado RIGHT")

  }
  else if (dominant === "sad") {

    client.publish("robot/servo1","LEFT")

    console.log("Enviado LEFT")

  }
  else {

    client.publish("robot/servo1","STOP")

    console.log("Enviado STOP")

  }
}
  
  
  // Cremaos función para pasar los parámetros mediante MQTT a la ESP32
  const sendLeft = () => {

  client.publish('robot/servo1', 'LEFT')

  alert('LEFT enviado')
}

const sendRight = () => {

  client.publish('robot/servo1','RIGHT')

}

const sendStop = () => {

  client.publish('robot/servo1','STOP')

}

  // Creamos una función testArtEngine, no recibe parámetros.
  // Llama a ArtEngine diciendole la emoción, pintor, movilidad 
  // Genera un plan artístico y lo guarda en const plan
const testArtEngine = () => {

  const plan = generateArtPlan({

    mainEmotions: [
      {
        emotion: 'happy',
        percentage: 100
      }
    ],

    artistId: 'pollock',

    mobility: 80

  })

  console.log("PLAN COMPLETO:")
  console.log(plan)

  console.log("COMANDOS:")
  // Muestra todos los comandos que artEngine.js hace console.log(plan.robot_commands)
  console.log(plan.robot_commands[2])

}
  
  const {
    videoRef,
    canvasRef,
    modelsLoaded,
    cameraActive,
    emotions,
    dominant,
    age,
    gender,
    error,
    loading,
    startCamera,
    stopCamera,
    detectionConfig,
    updateConfig,
    resetConfig,
  } = useFaceDetection()

  const {
    mqttConfig,
    updateMqttConfig,
    resetMqttConfig,
    connectionStatus,
    lastError,
    publishEmotion,
  } = useMqtt()

  const [settingsOpen, setSettingsOpen] = useState(false)

  // Crea una variable que React recuerda aunque la pantalla se vuelva a dibujar.
  // Guarda un plan artístico para poder modificarlo más tarde
  // Crea una variable de estado inicialmente con valor NULL
  // Para poder mostrarlo en cualquier parte
  const [artPlan, setArtPlan] = useState(null)

  // Publicar emociones por MQTT cuando cambian
  useEffect(() => {
    if (emotions && dominant) {
      publishEmotion(emotions, dominant)
    }
  }, [emotions, dominant, publishEmotion])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="py-4 px-4 flex items-center justify-between border-b border-gray-800">
        <div className="w-10" />
        <div className="flex items-center gap-3">
          <img src="/logo-esplubot.png" alt="Esplubot" className="w-10 h-10 rounded-full shadow-md" />
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #1378BC, #5AB5DB)' }}>
              Moodcam
            </h1>
            <p className="text-xs text-gray-500">by Esplubot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {mqttConfig.enabled && (
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`}
              title={`MQTT: ${connectionStatus}`}
            />
          )}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Configuración de detección"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 p-4 max-w-5xl mx-auto w-full">
        {/* Columna izquierda: Cámara */}
        <div className="w-full lg:w-3/5 space-y-4">
          <CameraView videoRef={videoRef} canvasRef={canvasRef} cameraActive={cameraActive} />

          {/* Controles */}
          <div className="flex justify-center gap-3">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                disabled={!modelsLoaded || loading}
                className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                style={{ background: 'linear-gradient(to right, #1378BC, #249BD7)', boxShadow: '0 10px 15px -3px rgba(19,120,188,0.25)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cargando modelos...
                  </span>
                ) : (
                  '📷 Iniciar Cámara'
                )}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all
                  bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/25"
              >
                ⏹ Detener
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-3 text-sm text-center">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Columna derecha: Emociones */}
        <div className="w-full lg:w-2/5 bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Estado de ánimo
          </h2>
          <EmotionDisplay emotions={emotions} dominant={dominant} age={age} gender={gender} />
          {artPlan && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">

                <h3 className="font-bold mb-2">
                  Plan artístico
                </h3>

                <p>
                  Pintor: {artPlan.artist_name}
                </p>

                <p>
                  Velocidad: {artPlan.speed}
                </p>

                <p>
                  Presión: {artPlan.pressure}
                </p>

                <p>
                  Trazos: {artPlan.strokes.length}
                </p>

                <p>
                  Comandos: {artPlan.robot_commands.length}
                </p>

              </div>
            )}
        </div>
// Creamos boton para agregar pintor, colores...
<button onClick={testArtEngine}>
  Probar ArtEngine
</button>
// Creamos boton para enviar datos MQTT ESP32
<button
  onClick={sendLeft}
  className="px-4 py-2 bg-green-600 text-white rounded"
>
  LEFT
</button>
<button onClick={sendStop}>
  STOP
</button>

<button onClick={sendRight}>
  RIGHT
</button>

// Creamos botón para poder enviar la emoción dominante
<button  onClick={sendEmotionCommand}  className="px-4 py-2 bg-purple-600 text-white rounded">
  Enviar emoción
</button>

<button
  onClick={sendEmotionPose}
  className="px-4 py-2 bg-purple-600 text-white rounded"
>
  Enviar emoción al brazo
</button>

<button onClick={runSimpleArtPlan}>
  Probar ArtEngine Simple
</button>

      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-gray-600 border-t border-gray-800">
        Moodcam by Esplubot · Powered by @vladmandic/human
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={detectionConfig}
        onConfigChange={updateConfig}
        onReset={resetConfig}
        mqttConfig={mqttConfig}
        onMqttConfigChange={updateMqttConfig}
        onMqttReset={resetMqttConfig}
        mqttStatus={connectionStatus}
        mqttError={lastError}
      />
    </div>
  )
}

export default App
