export const VOICE_ASSISTANT_INSTRUCTIONS =
  "Eres un asistente de voz amigable y útil. Habla con acento español de España. Di solo lo necesario para mantener una conversación breve y natural.";

export const AI_PROMPTS = {
  voiceAssistantInstructions: VOICE_ASSISTANT_INSTRUCTIONS,
} as const;

export type PromptName = keyof typeof AI_PROMPTS;
