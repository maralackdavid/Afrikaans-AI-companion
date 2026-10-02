
import React, { useState, useRef, useEffect } from 'react';
import { STYLES } from '../constants';
import { decodeAudioData, base64ToUint8Array, playAudioFromBase64 } from '../services/audio';
import { generateVariations, generateSpeech } from '../services/gemini';
import { Mic, AlertCircle, Volume2, Loader2, Sparkles, X, Activity, Languages, ArrowRightLeft } from 'lucide-react';
import { TutorStyle, TranslationVariations } from '../types';

interface LiveModeProps {
  style: TutorStyle;
  history: {role: 'user'|'model', text: string, translations?: TranslationVariations}[];
  setHistory: React.Dispatch<React.SetStateAction<{role: 'user'|'model', text: string, translations?: TranslationVariations}[]>>;
}

const TranslationBadge: React.FC<{ 
  translations?: TranslationVariations, 
  style: TutorStyle,
  onPlay: (text: string) => void 
}> = ({ translations, style, onPlay }) => {
  if (!translations) return null;

  const showEnglish = true; 
  const showKaapse = style === 'Formal' || style === 'Both' || style === 'isiXhosa';
  const showFormal = style === 'Both' || style === 'isiXhosa';
  const showIsiXhosa = style === 'isiXhosa' || style === 'Both';

  return (
    <div className="mt-2 flex flex-col gap-2 w-full">
      {showIsiXhosa && translations.isixhosa && (
        <div className="bg-green-50/50 rounded-lg p-2 border border-green-100 flex items-start gap-2 text-xs">
           <span className="text-[9px] font-bold text-sa-green uppercase tracking-wider mt-0.5 shrink-0">isiXhosa:</span>
           <span className="text-slate-700 flex-1">{translations.isixhosa}</span>
           <button onClick={() => onPlay(translations.isixhosa)} className="text-sa-green hover:text-green-700 shrink-0 p-0.5 hover:bg-green-100 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-3 h-3" />
           </button>
        </div>
      )}
      {showFormal && translations.formal && (
        <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-100 flex items-start gap-2 text-xs">
           <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-0.5 shrink-0">Formal:</span>
           <span className="text-slate-700 flex-1">{translations.formal}</span>
           <button onClick={() => onPlay(translations.formal)} className="text-blue-500 hover:text-blue-700 shrink-0 p-0.5 hover:bg-blue-100 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-3 h-3" />
           </button>
        </div>
      )}
      {showEnglish && translations.english && (
        <div className="bg-slate-100/50 rounded-lg p-2 border border-slate-200 flex items-start gap-2 text-xs">
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 shrink-0">English:</span>
           <span className="text-slate-700 flex-1">{translations.english}</span>
           <button onClick={() => onPlay(translations.english)} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 hover:bg-slate-200 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-3 h-3" />
           </button>
        </div>
      )}
      {showKaapse && translations.kaapse && (
        <div className="bg-orange-50/50 rounded-lg p-2 border border-orange-100 flex items-start gap-2 text-xs">
           <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider mt-0.5 shrink-0">Kaapse:</span>
           <span className="text-slate-700 flex-1">{translations.kaapse}</span>
           <button onClick={() => onPlay(translations.kaapse)} className="text-orange-500 hover:text-orange-700 shrink-0 p-0.5 hover:bg-orange-100 rounded-full transition-colors" title="Listen">
              <Volume2 className="w-3 h-3" />
           </button>
        </div>
      )}
    </div>
  );
};

