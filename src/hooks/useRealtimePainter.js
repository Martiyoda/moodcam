import { useCallback, useEffect, useRef, useState } from 'react'
import { createVoiceSample } from '../lib/voiceEngine'

const AUDIO_SAMPLE_MS = 500

export default function useRealtimePainter() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [voiceSamples, setVoiceSamples] = useState([])
  const [latestVoiceSample, setLatestVoiceSample] = useState(null)

  const peerRef = useRef(null)
  const dataChannelRef = useRef(null)
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserTimerRef = useRef(null)
  const lastMetricsRef = useRef({ intensity: 0, rms: 0, peak: 0, speaking: false, silenceMs: 0, wordsPerMinute: 0 })
  const lastSpeechAtRef = useRef(0)
  const transcriptWindowRef = useRef([])

  const stopAudioAnalysis = useCallback(() => {
    if (analyserTimerRef.current) {
      window.clearInterval(analyserTimerRef.current)
      analyserTimerRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  const stopConversation = useCallback(() => {
    stopAudioAnalysis()

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setStatus((current) => current === 'live' || current === 'connecting' ? 'ended' : current)
  }, [stopAudioAnalysis])

  const resetConversation = useCallback(() => {
    stopConversation()
    setStatus('idle')
    setError(null)
    setTranscript([])
    setVoiceSamples([])
    setLatestVoiceSample(null)
    transcriptWindowRef.current = []
    lastMetricsRef.current = { intensity: 0, rms: 0, peak: 0, speaking: false, silenceMs: 0, wordsPerMinute: 0 }
  }, [stopConversation])

  const recordVoiceSample = useCallback((metrics, text = '') => {
    const sample = createVoiceSample(metrics, text)
    setLatestVoiceSample(sample)
    setVoiceSamples((currentSamples) => [...currentSamples, sample])
    return sample
  }, [])

  const addTranscript = useCallback((item) => {
    const normalized = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      ...item,
    }

    setTranscript((current) => [...current, normalized])

    if (normalized.speaker === 'user') {
      const words = normalized.text.trim().split(/\s+/).filter(Boolean).length
      transcriptWindowRef.current = [
        ...transcriptWindowRef.current,
        { timestamp: Date.now(), words },
      ].filter((entry) => Date.now() - entry.timestamp < 15_000)

      const totalWords = transcriptWindowRef.current.reduce((sum, entry) => sum + entry.words, 0)
      const wordsPerMinute = Math.round((totalWords / 15) * 60)
      const metrics = { ...lastMetricsRef.current, wordsPerMinute }
      lastMetricsRef.current = metrics
      recordVoiceSample(metrics, normalized.text)
    }
  }, [recordVoiceSample])

  const startAudioAnalysis = useCallback((stream) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      setError('Este navegador no permite analizar intensidad de voz con Web Audio.')
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    const source = audioContext.createMediaStreamSource(stream)
    const data = new Uint8Array(analyser.fftSize)
    source.connect(analyser)
    audioContextRef.current = audioContext
    lastSpeechAtRef.current = Date.now()

    analyserTimerRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      let peak = 0

      for (let i = 0; i < data.length; i += 1) {
        const centered = (data[i] - 128) / 128
        sum += centered * centered
        peak = Math.max(peak, Math.abs(centered))
      }

      const rms = Math.sqrt(sum / data.length)
      const intensity = Math.min(100, Math.round(rms * 220))
      const speaking = intensity > 7 || peak > 0.16
      if (speaking) lastSpeechAtRef.current = Date.now()

      const metrics = {
        intensity,
        rms,
        peak,
        speaking,
        silenceMs: Date.now() - lastSpeechAtRef.current,
        wordsPerMinute: lastMetricsRef.current.wordsPerMinute || 0,
      }

      lastMetricsRef.current = metrics
      recordVoiceSample(metrics)
    }, AUDIO_SAMPLE_MS)
  }, [recordVoiceSample])

  const handleRealtimeEvent = useCallback((event) => {
    const transcriptText = extractTranscriptText(event)
    if (!transcriptText) return

    addTranscript({
      speaker: isUserTranscript(event) ? 'user' : 'painter',
      text: transcriptText,
      type: event.type,
    })
  }, [addTranscript])

  const startConversation = useCallback(async (artist) => {
    resetConversation()
    setStatus('connecting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      startAudioAnalysis(stream)

      const peer = new RTCPeerConnection()
      peerRef.current = peer

      const remoteAudio = document.createElement('audio')
      remoteAudio.autoplay = true
      peer.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0]
      }

      stream.getTracks().forEach((track) => peer.addTrack(track, stream))

      const dataChannel = peer.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel
      dataChannel.addEventListener('message', (messageEvent) => {
        try {
          handleRealtimeEvent(JSON.parse(messageEvent.data))
        } catch {
          // Los eventos no JSON no son útiles para el transcript.
        }
      })
      dataChannel.addEventListener('open', () => {
        dataChannel.send(JSON.stringify({
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: `Saluda como ${artist.name}, explica que pintaréis emociones y pregunta qué colores le gustan.`,
          },
        }))
      })

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      const response = await fetch(`/api/realtime/session?artist=${encodeURIComponent(artist.id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'x-artist-id': artist.id,
        },
        body: offer.sdp,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'No se pudo crear la sesión Realtime.')
      }

      const answer = {
        type: 'answer',
        sdp: await response.text(),
      }
      await peer.setRemoteDescription(answer)
      setStatus('live')
      return true
    } catch (startError) {
      console.error('Realtime conversation error:', startError)
      setError(startError.message || 'No se pudo iniciar la conversación de voz.')
      stopConversation()
      setStatus('error')
      return false
    }
  }, [handleRealtimeEvent, resetConversation, startAudioAnalysis, stopConversation])

  useEffect(() => () => stopConversation(), [stopConversation])

  return {
    status,
    error,
    transcript,
    voiceSamples,
    latestVoiceSample,
    startConversation,
    stopConversation,
    resetConversation,
  }
}

function extractTranscriptText(event) {
  if (!event || typeof event !== 'object') return ''
  if (typeof event.transcript === 'string') return event.transcript.trim()
  if (typeof event.delta === 'string' && event.type?.includes('transcript')) return event.delta.trim()
  if (typeof event.text === 'string' && event.type?.includes('transcript')) return event.text.trim()
  return ''
}

function isUserTranscript(event) {
  return event.type?.includes('input_audio') || event.item?.role === 'user'
}
