import { useCallback, useMemo, useRef, useState } from 'react'
import { createAudioToneAnalyzer, scoreToneEmotion } from '../lib/audioToneAnalyzer'
import { analyzeEmotionText, estimateWordsPerMinute } from '../lib/emotionTextAnalyzer'
import { fuseEmotionSignals } from '../lib/emotionFusionService'
import { mapFaceEmotionToSimple } from '../lib/faceEmotionProvider'
import { createBrowserSpeechToTextProvider } from '../lib/speechToTextProvider'
import { simpleScoresToArtSummary } from '../lib/emotionCategories'

const EMPTY_TEXT_SCORES = { neutral: 1 }
const EMPTY_TONE_SCORES = { neutral: 1 }
const EMPTY_FACE_SCORES = { neutral: 1 }

export default function useVoiceDetector() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [voiceSamples, setVoiceSamples] = useState([])
  const [latestVoiceSample, setLatestVoiceSample] = useState(null)
  const [speechSupported, setSpeechSupported] = useState(true)

  const streamRef = useRef(null)
  const toneAnalyzerRef = useRef(null)
  const speechProviderRef = useRef(null)
  const latestToneRef = useRef({ intensity: 0, rms: 0, peak: 0, speaking: false, silenceMs: 0 })
  const transcriptRef = useRef([])

  const stop = useCallback(() => {
    speechProviderRef.current?.stop()
    speechProviderRef.current = null
    toneAnalyzerRef.current?.stop()
    toneAnalyzerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStatus((current) => current === 'listening' || current === 'starting' ? 'ended' : current)
  }, [])

  const reset = useCallback(() => {
    stop()
    setStatus('idle')
    setError(null)
    setTranscript([])
    setVoiceSamples([])
    setLatestVoiceSample(null)
    transcriptRef.current = []
    latestToneRef.current = { intensity: 0, rms: 0, peak: 0, speaking: false, silenceMs: 0 }
  }, [stop])

  const recordSample = useCallback(({ text = '', final = false, toneMetrics = latestToneRef.current } = {}) => {
    const nextTranscript = text
      ? [
        ...transcriptRef.current,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          speaker: 'user',
          text,
          final,
          timestamp: Date.now(),
        },
      ]
      : transcriptRef.current

    if (text) {
      transcriptRef.current = nextTranscript
      setTranscript(nextTranscript)
    }

    const wordsPerMinute = estimateWordsPerMinute(nextTranscript)
    const textAnalysis = analyzeEmotionText(nextTranscript.map((item) => item.text).join(' '))
    const toneScores = scoreToneEmotion(toneMetrics, wordsPerMinute)
    const fused = fuseEmotionSignals({
      textScores: textAnalysis.scores,
      toneScores,
      faceScores: EMPTY_FACE_SCORES,
    }, { text: 0.65, tone: 0.35, face: 0 })

    const sample = {
      timestamp: Date.now(),
      detection_time: new Date().toISOString(),
      transcript_fragment: text,
      transcript_full: nextTranscript.map((item) => item.text).join(' '),
      final,
      intensity: toneMetrics.intensity || 0,
      rms: toneMetrics.rms || 0,
      peak: toneMetrics.peak || 0,
      speaking: Boolean(toneMetrics.speaking),
      silence_ms: Math.round(toneMetrics.silenceMs || 0),
      words_per_minute: wordsPerMinute,
      text_scores: textAnalysis.scores,
      tone_scores: toneScores,
      dominant: fused.dominant,
      label: fused.label,
      confidence: fused.confidence,
      emotions: fused.scores,
      colors: textAnalysis.colors,
      keywords: textAnalysis.keywords,
    }

    setLatestVoiceSample(sample)
    setVoiceSamples((current) => [...current, sample])
    return sample
  }, [])

  const start = useCallback(async () => {
    reset()
    setStatus('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      toneAnalyzerRef.current = createAudioToneAnalyzer(stream, {
        onSample: (metrics) => {
          latestToneRef.current = metrics
          recordSample({ toneMetrics: metrics })
        },
      })

      speechProviderRef.current = createBrowserSpeechToTextProvider({
        onStatus: setStatus,
        onError: (message) => {
          setError(message)
          setSpeechSupported(false)
        },
        onTranscript: ({ text, final }) => recordSample({ text, final }),
      })
      setSpeechSupported(speechProviderRef.current.supported)
      speechProviderRef.current.start()
      if (!speechProviderRef.current.supported) setStatus('listening')
      return true
    } catch (startError) {
      console.error('Voice detector error:', startError)
      setError(startError.message || 'No se pudo iniciar el micrófono.')
      stop()
      setStatus('error')
      return false
    }
  }, [recordSample, reset, stop])

  const buildFusion = useCallback((faceEmotions) => {
    const text = transcriptRef.current.map((item) => item.text).join(' ')
    const textAnalysis = analyzeEmotionText(text)
    const wordsPerMinute = estimateWordsPerMinute(transcriptRef.current)
    const toneScores = scoreToneEmotion(latestToneRef.current, wordsPerMinute)
    return fuseEmotionSignals({
      textScores: text ? textAnalysis.scores : EMPTY_TEXT_SCORES,
      toneScores: latestVoiceSample ? toneScores : EMPTY_TONE_SCORES,
      faceScores: faceEmotions ? mapFaceEmotionToSimple(faceEmotions) : EMPTY_FACE_SCORES,
    })
  }, [latestVoiceSample])

  const summary = useMemo(() => {
    const latest = latestVoiceSample
    return {
      main_emotions: simpleScoresToArtSummary(latest?.emotions || { neutral: 1 }),
      simple_emotion: latest?.dominant || 'neutral',
      label: latest?.label || 'neutro',
      confidence: latest?.confidence || 1,
      average_intensity: average(voiceSamples.map((sample) => sample.intensity)),
      speaking_ratio: voiceSamples.length ? voiceSamples.filter((sample) => sample.speaking).length / voiceSamples.length : 0,
      color_preferences: rankedStrings(voiceSamples.flatMap((sample) => sample.colors || [])),
      keywords: rankedStrings(voiceSamples.flatMap((sample) => sample.keywords || [])),
      sample_count: voiceSamples.length,
      speech_supported: speechSupported,
    }
  }, [latestVoiceSample, speechSupported, voiceSamples])

  return {
    status,
    error,
    transcript,
    voiceSamples,
    latestVoiceSample,
    summary,
    speechSupported,
    start,
    stop,
    reset,
    buildFusion,
  }
}

function average(values) {
  const filtered = values.filter((value) => typeof value === 'number')
  if (!filtered.length) return 0
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length)
}

function rankedStrings(values) {
  const counts = values.reduce((map, value) => {
    if (!value) return map
    map.set(value, (map.get(value) || 0) + 1)
    return map
  }, new Map())

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([value]) => value)
}
