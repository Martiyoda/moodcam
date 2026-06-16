import { generateArtPlan, getArtistById } from '../../../src/lib/artEngine.js'
import { resolveSessionEmotions } from './emotionProvider.js'
import { resolveVoiceProvider } from './voiceProvider.js'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const ART_EMOTIONS = ['happy', 'neutral', 'sad', 'angry', 'fear', 'disgust', 'surprise']

const DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['primary_emotion', 'secondary_emotion', 'mobility', 'color_preferences', 'style_directive'],
  properties: {
    primary_emotion: {
      type: 'string',
      enum: ['happy', 'neutral', 'sad', 'angry', 'fear', 'disgust', 'surprise'],
    },
    secondary_emotion: {
      type: 'string',
      enum: ['happy', 'neutral', 'sad', 'angry', 'fear', 'disgust', 'surprise'],
    },
    mobility: {
      type: 'integer',
    },
    color_preferences: {
      type: 'array',
      items: { type: 'string' },
    },
    style_directive: {
      type: 'string',
    },
  },
}

export async function decideArtPlan({ sessionSummary, latestFaceEmotion, config, fetchImpl = fetch }) {
  const artist = getArtistById(sessionSummary?.artist_id || latestFaceEmotion?.artist_id)
  const mainEmotions = resolveSessionEmotions(sessionSummary, latestFaceEmotion)
  const voiceProvider = resolveVoiceProvider(sessionSummary?.conversation_mode)
  const baseInput = {
    mainEmotions,
    artistId: artist.id,
    mobility: sessionSummary?.mobility || latestFaceEmotion?.mobility || 85,
    calibration: sessionSummary?.calibration || latestFaceEmotion?.calibration,
    colorPreferences: sessionSummary?.voice_summary?.color_preferences || [],
    voiceSummary: sessionSummary?.voice_summary || voiceProvider.summary,
  }

  if (!config.openaiApiKey) {
    return {
      plan: stampPlan(generateArtPlan(baseInput), sessionSummary, 'local_fallback'),
      source: 'local_fallback',
      reason: 'OPENAI_API_KEY no configurada.',
    }
  }

  try {
    const decision = await requestOpenAiDecision({
      artist,
      sessionSummary,
      mainEmotions,
      config,
      fetchImpl,
    })
    const decidedMainEmotions = [
      {
        emotion: decision.primary_emotion,
        label: decision.primary_emotion,
        percentage: mainEmotions[0]?.percentage || 65,
      },
      {
        emotion: decision.secondary_emotion,
        label: decision.secondary_emotion,
        percentage: mainEmotions[1]?.percentage || 35,
      },
    ]
    const plan = generateArtPlan({
      ...baseInput,
      mainEmotions: decidedMainEmotions,
      mobility: clamp(decision.mobility, 20, 100),
      colorPreferences: decision.color_preferences.slice(0, 5),
    })

    return {
      plan: stampPlan({
        ...plan,
        ai_directive: decision.style_directive,
      }, sessionSummary, 'openai'),
      source: 'openai',
      reason: null,
    }
  } catch (error) {
    return {
      plan: stampPlan(generateArtPlan(baseInput), sessionSummary, 'local_fallback'),
      source: 'local_fallback',
      reason: error.message || 'OpenAI no devolvió una decisión válida.',
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || min)))
}

async function requestOpenAiDecision({ artist, sessionSummary, mainEmotions, config, fetchImpl }) {
  const response = await fetchImpl(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiModel,
      input: [
        {
          role: 'system',
          content: [
            'Eres el cerebro artistico de Moodcam para un robot pintor ESP32.',
            'Devuelve solo una decision JSON estructurada.',
            'No inventes coordenadas fisicas: el servidor las validara despues.',
            'Prioriza seguridad: movimientos dentro de A4, cambios de color limpios y estilo del pintor elegido.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            artist,
            detected_emotions: mainEmotions,
            session: {
              session_id: sessionSummary?.session_id,
              face_emotions: sessionSummary?.face_emotions || [],
              voice_emotions: sessionSummary?.voice_emotions || [],
              color_preferences: sessionSummary?.voice_summary?.color_preferences || [],
              keywords: sessionSummary?.voice_summary?.keywords || [],
              transcript: (sessionSummary?.transcript || []).slice(-6),
              mobility: sessionSummary?.mobility,
              conversation_mode: sessionSummary?.conversation_mode,
            },
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'moodcam_art_decision',
          strict: true,
          schema: DECISION_SCHEMA,
        },
      },
    }),
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${responseText.slice(0, 240)}`)
  }

  const data = JSON.parse(responseText)
  const outputText = extractOutputText(data)
  if (!outputText) throw new Error('OpenAI no devolvió texto JSON.')
  return normalizeDecision(JSON.parse(outputText))
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join('')
}

function stampPlan(plan, sessionSummary, source) {
  return {
    ...plan,
    plan_id: plan.id,
    session_id: sessionSummary?.session_id,
    device_id: sessionSummary?.device_id,
    decision_source: source,
    validated_by: 'artEngine',
  }
}

function normalizeDecision(decision) {
  if (!decision || typeof decision !== 'object') {
    throw new Error('La decision IA no es un objeto JSON.')
  }

  const primary = sanitizeEmotion(decision.primary_emotion, 'neutral')
  const secondary = sanitizeEmotion(decision.secondary_emotion, primary)
  const colorPreferences = Array.isArray(decision.color_preferences)
    ? decision.color_preferences
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 5)
    : []

  return {
    primary_emotion: primary,
    secondary_emotion: secondary,
    mobility: clamp(decision.mobility, 20, 100),
    color_preferences: colorPreferences,
    style_directive: String(decision.style_directive || 'Pintar una respuesta emocional segura dentro de A4.')
      .slice(0, 500),
  }
}

function sanitizeEmotion(value, fallback) {
  return ART_EMOTIONS.includes(value) ? value : fallback
}
