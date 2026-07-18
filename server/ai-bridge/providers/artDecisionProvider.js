import { generateArtChunk, generateArtPlan, getArtistById, getEmotionLabel } from '../../../src/lib/artEngine.js'
import { getPainterRecipe, getPainterRecipeById, isPhysicalColor, recipeToPromptContext } from '../../../src/lib/painterRecipes.js'
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

const CHUNK_DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['primary_emotion', 'secondary_emotion', 'mobility', 'palette_slots', 'gestures', 'randomness', 'style_directive'],
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
    palette_slots: {
      type: 'array',
      items: { type: 'string' },
    },
    gestures: {
      type: 'array',
      items: { type: 'string' },
    },
    randomness: {
      type: 'integer',
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

export async function decideArtChunk({ emotionWindow, sessionState = {}, config, fetchImpl = fetch }) {
  const artist = getArtistById(emotionWindow?.artist_id || sessionState.artist_id)
  const recipe = getPainterRecipeById(emotionWindow?.artist_recipe_id) || getPainterRecipe(artist.id)
  const windowSummary = resolveSessionEmotions({
    combined_emotions: emotionWindow?.combined_summary,
    face_emotions: emotionWindow?.face_summary,
  }, null)
  const baseInput = {
    windowSummary,
    artistId: artist.id,
    recipe,
    sessionState: {
      session_id: emotionWindow?.session_id,
      window_index: emotionWindow?.window_index || 0,
      chunk_index: 1,
      chunk_total: 1,
    },
    calibration: emotionWindow?.calibration || sessionState.calibration,
    mobility: emotionWindow?.mobility || sessionState.mobility || 85,
    directives: {
      palette_slots: emotionWindow?.voice_summary?.color_preferences || [],
    },
  }

  if (!config.openaiApiKey) {
    return {
      chunk: stampChunk(generateArtChunk(baseInput), emotionWindow, 'local_fallback'),
      source: 'local_fallback',
      reason: 'OPENAI_API_KEY no configurada.',
    }
  }

  try {
    const decision = await requestOpenAiChunkDecision({
      artist,
      recipe,
      emotionWindow,
      windowSummary,
      config,
      fetchImpl,
    })
    const decidedSummary = [
      {
        emotion: decision.primary_emotion,
        label: decision.primary_emotion,
        percentage: windowSummary[0]?.percentage || 65,
      },
      {
        emotion: decision.secondary_emotion,
        label: decision.secondary_emotion,
        percentage: windowSummary[1]?.percentage || 35,
      },
    ]
    const chunk = generateArtChunk({
      ...baseInput,
      windowSummary: decidedSummary,
      mobility: clamp(decision.mobility, 20, 100),
      directives: {
        palette_slots: decision.palette_slots,
        gestures: decision.gestures,
        randomness: clamp(decision.randomness, 0, 100),
      },
    })

    return {
      chunk: stampChunk({
        ...chunk,
        ai_directive: decision.style_directive,
        directives: {
          palette_slots: decision.palette_slots,
          gestures: decision.gestures,
          randomness: clamp(decision.randomness, 0, 100),
        },
      }, emotionWindow, 'openai'),
      source: 'openai',
      reason: null,
    }
  } catch (error) {
    return {
      chunk: stampChunk(generateArtChunk(baseInput), emotionWindow, 'local_fallback'),
      source: 'local_fallback',
      reason: error.message || 'OpenAI no devolvió una decisión de chunk válida.',
    }
  }
}

export function createSessionEndChunk({ sessionEnd, sessionState = {} }) {
  const calibration = sessionEnd?.calibration || sessionState.calibration || {}
  const z = { up: 30, dip: 2, paint: 8, ...(calibration.z || {}) }
  const water = calibration.water || { x: 330, y: 145, z: z.dip }
  const towel = calibration.towel || { x: 330, y: 170, z: z.paint }
  const rest = calibration.rest || { x: 335, y: 190, z: z.up }
  const upWater = { x: water.x, y: water.y, z: z.up, brush: 0 }
  const dipWater = { x: water.x, y: water.y, z: water.z ?? z.dip, brush: 0 }
  const upTowel = { x: towel.x, y: towel.y, z: z.up, brush: 0 }
  const dryTowel = { x: towel.x, y: towel.y, z: towel.z ?? z.paint, brush: 0 }
  const sessionId = sessionEnd?.session_id || sessionState.session_id
  const windowIndex = sessionEnd?.total_windows || sessionState.window_index || 0
  const artistId = sessionEnd?.artist_id || sessionState.artist_id || 'kandinsky'
  const artist = getArtistById(artistId)

  return stampChunk({
    id: `${sessionId || 'session'}-session-end`,
    chunk_id: `${sessionId || 'session'}-session-end`,
    session_id: sessionId,
    window_index: windowIndex,
    chunk_index: 1,
    chunk_total: 1,
    artist: artist.id,
    artist_name: artist.name,
    robot_commands: [
      { type: 'move_to_water', points: [upWater] },
      { type: 'rinse_brush', points: [upWater, dipWater, { ...dipWater, x: dipWater.x + 5 }, { ...dipWater, x: dipWater.x - 5 }, dipWater, upWater] },
      { type: 'move_to_towel', points: [upTowel] },
      { type: 'dry_brush', points: [upTowel, dryTowel, { ...dryTowel, y: dryTowel.y + 5 }, { ...dryTowel, y: dryTowel.y - 5 }, dryTowel, upTowel] },
      { type: 'move_to_rest', points: [{ x: rest.x, y: rest.y, z: z.up, brush: 0 }] },
    ],
    queue_policy: 'enqueue',
    close_session: true,
    summary: {
      title: 'Cierre de sesion',
      text: 'Limpieza, secado y regreso a reposo al finalizar la captura dinamica.',
    },
  }, sessionEnd, 'local_fallback')
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

async function requestOpenAiChunkDecision({ artist, recipe, emotionWindow, windowSummary, config, fetchImpl }) {
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
            'Eres el director artistico de Inner Synergy para una ventana de 5 segundos.',
            'Devuelve solo JSON estructurado con directivas acotadas por receta.',
            'No inventes coordenadas, puntos ni comandos del robot.',
            'El artEngine generara la geometria A4 y aplicara limites fisicos.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            artist,
            recipe: recipeToPromptContext(recipe),
            detected_emotions: windowSummary,
            window: {
              session_id: emotionWindow?.session_id,
              window_index: emotionWindow?.window_index,
              window_start_ms: emotionWindow?.window_start_ms,
              window_end_ms: emotionWindow?.window_end_ms,
              face_summary: emotionWindow?.face_summary || [],
              voice_summary: emotionWindow?.voice_summary || null,
              transcript_delta: (emotionWindow?.transcript_delta || []).slice(-4),
              mobility: emotionWindow?.mobility,
              voice_consent: Boolean(emotionWindow?.voice_consent),
            },
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'inner_synergy_chunk_decision',
          strict: true,
          schema: CHUNK_DECISION_SCHEMA,
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
  if (!outputText) throw new Error('OpenAI no devolvió texto JSON para chunk.')
  return normalizeChunkDecision(JSON.parse(outputText), recipe)
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
  const summary = buildArtisticSummary(plan, source)

  return {
    ...plan,
    plan_id: plan.id,
    session_id: sessionSummary?.session_id,
    device_id: sessionSummary?.device_id,
    decision_source: source,
    summary,
    artistic_summary: summary,
    validated_by: 'artEngine',
  }
}

function stampChunk(chunk, emotionWindow, source) {
  const summary = chunk.summary || buildChunkSummary(chunk, source)

  return {
    ...chunk,
    session_id: chunk.session_id || emotionWindow?.session_id,
    device_id: emotionWindow?.device_id,
    decision_source: source,
    summary,
    artistic_summary: summary,
    validated_by: 'artEngine',
  }
}

function buildArtisticSummary(plan, source) {
  const primary = getEmotionLabel(plan.main_emotion)
  const secondary = getEmotionLabel(plan.secondary_emotion)
  const colors = (plan.palette || []).slice(0, 3).map((color) => readableColor(color.name)).join(', ')
  const strokeCount = Array.isArray(plan.strokes) ? plan.strokes.length : 0
  const artistName = plan.artist_name || 'el pintor seleccionado'
  const sourceLabel = source === 'openai' ? 'AI Bridge' : 'fallback local'

  return {
    title: `${primary} en estilo ${artistName}`,
    text: `${sourceLabel} interpreta ${primary.toLowerCase()} con un matiz de ${secondary.toLowerCase()} y lo traduce al lenguaje de ${artistName}. La propuesta usa ${colors || 'una paleta emocional'} y ${strokeCount} trazos para convertir la lectura de la sesión en una composición A4.`,
    movement: `El brazo trabajará con velocidad ${plan.speed}, presión ${plan.pressure} y ${plan.movement_strategy}.`,
  }
}

function buildChunkSummary(chunk, source) {
  const primary = getEmotionLabel(chunk.main_emotion)
  const colors = (chunk.palette || []).slice(0, 2).map((color) => readableColor(color.name)).join(', ')
  const strokeCount = Array.isArray(chunk.strokes) ? chunk.strokes.length : 0
  const sourceLabel = source === 'openai' ? 'AI Bridge' : 'fallback local'

  return {
    title: `Ventana ${Number(chunk.window_index || 0) + 1}: ${primary}`,
    text: `${sourceLabel} genera ${strokeCount} trazos para esta ventana usando ${colors || 'la paleta fisica disponible'}.`,
    movement: `Chunk con velocidad ${chunk.speed || 'n/a'}, presion ${chunk.pressure || 'n/a'} y cola ${chunk.queue_policy || 'enqueue'}.`,
  }
}

function readableColor(value) {
  return String(value || '').replaceAll('_', ' ')
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

function normalizeChunkDecision(decision, recipe) {
  if (!decision || typeof decision !== 'object') {
    throw new Error('La decision de chunk IA no es un objeto JSON.')
  }

  const allowedGestures = new Set(recipe.allowed_gestures || [])
  const gestures = Array.isArray(decision.gestures)
    ? decision.gestures
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => allowedGestures.has(value))
      .slice(0, 4)
    : []
  const paletteSlots = Array.isArray(decision.palette_slots)
    ? decision.palette_slots
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(isPhysicalColor)
      .slice(0, 2)
    : []

  return {
    primary_emotion: sanitizeEmotion(decision.primary_emotion, 'neutral'),
    secondary_emotion: sanitizeEmotion(decision.secondary_emotion, decision.primary_emotion || 'neutral'),
    mobility: clamp(decision.mobility, 20, 100),
    palette_slots: paletteSlots,
    gestures,
    randomness: clamp(decision.randomness, 0, 100),
    style_directive: String(decision.style_directive || 'Generar un chunk seguro dentro de A4.')
      .slice(0, 500),
  }
}

function sanitizeEmotion(value, fallback) {
  return ART_EMOTIONS.includes(value) ? value : fallback
}
