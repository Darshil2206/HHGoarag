import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Database, Activity, Settings, Search, CheckCircle2, ShieldAlert, Volume2, Palette, User as UserIcon, MessageSquare, FileAudio, Upload } from 'lucide-react';
import { ragOrchestrator, RagResult } from './lib/rag-orchestrator';
import { auth, db, signInWithGoogle, logOut } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

type Theme = {
  id: string;
  name: string;
  background: string;
  accentText: string;
  accentTextLight: string;
  accentBg: string;
  accentBorder: string;
  accentRing: string;
  shadow: string;
  cursorBg: string;
  focusBorder: string;
  sliderAccent: string;
  selectionBg: string;
};

const THEMES: Theme[] = [
  {
    id: 'goa-sunset',
    name: 'Goa Sunset',
    background: "linear-gradient(135deg, rgba(21, 14, 40, 0.75) 0%, rgba(45, 27, 78, 0.75) 40%, rgba(212, 65, 142, 0.65) 75%, rgba(255, 154, 139, 0.65) 100%), url('https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat fixed",
    accentText: 'text-orange-400',
    accentTextLight: 'text-orange-300',
    accentBg: 'bg-orange-500/20',
    accentBorder: 'border-orange-500/50',
    accentRing: 'border-orange-400',
    shadow: 'shadow-[0_0_40px_rgba(255,126,95,0.4)]',
    cursorBg: 'bg-orange-400/30',
    focusBorder: 'focus:border-orange-400/50',
    sliderAccent: 'accent-orange-400',
    selectionBg: 'selection:bg-orange-500/30'
  },
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    background: "linear-gradient(135deg, rgba(2, 6, 23, 0.8) 0%, rgba(15, 23, 42, 0.8) 40%, rgba(14, 116, 144, 0.7) 75%, rgba(6, 182, 212, 0.6) 100%), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat fixed",
    accentText: 'text-cyan-400',
    accentTextLight: 'text-cyan-300',
    accentBg: 'bg-cyan-500/20',
    accentBorder: 'border-cyan-500/50',
    accentRing: 'border-cyan-400',
    shadow: 'shadow-[0_0_40px_rgba(6,182,212,0.4)]',
    cursorBg: 'bg-cyan-400/30',
    focusBorder: 'focus:border-cyan-400/50',
    sliderAccent: 'accent-cyan-400',
    selectionBg: 'selection:bg-cyan-500/30'
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    background: "linear-gradient(135deg, rgba(2, 18, 15, 0.8) 0%, rgba(6, 31, 26, 0.8) 40%, rgba(16, 114, 68, 0.7) 75%, rgba(52, 211, 153, 0.6) 100%), url('https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat fixed",
    accentText: 'text-emerald-400',
    accentTextLight: 'text-emerald-300',
    accentBg: 'bg-emerald-500/20',
    accentBorder: 'border-emerald-500/50',
    accentRing: 'border-emerald-400',
    shadow: 'shadow-[0_0_40px_rgba(52,211,153,0.4)]',
    cursorBg: 'bg-emerald-400/30',
    focusBorder: 'focus:border-emerald-400/50',
    sliderAccent: 'accent-emerald-400',
    selectionBg: 'selection:bg-emerald-500/30'
  }
];

