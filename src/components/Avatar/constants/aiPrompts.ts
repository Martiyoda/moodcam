export const VOICE_ASSISTANT_INSTRUCTIONS =
  "Eres un asistente de voz amigable y util. Habla con acento espanol de Espana. Di solo lo necesario para mantener una conversacion breve y natural.";

export const CAMERA_WELCOME_PROMPT =
  "Saluda de forma breve y cercana en espanol de Espana. Di exactamente una frase que invite a la persona a mirar a la camara y a ver como se siente hoy. Mantente amable, natural y corto.";

export const AI_PROMPTS = {
  voiceAssistantInstructions: VOICE_ASSISTANT_INSTRUCTIONS,
  cameraWelcomePrompt: CAMERA_WELCOME_PROMPT,
} as const;

export type PromptName = keyof typeof AI_PROMPTS;
