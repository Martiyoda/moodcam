import test from 'node:test'
import assert from 'node:assert/strict'
import { bridgeReadiness, cameraReadiness, voiceReadiness } from './systemReadiness.js'

const configuredBridge = {
  payload: {
    status: 'online',
    openai_configured: true,
  },
}

test('marca AI Bridge listo antes de recibir el primer resumen', () => {
  assert.deepEqual(bridgeReadiness({ bridgePresence: configuredBridge }), {
    label: 'esperando resumen',
    state: 'ok',
  })
})

test('marca AI Bridge como pendiente mientras procesa una sesion', () => {
  assert.deepEqual(bridgeReadiness({ bridgePresence: configuredBridge, sessionActive: true }), {
    label: 'esperando chunks',
    state: 'pending',
  })
})

test('marca AI Bridge como no disponible sin OpenAI configurado', () => {
  assert.deepEqual(bridgeReadiness({
    bridgePresence: { payload: { status: 'online', openai_configured: false } },
  }), {
    label: 'OpenAI no configurado',
    state: 'error',
  })
})

test('marca la camara lista cuando sus modelos estan disponibles', () => {
  assert.deepEqual(cameraReadiness({ modelsLoaded: true, cameraActive: false, loading: false }), {
    label: 'lista',
    state: 'ok',
  })
})

test('marca la camara como no disponible cuando falla', () => {
  assert.deepEqual(cameraReadiness({ error: 'permiso denegado' }), {
    label: 'no disponible',
    state: 'error',
  })
})

test('marca la voz lista sin depender del AI Bridge', () => {
  assert.deepEqual(voiceReadiness({
    voiceAvailable: true,
    voiceEnabled: true,
    voiceStatus: 'idle',
    sessionActive: false,
  }), {
    label: 'lista',
    state: 'ok',
  })
})

test('marca la voz desactivada como estado inactivo', () => {
  assert.deepEqual(voiceReadiness({
    voiceAvailable: true,
    voiceEnabled: false,
  }), {
    label: 'desactivada',
    state: 'idle',
  })
})