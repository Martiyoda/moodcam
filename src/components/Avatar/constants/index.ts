export const WEBSOCKET_URL =
  import.meta.env.VITE_WS_URL ||
  (typeof window !== "undefined"
    ? window.location.protocol === "https:"
      ? `wss://${window.location.hostname.replace(
          "fulgencio-frontend",
          "fulgencio-backend"
        )}/ws`
      : `ws://${window.location.hostname}:8000/ws`
    : "ws://localhost:8000/ws");

export const AUDIO_CONFIG = {
  channelCount: 1,
  sampleRate: 16000,
  echoCancellation: true,
  noiseSuppression: true,
} as const;

export const AUDIO_PROCESSING = {
  bufferSize: 4096,
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  sampleRate: 24000,
} as const;

export const VOICE_DETECTION = {
  speakingThreshold: 0.005,
  silenceDurationMs: 1000,
} as const;

