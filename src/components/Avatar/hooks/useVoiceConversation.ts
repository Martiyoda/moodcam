import { useState, useRef, useCallback, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { useAudioRecording } from "./useAudioRecording";
import { useAudioPlayback } from "./useAudioPlayback";
import { WEBSOCKET_URL } from "../constants";
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
 * Hook principal para una conversacion de voz pura.
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
  const { preparePlayback, playAudio, stopAllAudio, hasActiveAudio } =
    useAudioPlayback();

  const currentResponseIdRef = useRef<string | null>(null);
  const externalAgentResponseActiveRef = useRef<boolean>(false);
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
      if (speaking && !wasSpeaking) {
        externalAgentResponseActiveRef.current = false;
      }

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
    },
    [hasActiveAudio]
  );

  const startConversation = useCallback(
    async () => {
      try {
        setError("");
        setConnectionStatus("Connecting");

        await preparePlayback();

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

        onMessage(
          "conversation.item.output_text.delta",
          (data: WebSocketMessage) => {
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
          }
        );

        onMessage(
          "conversation.item.output_text.done",
          (data: WebSocketMessage) => {
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
          }
        );

        onMessage(
          "response.audio_transcript.delta",
          (data: WebSocketMessage) => {
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
          }
        );

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

        onMessage("stt_output", (data: WebSocketMessage) => {
          const transcript = (data.transcript as string) || "";
          externalAgentResponseActiveRef.current = false;

          if (!transcript.trim()) {
            return;
          }

          setTranscription((prev) => [
            ...prev,
            {
              role: "user",
              content: transcript,
              timestamp: new Date(),
            },
          ]);
        });

        onMessage("agent_chunk", (data: WebSocketMessage) => {
          const chunkText = (data.text as string) || "";
          if (!chunkText.trim()) {
            return;
          }

          setTranscription((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (
              externalAgentResponseActiveRef.current &&
              lastMessage?.role === "assistant"
            ) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: lastMessage.content + chunkText,
                },
              ];
            }

            externalAgentResponseActiveRef.current = true;
            return [
              ...prev,
              {
                role: "assistant",
                content: chunkText,
                timestamp: new Date(),
              },
            ];
          });
        });

        onMessage("agent_end", () => {
          externalAgentResponseActiveRef.current = false;
          currentResponseIdRef.current = null;
        });

        onMessage("tts_chunk", (data: WebSocketMessage) => {
          if (isInterruptedRef.current) {
            return;
          }

          try {
            const audioBase64 = (data.audio as string) || "";
            if (audioBase64) {
              playAudio(base64ToFloat32(audioBase64));
            }
          } catch (audioErr) {
            console.error("Error procesando audio TTS:", audioErr);
          }
        });

        onMessage("error", (data: WebSocketMessage) => {
          const directMessage =
            typeof data.message === "string" ? data.message : "";
          const errorCode = typeof data.code === "string" ? data.code : "";
          const nestedMessage =
            typeof data.error === "object" &&
            data.error !== null &&
            "message" in data.error &&
            typeof (data.error as { message?: unknown }).message === "string"
              ? (data.error as { message: string }).message
              : "";
          const message = directMessage || nestedMessage || "Error desconocido";
          setError(errorCode ? `${message} (${errorCode})` : message);
          setConnectionStatus("Disconnected");
        });

        onConnection({
          onOpen: () => {
            setIsConnected(true);
            setConnectionStatus("Connected");
            setIsRecording(true);
            currentResponseIdRef.current = null;
            externalAgentResponseActiveRef.current = false;
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
        console.error("Error iniciando conversacion:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al acceder al microfono o conectar con el servidor"
        );
        setConnectionStatus("Disconnected");
      }
    },
    [
      connect,
      onMessage,
      onConnection,
      preparePlayback,
      startRecording,
      handleAudioChunk,
      playAudio,
      stopAllAudio,
      handleUserSpeaking,
    ]
  );

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
    externalAgentResponseActiveRef.current = false;
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
