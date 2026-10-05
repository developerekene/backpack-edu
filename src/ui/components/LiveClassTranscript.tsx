/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, Copy, Check, Search, 
  Subtitles, Mic, MicOff, Save, Trash2
} from 'lucide-react';
import { useAppContext } from '../../store/AppContext';

export interface TranscriptEntry {
  id: string;
  speaker: string;
  role: string;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface LiveClassTranscriptProps {
  courseId?: string;
  speakerName: string;
  speakerRole: string;
  onSubtitleChange?: (text: string) => void;
}

export const LiveClassTranscript: React.FC<LiveClassTranscriptProps> = ({
  courseId,
  speakerName,
  speakerRole,
  onSubtitleChange
}) => {
  const { addMaterial } = useAppContext();

  const [speechSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [language, setLanguage] = useState<string>('en-US');

  const recognitionRef = useRef<any>(null);
  const entriesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to newest transcript line
  useEffect(() => {
    entriesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptEntries, interimText]);

  const handleSpeechResult = useCallback((event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcriptPiece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        const finalTrimmed = transcriptPiece.trim();
        if (finalTrimmed) {
          const newEntry: TranscriptEntry = {
            id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            speaker: speakerName || 'Participant',
            role: speakerRole || 'student',
            text: finalTrimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isFinal: true
          };
          setTranscriptEntries(prev => [...prev, newEntry]);
          if (onSubtitleChange) onSubtitleChange(finalTrimmed);
        }
      } else {
        interim += transcriptPiece;
      }
    }
    setInterimText(interim);
    if (interim && onSubtitleChange) {
      onSubtitleChange(interim);
    }
  }, [speakerName, speakerRole, onSubtitleChange]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = handleSpeechResult;

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart if user hasn't explicitly stopped it
        if (isListening && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setInterimText('');
    if (onSubtitleChange) onSubtitleChange('');
  };

  const handleCopyTranscript = () => {
    const textContent = transcriptEntries
      .map(e => `[${e.timestamp}] ${e.speaker} (${e.role}): ${e.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const header = `=== LIVE CLASS TRANSCRIPT ===\nDate: ${new Date().toLocaleDateString()}\nCourse ID: ${courseId || 'General'}\n==============================\n\n`;
    const body = transcriptEntries
      .map(e => `[${e.timestamp}] ${e.speaker} (${e.role.toUpperCase()}):\n${e.text}\n`)
      .join('\n');
    
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-class-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToCourseMaterials = async () => {
    if (!courseId || transcriptEntries.length === 0) return;
    
    const markdownContent = `# Live Class Lecture Notes & Transcript\n**Date:** ${new Date().toLocaleString()}\n**Recorded by:** ${speakerName}\n\n---\n\n` +
      transcriptEntries.map(e => `**[${e.timestamp}] ${e.speaker} (${e.role}):**\n> ${e.text}\n`).join('\n');

    try {
      await addMaterial({
        id: `mat_tr_${Date.now()}`,
        courseId,
        title: `Live Class Transcript - ${new Date().toLocaleDateString()}`,
        type: 'notes',
        content: markdownContent,
        createdAt: new Date().toISOString()
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn('Failed to save material:', err);
    }
  };

  const filteredEntries = transcriptEntries.filter(e => 
    e.text.toLowerCase().includes(searchFilter.toLowerCase()) ||
    e.speaker.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-2">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center shadow-sm ${
              isListening
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 mr-1.5 animate-bounce" /> Transcribing Live
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 mr-1.5" /> Start Transcription
              </>
            )}
          </button>

          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={isListening}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="ar-SA">Arabic</option>
          </select>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopyTranscript}
            disabled={transcriptEntries.length === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition"
            title="Copy all transcript"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={handleDownloadTxt}
            disabled={transcriptEntries.length === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition"
            title="Download text file (.txt)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {courseId && (
            <button
              onClick={handleSaveToCourseMaterials}
              disabled={transcriptEntries.length === 0 || savedSuccess}
              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white disabled:opacity-40 transition border border-indigo-500/30"
              title="Save as study material in course"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          )}

          {transcriptEntries.length > 0 && (
            <button
              onClick={() => setTranscriptEntries([])}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!speechSupported && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
          Speech Recognition is not supported by your current browser engine. Use Chrome or Edge for live transcription.
        </div>
      )}

      {/* Search Input */}
      {transcriptEntries.length > 0 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Search transcript phrases..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Transcript Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-72">
        {transcriptEntries.length === 0 && !interimText ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
              <Subtitles className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Click <strong className="text-indigo-400">Start Transcription</strong> above to transcribe spoken lectures and class discussions in real time.
            </p>
          </div>
        ) : (
          <>
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 shadow-sm space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-indigo-300">{entry.speaker}</span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] uppercase font-bold bg-slate-900 text-slate-400 border border-slate-700">
                      {entry.role}
                    </span>
                  </div>
                  <span>{entry.timestamp}</span>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed select-text">
                  {entry.text}
                </p>
              </div>
            ))}

            {interimText && (
              <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/40 animate-pulse space-y-1">
                <div className="flex items-center space-x-1.5 text-[10px] text-indigo-400">
                  <span className="font-bold">{speakerName}</span>
                  <span className="text-[9px] text-emerald-400">● speaking now...</span>
                </div>
                <p className="text-xs text-indigo-200 italic">
                  {interimText}
                </p>
              </div>
            )}
            <div ref={entriesEndRef} />
          </>
        )}
      </div>

      {savedSuccess && (
        <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center space-x-1.5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Transcript successfully published to Course Study Materials!</span>
        </div>
      )}
    </div>
  );
};
