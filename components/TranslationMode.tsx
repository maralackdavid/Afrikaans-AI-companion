import React, { useState } from 'react';
import { translateText, generateSpeech } from '../services/gemini';
import { playAudioFromBase64 } from '../services/audio';
import { ArrowRightLeft, Volume2, Loader2, Copy, Check, Sparkles } from 'lucide-react';

const TranslationMode: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Translation languages
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('af');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'af', name: 'Formal Afrikaans' },
    { code: 'kaapse', name: 'Kaapse Afrikaans' },
    { code: 'xh', name: 'isiXhosa' },
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const result = await translateText(inputText, targetLang);
      setOutputText(result);
    } catch (err) {
      alert("Failed to translate with Gemini 3.5. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async (text: string, langCode: string) => {
    if (!text || isPlaying) return;
    setIsPlaying(true);
    try {
      // Choose voice based on the language
      const voice = langCode === 'xh' ? 'Zephyr' : 'Kore';
      const base64Audio = await generateSpeech(text, voice);
      if (base64Audio) {
        await playAudioFromBase64(base64Audio);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsPlaying(false), 800);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Selector bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-col sm:flex-row items-center justify-between gap-3">
         <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase px-1">Source Language</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-orange-500 text-slate-700"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
         </div>

         <button 
           onClick={swapLanguages} 
           className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-600 hover:text-orange-600 shadow-sm mt-4 sm:mt-0 cursor-pointer self-center"
           title="Swap languages"
         >
            <ArrowRightLeft className="w-5 h-5" />
         </button>

         <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase px-1">Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-orange-500 text-slate-700"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
         </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col h-72">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
             <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                {languages.find(l => l.code === sourceLang)?.name}
             </span>
             {inputText && (
               <button 
                 onClick={() => handleSpeak(inputText, sourceLang)}
                 className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                 title="Listen"
               >
                  <Volume2 className="w-4 h-4" />
               </button>
             )}
          </div>
          <textarea
            className="flex-1 w-full p-2 bg-transparent resize-none text-slate-800 text-lg outline-none placeholder:text-slate-300 placeholder:italic"
            placeholder={`Enter text to translate from ${languages.find(l => l.code === sourceLang)?.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        {/* Output Card */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 flex flex-col h-72 relative">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-3">
             <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                {languages.find(l => l.code === targetLang)?.name}
             </span>
             <div className="flex items-center gap-1.5">
                {outputText && (
                   <>
                      <button 
                        onClick={copyToClipboard}
                        className="p-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-500 hover:text-orange-600 shadow-xs transition-colors"
                        title={copied ? "Copied!" : "Copy"}
                      >
                         {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleSpeak(outputText, targetLang)}
                        disabled={isPlaying}
                        className={`p-1.5 rounded-lg bg-white/80 border border-slate-200 shadow-xs transition-all ${isPlaying ? 'text-orange-600 animate-pulse' : 'text-slate-500 hover:text-orange-600'}`}
                        title="Listen"
                      >
                         <Volume2 className="w-4 h-4" />
                      </button>
                   </>
                )}
             </div>
          </div>
          <div className="flex-1 w-full p-2 text-slate-800 text-lg overflow-y-auto font-medium">
             {isLoading ? (
               <div className="flex h-full items-center justify-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                     <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                     <span className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-wider">Translating with Gemini 3.5...</span>
                  </div>
               </div>
             ) : (
                outputText || <span className="text-slate-300 italic font-normal">Translation will appear here...</span>
             )}
          </div>
        </div>
      </div>

      <button
        onClick={handleTranslate}
        disabled={isLoading || !inputText.trim()}
        className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-100 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? 'Translating with Gemini 3.5...' : 'Translate'}
        {!isLoading && <Sparkles className="w-5 h-5 text-amber-200" />}
      </button>
    </div>
  );
};

export default TranslationMode;
