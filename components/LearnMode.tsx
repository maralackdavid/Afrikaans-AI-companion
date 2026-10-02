
import React, { useState, useRef, useEffect } from 'react';
import { generateFlashcards, generateQuiz, sendChatMessage, generateSpeech, transcribeAudio } from '../services/gemini';
import { playAudioFromBase64 } from '../services/audio';
import { Flashcard, QuizQuestion, LearningState, ChatMessage, TutorStyle } from '../types';
import { BookOpen, HelpCircle, ArrowRight, RotateCw, CheckCircle, XCircle, ChevronLeft, ChevronRight, GraduationCap, Mic, MessageCircle, Volume2, Send, Bot, User, Loader2 } from 'lucide-react';

const TOPICS = [
  { en: "Greetings & Introductions", af: "Groete & Bekendstellings", xh: "Imibuliso neSingeniso" },
  { en: "Food & Dining", af: "Kos & Eet", xh: "Ukutya neDine" },
  { en: "Travel & Directions", af: "Reis & Aanwysings", xh: "Ukuhamba nemikhombandlela" },
  { en: "Numbers & Time", af: "Getalle & Tyd", xh: "Amanani nexesha" },
  { en: "Common Verbs", af: "Algemene Werkwoorde", xh: "Izenzi eziqhelekileyo" },
  { en: "isiXhosa Basics", af: "isiXhosa Basies", xh: "Izinto Ezisisiseko zesiXhosa" }
];

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (a: string, b: string) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const calculateSimilarity = (str1: string, str2: string) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  const distance = levenshteinDistance(longer, shorter);
  return (longerLength - distance) / longerLength;
};

