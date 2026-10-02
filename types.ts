

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  translation?: string;
  slang?: string; // Western Cape slang (Kaaps) translation
  isFinal: boolean;
  timestamp: Date;
  sources?: { title: string; uri: string }[];
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerData {
  volume: number;
}

export type TutorStyle = 'Formal' | 'Both' | 'Kaapse' | 'isiXhosa';

export interface TranslationVariations {
  formal: string;
  kaapse: string;
  english: string;
  isixhosa?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  translations?: TranslationVariations;
}

export interface Flashcard {
  afrikaans: string;
  english: string;
  example: string;
  isixhosa?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export type LearningState = 'MENU' | 'FLASHCARDS' | 'QUIZ' | 'PRONUNCIATION' | 'ROLEPLAY';

// --- TRIVIA TYPES ---

export type TriviaPersonaId = 'Auntie Christine' | 'Bra Colin' | 'Meester Martin';

export interface TriviaPersona {
  id: TriviaPersonaId;
  name: string;
  role: string;
  description: string;
  voice: string;
  avatarPrompt?: string;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  hostIntro: string; // What the host says before/while asking
}

export type TriviaState = 'SELECTION' | 'LOADING' | 'QUESTION' | 'FEEDBACK';

// --- IMAGE GEN TYPES ---

export type ImageSize = '1K' | '2K' | '4K';

export type ImageAspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';

export type ImageStyle = 
  | 'Cartoon' 
  | 'Oil Painting' 
  | 'Pencil Sketch' 
  | 'Watercolor' 
  | 'Anime' 
  | 'Retro 80s'
  | '3D Render'
  | 'Photorealistic';