import React, { useState, useEffect } from "react";
import { useAccessibility } from "../../../store/AccessibilityContext";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  MousePointer,
  Settings2,
  X,
} from "lucide-react";

export const TTSFloatingController: React.FC = () => {
  const {
    ttsEnabled,
    setTtsEnabled,
    ttsPlaying,
    ttsPaused,
    ttsCurrentText,
    ttsRate,
    setTtsRate,
    ttsVoices,
    ttsVoiceURI,
    setTtsVoiceURI,
    speakSelection,
    pauseTts,
    resumeTts,
    stopTts,
  } = useAccessibility();

  const [hasSelectedText, setHasSelectedText] = useState(false);
  const [showVoiceSelect, setShowVoiceSelect] = useState(false);

  useEffect(() => {
    if (!ttsEnabled) return;

    const checkSelection = () => {
      const selected = window.getSelection()?.toString().trim();
      setHasSelectedText(Boolean(selected && selected.length > 0));
    };

    document.addEventListener("selectionchange", checkSelection);
    return () => {
      document.removeEventListener("selectionchange", checkSelection);
    };
  }, [ttsEnabled]);

  if (!ttsEnabled) return null;

  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92vw] sm:w-auto bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-md border border-indigo-500/30 rounded-2xl p-3 shadow-2xl transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Branding / Status */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            {ttsPlaying ? (
              <Volume2 className="w-4 h-4 animate-bounce text-emerald-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs text-white">TTS Reader</span>
              {ttsPlaying && (
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                  Speaking
                </span>
              )}
              {ttsPaused && (
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
                  Paused
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
              {ttsCurrentText
                ? `"${ttsCurrentText.slice(0, 35)}..."`
                : hasSelectedText
                  ? "Text selected ready to read"
                  : "Highlight text or click Read"}
            </p>
          </div>
        </div>

        {/* Center Controls */}
        <div className="flex items-center space-x-1.5">
          {ttsPlaying ? (
            <button
              onClick={pauseTts}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow-sm"
              title="Pause speaking"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : ttsPaused ? (
            <button
              onClick={resumeTts}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow-sm"
              title="Resume speaking"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              onClick={speakSelection}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow-sm"
              title={hasSelectedText ? "Read selected text" : "Read page"}
            >
              {hasSelectedText ? (
                <MousePointer className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{hasSelectedText ? "Read Selected" : "Read Page"}</span>
            </button>
          )}

          {(ttsPlaying || ttsPaused) && (
            <button
              onClick={stopTts}
              className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 rounded-xl transition"
              title="Stop playback"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Speed Pills */}
          <div className="hidden sm:flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
            {rates.map((rate) => (
              <button
                key={rate}
                onClick={() => setTtsRate(rate)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  ttsRate === rate
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Voice Settings Toggle */}
          {ttsVoices.length > 0 && (
            <button
              onClick={() => setShowVoiceSelect(!showVoiceSelect)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Voice Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Floating Controller */}
          <button
            onClick={() => setTtsEnabled(false)}
            className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition ml-1"
            title="Close Text-to-Speech"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice Selection Dropdown Drawer */}
      {showVoiceSelect && ttsVoices.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <label className="text-[11px] text-slate-300 font-semibold flex items-center">
            <VolumeX className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Select Voice:
          </label>
          <select
            value={ttsVoiceURI || ""}
            onChange={(e) => setTtsVoiceURI(e.target.value || null)}
            className="w-full sm:w-64 bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Default System Voice</option>
            {ttsVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