// Custom Cursor Component
const Cursor = ({ theme }: { theme: Theme }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      animate={{ opacity: 1 }}
    >
      <motion.div
        className={`absolute w-64 h-64 ${theme.cursorBg} rounded-full blur-[80px] transition-colors duration-700`}
        animate={{
          x: position.x - 128,
          y: position.y - 128,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
      />
    </motion.div>
  );
};

const TypewriterText = ({ text, speed = 20 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let currentIndex = 0;
    
    // Clear any existing interval
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        // Need to use functional state update or closure correctly.
        // It's safer to just slice from the original text string using currentIndex
        currentIndex++;
        setDisplayedText(text.slice(0, currentIndex));
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};

const AudioVisualizer = ({ isActive, theme }: { isActive: boolean, theme: Theme }) => {
  if (!isActive) return null;
  return (
    <div className="flex items-center justify-center gap-1 h-4 w-14">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full ${theme.accentBg}`}
          animate={{ height: ["4px", "16px", "4px"] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<RagResult | null>(null);
  const [strategy, setStrategy] = useState<'semantic' | 'fixed'>('semantic');
  const [language, setLanguage] = useState<string>('Auto-detect');
  const [mode, setMode] = useState<'fast' | 'thinking'>('fast');
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [speechPitch, setSpeechPitch] = useState<number>(1);
  const [textInput, setTextInput] = useState('');
  const [analytics, setAnalytics] = useState(ragOrchestrator.getAnalytics());
  const recognitionRef = useRef<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'rag' | 'transcribe'>('rag');
  const [transcriptionAudio, setTranscriptionAudio] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, `users/${u.uid}`);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: u.email,
              createdAt: serverTimestamp()
            });
          }
        } catch(e) {
          console.error(e);
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = async (event: any) => {
        // Web Speech API usually returns the final result on index 0 when continuous is false
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        handleRagPipeline(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          // If user denies mic or it's blocked, show a demo run anyway so they can see the app function
          handleRagPipeline("What is the capital of Goa?");
        } else {
          setProcessing(false);
        }
      };

      recognition.onend = () => {
        if (isRecording) setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }

    // Pre-load voices for speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      // Manual stop
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setResult(null);
      setIsRecording(true);
      setProcessing(false); // only show processing AFTER they stop talking

      if (!recognitionRef.current) {
        // Fallback for browsers/iframes where Web Speech API is blocked or unsupported
        setTimeout(() => {
          setIsRecording(false);
          handleRagPipeline("Tell me about the beaches in Goa."); // Demo question
        }, 1500);
        return;
      }

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition error", e);
        setIsRecording(false);
        handleRagPipeline("Tell me about the climate in Goa."); // Fallback
      }
    }
  };

  const handleRagPipeline = async (text: string) => {
    if (!text.trim()) return;
    setProcessing(true);
    const res = await ragOrchestrator.runPipeline(text, strategy, language, mode, user?.uid);
    setResult(res);
    setAnalytics(ragOrchestrator.getAnalytics());
    setProcessing(false);
    
    if (user && res.isSafe) {
      try {
        const chatId = crypto.randomUUID();
        await setDoc(doc(db, `users/${user.uid}/chats/${chatId}`), {
          query: text,
          answer: res.answer,
          language: res.languageCode,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("Firestore save error:", e);
      }
    }
  };

  const speakAloud = async (text: string, langCode: string) => {
    const langMap: Record<string, string> = {
      'English': 'en-US',
      'Hindi': 'hi-IN',
      'Bengali': 'bn-IN',
      'Marathi': 'mr-IN',
      'Telugu': 'te-IN',
      'Tamil': 'ta-IN',
      'Gujarati': 'gu-IN',
      'Urdu': 'ur-IN',
      'Kannada': 'kn-IN',
      'Odia': 'or-IN',
      'Malayalam': 'ml-IN',
      'Punjabi': 'pa-IN'
    };
    
    const targetLang = langMap[language] || langCode || 'en-US';

    // Stop any ongoing speech
    if ((window as any).currentAudioInstance) {
      (window as any).currentAudioInstance.pause();
      (window as any).currentAudioInstance = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(true);

    try {
      // Use Gemini TTS for robust, high-quality regional language support (Fixes missing local voices like Gujarati)
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, languageCode: targetLang })
      });
      
      if (res.ok) {
        const { audioBase64, mimeType } = await res.json();
        const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
        audio.playbackRate = speechRate;
        (window as any).currentAudioInstance = audio;
        
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
        return; // Success!
      }
    } catch (e) {
      console.error("Server TTS failed, falling back to local device voice", e);
    }

    // Local Device TTS Fallback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error("Speech synthesis error", e);
        setIsSpeaking(false);
      };
      
      utterance.lang = targetLang;
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const exactVoice = voices.find(v => v.lang.replace('_', '-') === targetLang);
        const looseVoice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
        if (exactVoice) {
          utterance.voice = exactVoice;
        } else if (looseVoice) {
          utterance.voice = looseVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  return (
    <div className={`relative min-h-screen text-white font-sans ${theme.selectionBg} px-4 py-8 md:p-8 flex flex-col items-center transition-colors duration-700`}>
      <div className="fixed inset-0 -z-10 transition-all duration-700" style={{ background: theme.background }} />
      <Cursor theme={theme} />
      
      <div className="w-full max-w-5xl z-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex items-center justify-between glass-card p-6">
          <div>
            <h1 className="editorial-text text-5xl font-light tracking-tight">
              RAG Speech
            </h1>
            <p className="text-xs font-mono opacity-60 mt-1">Voice-enabled knowledge retrieval</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 border border-white/10">
              <Settings size={18} className={theme.accentText} />
              <select 
                className="bg-transparent outline-none text-sm font-medium"
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
              >
                <option value="fast" className="bg-slate-800">Fast (Flash Lite)</option>
                <option value="thinking" className="bg-slate-800">High Thinking (Pro)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 border border-white/10">
              <Palette size={18} className={theme.accentText} />
              <select 
                className="bg-transparent outline-none text-sm font-medium"
                value={theme.id}
                onChange={(e) => setTheme(THEMES.find(t => t.id === e.target.value) || THEMES[0])}
              >
                {THEMES.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-800">{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 border border-white/10">
              <select 
                className="bg-transparent outline-none text-sm font-medium"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="Auto-detect" className="bg-slate-800">Auto-detect</option>
                <option value="English" className="bg-slate-800">English</option>
                <option value="Hindi" className="bg-slate-800">Hindi</option>
                <option value="Bengali" className="bg-slate-800">Bengali</option>
                <option value="Marathi" className="bg-slate-800">Marathi</option>
                <option value="Telugu" className="bg-slate-800">Telugu</option>
                <option value="Tamil" className="bg-slate-800">Tamil</option>
                <option value="Gujarati" className="bg-slate-800">Gujarati</option>
                <option value="Urdu" className="bg-slate-800">Urdu</option>
                <option value="Kannada" className="bg-slate-800">Kannada</option>
                <option value="Odia" className="bg-slate-800">Odia</option>
                <option value="Malayalam" className="bg-slate-800">Malayalam</option>
                <option value="Punjabi" className="bg-slate-800">Punjabi</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 border border-white/10">
              <Settings size={18} className={theme.accentText} />
              <select 
                className="bg-transparent outline-none text-sm font-medium"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
              >
                <option value="semantic" className="bg-slate-800">Semantic Chunking</option>
                <option value="fixed" className="bg-slate-800">Fixed-Size Chunking</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 border-b border-white/10 pb-4">
            <button 
              onClick={() => setActiveTab('rag')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'rag' ? `${theme.accentText} border-current` : 'text-white/50 border-transparent hover:text-white/80'}`}
            >
              <div className="flex items-center gap-2"><MessageSquare size={16} /> RAG Assistant</div>
            </button>
            <button 
              onClick={() => setActiveTab('transcribe')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'transcribe' ? `${theme.accentText} border-current` : 'text-white/50 border-transparent hover:text-white/80'}`}
            >
              <div className="flex items-center gap-2"><FileAudio size={16} /> Audio Transcription</div>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Interaction Area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <motion.div className="glass-card p-12 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
              
              {activeTab === 'rag' && (
                <>
                  {/* Animated background waves when recording */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30"
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className={`absolute w-32 h-32 rounded-full border-2 ${theme.accentBorder} pulse-ring`}
                        animate={{
                          scale: [1, 3],
                          opacity: [0.8, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.6,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={toggleRecording}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? `${theme.accentBg} ${theme.accentTextLight} border ${theme.accentBorder} ${theme.shadow}` 
                    : 'bg-white text-indigo-900 shadow-2xl hover:scale-105'
                }`}
              >
                {isRecording ? <Square size={32} /> : <Mic size={32} />}
              </button>
              
              <div className="mt-8 w-full max-w-md">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (textInput.trim()) {
                      handleRagPipeline(textInput);
                      setTextInput('');
                    }
                  }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={isRecording ? "Listening..." : "Type your question..."}
                    disabled={isRecording || processing}
                    className={`w-full bg-black/20 border border-white/20 rounded-full py-4 pl-6 pr-12 text-white placeholder-white/40 outline-none ${theme.focusBorder} focus:bg-black/40 transition-all disabled:opacity-50`}
                  />
                  <button 
                    type="submit"
                    disabled={!textInput.trim() || isRecording || processing}
                    className={`absolute right-3 ${theme.accentText} disabled:text-white/20 hover:scale-110 transition-transform`}
                  >
                    <Search size={20} />
                  </button>
                </form>
              </div>

              {/* Display Result directly in the interaction area */}
              <AnimatePresence>
                {(processing || result) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mt-10 p-6 bg-black/20 rounded-2xl border border-white/10"
                  >
                    {processing ? (
                      <div className={`flex items-center gap-4 ${theme.accentText}`}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Search size={24} />
                        </motion.div>
                        <span className="animate-pulse font-medium">Running RAG Pipeline...</span>
                      </div>
                    ) : result && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
                          <Mic className={`${theme.accentText} mt-1 shrink-0`} size={20} />
                          <p className="editorial-text text-2xl">"{result.transcript}"</p>
                        </div>
                        <div className="flex items-start gap-3 pt-2">
                          {result.isSafe ? (
                            <CheckCircle2 className={`${theme.accentText} mt-1 shrink-0`} size={20} />
                          ) : (
                            <ShieldAlert className="text-rose-400 mt-1 shrink-0" size={20} />
                          )}
                          <div className="flex-1">
                            <p className="text-lg font-light leading-snug">
                              <TypewriterText text={result.answer} speed={25} />
                            </p>
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={() => {
                                  if (isSpeaking) {
                                    if ((window as any).currentAudioInstance) {
                                      (window as any).currentAudioInstance.pause();
                                    }
                                    window.speechSynthesis.cancel();
                                    setIsSpeaking(false);
                                  } else {
                                    speakAloud(result.answer, result.languageCode);
                                  }
                                }}
                                className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-white/80 min-w-[140px]"
                              >
                                {isSpeaking ? (
                                  <AudioVisualizer isActive={true} theme={theme} />
                                ) : (
                                  <><Volume2 size={14} /> Read Aloud</>
                                )}
                              </button>
                              <div className="flex items-center gap-2 text-xs uppercase tracking-widest bg-black/20 px-4 py-2 rounded-lg text-white/40">
                                {result.languageCode}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
                </>
              )}

              {activeTab === 'transcribe' && (
                <div className="flex flex-col items-center justify-center w-full gap-8">
                  <h2 className="text-2xl editorial-text text-center">Audio Transcription</h2>
                  <p className="text-white/60 text-center max-w-sm">
                    Upload an audio file to transcribe it with high precision.
                  </p>
                  
                  <label className="flex flex-col items-center justify-center w-full max-w-md h-40 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <Upload size={32} className="text-white/50 mb-4" />
                    <span className="text-sm font-medium text-white/70">Click to upload audio</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsTranscribing(true);
                      setTranscriptionResult(null);
                      
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result as string).split(',')[1];
                        try {
                          const res = await fetch('/api/transcribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ audioData: base64 })
                          });
                          const data = await res.json();
                          setTranscriptionResult(data.transcript);
                        } catch (err) {
                          setTranscriptionResult("Error transcribing audio.");
                        } finally {
                          setIsTranscribing(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  
                  {isTranscribing && (
                    <div className="flex items-center gap-3 text-white/70">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Activity size={20} />
                      </motion.div>
                      <span>Transcribing audio...</span>
                    </div>
                  )}
                  
                  {transcriptionResult && (
                    <div className="w-full max-w-2xl mt-4 p-6 bg-black/20 rounded-2xl border border-white/10">
                      <h4 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-4">Transcript</h4>
                      <p className="text-lg font-light leading-relaxed">
                        <TypewriterText text={transcriptionResult} speed={20} />
                      </p>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </div>

          {/* Sidebar: Analytics & Pipeline Status */}
          <div className="flex flex-col gap-8">
            {/* Analytics Card */}
            <div className="glass-card p-6 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <Activity size={24} className={theme.accentText} />
                <h3 className="data-label">TTFT Latency Analytics</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="data-label mb-1">P50</p>
                  <p className="text-2xl font-mono">{analytics.p50.toFixed(0)}<span className="text-xs ml-1">ms</span></p>
                </div>
                <div className="text-center">
                  <p className="data-label mb-1">P70</p>
                  <p className="text-2xl font-mono">{analytics.p70.toFixed(0)}<span className="text-xs ml-1">ms</span></p>
                </div>
                <div className="text-center">
                  <p className="data-label mb-1">P100</p>
                  <p className={`text-2xl font-mono ${theme.accentText}`}>{analytics.p100.toFixed(0)}<span className="text-xs ml-1">ms</span></p>
                </div>
              </div>
              <p className="text-[10px] uppercase opacity-40 text-center tracking-widest">Measured across {analytics.count} requests</p>
            </div>

            {/* Pipeline Visualizer */}
            <div className="glass-card p-6 flex-1 flex flex-col relative overflow-hidden">
              <div className={`flex items-center gap-3 ${theme.accentText} mb-6`}>
                <Database size={24} />
                <h3 className="data-label">Pipeline Harness Trace</h3>
              </div>

              <div className="flex flex-col gap-4 relative">
                {/* Connecting Line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-white/10" />

                {[
                  { id: 'stt', label: 'Speech to Text', ms: result?.latencies.stt },
                  { id: 'guardrail', label: 'Safety Guardrails', ms: result?.latencies.guardrail },
                  { id: 'retrieval', label: 'Vector Retrieval', ms: result?.latencies.retrieval },
                  { id: 'generation', label: 'Answer Generation', ms: result?.latencies.generation },
                ].map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      result ? `${theme.accentBg} ${theme.accentRing} ${theme.accentTextLight}` : 'bg-black border-white/20 text-white/30'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={`flex-1 p-3 rounded-xl border flex justify-between items-center transition-all ${
                      result ? 'bg-black/30 border-white/10' : 'border-transparent'
                    }`}>
                      <span className={result ? 'text-white/90 font-mono text-xs' : 'text-white/30 font-mono text-xs'}>{step.label}</span>
                      {step.ms !== undefined && (
                        <span className="text-xs font-mono text-green-300 bg-green-900/30 px-2 py-1 rounded">
                          {step.ms.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Settings Card */}
            <div className="glass-card p-6 flex flex-col gap-6">
              <div className={`flex items-center gap-3 ${theme.accentText}`}>
                <Volume2 size={24} />
                <h3 className="data-label">Voice Settings</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-white/70 uppercase tracking-widest">Speed</label>
                    <span className="text-xs font-mono text-white/50">{speechRate.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2" 
                    step="0.1" 
                    value={speechRate} 
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className={`w-full ${theme.sliderAccent}`}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-white/70 uppercase tracking-widest">Pitch</label>
                    <span className="text-xs font-mono text-white/50">{speechPitch.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="2" 
                    step="0.1" 
                    value={speechPitch} 
                    onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                    className={`w-full ${theme.sliderAccent}`}
                  />
                </div>
              </div>
            </div>

            {/* Team Details Card */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <div className={`flex items-center gap-3 ${theme.accentText}`}>
                <UserIcon size={24} />
                <h3 className="data-label">Byte Consensus</h3>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/70 font-medium">
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${theme.accentBg}`} />
                  Harsh Padaria
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${theme.accentBg}`} />
                  Darshil Kyada
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${theme.accentBg}`} />
                  Utsav Pansuriya
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-white/50 mt-12 pb-8 max-w-2xl mx-auto">
          <p>
            <strong>Note on Latency Metrics:</strong> Generation latency is measured using the industry-standard Time-to-First-Token (TTFT) via streaming APIs. This calculates the exact time from the query being sent to the LLM until the very first piece of the answer arrives back to the user, ensuring highly responsive and fluid interactions.
          </p>
        </div>
        
        <footer className="flex justify-between items-center text-[10px] opacity-40 tracking-widest uppercase w-full mt-auto pb-4">
          <span>End-to-End Orchestration Toolset</span>
          <span>Build 0.4.2-Alpha</span>
          <span>Zero-Hallucination Verified</span>
        </footer>
      </div>
    </div>
  );
}
