import express from 'express'
import { loadServerEnv } from './loadEnv.js'

loadServerEnv()

const PORT = Number(process.env.MOODCAM_API_PORT || 8787)
const REALTIME_URL = 'https://api.openai.com/v1/realtime/calls'
const DEFAULT_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime'
const DEFAULT_VOICE = process.env.OPENAI_REALTIME_VOICE || 'marin'

const ARTIST_PROMPTS = {
  kandinsky: {
    name: 'Kandinsky',
    instructions: 'Habla como un pintor abstracto inspirado por música, formas geométricas, círculos, líneas y color.',
  },
  pollock: {
    name: 'Pollock',
    instructions: 'Habla con energía de pintura de acción: movimiento, salpicaduras, ritmo corporal y libertad.',
  },
  rothko: {
    name: 'Rothko',
    instructions: 'Habla con calma, profundidad emocional, campos de color y pausas contemplativas.',
  },
  'alma-thomas': {
    name: 'Alma Thomas',
    instructions: 'Habla con sensibilidad hacia patrones, mosaicos, luz, naturaleza y color alegre.',
  },
  'de-kooning': {
    name: 'De Kooning',
    instructions: 'Habla con gesto intenso, curvas rotas, energía expresiva y composición fragmentada.',
  },
}

function getArtistPrompt(artistId) {
  return ARTIST_PROMPTS[artistId] || ARTIST_PROMPTS.kandinsky
}

function buildSessionConfig(artistId) {
  const artist = getArtistPrompt(artistId)

  return {
    type: 'realtime',
    model: DEFAULT_MODEL,
    audio: {
      output: {
        voice: DEFAULT_VOICE,
      },
      input: {
        transcription: {
          model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
          language: 'es',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          silence_duration_ms: 700,
        },
      },
    },
    instructions: [
      `Eres ${artist.name}, actuando como guía artístico para un niño delante de Moodcam.`,
      artist.instructions,
      'Responde siempre en español, con frases breves, cálidas y fáciles de entender.',
      'Haz preguntas cortas sobre colores, sensaciones y recuerdos mientras el sistema detecta emociones.',
      'No des instrucciones técnicas ni menciones APIs. Mantén la conversación segura, educativa y artística.',
      'Cuando detectes preferencias de color o emociones expresadas, refléjalas de forma natural.',
    ].join(' '),
  }
}

const app = express()
app.use(express.text({ type: ['application/sdp', 'text/plain'], limit: '2mb' }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    realtimeConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: DEFAULT_MODEL,
  })
})

app.post('/api/realtime/session', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: 'OPENAI_API_KEY no esta configurada en .env.local o .env',
    })
    return
  }

  const sdp = typeof req.body === 'string' ? req.body : ''
  if (!sdp.trim()) {
    res.status(400).json({ error: 'Falta el SDP offer del navegador.' })
    return
  }

  const artistId = req.query.artist || req.header('x-artist-id') || 'kandinsky'
  const fd = new FormData()
  fd.set('sdp', sdp)
  fd.set('session', JSON.stringify(buildSessionConfig(artistId)))

  try {
    const upstream = await fetch(REALTIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: fd,
    })

    const answer = await upstream.text()
    if (!upstream.ok) {
      res.status(upstream.status).type('text/plain').send(answer)
      return
    }

    res.status(201).type('application/sdp').send(answer)
  } catch (error) {
    console.error('Realtime session error:', error)
    res.status(500).json({ error: 'No se pudo crear la sesión Realtime.' })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Moodcam API escuchando en http://127.0.0.1:${PORT}`)
})
