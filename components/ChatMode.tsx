
import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, generateVariations, generateSpeech } from '../services/gemini';
import { playAudioFromBase64 } from '../services/audio';
import { ChatMessage, TutorStyle, TranslationVariations } from '../types';
import { Send, User, Bot, Sparkles, Mic, Volume2, Languages, Loader2 } from 'lucide-react';
import { HERITAGE_QUESTIONS, GENERAL_QUESTIONS, STYLES } from '../constants';

interface ChatModeProps {
  style: TutorStyle;
  mode: 'general' | 'heritage';
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  history: {role: string, parts: {text: string}[]}[];
  setHistory: React.Dispatch<React.SetStateAction<{role: string, parts: {text: string}[]}[]>>;
}

const TranslationBadge: React.FC<{ 
  translations?: TranslationVariations, 
  style: TutorStyle,
  onPlay: (text: string) => void 
}> = ({ translations, style, onPlay }) => {
  if (!translations) return null;

  // Logic based on request:
  // Kaapse Mode: Show ONLY English translation.
  // Formal Mode: English AND Kaapse translation.
  // Both Mode: Show Formal as the primary, and English AND Kaapse as translations. (Showing all three to cover basis)

  const showEnglish = true; // Always show English as base reference
  const showKaapse = style === 'Formal' || style === 'Both' || style === 'isiXhosa';
  const showFormal = style === 'Both' || style === 'isiXhosa';
  const showIsiXhosa = style === 'isiXhosa' || style === 'Both';

  return (
    <div className="mt-2 flex flex-col gap-2 w-full">
      {showIsiXhosa && translations.isixhosa && (
        <div className="bg-green-50/50 rounded-lg p-2 border border-green-100 flex items-start gap-2 text-sm">
           <span className="text-[10px] font-bold text-sa-green uppercase tracking-wider mt-1 shrink-0">isiXhosa:</span>
           <span className="text-slate-700 flex-1">{translations.isixhosa}</span>
           <button onClick={() => onPlay(translations.isixhosa)} className="text-sa-green hover:text-green-700 shrink-0 p-0.5 hover:bg-green-100 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-4 h-4" />
           </button>
        </div>
      )}
      {showFormal && translations.formal && (
        <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-100 flex items-start gap-2 text-sm">
           <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1 shrink-0">Formal:</span>
           <span className="text-slate-700 flex-1">{translations.formal}</span>
           <button onClick={() => onPlay(translations.formal)} className="text-blue-500 hover:text-blue-700 shrink-0 p-0.5 hover:bg-blue-100 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-4 h-4" />
           </button>
        </div>
      )}
      {showEnglish && translations.english && (
        <div className="bg-slate-100/50 rounded-lg p-2 border border-slate-200 flex items-start gap-2 text-sm">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 shrink-0">English:</span>
           <span className="text-slate-700 flex-1">{translations.english}</span>
           <button onClick={() => onPlay(translations.english)} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 hover:bg-slate-200 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-4 h-4" />
           </button>
        </div>
      )}
      {showKaapse && translations.kaapse && (
        <div className="bg-orange-50/50 rounded-lg p-2 border border-orange-100 flex items-start gap-2 text-sm">
           <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mt-1 shrink-0">Kaapse:</span>
           <span className="text-slate-700 flex-1">{translations.kaapse}</span>
           <button onClick={() => onPlay(translations.kaapse)} className="text-orange-500 hover:text-orange-700 shrink-0 p-0.5 hover:bg-orange-100 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-4 h-4" />
           </button>
        </div>
      )}
    </div>
  );
};

