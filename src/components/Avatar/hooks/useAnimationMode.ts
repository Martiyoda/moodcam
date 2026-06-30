import { useMemo } from "react";
import { ConnectionStatus } from "../types";
import type { VideoMode } from "./useVideoLoop";

/**
 * Hook para determinar el modo de animación (idle o speak).
 */
export function useAnimationMode(connectionStatus: ConnectionStatus, isSpeaking: boolean) {
  const mode = useMemo((): VideoMode => {
    if (connectionStatus === "Connected" && isSpeaking) {
      return "speak";
    }
    return "idle";
  }, [connectionStatus, isSpeaking]);

  return { mode };
}

