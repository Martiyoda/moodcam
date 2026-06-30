import { useState, useRef, useCallback, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { useAudioRecording } from "./useAudioRecording";
import { useAudioPlayback } from "./useAudioPlayback";
import { VOICE_DETECTION, WEBSOCKET_URL } from "../constants";
import { Message, ConnectionStatus, WebSocketMessage } from "../types";
import { arrayBufferToFloat32, base64ToFloat32 } from "../services/audioUtils";

interface UseVoiceConversationReturn {
  isConnected: boolean;
  isRecording: boolean;
  transcription: Message[];
  error: string;
  connectionStatus: ConnectionStatus;
  isSpeaking: boolean;
  startConversation: () => Promise<void>;
  stopConversation: () => void;
  toggleConversation: () => void;
  clearError: () => void;
}

/**
 * Hook principal para una conversación de voz pura.
 */
export function useVoiceConversation(): UseVoiceConversationReturn {
  const HALF_DUPLEX_RELEASE_MS = 800;
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<Message[]>([]);
  const [error, setError] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("Disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const {
    connect,
    disconnect,
    send,
    onMessage,
    onConnection,
    isConnected: wsIsConnected,
  } = useWebSocket();
  const { startRecording, stopRecording, isRecording: audioIsRecording } =
    useAudioRecording();
  const { playAudio, stopAllAudio, hasActiveAudio } = useAudioPlayback();

  const currentResponseIdRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasAssistantSpeakingRef = useRef<boolean>(false);
  const halfDuplexHoldUntilRef = useRef<number>(0);
  const isInterruptedRef = useRef<boolean>(false);

  useEffect(() => {
    audioCheckIntervalRef.current = setInterval(() => {
      const hasAudio = hasActiveAudio();
      setIsSpeaking(hasAudio);

      if (wasAssistantSpeakingRef.current && !hasAudio) {
        halfDuplexHoldUntilRef.current = Date.now() + HALF_DUPLEX_RELEASE_MS;
      }
      wasAssistantSpeakingRef.current = hasAudio;
    }, 100);

    return () => {
      if (audioCheckIntervalRef.current) {
        clearInterval(audioCheckIntervalRef.current);
      }
    };
  }, [hasActiveAudio]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (audioCheckIntervalRef.current) {
        clearInterval(audioCheckIntervalRef.current);
      }
      stopRecording();
      disconnect();
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAudioChunk = useCallback(
    (audioData: ArrayBuffer) => {
      const isHalfDuplexBlocked =
        hasActiveAudio() || Date.now() < halfDuplexHoldUntilRef.current;
      if (isHalfDuplexBlocked) {
        return;
      }

      if (wsIsConnected() && audioIsRecording()) {
        send(audioData);
      }
    },
    [send, wsIsConnected, audioIsRecording, hasActiveAudio]
  );

  const handleUserSpeaking = useCallback(
    (speaking: boolean, wasSpeaking: boolean) => {
      const isHalfDuplexBlocked =
        hasActiveAudio() || Date.now() < halfDuplexHoldUntilRef.current;
      if (isHalfDuplexBlocked) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        return;
      }

      if (!speaking && wasSpeaking) {
        isInterruptedRef.current = false;
      }

      if (!speaking && wasSpeaking) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (wsIsConnected() && !currentResponseIdRef.current) {
            send({
              type: "response.create",
            });
          }
          silenceTimerRef.current = null;
        }, VOICE_DETECTION.silenceDurationMs);
      }
    },
    [send, wsIsConnected, hasActiveAudio]
  );

  const startConversation = useCallback(async () => {
    try {
      setError("");
      setConnectionStatus("Connecting");

      onMessage("audio", async (blob: Blob) => {
        if (isInterruptedRef.current) {
          return;
        }

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const float32 = await arrayBufferToFloat32(arrayBuffer);
          playAudio(float32);
        } catch (audioErr) {
          console.error("Error reproduciendo audio:", audioErr);
        }
      });

      onMessage(
        "conversation.item.input_audio_transcription.completed",
        (data: WebSocketMessage) => {
          const userMessage: Message = {
            role: "user",
            content: (data.transcript as string) || "",
            timestamp: new Date(),
          };
          setTranscription((prev) => [...prev, userMessage]);
        }
      );

      onMessage("response.audio.delta", (data: WebSocketMessage) => {
        if (isInterruptedRef.current) {
          return;
        }

        try {
          const float32 = base64ToFloat32((data.delta as string) || "");
          playAudio(float32);
        } catch (audioErr) {
          console.error("Error procesando audio delta:", audioErr);
        }
      });

      onMessage("conversation.item.output_text.delta", (data: WebSocketMessage) => {
        const deltaText = (data.delta as string) || "";
        if (!deltaText.trim()) {
          return;
        }

        setTranscription((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: lastMessage.content + deltaText,
              },
            ];
          }

          return [
            ...prev,
            {
              role: "assistant",
              content: deltaText,
              timestamp: new Date(),
            },
          ];
        });
      });

      onMessage("conversation.item.output_text.done", (data: WebSocketMessage) => {
        const fullText = (data.text as string) || "";
        if (!fullText.trim()) {
          return;
        }

        setTranscription((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: fullText || lastMessage.content,
              },
            ];
          }

          return [
            ...prev,
            {
              role: "assistant",
              content: fullText,
              timestamp: new Date(),
            },
          ];
        });
      });

      onMessage("response.audio_transcript.delta", (data: WebSocketMessage) => {
        const transcriptDelta = (data.delta as string) || "";
        if (!transcriptDelta.trim()) {
          return;
        }

        setTranscription((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: lastMessage.content + transcriptDelta,
              },
            ];
          }

          return [
            ...prev,
            {
              role: "assistant",
              content: transcriptDelta,
              timestamp: new Date(),
            },
          ];
        });
      });

      onMessage("response.audio_transcript.done", (data: WebSocketMessage) => {
        const fullTranscript = (data.transcript as string) || "";
        if (!fullTranscript.trim()) {
          return;
        }

        setTranscription((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: fullTranscript || lastMessage.content,
              },
            ];
          }

          return [
            ...prev,
            {
              role: "assistant",
              content: fullTranscript,
              timestamp: new Date(),
            },
          ];
        });
      });

      onMessage("response.created", (data: WebSocketMessage) => {
        currentResponseIdRef.current =
          (data.response as { id?: string })?.id || null;
      });

      onMessage("response.done", () => {
        currentResponseIdRef.current = null;
      });

      onMessage("response.cancelled", () => {
        currentResponseIdRef.current = null;
        stopAllAudio();
        isInterruptedRef.current = false;
      });

      onMessage("error", (data: WebSocketMessage) => {
        const directMessage =
          typeof data.message === "string" ? data.message : "";
        const nestedMessage =
          typeof data.error === "object" &&
          data.error !== null &&
          "message" in data.error &&
          typeof (data.error as { message?: unknown }).message === "string"
            ? (data.error as { message: string }).message
            : "";
        setError(directMessage || nestedMessage || "Error desconocido");
        setConnectionStatus("Disconnected");
      });

      onConnection({
        onOpen: () => {
          setIsConnected(true);
          setConnectionStatus("Connected");
          setIsRecording(true);
          currentResponseIdRef.current = null;
          isInterruptedRef.current = false;

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        },
        onClose: () => {
          setIsConnected(false);
          setConnectionStatus("Disconnected");
          setIsRecording(false);
        },
        onError: (err: Error) => {
          setError(err.message);
          setConnectionStatus("Disconnected");
        },
      });

      await connect(WEBSOCKET_URL);
      await startRecording(handleAudioChunk, handleUserSpeaking);
    } catch (err) {
      console.error("Error iniciando conversación:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al acceder al micrófono o conectar con el servidor"
      );
      setConnectionStatus("Disconnected");
    }
  }, [
    connect,
    onMessage,
    onConnection,
    startRecording,
    handleAudioChunk,
    playAudio,
    stopAllAudio,
    handleUserSpeaking,
  ]);

  const stopConversation = useCallback(() => {
    stopAllAudio();

    if (currentResponseIdRef.current && wsIsConnected()) {
      send({
        type: "response.cancel",
        response_id: currentResponseIdRef.current,
      });
    }

    disconnect();
    stopRecording();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setIsRecording(false);
    setIsConnected(false);
    setConnectionStatus("Disconnected");
    currentResponseIdRef.current = null;
    isInterruptedRef.current = false;
    setTranscription([]);
  }, [disconnect, stopRecording, stopAllAudio, send, wsIsConnected]);

  const toggleConversation = useCallback(() => {
    if (isRecording) {
      stopConversation();
    } else {
      void startConversation();
    }
  }, [isRecording, startConversation, stopConversation]);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    isConnected,
    isRecording,
    transcription,
    error,
    connectionStatus,
    isSpeaking,
    startConversation,
    stopConversation,
    toggleConversation,
    clearError,
  };
}