const ChatMode: React.FC<ChatModeProps> = ({ style, mode, messages, setMessages, history, setHistory }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Gemini 3.5 Live Translation states for draft messages
  const [liveTranslation, setLiveTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [liveTranslateEnabled, setLiveTranslateEnabled] = useState(false);

  const questions = mode === 'heritage' ? HERITAGE_QUESTIONS : GENERAL_QUESTIONS;

  useEffect(() => {
    if (!liveTranslateEnabled || !input.trim()) {
      setLiveTranslation('');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsTranslating(true);
      try {
         const response = await fetch('/api/gemini/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               text: input, 
               targetLang: style === 'isiXhosa' ? 'xh' : (style === 'Kaapse' ? 'kaapse' : 'af') 
            }),
         });
         const data = await response.json();
         setLiveTranslation(data.translation || '');
      } catch (e) {
         console.error("Live translate error:", e);
      } finally {
         setIsTranslating(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [input, liveTranslateEnabled, style]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handlePlayAudio = async (text: string) => {
    if (playingAudio || !text) return;
    setPlayingAudio(true);
    try {
       const audioBase64 = await generateSpeech(text);
       if (audioBase64) {
          await playAudioFromBase64(audioBase64);
       }
    } catch (e) {
       console.error(e);
    } finally {
       setTimeout(() => setPlayingAudio(false), 1000);
    }
  };

  // Handle Browser Speech Recognition
  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = style === 'Formal' ? 'af-ZA' : 'en-ZA'; // Simple logic for lang
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Benign error, just stop listening without logging spam
          console.log("Speech recognition: No speech detected.");
        } else {
          console.error("Speech recognition error", event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setIsTyping(true);

    // Background fetch for user variations
    generateVariations(textToSend).then(vars => {
        setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, translations: vars } : m));
    });

    try {
      const instruction = STYLES[style];
      const responseText = await sendChatMessage(history, userMsg.text, instruction);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);
      
      // Background fetch for model variations
      generateVariations(responseText).then(vars => {
          setMessages(prev => prev.map(m => m.id === modelMsg.id ? { ...m, translations: vars } : m));
      });
      
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMsg.text }] },
        { role: 'model', parts: [{ text: responseText }] }
      ]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Jammer, ek het 'n probleem ondervind. (Sorry, I encountered an error.)",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- EMPTY STATE (Welcome View) ---
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-[600px] relative">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-20">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Welcome to Maralack Tutor</h2>
          <p className="text-slate-500 max-w-md mb-10">
            Start a conversation or pick a topic below to get started.
          </p>

          <div className="w-full max-w-2xl space-y-3">
            {questions.map((q, idx) => (
              <button 
                key={idx}
                onClick={() => handleSend(q)}
                className="w-full bg-white p-5 rounded-2xl border border-slate-200 hover:border-sa-green hover:shadow-md transition-all text-left flex items-start gap-4 group"
              >
                <div className="p-2 bg-yellow-50 rounded-full shrink-0 group-hover:bg-yellow-100 transition-colors">
                   <Sparkles className="w-5 h-5 text-sa-gold" />
                </div>
                <span className="text-slate-700 font-medium leading-relaxed">{q}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Area - Fixed Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-50 pt-4 flex flex-col gap-3">
          {/* Live Translation Helper Preview */}
          {liveTranslateEnabled && input.trim() && (
             <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 mx-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                      <Languages className="w-3.5 h-3.5 animate-pulse text-orange-500" />
                      Gemini 3.5 Spontaneous Draft Translate:
                   </div>
                   {liveTranslation && (
                      <button 
                        onClick={() => {
                           setInput(liveTranslation);
                           setLiveTranslation('');
                        }}
                        className="text-[9px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-0.5 rounded transition-all"
                      >
                         Use Translation
                      </button>
                   )}
                </div>
                <div className="text-slate-700 text-xs font-semibold min-h-4 flex items-center">
                   {isTranslating ? (
                      <span className="text-slate-400 italic flex items-center gap-1.5">
                         <Loader2 className="w-3.5 h-3.5 animate-spin" /> Translating...
                      </span>
                   ) : (
                      liveTranslation || <span className="text-slate-300 italic">Translating into {style === 'isiXhosa' ? 'isiXhosa' : (style === 'Kaapse' ? 'Kaapse' : 'Afrikaans')}...</span>
                   )}
                </div>
             </div>
          )}

          <div className="flex items-center gap-3 px-4">
             <button 
               onClick={() => setLiveTranslateEnabled(!liveTranslateEnabled)}
               className={`p-3.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  liveTranslateEnabled 
                   ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                   : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-200'
               }`}
               title="Toggle Live draft translation helper"
             >
                <Languages className="w-4 h-4" />
                {liveTranslateEnabled ? 'Translate ON' : 'Translate OFF'}
             </button>
             <button 
               onClick={handleMicClick}
               className={`p-4 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-sa-green hover:border-sa-green transition-colors ${isListening ? 'animate-pulse border-red-400 text-red-500' : ''}`}
             >
               <Mic className="w-5 h-5" />
             </button>
             
             <div className="flex-1 relative">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyPress}
                 placeholder="Type a message..."
                 className="w-full h-12 pl-5 pr-12 rounded-full border border-slate-200 shadow-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green outline-none text-slate-700 placeholder:text-slate-400"
               />
               <button 
                 onClick={() => handleSend()}
                 disabled={!input.trim() && !isListening}
                 className="absolute right-2 top-1.5 p-2 text-slate-400 hover:text-sa-green disabled:opacity-50 transition-colors"
               >
                 <Send className="w-5 h-5" />
               </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- CHAT STATE ---
  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-sa-green' : 'bg-slate-200'}`}>
                 {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-slate-600" />}
              </div>
              <div className="flex flex-col gap-1 w-full max-w-full">
                <div
                  className={`p-4 rounded-2xl text-base leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-sa-green text-white rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                  } flex items-start gap-3`}
                >
                  <span className="flex-1 whitespace-pre-wrap">{msg.text}</span>
                  <button 
                    onClick={() => handlePlayAudio(msg.text)}
                    className={`shrink-0 p-1 rounded-full transition-colors ${
                       msg.role === 'user' 
                         ? 'text-green-100 hover:text-white hover:bg-green-600' 
                         : 'text-slate-400 hover:text-sa-green hover:bg-slate-100'
                    }`}
                    title="Read aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Translation Badge */}
                <div className={`${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                   <TranslationBadge translations={msg.translations} style={style} onPlay={handlePlayAudio} />
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start w-full">
              <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mt-1">
                    <Bot className="w-5 h-5 text-slate-600" />
                 </div>
                 <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
         {/* Live Translation Helper Preview */}
         {liveTranslateEnabled && input.trim() && (
            <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                     <Languages className="w-3.5 h-3.5 animate-pulse text-orange-500" />
                     Gemini 3.5 Spontaneous Draft Translate:
                  </div>
                  {liveTranslation && (
                     <button 
                       onClick={() => {
                          setInput(liveTranslation);
                          setLiveTranslation('');
                       }}
                       className="text-[9px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-0.5 rounded transition-all"
                     >
                        Use Translation
                     </button>
                  )}
               </div>
               <div className="text-slate-700 text-xs font-semibold min-h-4 flex items-center">
                  {isTranslating ? (
                     <span className="text-slate-400 italic flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Translating...
                     </span>
                  ) : (
                     liveTranslation || <span className="text-slate-300 italic">Translating into {style === 'isiXhosa' ? 'isiXhosa' : (style === 'Kaapse' ? 'Kaapse' : 'Afrikaans')}...</span>
                  )}
               </div>
            </div>
         )}
         <div className="flex items-center gap-3">
            <button 
              onClick={() => setLiveTranslateEnabled(!liveTranslateEnabled)}
              className={`p-3 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                 liveTranslateEnabled 
                  ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-200'
              }`}
              title="Toggle Live draft translation helper"
            >
               <Languages className="w-4 h-4" />
               {liveTranslateEnabled ? 'Translate ON' : 'Translate OFF'}
            </button>
            <button 
              onClick={handleMicClick}
              className={`p-3 rounded-xl border border-slate-200 text-slate-500 hover:text-sa-green hover:border-sa-green transition-colors ${isListening ? 'animate-pulse border-red-400 text-red-500' : ''}`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="w-full h-12 pl-5 pr-12 rounded-full border border-slate-200 focus:border-sa-green focus:ring-1 focus:ring-sa-green outline-none text-slate-700"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="absolute right-2 top-1.5 p-2 text-slate-400 hover:text-sa-green disabled:opacity-50 transition-colors"
               >
                 <Send className="w-5 h-5" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ChatMode;
