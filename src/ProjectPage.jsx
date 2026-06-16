import { useEffect, useRef } from 'react'
import './project.css'

const pipelineSteps = [
  {
    title: 'Camara y rostro',
    text: 'La webcam detecta un rostro, dibuja una malla facial y transforma la expresion en datos utiles.',
    metric: '640 x 480',
  },
  {
    title: 'IA emocional',
    text: 'Los modelos locales leen siete emociones y suavizan los cambios para obtener una senal estable.',
    metric: '7 emociones',
  },
  {
    title: 'Voz y pintor',
    text: 'La conversacion con el pintor elegido suma ritmo, palabras, intensidad y preferencias de color.',
    metric: '60 segundos',
  },
  {
    title: 'Plan artistico',
    text: 'El motor mezcla rostro, voz, movilidad y estilo para crear trazos, formas, presion y colores.',
    metric: '5 estilos',
  },
  {
    title: 'Robot A4',
    text: 'El ESP32 recibe una secuencia de comandos x, y, z y brush lista para mover el brazo.',
    metric: 'MQTT',
  },
]

const stats = [
  ['Tiempo de observacion', '60 s'],
  ['Formato de pintura', 'A4 horizontal'],
  ['Salida del robot', 'x / y / z / brush'],
  ['Privacidad visual', 'IA en navegador'],
]

const artists = ['Kandinsky', 'Pollock', 'Rothko', 'Alma Thomas', 'De Kooning']

const robotCommands = [
  'paint_sequence_start',
  'move_to_paint',
  'dip_paint',
  'stroke',
  'move_to_water',
  'rinse_brush',
  'move_to_rest',
  'paint_sequence_end',
]

