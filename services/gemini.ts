
import { Flashcard, QuizQuestion, TriviaQuestion, TriviaPersonaId, ImageSize, ImageStyle, ImageAspectRatio, TranslationVariations, TutorStyle } from "../types";
import { TRIVIA_PERSONAS_DATA, CAPE_FLATS_IMAGE_CONTEXT } from "../constants";

/**
 * Generic fetch wrapper for API calls
 */
async function fetchAPI(endpoint: string, body: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Translates text between English, Afrikaans (Formal/Kaapse), and isiXhosa.
 */
export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text.trim()) return "";
  const data = await fetchAPI('/api/gemini/translate', { text, targetLang });
  return data.translation;
};

/**
 * Generates audio speech from text using Gemini TTS.
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  const data = await fetchAPI('/api/gemini/tts', { text, voiceName });
  return data.audio;
};

/**
 * Generates variation translations (Formal, Kaapse, English) for a given text.
 */
export const generateVariations = async (text: string): Promise<TranslationVariations> => {
  return await fetchAPI('/api/gemini/variations', { text });
};

/**
 * Transcribes audio using Gemini.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const data = await fetchAPI('/api/gemini/transcribe', { base64Audio, mimeType });
  return data.transcription;
};

/**
 * Generates flashcards for a specific topic.
 */
export const generateFlashcards = async (topic: string, style: TutorStyle = 'Kaapse'): Promise<Flashcard[]> => {
  return await fetchAPI('/api/gemini/flashcards', { topic, style });
};

/**
 * Generates quiz questions for a specific topic.
 */
export const generateQuiz = async (topic: string, style: TutorStyle = 'Kaapse'): Promise<QuizQuestion[]> => {
  return await fetchAPI('/api/gemini/quiz', { topic, style });
};

/**
 * Chatbot interaction.
 */
export const sendChatMessage = async (history: any[], message: string, instruction: string): Promise<string> => {
  const data = await fetchAPI('/api/gemini/chat', { history, message, instruction });
  return data.text;
};

/**
 * Generates a Trivia Question with Host Intro
 */
export const generateTriviaQuestion = async (personaId: TriviaPersonaId, topic: string): Promise<TriviaQuestion> => {
  return await fetchAPI('/api/gemini/trivia-question', { personaId, topic, personaData: TRIVIA_PERSONAS_DATA });
};

/**
 * Generates Host Feedback for Trivia
 */
export const generateTriviaFeedback = async (
  personaId: TriviaPersonaId, 
  isCorrect: boolean, 
  correctAnswer: string
): Promise<string> => {
   const data = await fetchAPI('/api/gemini/trivia-feedback', { personaId, isCorrect, correctAnswer, personaData: TRIVIA_PERSONAS_DATA });
   return data.text;
};

/**
 * Generates an image based on a prompt with Cape Flats context.
 */
export const generateCapeImage = async (
  userPrompt: string, 
  size: ImageSize, 
  style: ImageStyle, 
  aspectRatio: ImageAspectRatio,
  useLocationGrounding: boolean,
  referenceImageBase64?: string
): Promise<string> => {
  const data = await fetchAPI('/api/gemini/image', {
    userPrompt,
    size,
    style,
    aspectRatio,
    useLocationGrounding,
    referenceImageBase64,
    imageContext: CAPE_FLATS_IMAGE_CONTEXT
  });
  return data.image;
};

/**
 * Initiates video generation with Veo 3.1.
 */
export const generateCapeVideo = async (
  prompt: string,
  image?: string | null,
  aspectRatio: ImageAspectRatio = '16:9'
): Promise<string> => {
  const data = await fetchAPI('/api/gemini/generate-video', {
    prompt,
    image,
    aspectRatio
  });
  return data.operationName;
};

/**
 * Checks status of video generation.
 */
export const getVideoStatus = async (
  operationName: string
): Promise<{ done: boolean; error?: any }> => {
  return await fetchAPI('/api/gemini/video-status', { operationName });
};

/**
 * Downloads generated video as base64 data URL.
 */
export const downloadVideo = async (
  operationName: string
): Promise<string> => {
  const data = await fetchAPI('/api/gemini/video-download', { operationName });
  return data.video;
};
