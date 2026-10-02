
import React, { useState, useEffect, useRef } from 'react';
import { TRIVIA_PERSONAS_DATA, TRIVIA_TOPICS, AVAILABLE_VOICES } from '../constants';
import { generateTriviaQuestion, generateTriviaFeedback, generateSpeech, generateCapeImage } from '../services/gemini';
import { playAudioFromBase64 } from '../services/audio';
import { TriviaState, TriviaPersonaId, TriviaQuestion, ImageStyle } from '../types';
import { User, Car, GraduationCap, Play, Volume2, ArrowRight, Loader2, Sparkles, AlertCircle, ArrowLeft, CheckCircle, XCircle, Mic, Settings2, RefreshCw } from 'lucide-react';

// IndexedDB Constants
const DB_NAME = 'MaralackTriviaDB';
const STORE_NAME = 'avatars';
const CACHE_VERSION = 'v5'; // Update this if you change prompts to invalidate old images

// --- IndexedDB Helpers ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAvatarFromDB = async (id: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(`${id}_${CACHE_VERSION}`);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Error reading from IndexedDB", e);
    return null;
  }
};

const saveAvatarToDB = async (id: string, dataUrl: string) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ data: dataUrl }, `${id}_${CACHE_VERSION}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Error saving to IndexedDB", e);
  }
};

const TriviaMode: React.FC = () => {
  const [gameState, setGameState] = useState<TriviaState>('SELECTION');
  const [selectedPersonaId, setSelectedPersonaId] = useState<TriviaPersonaId | null>(null);
  const [currentVoice, setCurrentVoice] = useState<string>('Puck');
  
  // Track user voice preferences per persona
  const [personaVoices, setPersonaVoices] = useState<Record<string, string>>({});
  
  // Avatar Management
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [loadingAvatars, setLoadingAvatars] = useState<Record<string, boolean>>({});
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  
  // Queue for managing sequential generation
  const [generationQueue, setGenerationQueue] = useState<string[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Ref to prevent double-initialization in Strict Mode
  const initializationRef = useRef(false);

  const [currentTopic, setCurrentTopic] = useState('');
  const [questionData, setQuestionData] = useState<TriviaQuestion | null>(null);
  const [hostFeedback, setHostFeedback] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);

  // Initialize Avatars on Mount using IndexedDB
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAvatars = async () => {
      const personas = Object.values(TRIVIA_PERSONAS_DATA);
      const loadedAvatars: Record<string, string> = {};
      const missingIds: string[] = [];

      // 1. Attempt to load existing avatars from DB
      await Promise.all(personas.map(async (persona) => {
        const cachedData = await getAvatarFromDB(persona.id);
        if (cachedData) {
          loadedAvatars[persona.id] = cachedData;
        } else if (persona.avatarPrompt) {
          missingIds.push(persona.id);
        }
      }));

      // Update state with whatever we found
      setAvatars(prev => ({ ...prev, ...loadedAvatars }));

      // 2. Set queue for missing avatars
      if (missingIds.length > 0) {
        setGenerationQueue(missingIds);
      }
    };

    initializeAvatars();
  }, []);

  // Queue Processor Effect
  useEffect(() => {
    if (generationQueue.length === 0 || isProcessingQueue) return;

    const processNext = async () => {
      setIsProcessingQueue(true);
      const personaId = generationQueue[0];
      const persona = TRIVIA_PERSONAS_DATA[personaId as TriviaPersonaId];
      
      if (!persona || avatars[personaId]) {
         // Already has avatar or invalid, skip
         setGenerationQueue(prev => prev.slice(1));
         setIsProcessingQueue(false);
         return;
      }

      setLoadingAvatars(prev => ({ ...prev, [personaId]: true }));
      setFailedAvatars(prev => ({ ...prev, [personaId]: false }));
      
      try {
        // Delay before start to respect rate limits and UI smoothness
        // Increased to 5s to avoid 503s
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const style: ImageStyle = 'Pencil Sketch';
        const base64Data = await generateCapeImage(
            persona.avatarPrompt!,
            '1K',
            style,
            '1:1',
            true // Use location grounding
        );
        const dataUrl = `data:image/png;base64,${base64Data}`;
        
        // Save to state
        setAvatars(prev => ({ ...prev, [personaId]: dataUrl }));
        // Save to DB for persistence
        await saveAvatarToDB(personaId, dataUrl);
        
        // Remove from queue on success
        setGenerationQueue(prev => prev.slice(1));

      } catch (e) {
        console.error(`Failed to generate avatar for ${personaId}`, e);
        setFailedAvatars(prev => ({ ...prev, [personaId]: true }));
        // Remove from queue on failure to unblock others. User can manually retry.
        setGenerationQueue(prev => prev.slice(1));
      } finally {
        setLoadingAvatars(prev => ({ ...prev, [personaId]: false }));
        setIsProcessingQueue(false);
      }
    };

    processNext();
  }, [generationQueue, isProcessingQueue, avatars]);

  const handleRetryAvatar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Re-add to queue
    setFailedAvatars(prev => ({ ...prev, [id]: false }));
    setGenerationQueue(prev => [...prev, id]);
  };

  const handleSelectPersona = (id: TriviaPersonaId) => {
    setSelectedPersonaId(id);
    // Use saved preference if available, otherwise default
    if (personaVoices[id]) {
      setCurrentVoice(personaVoices[id]);
    } else {
      setCurrentVoice(TRIVIA_PERSONAS_DATA[id].voice);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setCurrentVoice(voice);
    if (selectedPersonaId) {
      setPersonaVoices(prev => ({ ...prev, [selectedPersonaId]: voice }));
    }
  };

  const handleStartGame = async (topic: string) => {
    if (!selectedPersonaId) return;
    setCurrentTopic(topic);
    setGameState('LOADING');
    await loadNewQuestion(selectedPersonaId, topic);
  };

  const loadNewQuestion = async (personaId: TriviaPersonaId, topic: string) => {
    setIsLoading(true);
    setHostFeedback('');
    setAudioUrl(null);
    setQuestionData(null);
    setSelectedAnswerIndex(null);

    try {
      const data = await generateTriviaQuestion(personaId, topic);
      setQuestionData(data);
      setGameState('QUESTION');
      
      // Auto-generate audio for the intro using the selected voice
      if (data.hostIntro) {
        const audio = await generateSpeech(data.hostIntro, currentVoice);
        setAudioUrl(audio);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load question. Try again.");
      setGameState('SELECTION');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (index: number) => {
    if (!selectedPersonaId || !questionData) return;
    
    setSelectedAnswerIndex(index);
    setIsLoading(true);
    const isCorrect = index === questionData.correctAnswerIndex;
    const correctAnswerText = questionData.options[questionData.correctAnswerIndex];

    try {
      const feedback = await generateTriviaFeedback(selectedPersonaId, isCorrect, correctAnswerText);
      setHostFeedback(feedback);
      setGameState('FEEDBACK');
      
      // Use selected voice for feedback
      const audio = await generateSpeech(feedback, currentVoice);
      setAudioUrl(audio);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextRound = () => {
    if (selectedPersonaId) {
      loadNewQuestion(selectedPersonaId, currentTopic);
    }
  };

  const handlePlayAudio = async () => {
    if (audioUrl) {
      setIsPlayingAudio(true);
      try {
        await playAudioFromBase64(audioUrl);
      } catch (e) {
        console.error(e);
      } finally {
         setTimeout(() => setIsPlayingAudio(false), 2000); // Rough timeout
      }
    }
  };

  const handleBackToSelection = () => {
    setGameState('SELECTION');
    setSelectedPersonaId(null);
    setQuestionData(null);
    setSelectedAnswerIndex(null);
  };

  // --- RENDERING ---

  if (gameState === 'SELECTION') {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-800">Kaapse Trivia Night</h2>
          <p className="text-slate-500">Choose your host to get started.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {(Object.values(TRIVIA_PERSONAS_DATA) as any[]).map((persona) => {
             const isSelected = selectedPersonaId === persona.id;
             const avatarUrl = avatars[persona.id];
             const isLoadingAvatar = loadingAvatars[persona.id];
             const isFailed = failedAvatars[persona.id];

             return (
              <button
                key={persona.id}
                onClick={() => handleSelectPersona(persona.id as TriviaPersonaId)}
                className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 ${
                  isSelected 
                    ? 'border-sa-green bg-green-50 shadow-xl scale-105' 
                    : 'border-slate-200 bg-white hover:border-sa-gold hover:shadow-lg'
                }`}
              >
                {/* Avatar Image */}
                <div className={`w-32 h-32 rounded-full mb-4 overflow-hidden border-4 shadow-sm relative bg-slate-100 flex items-center justify-center ${isSelected ? 'border-sa-green' : 'border-slate-100'}`}>
                   {avatarUrl ? (
                     <img src={avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
                   ) : isLoadingAvatar ? (
                     <Loader2 className="w-8 h-8 animate-spin text-sa-gold" />
                   ) : isFailed ? (
                     <button 
                        onClick={(e) => handleRetryAvatar(e, persona.id)}
                        className="flex flex-col items-center text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Retry generation"
                     >
                        <RefreshCw className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-bold uppercase">Retry</span>
                     </button>
                   ) : (
                     <User className="w-12 h-12 text-slate-300" />
                   )}
                </div>

                <h3 className="text-xl font-bold text-slate-800">{persona.name}</h3>
                <span className="text-xs font-bold text-sa-gold uppercase tracking-wider mb-2">{persona.role}</span>
                <p className="text-sm text-slate-500 text-center leading-relaxed">
                  {persona.description}
                </p>
                
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedPersonaId && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2 space-y-8">
            
            {/* Voice Selection */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <div className="p-2 bg-blue-100 rounded-lg">
                    <Mic className="w-4 h-4 text-blue-700" />
                 </div>
                 <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Select Voice for {TRIVIA_PERSONAS_DATA[selectedPersonaId].name}
                 </h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                 {AVAILABLE_VOICES.map(voice => (
                   <button
                     key={voice}
                     onClick={() => handleVoiceChange(voice)}
                     className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                       currentVoice === voice
                         ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                         : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                     }`}
                   >
                     {voice}
                   </button>
                 ))}
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Topic Selection */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <div className="p-2 bg-sa-gold/20 rounded-lg">
                    <Sparkles className="w-4 h-4 text-sa-gold" />
                 </div>
                 <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Select a Topic to Start
                 </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TRIVIA_TOPICS.map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleStartGame(topic)}
                    className="p-4 text-sm font-medium bg-slate-50 hover:bg-sa-green hover:text-white rounded-xl transition-all border border-slate-100 shadow-sm hover:shadow-md text-left flex items-center justify-between group"
                  >
                    <span>{topic}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'LOADING') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-sa-green animate-spin" />
        <p className="text-lg font-medium text-slate-600">
          {selectedPersonaId && TRIVIA_PERSONAS_DATA[selectedPersonaId].name} is preparing a question...
        </p>
      </div>
    );
  }

  // GAME (QUESTION or FEEDBACK)
  const persona = selectedPersonaId ? TRIVIA_PERSONAS_DATA[selectedPersonaId] : null;
  if (!persona || !questionData) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={handleBackToSelection}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider">
          Topic: {currentTopic}
        </div>
      </div>

      {/* Host Bubble */}
      <div className="flex gap-4 items-start animate-in slide-in-from-left-4">
        <div className="shrink-0 flex flex-col gap-2 items-center">
           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-sa-green shadow-md bg-white relative">
              {avatars[persona.id] ? (
                 <img src={avatars[persona.id]} alt={persona.name} className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <User className="w-8 h-8 text-slate-400" />
                 </div>
              )}
           </div>
           
           {/* Audio Button moved outside */}
           <button 
             onClick={handlePlayAudio}
             disabled={!audioUrl || isPlayingAudio}
             className={`p-2 rounded-full border shadow-sm transition-all ${
               isPlayingAudio 
                 ? 'bg-sa-green text-white border-sa-green' 
                 : 'bg-white text-slate-500 border-slate-200 hover:text-sa-green hover:border-sa-green'
             } disabled:opacity-50`}
             title="Replay Host Audio"
           >
             <Volume2 className="w-4 h-4" />
           </button>
        </div>

        <div className="flex-1 space-y-2">
           <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm relative">
              <h4 className="font-bold text-slate-800 mb-1">{persona.name}</h4>
              <p className="text-slate-600 italic leading-relaxed">
                "{gameState === 'FEEDBACK' ? hostFeedback : questionData.hostIntro}"
              </p>
           </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 text-center leading-snug">
            {questionData.question}
          </h3>
        </div>
        
        <div className="p-4 md:p-6 space-y-3">
          {questionData.options.map((option, idx) => {
            let btnClass = "w-full p-4 rounded-xl text-left border-2 transition-all flex justify-between items-center group ";
            
            if (gameState === 'FEEDBACK') {
               // Reveal phase
               if (idx === questionData.correctAnswerIndex) {
                  btnClass += "border-green-500 bg-green-50 text-green-900 font-medium";
               } else if (idx === selectedAnswerIndex) {
                  btnClass += "border-red-500 bg-red-50 text-red-900";
               } else {
                  btnClass += "border-slate-100 opacity-50";
               }
            } else {
               // Selection phase
               btnClass += "border-slate-200 hover:border-sa-gold hover:bg-yellow-50 hover:shadow-md text-slate-700";
            }

            return (
              <button
                key={idx}
                onClick={() => gameState === 'QUESTION' && handleAnswer(idx)}
                disabled={gameState !== 'QUESTION' || isLoading}
                className={btnClass}
              >
                <span className="text-lg">{option}</span>
                {gameState === 'FEEDBACK' && idx === questionData.correctAnswerIndex && <CheckCircle className="w-6 h-6 text-green-600" />}
                {gameState === 'FEEDBACK' && idx === selectedAnswerIndex && idx !== questionData.correctAnswerIndex && <XCircle className="w-6 h-6 text-red-600" />}
              </button>
            );
          })}
        </div>

        {gameState === 'FEEDBACK' && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleNextRound}
              className="px-6 py-3 bg-sa-green hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2"
            >
              Next Question <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriviaMode;
