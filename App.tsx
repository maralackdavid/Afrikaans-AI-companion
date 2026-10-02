
import React, { useState, useEffect } from 'react';
import LiveMode from './components/LiveMode';
import ChatMode from './components/ChatMode';
import TriviaMode from './components/TriviaMode';
import ImageGenMode from './components/ImageGenMode';
import LearnMode from './components/LearnMode';
import { MessageSquare, Mic, BookOpen, Gamepad2, Image as ImageIcon, GraduationCap } from 'lucide-react';
import { VISION_TEXT } from './constants';
import { TutorStyle, ChatMessage, TranslationVariations } from './types';

type Tab = 'Learn' | 'Chat' | 'Voice' | 'Heritage' | 'Trivia' | 'Imagen';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Learn');
  const [tutorStyle, setTutorStyle] = useState<TutorStyle>('Kaapse');

  // --- LIFTED STATE FOR PERSISTENCE ---
  
  // General Chat
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([]);
  const [generalHistory, setGeneralHistory] = useState<{role: string, parts: {text: string}[]}[]>([]);

  // Heritage Chat
  const [heritageMessages, setHeritageMessages] = useState<ChatMessage[]>([]);
  const [heritageHistory, setHeritageHistory] = useState<{role: string, parts: {text: string}[]}[]>([]);

  // Live Voice Transcripts
  const [liveTranscriptHistory, setLiveTranscriptHistory] = useState<{
      role: 'user'|'model', 
      text: string, 
      translations?: TranslationVariations
  }[]>([]);

  // Ensure "Both" is not selected when switching to Voice or Learn tab
  useEffect(() => {
    if ((activeTab === 'Voice' || activeTab === 'Learn') && tutorStyle === 'Both') {
      setTutorStyle('Kaapse');
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 pt-6 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-sa-green rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-xl shrink-0">
              MA
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Maralack Cape Flats AI Companion</h1>
          </div>
          
          <div className="flex gap-2 mb-6">
            <span className="text-sa-gold text-lg leading-none mt-1">•</span>
            <p className="text-slate-600 text-sm leading-relaxed">
              {VISION_TEXT}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-4">
             <div className="bg-slate-100 p-1 rounded-xl inline-flex flex-wrap">
              {(['Learn', 'Chat', 'Voice', 'Heritage', 'Trivia', 'Imagen'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'Learn' && <GraduationCap size={16} />}
                  {tab === 'Chat' && <MessageSquare size={16} />}
                  {tab === 'Voice' && <Mic size={16} />}
                  {tab === 'Heritage' && <BookOpen size={16} />}
                  {tab === 'Trivia' && <Gamepad2 size={16} />}
                  {tab === 'Imagen' && <ImageIcon size={16} />}
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          {/* Language Selector (Hidden for Trivia and Image Gen) */}
          {activeTab !== 'Trivia' && activeTab !== 'Imagen' && (
            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">LANGUAGE:</span>
              <div className="flex gap-2">
                {(['Formal', 'Both', 'Kaapse', 'isiXhosa'] as TutorStyle[])
                  .filter(style => {
                    if (activeTab === 'Voice') return (style !== 'Both' && style !== 'isiXhosa');
                    if (activeTab === 'Learn') return style !== 'Both';
                    return true;
                  })
                  .map((style) => (
                  <button
                    key={style}
                    onClick={() => setTutorStyle(style)}
                    className={`px-4 py-1.5 rounded border text-sm font-medium transition-colors ${
                      tutorStyle === style
                        ? 'bg-sa-green border-sa-green text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:px-8 md:py-6">
        {activeTab === 'Learn' ? (
          <LearnMode style={tutorStyle} />
        ) : activeTab === 'Voice' ? (
          <LiveMode 
            style={tutorStyle} 
            history={liveTranscriptHistory}
            setHistory={setLiveTranscriptHistory}
          />
        ) : activeTab === 'Trivia' ? (
          <TriviaMode />
        ) : activeTab === 'Imagen' ? (
          <ImageGenMode />
        ) : activeTab === 'Heritage' ? (
          <ChatMode 
            key="heritage"
            style={tutorStyle} 
            mode="heritage"
            messages={heritageMessages}
            setMessages={setHeritageMessages}
            history={heritageHistory}
            setHistory={setHeritageHistory}
          />
        ) : (
          <ChatMode 
            key="general"
            style={tutorStyle} 
            mode="general"
            messages={generalMessages}
            setMessages={setGeneralMessages}
            history={generalHistory}
            setHistory={setGeneralHistory}
          />
        )}
      </main>
    </div>
  );
};

export default App;
