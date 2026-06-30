import { useEffect, useRef, useState, useCallback } from 'react'
import { Human } from '@vladmandic/human'

export const DEFAULT_CONFIG = {
    face: {
        detector: { minConfidence: 0.5, maxDetected: 1, rotation: false, iouThreshold: 0.1, skipFrames: 99, skipTime: 2500 },
        mesh: { enabled: true },
        emotion: { minConfidence: 0.3, skipFrames: 99, skipTime: 1500 },
    },
    filter: {
        equalization: true,
        autoBrightness: true,
        sharpness: 0,
        brightness: 0,
        contrast: 0,
        blur: 0,
    },
    cacheSensitivity: 0.7,
    smoothing: { enabled: true, factor: 0.25 },
}

const STORAGE_KEY = 'moodcam-detection-config'

function loadStoredConfig() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return null
        const parsed = JSON.parse(stored)
        return mergeDeep(structuredClone(DEFAULT_CONFIG), parsed)
    } catch {
        return null
    }
}

function saveConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
        // Ignore storage quota or private browsing failures.
    }
}

function mergeDeep(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && key in target) {
            mergeDeep(target[key], source[key])
        } else if (key in target) {
            target[key] = source[key]
        }
    }
    return target
}

function buildHumanConfig(userConfig) {
    return {
        modelBasePath: '/models',
        cacheSensitivity: userConfig.cacheSensitivity,
        filter: {
            enabled: true,
            ...userConfig.filter,
        },
        face: {
            enabled: true,
            detector: { enabled: true, ...userConfig.face.detector },
            mesh: { enabled: true },
            emotion: { enabled: true, ...userConfig.face.emotion },
            description: { enabled: false },
            iris: { enabled: false },
            antispoof: { enabled: false },
            liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
    }
}

let humanInstance = null
function getHuman(config) {
    if (!humanInstance) {
        humanInstance = new Human(buildHumanConfig(config))
    }
    return humanInstance
}

export default function useFaceDetection() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const rafRef = useRef(null)
    const detectingRef = useRef(false)
    const smoothedEmotionsRef = useRef(null)

    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [cameraActive, setCameraActive] = useState(false)
    const [emotions, setEmotions] = useState(null)
    const [dominant, setDominant] = useState(null)
    const [age, setAge] = useState(null)
    const [gender, setGender] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [detectionConfig, setDetectionConfig] = useState(() => loadStoredConfig() || structuredClone(DEFAULT_CONFIG))

    const configRef = useRef(detectionConfig)

    useEffect(() => {
        configRef.current = detectionConfig
    }, [detectionConfig])

    const updateConfig = useCallback((key, value) => {
        setDetectionConfig(prev => {
            const next = structuredClone(prev)
            const keys = key.split('.')
            let obj = next
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]]
            }
            obj[keys[keys.length - 1]] = value
            return next
        })
    }, [])

    const resetConfig = useCallback(() => {
        const defaults = structuredClone(DEFAULT_CONFIG)
        setDetectionConfig(defaults)
    }, [])

    useEffect(() => {
        saveConfig(detectionConfig)
    }, [detectionConfig])

    useEffect(() => {
        if (!humanInstance) return
        const newHumanConfig = buildHumanConfig(detectionConfig)
        Object.assign(humanInstance.config.face.detector, newHumanConfig.face.detector)
        Object.assign(humanInstance.config.face.emotion, newHumanConfig.face.emotion)
        Object.assign(humanInstance.config.filter, newHumanConfig.filter)
        humanInstance.config.cacheSensitivity = newHumanConfig.cacheSensitivity
    }, [detectionConfig])

    const smoothEmotions = useCallback((rawEmotions) => {
        const cfg = configRef.current.smoothing
        if (!cfg.enabled || !smoothedEmotionsRef.current) {
            smoothedEmotionsRef.current = { ...rawEmotions }
            return { ...rawEmotions }
        }
        const alpha = cfg.factor
        const smoothed = {}
        for (const key in rawEmotions) {
            const prev = smoothedEmotionsRef.current[key] ?? rawEmotions[key]
            smoothed[key] = alpha * rawEmotions[key] + (1 - alpha) * prev
        }
        smoothedEmotionsRef.current = smoothed
        return smoothed
    }, [])

    useEffect(() => {
        async function loadModels() {
            try {
                setLoading(true)
                const human = getHuman(detectionConfig)
                await human.load()
                await human.warmup()
                setModelsLoaded(true)
            } catch (err) {
                console.error('Error cargando modelos:', err)
                setError('No se pudieron cargar los modelos de deteccion facial.')
            } finally {
                setLoading(false)
            }
        }
        loadModels()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const startCamera = useCallback(async () => {
        if (!modelsLoaded) return false
        try {
            setError(null)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            setCameraActive(true)
            return true
        } catch (err) {
            console.error('Error accediendo a camara:', err)
            setError('No se pudo acceder a la camara. Asegurate de dar permisos.')
            return false
        }
    }, [modelsLoaded])

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
        detectingRef.current = false
        smoothedEmotionsRef.current = null
        setCameraActive(false)
        setEmotions(null)
        setDominant(null)
        setAge(null)
        setGender(null)
    }, [])

    useEffect(() => {
        if (!cameraActive || !modelsLoaded) return

        const video = videoRef.current
        if (!video) return

        const human = getHuman(configRef.current)

        const handlePlay = () => {
            detectingRef.current = true

            const detectLoop = async () => {
                if (!detectingRef.current) return

                try {
                    const result = await human.detect(video)
                    const canvas = canvasRef.current

                    if (canvas && video.videoWidth > 0) {
                        canvas.width = video.videoWidth
                        canvas.height = video.videoHeight
                        const ctx = canvas.getContext('2d')
                        ctx.clearRect(0, 0, canvas.width, canvas.height)

                        human.draw.face(canvas, result.face, {
                            drawBoxes: true,
                            drawLabels: false,
                            drawPoints: false,
                            drawPolygons: true,
                            fillPolygons: false,
                        })
                    }

                    if (result.face && result.face.length > 0) {
                        const face = result.face[0]

                        if (face.emotion && face.emotion.length > 0) {
                            const rawMap = {}
                            face.emotion.forEach(({ emotion, score }) => {
                                rawMap[emotion] = score
                            })
                            const smoothed = smoothEmotions(rawMap)
                            setEmotions(smoothed)

                            const dominantEmotion = Object.entries(smoothed).sort(([, a], [, b]) => b - a)[0][0]
                            setDominant(dominantEmotion)
                        }

                        if (face.age) setAge(Math.round(face.age))
                        if (face.gender) setGender(face.gender)
                    } else {
                        setEmotions(null)
                        setDominant(null)
                        setAge(null)
                        setGender(null)
                    }
                } catch (err) {
                    console.error('Error en deteccion:', err)
                }

                if (detectingRef.current) {
                    rafRef.current = requestAnimationFrame(detectLoop)
                }
            }

            detectLoop()
        }

        video.addEventListener('playing', handlePlay)
        if (!video.paused && video.readyState >= 2) handlePlay()

        return () => {
            video.removeEventListener('playing', handlePlay)
            detectingRef.current = false
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [cameraActive, modelsLoaded, smoothEmotions])

    useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [stopCamera])

    return {
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
    }
}
