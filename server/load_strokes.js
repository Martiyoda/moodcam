import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STROKES_DIR = path.join(ROOT_DIR, 'strokes')
const PAINTERS_DIR = path.join(ROOT_DIR, 'arduino', 'painters')

const STROKE_FILES = [
  { file: 'kandinsky.json', header: 'kandinsky.h' },
  { file: 'pollock.json', header: 'pollock.h' },
  { file: 'rothko.json', header: 'rothko.h' },
  { file: 'alma_thomas.json', header: 'alma_thomas.h' },
  { file: 'de_kooning.json', header: 'de_kooning.h' },
]

let cachedCatalog = null

export function loadStrokes({ forceReload = false } = {}) {
  if (cachedCatalog && !forceReload) return cachedCatalog

  const strokes = []
  const approvedFunctions = new Set()

  for (const source of STROKE_FILES) {
    const filePath = path.join(STROKES_DIR, source.file)
    const headerPath = path.join(PAINTERS_DIR, source.header)
    const records = readJsonArray(filePath)
    const headerFunctions = readHeaderFunctions(headerPath)
    headerFunctions.forEach((functionName) => approvedFunctions.add(functionName))

    for (const record of records) {
      assertStrokeRecord(record, source.file)
      if (!headerFunctions.has(record.base_function)) {
        throw new Error(`Función base no implementada: ${record.base_function} (${source.file})`)
      }
      strokes.push(deepFreeze(record))
    }
  }

  const byId = new Map()
  for (const stroke of strokes) {
    if (byId.has(stroke.stroke_id)) {
      throw new Error(`stroke_id duplicado: ${stroke.stroke_id}`)
    }
    byId.set(stroke.stroke_id, stroke)
  }

  cachedCatalog = Object.freeze({
    strokes: Object.freeze(strokes),
    byId,
    artists: new Set(strokes.map((stroke) => stroke.artist)),
    emotions: new Set(strokes.map((stroke) => stroke.emotion)),
    approvedFunctions,
  })
  return cachedCatalog
}

function readJsonArray(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (!Array.isArray(parsed)) {
    throw new Error(`El archivo de trazos debe contener una lista: ${filePath}`)
  }
  return parsed
}

function readHeaderFunctions(headerPath) {
  const contents = fs.readFileSync(headerPath, 'utf8')
  const functionNames = new Set()
  const pattern = /void\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*int speed\s*,\s*int intensity\s*,\s*int durationMs\s*,\s*int pressure\s*\)\s*;/g
  let match
  while ((match = pattern.exec(contents)) !== null) {
    functionNames.add(match[1])
  }
  return functionNames
}

function assertStrokeRecord(record, sourceFile) {
  const required = [
    'stroke_id',
    'artist',
    'emotion',
    'base_function',
    'speed',
    'intensity',
    'duration_ms',
    'pressure',
    'color_palette',
    'safe_limits',
  ]
  for (const field of required) {
    if (record?.[field] === undefined) {
      throw new Error(`Falta ${field} en ${sourceFile}`)
    }
  }
  if (!Array.isArray(record.color_palette) || record.color_palette.length === 0) {
    throw new Error(`Paleta vacía en ${record.stroke_id}`)
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  Object.values(value).forEach(deepFreeze)
  return value
}
