export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type ConnectionStatus = "Disconnected" | "Connecting" | "Connected";

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

