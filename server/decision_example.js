import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadStrokes } from './load_strokes.js'
import { validateDecision } from './validator.js'

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(SERVER_DIR, '..')
const PROMPT_PATH = path.join(SERVER_DIR, 'openai_decision_prompt.md')

const ARTIST_ALIASES = {
  kandinsky: 'kandinsky',
  pollock: 'pollock',
  rothko: 'rothko',
  'alma thomas': 'alma-thomas',
  'alma-thomas': 'alma-thomas',
  'de kooning': 'de-kooning',
  'de-kooning': 'de-kooning',
}

const EMOTION_ALIASES = {
  alegria: 'happy',
  happy: 'happy',
  tristeza: 'sad',
  sad: 'sad',
  rabia: 'angry',
  angry: 'angry',
  calma: 'calm',
  calm: 'calm',
  miedo: 'fear',
  fear: 'fear',
  sorpresa: 'surprise',
  surprise: 'surprise',
  neutral: 'neutral',
}

const COLOR_ALIASES = {
  rojo: 'red',
  red: 'red',
  amarillo: 'yellow',
  yellow: 'yellow',
  naranja: 'orange',
  orange: 'orange',
  azul: 'blue',
  blue: 'blue',
  violeta: 'violet',
  morado: 'violet',
  violet: 'violet',
  purple: 'violet',
  negro: 'black',
  black: 'black',
}

// Construye un prompt limitado al pintor y colores realmente disponibles.
export function buildDecisionPrompt(input, catalog = loadStrokes()) {
  const context = buildDecisionContext(input, catalog)
  const template = fs.readFileSync(PROMPT_PATH, 'utf8')
  return template
    .replace('{{INPUT_JSON}}', JSON.stringify(context.input, null, 2))
    .replace('{{APPROVED_STROKES_JSON}}', JSON.stringify(context.approvedStrokes, null, 2))
}

// Reduce el catálogo completo a las únicas elecciones permitidas para esta sesión.
export function buildDecisionContext(input, catalog = loadStrokes()) {
  assertInput(input)
  const artist = normalizeArtist(input.selected_artist)
  const availableColors = normalizeAvailableColors(input.available_colors)
  const approvedStrokes = catalog.strokes
    .filter((stroke) => stroke.artist === artist)
    .map((stroke) => ({
      stroke_id: stroke.stroke_id,
      emotion: stroke.emotion,
      speed: stroke.speed,
      intensity: stroke.intensity,
      duration_ms: stroke.duration_ms,
      pressure: stroke.pressure,
      color_palette: stroke.color_palette.filter((color) => availableColors.has(color)),
      safe_limits: stroke.safe_limits,
    }))
    .filter((stroke) => stroke.color_palette.length > 0)

  if (!approvedStrokes.length) {
    throw new Error('No existen trazos aprobados para el pintor y los colores disponibles.')
  }

  return {
    input: {
      ...input,
      selected_artist: artist,
      facial_emotion: normalizeEmotion(input.facial_emotion),
      available_colors: [...availableColors],
    },
    approvedStrokes,
  }
}

// Convierte una respuesta textual de IA en una decisión validada. Nunca ejecuta nada.
export function parseAndValidateAiOutput(outputText, catalog = loadStrokes()) {
  try {
    const decision = JSON.parse(outputText)
    return validateDecision(decision, catalog)
  } catch (error) {
    return {
      valid: false,
      error: `La IA no devolvió JSON válido: ${error.message}`,
    }
  }
}

// Fallback local para demostraciones sin API: selecciona emoción coherente o neutral.
export function createSafeFallbackDecision(input, catalog = loadStrokes()) {
  const context = buildDecisionContext(input, catalog)
  const targetEmotion = resolveTargetEmotion(context.input)
  const selectedStroke = context.approvedStrokes.find((stroke) => stroke.emotion === targetEmotion)
    || context.approvedStrokes.find((stroke) => stroke.emotion === 'neutral')

  if (!selectedStroke) {
    throw new Error('No existe una receta neutral segura para esta entrada.')
  }

  return {
    stroke_id: selectedStroke.stroke_id,
    speed: selectedStroke.speed,
    intensity: selectedStroke.intensity,
    duration_ms: selectedStroke.duration_ms,
    pressure: selectedStroke.pressure,
    selected_colors: selectedStroke.color_palette.slice(0, 3),
  }
}

function resolveTargetEmotion(input) {
  const facialConfidence = confidence(input.facial_confidence)
  const voiceConfidence = confidence(input.voice_confidence)
  const facialEmotion = normalizeEmotion(input.facial_emotion)
  const voiceEmotion = inferVoiceEmotion(input.voice_emotion, input.user_text)

  if (facialConfidence < 0.5 && voiceConfidence < 0.5) return 'neutral'
  if (facialEmotion === voiceEmotion) return facialEmotion
  if (facialConfidence >= voiceConfidence && facialConfidence >= 0.6) return facialEmotion
  if (voiceConfidence > facialConfidence && voiceConfidence >= 0.6) return voiceEmotion
  return 'neutral'
}

function inferVoiceEmotion(voiceEmotion = '', userText = '') {
  const text = normalizeText(`${voiceEmotion} ${userText}`)
  if (/(energia alta|motivad|alegr|feliz|content)/.test(text)) return 'happy'
  if (/(trist|pena|cansad)/.test(text)) return 'sad'
  if (/(rabia|enfad|furia)/.test(text)) return 'angry'
  if (/(calma|tranquil|relajad)/.test(text)) return 'calm'
  if (/(miedo|nervios|asust)/.test(text)) return 'fear'
  if (/(sorpres|increible|wow)/.test(text)) return 'surprise'
  return 'neutral'
}

function assertInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('La entrada emocional debe ser un objeto JSON.')
  }
  if (!input.selected_artist) throw new Error('Falta selected_artist.')
  if (!Array.isArray(input.available_colors) || input.available_colors.length === 0) {
    throw new Error('available_colors no puede estar vacío.')
  }
}

function normalizeArtist(value) {
  const artist = ARTIST_ALIASES[normalizeText(value)]
  if (!artist) throw new Error(`Pintor no aprobado: ${value}`)
  return artist
}

function normalizeEmotion(value) {
  return EMOTION_ALIASES[normalizeText(value)] || 'neutral'
}

function normalizeAvailableColors(colors) {
  return new Set(colors.map((color) => COLOR_ALIASES[normalizeText(color)]).filter(Boolean))
}

function confidence(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(1, number))
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Ejecutable de demostración local sin API real.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputPath = path.join(ROOT_DIR, 'examples', 'input_emotion_example.json')
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const decision = createSafeFallbackDecision(input)
  const validated = validateDecision(decision)
  console.log(JSON.stringify({ prompt: buildDecisionPrompt(input), decision, validated }, null, 2))
}