function ProjectPage() {
  useRevealAnimation()

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'E-motion Proyecto'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="project-page">
      <ProjectNav />

      <main>
        <section className="project-hero" aria-labelledby="project-title">
          <ProjectRender />
          <div className="project-hero__content project-reveal is-visible">
            <p className="project-kicker">E-motion</p>
            <h1 id="project-title">Una camara que convierte emociones en pintura robotica</h1>
            <p className="project-hero__lead">
              Nuestro proyecto une vision artificial, voz en tiempo real, arte generativo y un brazo Arduino
              para crear una obra fisica a partir de lo que una persona expresa durante una experiencia guiada.
            </p>
            <div className="project-actions">
              <a className="project-button project-button--primary" href="/">
                Abrir experiencia
              </a>
              <a className="project-button project-button--ghost" href="#arquitectura">
                Ver arquitectura
              </a>
            </div>
          </div>

          <div className="project-hero__readout project-reveal is-visible" aria-label="Estado del sistema">
            <span>
              <strong>Rostro</strong>
              FaceMesh activo
            </span>
            <span>
              <strong>Voz</strong>
              Pintor en vivo
            </span>
            <span>
              <strong>Robot</strong>
              A4 calibrado
            </span>
          </div>
        </section>

        <section className="project-stats project-reveal" aria-label="Resumen rapido">
          {stats.map(([label, value]) => (
            <div className="project-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section className="project-section project-section--story">
          <div className="project-copy project-reveal">
            <p className="project-kicker">La idea</p>
            <h2>De una emocion humana a una pincelada real</h2>
            <p>
              Moodcam observa el rostro, escucha la conversacion y resume la energia emocional de la sesion.
              Despues transforma esa lectura en decisiones plasticas: paleta, densidad, presion, ritmo,
              trayectorias y pausas.
            </p>
            <p>
              La parte importante no es solo detectar una emocion. Es construir un puente entre datos,
              interpretacion artistica y movimiento fisico para que el robot pinte una respuesta visible.
            </p>
          </div>

          <div className="project-signal-board project-reveal" aria-label="Senales del proyecto">
            <div className="signal-row">
              <span>feliz</span>
              <div style={{ '--level': '86%' }} />
            </div>
            <div className="signal-row">
              <span>sorpresa</span>
              <div style={{ '--level': '62%' }} />
            </div>
            <div className="signal-row">
              <span>voz</span>
              <div style={{ '--level': '74%' }} />
            </div>
            <div className="signal-row">
              <span>movilidad</span>
              <div style={{ '--level': '92%' }} />
            </div>
          </div>
        </section>

        <section className="project-section" id="arquitectura">
          <div className="project-section__header project-reveal">
            <p className="project-kicker">Arquitectura</p>
            <h2>Un flujo claro desde la camara hasta el pincel</h2>
          </div>

          <div className="project-pipeline" aria-label="Pipeline del sistema">
            {pipelineSteps.map((step, index) => (
              <article className="pipeline-card project-reveal" key={step.title}>
                <div className="pipeline-card__number">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <strong>{step.metric}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="project-section project-section--studio">
          <div className="project-art-preview project-reveal" aria-label="Lienzo animado">
            <div className="paper-grid">
              <span className="stroke stroke--one" />
              <span className="stroke stroke--two" />
              <span className="stroke stroke--three" />
              <span className="stroke stroke--four" />
              <span className="brush-head" />
            </div>
          </div>

          <div className="project-copy project-reveal">
            <p className="project-kicker">Motor artistico</p>
            <h2>Cada pintor cambia la manera de moverse</h2>
            <p>
              La experiencia permite elegir un referente artistico. Ese estilo modifica la forma de los trazos,
              la repeticion, la velocidad, los colores y la amplitud del brazo antes de enviar la secuencia al robot.
            </p>
            <div className="artist-tags" aria-label="Pintores disponibles">
              {artists.map((artist) => (
                <span key={artist}>{artist}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="project-section project-section--commands">
          <div className="project-section__header project-reveal">
            <p className="project-kicker">Arduino</p>
            <h2>Comandos pensados para movimiento real</h2>
          </div>
          <div className="command-track project-reveal">
            {robotCommands.map((command) => (
              <span key={command}>{command}</span>
            ))}
          </div>
        </section>
      </main>

      <footer className="project-footer">
        <img src="/e-motion-wordmark.png" alt="E-motion" />
        <span>E-motion · IA emocional · arte generativo · robot A4</span>
      </footer>
    </div>
  )
}

function ProjectNav() {
  return (
    <nav className="project-nav" aria-label="Navegacion del proyecto">
      <a className="project-brand" href="/">
        <img src="/e-motion-wordmark.png" alt="E-motion" />
      </a>
      <div>
        <a href="#arquitectura">Arquitectura</a>
        <a href="/">App</a>
      </div>
    </nav>
  )
}

function ProjectRender() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let animationFrame = 0
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawGrid = (time) => {
      context.save()
      context.globalAlpha = 0.22
      context.strokeStyle = '#ffffff'
      context.lineWidth = 1
      const gap = 44
      const offset = (time * 0.018) % gap
      for (let x = -gap; x < width + gap; x += gap) {
        context.beginPath()
        context.moveTo(x + offset, 0)
        context.lineTo(x + offset - 80, height)
        context.stroke()
      }
      for (let y = -gap; y < height + gap; y += gap) {
        context.beginPath()
        context.moveTo(0, y + offset)
        context.lineTo(width, y + offset)
        context.stroke()
      }
      context.restore()
    }

    const drawFace = (time) => {
      const cx = width * 0.22
      const cy = height * 0.5
      const pulse = Math.sin(time * 0.003) * 5
      context.save()
      context.translate(cx, cy)
      context.strokeStyle = '#3ee7c7'
      context.lineWidth = 2
      context.globalAlpha = 0.82
      context.beginPath()
      context.ellipse(0, 0, 92 + pulse, 120 - pulse, 0, 0, Math.PI * 2)
      context.stroke()

      const points = [
        [-45, -35], [-15, -48], [17, -46], [48, -32],
        [-54, 4], [-20, -3], [18, -2], [55, 5],
        [-36, 42], [-6, 56], [27, 48], [0, 18],
        [-28, 83], [0, 92], [30, 82],
      ]

      context.strokeStyle = '#f6c453'
      context.globalAlpha = 0.58
      for (let i = 0; i < points.length - 1; i += 1) {
        const [x1, y1] = points[i]
        const [x2, y2] = points[(i + 3) % points.length]
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
      }

      context.fillStyle = '#ffffff'
      context.globalAlpha = 0.95
      points.forEach(([x, y], index) => {
        const radius = 2.4 + Math.sin(time * 0.006 + index) * 0.8
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      })
      context.restore()
    }

    const drawAiCore = (time) => {
      const cx = width * 0.5
      const cy = height * 0.48
      const radius = 78 + Math.sin(time * 0.004) * 8
      context.save()
      context.translate(cx, cy)
      context.rotate(time * 0.0004)

      for (let ring = 0; ring < 3; ring += 1) {
        context.strokeStyle = ['#ff6b5f', '#f6c453', '#3ee7c7'][ring]
        context.globalAlpha = 0.76 - ring * 0.16
        context.lineWidth = 3
        context.beginPath()
        context.arc(0, 0, radius + ring * 28, time * 0.001 + ring, Math.PI * 1.35 + time * 0.001 + ring)
        context.stroke()
      }

      context.rotate(-time * 0.0008)
      context.fillStyle = '#10131a'
      context.strokeStyle = '#ffffff'
      context.globalAlpha = 0.95
      context.lineWidth = 1.5
      context.beginPath()
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6
        const x = Math.cos(angle) * 54
        const y = Math.sin(angle) * 54
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.closePath()
      context.fill()
      context.stroke()
      context.fillStyle = '#ffffff'
      context.font = '700 14px Inter, system-ui, sans-serif'
      context.textAlign = 'center'
      context.fillText('IA', 0, 5)
      context.restore()
    }

    const drawRobot = (time) => {
      const baseX = width * 0.78
      const baseY = height * 0.68
      const armA = Math.sin(time * 0.0018) * 0.34 - 0.95
      const armB = Math.cos(time * 0.0022) * 0.45 + 0.66
      const jointX = baseX + Math.cos(armA) * 108
      const jointY = baseY + Math.sin(armA) * 108
      const tipX = jointX + Math.cos(armA + armB) * 94
      const tipY = jointY + Math.sin(armA + armB) * 94

      context.save()
      context.lineCap = 'round'
      context.lineJoin = 'round'

      context.fillStyle = 'rgba(255,255,255,0.9)'
      context.fillRect(width * 0.64, height * 0.58, 238, 150)
      context.strokeStyle = '#20242e'
      context.lineWidth = 2
      context.strokeRect(width * 0.64, height * 0.58, 238, 150)

      const progress = (time * 0.00018) % 1
      const strokes = [
        ['#ff6b5f', 0.68, 0.65, 92, 28],
        ['#3ee7c7', 0.68, 0.72, 142, 26],
        ['#f6c453', 0.73, 0.62, 84, 42],
        ['#8bd450', 0.76, 0.72, 108, 16],
      ]
      strokes.forEach(([color, sx, sy, sw, sh], index) => {
        const localProgress = Math.max(0.12, Math.min(1, progress * 1.6 - index * 0.18))
        context.strokeStyle = color
        context.globalAlpha = 0.86
        context.lineWidth = 9
        context.beginPath()
        context.moveTo(width * sx, height * sy)
        context.bezierCurveTo(
          width * sx + sw * 0.35,
          height * sy - sh,
          width * sx + sw * 0.7,
          height * sy + sh,
          width * sx + sw * localProgress,
          height * sy + Math.sin(time * 0.004 + index) * sh,
        )
        context.stroke()
      })

      context.globalAlpha = 1
      context.strokeStyle = '#f6c453'
      context.lineWidth = 18
      context.beginPath()
      context.moveTo(baseX, baseY)
      context.lineTo(jointX, jointY)
      context.lineTo(tipX, tipY)
      context.stroke()

      context.strokeStyle = '#10131a'
      context.lineWidth = 5
      context.beginPath()
      context.moveTo(baseX, baseY)
      context.lineTo(jointX, jointY)
      context.lineTo(tipX, tipY)
      context.stroke()

      context.fillStyle = '#ff6b5f'
      const joints = [[baseX, baseY], [jointX, jointY], [tipX, tipY]]
      joints.forEach(([x, y]) => {
        context.beginPath()
        context.arc(x, y, 14, 0, Math.PI * 2)
        context.fill()
      })

      context.strokeStyle = '#20242e'
      context.lineWidth = 10
      context.beginPath()
      context.moveTo(tipX, tipY)
      context.lineTo(tipX + 20, tipY + 34)
      context.stroke()
      context.restore()
    }

    const drawConnectors = (time) => {
      const points = [
        [width * 0.31, height * 0.5],
        [width * 0.43, height * 0.48],
        [width * 0.58, height * 0.48],
        [width * 0.68, height * 0.58],
      ]

      context.save()
      context.strokeStyle = '#ffffff'
      context.lineWidth = 1.4
      context.globalAlpha = 0.42
      context.beginPath()
      context.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length; i += 1) {
        context.lineTo(points[i][0], points[i][1])
      }
      context.stroke()

      points.forEach(([x, y], index) => {
        const dotOffset = Math.sin(time * 0.004 + index) * 8
        context.fillStyle = ['#3ee7c7', '#f6c453', '#ff6b5f', '#8bd450'][index]
        context.globalAlpha = 1
        context.beginPath()
        context.arc(x + dotOffset, y, 5, 0, Math.PI * 2)
        context.fill()
      })
      context.restore()
    }

    const animate = (time) => {
      context.clearRect(0, 0, width, height)
      const background = context.createLinearGradient(0, 0, width, height)
      background.addColorStop(0, '#0c0f16')
      background.addColorStop(0.4, '#10131a')
      background.addColorStop(1, '#170f12')
      context.fillStyle = background
      context.fillRect(0, 0, width, height)
      drawGrid(time)
      drawConnectors(time)
      drawFace(time)
      drawAiCore(time)
      drawRobot(time)
      animationFrame = window.requestAnimationFrame(animate)
    }

    resize()
    animationFrame = window.requestAnimationFrame(animate)
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="project-render" aria-hidden="true" />
}

function useRevealAnimation() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('.project-reveal'))

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.18 })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
}

export default ProjectPage