const LearnMode: React.FC<{ style: TutorStyle }> = ({ style }) => {
  const [state, setState] = useState<LearningState>('MENU');
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  
  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Pronunciation State
  const [pronunciationIndex, setPronunciationIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // MediaRecorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Roleplay State
  const [roleplayMessages, setRoleplayMessages] = useState<ChatMessage[]>([]);
  const [roleplayInput, setRoleplayInput] = useState('');
  const [isRoleplayTyping, setIsRoleplayTyping] = useState(false);
  const roleplayEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup function for media stream
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startSession = async (type: LearningState, topicName: string) => {
    setLoading(true);
    setSelectedTopic(topicName);
    try {
      if (type === 'FLASHCARDS' || type === 'PRONUNCIATION') {
        // Reuse flashcard generation for pronunciation phrases
        const cards = await generateFlashcards(topicName, style);
        setFlashcards(cards);
        setCurrentCardIndex(0);
        setPronunciationIndex(0);
        setIsFlipped(false);
        setUserTranscript('');
        setAccuracyScore(null);
        setState(type);
      } else if (type === 'QUIZ') {
        const questions = await generateQuiz(topicName, style);
        setQuizQuestions(questions);
        setCurrentQuizIndex(0);
        setQuizScore(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setState('QUIZ');
      } else if (type === 'ROLEPLAY') {
        setState('ROLEPLAY');
        setRoleplayMessages([]);
        setIsRoleplayTyping(true);
        // Start the roleplay
        const lang = style === 'isiXhosa' ? 'isiXhosa' : (style === 'Formal' ? 'Formal Afrikaans' : 'Kaapse Afrikaans');
        const intro = await sendChatMessage([], `Start a roleplay scenario in ${lang} about ${topicName}. You start first. Keep it simple for a beginner.`, `You are a helpful tutor specializing in ${lang}.`);
        setRoleplayMessages([{
          id: '1', role: 'model', text: intro, timestamp: Date.now()
        }]);
        setIsRoleplayTyping(false);
      }
    } catch (e) {
      alert("Error generating content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleQuizAnswer = (index: number) => {
    if (selectedAnswer !== null) return; // Already answered
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === quizQuestions[currentQuizIndex].correctAnswerIndex) {
      setQuizScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(p => p + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz finished
      alert(`Quiz Finished! Score: ${quizScore}/${quizQuestions.length}`);
      setState('MENU');
    }
  };

  // --- Pronunciation Logic using MediaRecorder (Robust for iOS) ---
  
  const handleMicClick = async () => {
    // If already recording, stop it
    if (isListening && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      setUserTranscript('');
      setAccuracyScore(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Determine supported mime type for iOS/Safari/Chrome
      let mimeType = '';
      const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/aac'];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      // Create MediaRecorder
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessingAudio(true);
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());

        try {
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            // Send to Gemini for transcription
            const transcript = await transcribeAudio(base64Data, mimeType || 'audio/webm');
            
            setUserTranscript(transcript);

            // Calculate score
            const cleanTranscript = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
            const targetText = style === 'isiXhosa' ? flashcards[pronunciationIndex].isixhosa : flashcards[pronunciationIndex].afrikaans;
            const cleanTarget = (targetText || "").toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
            
            const similarity = calculateSimilarity(cleanTarget, cleanTranscript);
            setAccuracyScore(Math.round(similarity * 100));
            setIsProcessingAudio(false);
          };
        } catch (error) {
          console.error("Audio Processing Error:", error);
          setUserTranscript("Error processing audio. Please try again.");
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);

    } catch (err) {
      console.error("Microphone Access Error:", err);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const handlePlayAudioText = async (text: string) => {
    if (isPlayingAudio || !text) return;
    setIsPlayingAudio(true);
    try {
      const base64Audio = await generateSpeech(text, style === 'isiXhosa' ? 'Zephyr' : 'Kore');
      if (base64Audio) {
        await playAudioFromBase64(base64Audio);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsPlayingAudio(false), 1000);
    }
  };

  const handlePlayAudio = async () => {
    const text = style === 'isiXhosa' ? flashcards[pronunciationIndex].isixhosa : flashcards[pronunciationIndex].afrikaans;
    if (text) handlePlayAudioText(text);
  };

  const handleNextPronunciation = () => {
    setUserTranscript('');
    setAccuracyScore(null);
    setPronunciationIndex(prev => (prev + 1) % flashcards.length);
  };

  // --- Roleplay Logic ---
  const handleRoleplaySend = async () => {
    if (!roleplayInput.trim()) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: roleplayInput,
      timestamp: Date.now()
    };

    setRoleplayMessages(prev => [...prev, userMsg]);
    setRoleplayInput('');
    setIsRoleplayTyping(true);

    try {
      const history = roleplayMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendChatMessage(history, userMsg.text, `Continue the roleplay about ${selectedTopic}. Keep responses short (1-2 sentences) and correct user mistakes gently if needed.`);
      
      setRoleplayMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: Date.now()
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRoleplayTyping(false);
    }
  };

  useEffect(() => {
    if (roleplayEndRef.current) {
      roleplayEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roleplayMessages, isRoleplayTyping]);


  // --- RENDER FUNCTIONS ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium">Generating {selectedTopic} content...</p>
      </div>
    );
  }

  if (state === 'MENU') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-orange-600" />
          Choose a Topic <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-normal">{style}</span>
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {TOPICS.map(topic => (
            <div key={topic.en} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col mb-6 border-b border-slate-50 pb-2">
                <h3 className="font-bold text-lg text-slate-800">{topic.en}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-1 rounded">{topic.af}</span>
                  <span className="text-[10px] font-bold text-sa-green uppercase tracking-tighter bg-green-50 px-1 rounded">{topic.xh}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Cards */}
                <button 
                  onClick={() => startSession('FLASHCARDS', topic.en)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors gap-2 group"
                >
                  <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Cards</span>
                </button>

                {/* Quiz */}
                <button 
                  onClick={() => startSession('QUIZ', topic.en)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors gap-2 group"
                >
                  <HelpCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Quiz</span>
                </button>

                {/* Pronunciation */}
                <button 
                  onClick={() => startSession('PRONUNCIATION', topic.en)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors gap-2 group"
                >
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Pronunciation</span>
                </button>

                {/* Roleplay */}
                <button 
                  onClick={() => startSession('ROLEPLAY', topic.en)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors gap-2 group"
                >
                  <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Roleplay</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- FLASHCARDS VIEW ---
  if (state === 'FLASHCARDS' && flashcards.length > 0) {
    const card = flashcards[currentCardIndex];
    return (
      <div className="max-w-2xl mx-auto p-4 flex flex-col items-center">
        <button onClick={() => setState('MENU')} className="self-start text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to Topics
        </button>
        
        <div className="w-full relative perspective-1000 h-80 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full duration-500 preserve-3d transition-all ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-white border-2 border-orange-100 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: 'hidden' }}>
              <span className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-4">
                {style === 'isiXhosa' ? 'isiXhosa' : 'Afrikaans'}
              </span>
              <h3 className="text-4xl font-bold text-slate-800">
                {style === 'isiXhosa' ? card.isixhosa : card.afrikaans}
              </h3>
              <p className="mt-8 text-slate-400 text-sm flex items-center gap-2">
                <RotateCw className="w-4 h-4" /> Click to flip
              </p>
            </div>

            {/* Back */}
            <div className="absolute w-full h-full backface-hidden bg-orange-600 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 text-center text-white" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <span className="text-sm uppercase tracking-wider text-orange-200 font-semibold mb-2">English</span>
              <h3 className="text-3xl font-bold mb-4">{card.english}</h3>
              
              <div className="flex flex-col gap-1 items-center">
                {style !== 'isiXhosa' && (
                  <div className="text-orange-200 text-sm">
                    <span className="font-bold opacity-60">Afrikaans:</span> {card.afrikaans}
                  </div>
                )}
                
                {card.isixhosa && (style === 'Both' || style === 'Formal' || style === 'Kaapse') && (
                  <div className="text-orange-200 text-sm">
                    <span className="font-bold opacity-60">isiXhosa:</span> {card.isixhosa}
                  </div>
                )}
              </div>
              
              <div className="w-full h-px bg-orange-500 my-4"></div>
              <p className="italic text-orange-100 text-lg">"{card.example}"</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-8">
          <button onClick={handlePrevCard} className="p-3 rounded-full bg-white shadow-md hover:bg-slate-50 text-slate-600 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-slate-500 font-medium">
            {currentCardIndex + 1} / {flashcards.length}
          </span>
          <button onClick={handleNextCard} className="p-3 rounded-full bg-white shadow-md hover:bg-slate-50 text-slate-600 transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // --- QUIZ VIEW ---
  if (state === 'QUIZ' && quizQuestions.length > 0) {
    const q = quizQuestions[currentQuizIndex];
    return (
      <div className="max-w-2xl mx-auto p-4">
        <button onClick={() => setState('MENU')} className="text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
          <ArrowRight className="w-4 h-4 rotate-180" /> Exit Quiz
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-semibold text-orange-600 uppercase tracking-wider">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
            <span className="text-sm font-semibold text-slate-500">Score: {quizScore}</span>
          </div>

          <div className="flex items-center justify-between gap-4 mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 flex-1">{q.question}</h3>
            <button 
               onClick={() => handlePlayAudioText(q.question)}
               className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
               title="Listen to question"
             >
                <Volume2 className="w-5 h-5" />
             </button>
          </div>

          <div className="space-y-3">
            {q.options.map((option, idx) => {
              let btnClass = "w-full p-4 rounded-xl text-left border-2 transition-all flex justify-between items-center ";
              if (selectedAnswer === null) {
                btnClass += "border-slate-100 hover:border-orange-200 hover:bg-slate-50";
              } else {
                if (idx === q.correctAnswerIndex) {
                  btnClass += "border-green-500 bg-green-50 text-green-800";
                } else if (idx === selectedAnswer) {
                  btnClass += "border-red-500 bg-red-50 text-red-800";
                } else {
                  btnClass += "border-slate-100 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleQuizAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={btnClass}
                >
                  <span className="font-medium">{option}</span>
                  {selectedAnswer !== null && idx === q.correctAnswerIndex && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {selectedAnswer !== null && idx === selectedAnswer && idx !== q.correctAnswerIndex && <XCircle className="w-5 h-5 text-red-600" />}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm leading-relaxed">
              <span className="font-bold block mb-1">Explanation:</span>
              {q.explanation}
            </div>
          )}

          {selectedAnswer !== null && (
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                {currentQuizIndex < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- PRONUNCIATION VIEW ---
  if (state === 'PRONUNCIATION' && flashcards.length > 0) {
    const card = flashcards[pronunciationIndex];
    return (
      <div className="max-w-xl mx-auto p-4 flex flex-col items-center text-center">
        <button onClick={() => setState('MENU')} className="self-start text-slate-500 hover:text-slate-800 mb-8 flex items-center gap-1">
          <ArrowRight className="w-4 h-4 rotate-180" /> Back
        </button>

        <div className="w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-sa-green font-bold uppercase tracking-wider text-sm mb-4">
            PRONUNCIATION PRACTICE ({style.toUpperCase()})
          </h3>
          
          <h2 className="text-4xl font-bold text-slate-900 mb-2">
            {style === 'isiXhosa' ? card.isixhosa : card.afrikaans}
          </h2>
          <p className="text-slate-500 text-lg mb-8">{card.english}</p>

          <div className="flex gap-6 justify-center mb-8">
             <button
               onClick={handlePlayAudio}
               className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                 isPlayingAudio 
                    ? 'bg-slate-200 text-sa-green' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
               }`}
             >
               <Volume2 className="w-8 h-8" />
             </button>

             <button 
               onClick={handleMicClick}
               disabled={isProcessingAudio}
               className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg shadow-green-200 ${
                 isListening 
                   ? 'bg-red-500 text-white animate-pulse' 
                   : isProcessingAudio 
                     ? 'bg-slate-200 text-slate-500 cursor-wait'
                     : 'bg-sa-green hover:bg-green-700 text-white hover:scale-105'
               }`}
             >
               {isProcessingAudio ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
             </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 mb-4 text-center border border-slate-100">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">YOU SAID:</h4>
             <p className="text-lg font-medium text-slate-700 min-h-[1.75rem]">
               {isProcessingAudio ? (
                 <span className="text-slate-400 italic animate-pulse">Processing audio...</span>
               ) : userTranscript ? (
                 `"${userTranscript}"`
               ) : (
                 <span className="text-slate-300 italic">...</span>
               )}
             </p>
          </div>

          {accuracyScore !== null && !isProcessingAudio && (
            <div className="bg-orange-50 rounded-xl p-6 text-center border border-orange-100 animate-in slide-in-from-bottom-2">
               <div className="text-4xl font-bold text-orange-800 mb-1">{accuracyScore}%</div>
               <p className="text-orange-600 font-medium">
                 {style === 'isiXhosa' 
                   ? (accuracyScore >= 80 ? 'Gqwesileyo! (Excellent!)' : accuracyScore >= 50 ? 'Good effort, keep practicing!' : 'Zama futhi! (Try again!)')
                   : (accuracyScore >= 80 ? 'Uitstekend! (Excellent!)' : accuracyScore >= 50 ? 'Good effort, keep practicing!' : 'Try again, luister mooi!')
                 }
               </p>
            </div>
          )}

          <div className="flex justify-center mt-8">
             <button onClick={handleNextPronunciation} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 font-medium">
               Next Phrase <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ROLEPLAY VIEW ---
  if (state === 'ROLEPLAY') {
     return (
        <div className="max-w-2xl mx-auto p-4">
           <button onClick={() => setState('MENU')} className="text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1 transition-colors">
             <ArrowRight className="w-4 h-4 rotate-180" /> Back to Topics
           </button>

           <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-purple-50 flex items-center gap-2">
                 <MessageCircle className="w-5 h-5 text-purple-600" />
                 <span className="font-bold text-purple-800">Roleplay: {selectedTopic}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {roleplayMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`flex max-w-[85%] items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-purple-600' : 'bg-slate-200'}`}>
                           {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm shadow-sm flex items-start gap-2 ${
                           msg.role === 'user' 
                             ? 'bg-purple-600 text-white rounded-tr-none' 
                             : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}>
                           <span className="flex-1">{msg.text}</span>
                           {msg.role === 'model' && (
                              <button 
                                onClick={() => handlePlayAudioText(msg.text)}
                                className="text-slate-400 hover:text-purple-600 p-0.5"
                                title="Listen"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
                {isRoleplayTyping && (
                   <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm ml-10">
                         <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                         </div>
                      </div>
                   </div>
                )}
                <div ref={roleplayEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-slate-100">
                <div className="relative">
                   <input
                     type="text"
                     value={roleplayInput}
                     onChange={(e) => setRoleplayInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleRoleplaySend()}
                     placeholder={style === 'isiXhosa' ? "Reply in isiXhosa..." : "Reply in Afrikaans..."}
                     className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 outline-none"
                   />
                   <button 
                     onClick={handleRoleplaySend}
                     disabled={!roleplayInput.trim()}
                     className="absolute right-2 top-2 p-2 text-slate-400 hover:text-purple-600 disabled:opacity-50"
                   >
                      <Send className="w-5 h-5" />
                   </button>
                </div>
              </div>
           </div>
        </div>
     );
  }

  return <div>Loading...</div>;
};

export default LearnMode;