const LiveMode: React.FC<LiveModeProps> = ({ style, history, setHistory }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(false);
  
  const [userTranscript, setUserTranscript] = useState('');
  const [modelTranscript, setModelTranscript] = useState('');

  // Live Translate Mode States
  const [isLiveTranslateMode, setIsLiveTranslateMode] = useState(false);
  const [translateSourceLang, setTranslateSourceLang] = useState('en');
  const [translateTargetLang, setTranslateTargetLang] = useState('af');
  const [echoTargetLanguage, setEchoTargetLanguage] = useState(false);

  // References to prevent closures in audio callbacks
  const isLiveTranslateModeRef = useRef(false);
  const translateSourceLangRef = useRef('en');
  const translateTargetLangRef = useRef('af');
  const echoTargetLanguageRef = useRef(false);
  const userTranscriptRef = useRef('');
  const modelTranscriptRef = useRef('');

  useEffect(() => {
    isLiveTranslateModeRef.current = isLiveTranslateMode;
  }, [isLiveTranslateMode]);

  useEffect(() => {
    translateSourceLangRef.current = translateSourceLang;
  }, [translateSourceLang]);

  useEffect(() => {
    translateTargetLangRef.current = translateTargetLang;
  }, [translateTargetLang]);

  useEffect(() => {
    echoTargetLanguageRef.current = echoTargetLanguage;
  }, [echoTargetLanguage]);

  useEffect(() => {
    userTranscriptRef.current = userTranscript;
  }, [userTranscript]);

  useEffect(() => {
    modelTranscriptRef.current = modelTranscript;
  }, [modelTranscript]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const currentSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [userTranscript, modelTranscript, history]);

  const updateVolume = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      setVolumeLevel(sum / dataArray.length);
    }
    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  const pcmToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const binary = String.fromCharCode(...new Uint8Array(int16Array.buffer));
    return btoa(binary);
  };

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

  const startSession = async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setError(null);
    setUserTranscript('');
    setModelTranscript('');
    userTranscriptRef.current = '';
    modelTranscriptRef.current = '';

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      updateVolume();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws-live`);
      wsRef.current = ws;

      const instruction = STYLES[style];

      ws.onopen = () => {
        if (isLiveTranslateModeRef.current) {
          const srcLang = translateSourceLangRef.current;
          const tgtLang = translateTargetLangRef.current;
          const srcLabel = srcLang === 'en' ? 'English' : (srcLang === 'af' ? 'Afrikaans' : 'isiXhosa');
          const tgtLabel = tgtLang === 'en' ? 'English' : (tgtLang === 'af' ? 'Afrikaans' : 'isiXhosa');
          
          ws.send(JSON.stringify({
            type: 'setup',
            mode: 'translate',
            targetLanguageCode: tgtLang,
            echoTargetLanguage: echoTargetLanguageRef.current,
            voiceName: 'Zephyr',
            systemInstruction: `You are a professional real-time voice translation system. Your primary role is to interpret and translate spoken words on-the-fly. The user is speaking in ${srcLabel}. Immediately translate their speech into natural, perfectly-pronounced, context-aware spoken ${tgtLabel}. Play back ONLY the translation audio output.`
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'setup',
            voiceName: 'Zephyr',
            systemInstruction: `You are a friendly Afrikaans tutor. ${instruction}`
          }));
        }
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'ready') {
          setIsConnected(true);
          setIsConnecting(false);
          
          const source = inputCtx.createMediaStreamSource(stream);
          sourceRef.current = source;
          source.connect(analyser);

          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64 = pcmToBase64(inputData);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };
          source.connect(processor);
          processor.connect(inputCtx.destination);
          return;
        }

        if (msg.audio) {
          const audioBytes = base64ToUint8Array(msg.audio);
          const audioBuffer = await decodeAudioData(audioBytes, outputCtx, 24000, 1);
          const source = outputCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputCtx.destination);
          const startTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
          source.start(startTime);
          nextStartTimeRef.current = startTime + audioBuffer.duration;
          currentSourcesRef.current.add(source);
          source.onended = () => currentSourcesRef.current.delete(source);
        }

        if (msg.userTranscription) {
          setUserTranscript(prev => {
            const updated = prev + msg.userTranscription;
            userTranscriptRef.current = updated;
            return updated;
          });
        }

        if (msg.transcription) {
          setModelTranscript(prev => {
            const updated = prev + msg.transcription;
            modelTranscriptRef.current = updated;
            return updated;
          });
        }

        if (msg.interrupted) {
          currentSourcesRef.current.forEach(src => { try { src.stop(); } catch(e) {} });
          currentSourcesRef.current.clear();
          nextStartTimeRef.current = 0;
          setModelTranscript('');
          modelTranscriptRef.current = '';
        }

        if (msg.turnComplete) {
          const userText = userTranscriptRef.current.trim();
          const modelText = modelTranscriptRef.current.trim();
          const isTranslate = isLiveTranslateModeRef.current;
          const srcLang = translateSourceLangRef.current;
          const tgtLang = translateTargetLangRef.current;

          if (userText || modelText) {
            setHistory(prev => {
              const updated = [...prev];
              if (userText) {
                updated.push({
                  role: 'user',
                  text: userText,
                  translations: isTranslate ? {
                    formal: srcLang === 'af' ? userText : '',
                    kaapse: '',
                    english: srcLang === 'en' ? userText : '',
                    isixhosa: srcLang === 'xh' ? userText : ''
                  } : undefined
                });
              }
              if (modelText) {
                updated.push({
                  role: 'model',
                  text: modelText,
                  translations: isTranslate ? {
                    formal: tgtLang === 'af' ? modelText : '',
                    kaapse: '',
                    english: tgtLang === 'en' ? modelText : '',
                    isixhosa: tgtLang === 'xh' ? modelText : ''
                  } : undefined
                });
              }
              return updated;
            });
            
            // Clear transcripts
            setUserTranscript('');
            userTranscriptRef.current = '';
            setModelTranscript('');
            modelTranscriptRef.current = '';
          }
        }
      };

      ws.onclose = () => stopSession();
      ws.onerror = () => {
        setError("WebSocket connection error.");
        stopSession();
      };

    } catch (err) {
      console.error(err);
      setError("Microphone access denied or connection failed.");
      stopSession();
    }
  };

  const stopSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outputContextRef.current) { outputContextRef.current.close(); outputContextRef.current = null; }
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    
    setIsConnected(false);
    setIsConnecting(false);
    setVolumeLevel(0);
    nextStartTimeRef.current = 0;
  };

  return (
    <div className="flex flex-col min-h-0 h-full w-full gap-4">
      {/* Mode Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-200 shadow-inner shrink-0">
         <button 
           disabled={isConnected || isConnecting}
           onClick={() => setIsLiveTranslateMode(false)}
           className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isLiveTranslateMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-60`}
         >
            <Mic className="w-4 h-4 text-sa-green" />
            Tutor Practice ({style})
         </button>
         <button 
           disabled={isConnected || isConnecting}
           onClick={() => setIsLiveTranslateMode(true)}
           className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isLiveTranslateMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-60`}
         >
            <Languages className="w-4 h-4 text-orange-600" />
            Gemini 3.5 Live Speech Translate
         </button>
      </div>

      {/* Translation Settings Dropdowns */}
      {isLiveTranslateMode && !isConnected && !isConnecting && (
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-2 shrink-0">
            <div className="flex-1 w-full">
               <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">I will speak:</label>
               <select 
                 value={translateSourceLang} 
                 onChange={e => setTranslateSourceLang(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold outline-none focus:border-orange-500"
               >
                  <option value="en">English (South Africa)</option>
                  <option value="af">Afrikaans</option>
                  <option value="xh">isiXhosa</option>
               </select>
            </div>
            <div className="p-2 bg-slate-50 rounded-full mt-4 md:mt-0">
               <ArrowRightLeft className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 w-full">
               <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">Translate my speech to:</label>
               <select 
                 value={translateTargetLang} 
                 onChange={e => setTranslateTargetLang(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold outline-none focus:border-orange-500"
               >
                  <option value="af">Afrikaans</option>
                  <option value="en">English (South Africa)</option>
                  <option value="xh">isiXhosa</option>
               </select>
            </div>
            <div className="flex items-center gap-2 pt-4 md:pt-0 shrink-0">
               <input 
                 id="echo-checkbox"
                 type="checkbox" 
                 checked={echoTargetLanguage}
                 onChange={e => setEchoTargetLanguage(e.target.checked)}
                 className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
               />
               <label htmlFor="echo-checkbox" className="text-xs font-semibold text-slate-500 cursor-pointer">Echo translation</label>
            </div>
         </div>
      )}

      <div className={`bg-gradient-to-b from-white to-slate-50 rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center transition-all duration-500 ${isConnected ? 'flex-1 min-h-[220px]' : 'flex-[2] min-h-[280px]'}`}>
        <div className={`mb-6 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
           isConnected ? 'bg-green-100 text-green-700' : 
           isConnecting ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
        }`}>
           {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : isConnected ? <Activity className="w-4 h-4 animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
           {isConnecting ? 'Opening Server Stream...' : isConnected ? 'Live Connection Active' : 'Ready to Start'}
        </div>

        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
          {isConnected && (
            <>
               <div className="absolute inset-0 rounded-full bg-sa-green opacity-10 animate-ping" style={{ animationDuration: '2s' }}></div>
               <div className="absolute rounded-full bg-green-100 opacity-60 transition-all duration-75 ease-out" style={{ width: `${100 + volumeLevel * 1.5}%`, height: `${100 + volumeLevel * 1.5}%` }} />
            </>
          )}

          <div className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
             isConnected ? 'bg-gradient-to-br from-sa-green to-emerald-600 shadow-lg shadow-green-200 scale-110' : 
             isConnecting ? 'bg-slate-100 scale-95' : 'bg-white border-2 border-slate-100 shadow-sm hover:border-sa-green hover:shadow-md cursor-pointer'
          }`} onClick={!isConnected ? startSession : undefined}>
            {isConnecting ? <Loader2 className="w-12 h-12 text-slate-400 animate-spin" /> : isConnected ? <Volume2 className="w-12 h-12 text-white animate-pulse" /> : <Mic className="w-12 h-12 text-slate-400" />}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm z-20">
           {error && <div className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
           {!isConnected ? (
             <button onClick={startSession} disabled={isConnecting} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-base shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
               {isConnecting ? 'Connecting...' : (isLiveTranslateMode ? 'Start Live Translation' : 'Start Voice Chat')}
               {!isConnecting && <Sparkles className="w-5 h-5 text-sa-gold" />}
             </button>
           ) : (
             <button onClick={stopSession} className="w-full py-3 bg-white border-2 border-red-100 hover:bg-red-50 text-red-600 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
               <X className="w-5 h-5" /> End Conversation
             </button>
           )}
        </div>
      </div>

      {(isConnected || history.length > 0) && (
          <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation Log</span>
                {isConnected && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
             </div>
             <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.length === 0 && !modelTranscript && <div className="h-full flex flex-col items-center justify-center text-slate-300 italic"><p>Speak now to begin...</p></div>}
                {history.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex flex-col gap-1 max-w-[80%]">
                        <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-sa-green text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'} flex items-start gap-2`}>
                            <span className="flex-1">{msg.text}</span>
                            <button onClick={() => handlePlayAudio(msg.text)} className={`shrink-0 p-1 rounded-full ${msg.role === 'user' ? 'text-green-100 hover:text-white' : 'text-slate-400 hover:text-sa-green'}`} title="Listen"><Volume2 className="w-3 h-3" /></button>
                        </div>
                        <TranslationBadge translations={msg.translations} style={style} onPlay={handlePlayAudio} />
                      </div>
                   </div>
                ))}
                {modelTranscript && (
                   <div className="flex justify-start">
                      <div className="max-w-[80%] p-3 rounded-2xl rounded-tl-none bg-slate-50/50 text-slate-700/70 text-sm border border-slate-100 border-dashed animate-pulse"> {modelTranscript} </div>
                   </div>
                )}
             </div>
          </div>
      )}
    </div>
  );
};

export default LiveMode;
