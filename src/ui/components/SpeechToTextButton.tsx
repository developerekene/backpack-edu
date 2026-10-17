/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface SpeechToTextButtonProps {
  onTranscript: (transcript: string) => void;
  title?: string;
  className?: string;
  iconClassName?: string;
}

// Check for Web Speech API browser support
const checkSpeechSupport = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
};

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
};

export const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({
  onTranscript,
  title = "Speak to text (Speech Recognition)",
  className = "",
  iconClassName = "w-3.5 h-3.5",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(checkSpeechSupport);
  const recognitionRef = useRef<any>(null);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSupported) {
      alert(
        "Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari to use voice typing."
      );
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert("Unable to initialize speech recognition.");
      return;
    }

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript =
        event.results && event.results[0] && event.results[0][0]
          ? event.results[0][0].transcript
          : "";
      if (transcript && transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition notice:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition start failed:", err);
      setIsListening(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`inline-flex items-center gap-1 rounded-lg transition-all cursor-pointer ${
        isListening
          ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 px-2 py-0.5 animate-pulse"
          : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1"
      } ${className}`}
      title={isListening ? "Listening... Click to finish speaking" : title}
      aria-label={isListening ? "Listening... Click to finish" : title}
    >
      {isListening ? (
        <>
          <Mic className={`${iconClassName} text-red-600 dark:text-red-400 animate-bounce`} />
          <span className="text-[10px] font-bold tracking-tight text-red-600 dark:text-red-400">
            Listening...
          </span>
        </>
      ) : (
        <Mic className={iconClassName} />
      )}
    </button>
  );
};
