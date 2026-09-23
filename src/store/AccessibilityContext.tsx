/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { SpecialNeedsAccommodations } from "../types";

export type TextScale = 100 | 115 | 130 | 145;
export type LineSpacing = "normal" | "relaxed" | "loose";
export type ColorFilterType =
  | "none"
  | "soft-yellow"
  | "warm-sepia"
  | "calm-sage"
  | "high-contrast"
  | "dark-high-contrast";
export type ExamMultiplier = 1.0 | 1.25 | 1.5 | 2.0;

export interface AccessibilitySettings {
  dyslexicFont: boolean;
  textScale: TextScale;
  lineSpacing: LineSpacing;
  reducedMotion: boolean;
  highContrast: boolean;
  colorFilter: ColorFilterType;
  colorFilterIntensity: number; // 0.1 to 0.6
  readingRulerEnabled: boolean;
  readingRulerHeight: number; // px
  readingRulerDim: number; // opacity of dim overlay
  ttsEnabled: boolean;
  ttsRate: number; // 0.75, 1, 1.25, 1.5, 2
  ttsPitch: number;
  ttsVoiceURI: string | null;
  examTimeMultiplier: ExamMultiplier;
  studentAccommodations: SpecialNeedsAccommodations;
}

const DEFAULT_ACCOMMODATIONS: SpecialNeedsAccommodations = {
  enabled: false,
  disabilityCategories: [],
  examTimeMultiplier: 1.0,
  preferredFormatting: [],
  medicalNotes: "",
  emergencyHealthNotice: "",
  requestedServices: [],
  allowInstructorVisibility: true,
  allowReviewerVisibility: true,
};

const DEFAULT_SETTINGS: AccessibilitySettings = {
  dyslexicFont: false,
  textScale: 100,
  lineSpacing: "normal",
  reducedMotion: false,
  highContrast: false,
  colorFilter: "none",
  colorFilterIntensity: 0.22,
  readingRulerEnabled: false,
  readingRulerHeight: 64,
  readingRulerDim: 0.4,
  ttsEnabled: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoiceURI: null,
  examTimeMultiplier: 1.0,
  studentAccommodations: DEFAULT_ACCOMMODATIONS,
};

const STORAGE_KEY = "backpack_accessibility_settings_v1";

interface AccessibilityContextType extends AccessibilitySettings {
  setDyslexicFont: (val: boolean) => void;
  setTextScale: (val: TextScale) => void;
  setLineSpacing: (val: LineSpacing) => void;
  setReducedMotion: (val: boolean) => void;
  setHighContrast: (val: boolean) => void;
  setColorFilter: (val: ColorFilterType) => void;
  setColorFilterIntensity: (val: number) => void;
  setReadingRulerEnabled: (val: boolean) => void;
  setReadingRulerHeight: (val: number) => void;
  setReadingRulerDim: (val: number) => void;
  setTtsEnabled: (val: boolean) => void;
  setTtsRate: (val: number) => void;
  setTtsPitch: (val: number) => void;
  setTtsVoiceURI: (val: string | null) => void;
  setExamTimeMultiplier: (val: ExamMultiplier) => void;
  updateAccommodations: (plan: Partial<SpecialNeedsAccommodations>) => void;
  resetToDefaults: () => void;

  // TTS runtime controls
  ttsPlaying: boolean;
  ttsPaused: boolean;
  ttsCurrentText: string;
  ttsVoices: SpeechSynthesisVoice[];
  speakText: (text: string) => void;
  speakSelection: () => void;
  pauseTts: () => void;
  resumeTts: () => void;
  stopTts: () => void;

  // Modal UI state
  isAccessibilityModalOpen: boolean;
  activeModalTab: "visual" | "filter" | "reading" | "accommodations";
  openAccessibilityModal: (
    tab?: "visual" | "filter" | "reading" | "accommodations",
  ) => void;
  closeAccessibilityModal: () => void;
  hasActiveFeatures: boolean;
}

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          studentAccommodations: {
            ...DEFAULT_ACCOMMODATIONS,
            ...(parsed.studentAccommodations || {}),
          },
        };
      }
    } catch (e) {
      console.error("Failed to load accessibility settings from storage", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Modal State
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] =
    useState(false);
  const [activeModalTab, setActiveModalTab] = useState<
    "visual" | "filter" | "reading" | "accommodations"
  >("visual");

  // TTS runtime state
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsCurrentText, setTtsCurrentText] = useState("");
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Save settings on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to persist accessibility settings", e);
    }
  }, [settings]);

  // Load available browser TTS voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setTtsVoices(voices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Apply DOM classes and styles dynamically
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Text Scale
    if (settings.textScale === 100) {
      root.style.removeProperty("font-size");
    } else {
      root.style.fontSize = `${settings.textScale}%`;
    }

    // Dyslexic Font
    if (settings.dyslexicFont) {
      body.classList.add("dyslexic-font-active");
    } else {
      body.classList.remove("dyslexic-font-active");
    }

    // Line Spacing
    body.classList.remove("line-spacing-relaxed", "line-spacing-loose");
    if (settings.lineSpacing === "relaxed") {
      body.classList.add("line-spacing-relaxed");
    } else if (settings.lineSpacing === "loose") {
      body.classList.add("line-spacing-loose");
    }

    // Reduced Motion
    if (settings.reducedMotion) {
      body.classList.add("reduced-motion-active");
    } else {
      body.classList.remove("reduced-motion-active");
    }

    // High Contrast
    if (settings.highContrast) {
      body.classList.add("high-contrast-mode");
    } else {
      body.classList.remove("high-contrast-mode");
    }
  }, [
    settings.textScale,
    settings.dyslexicFont,
    settings.lineSpacing,
    settings.reducedMotion,
    settings.highContrast,
  ]);

  // TTS Controls
  const stopTts = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setTtsPlaying(false);
    setTtsPaused(false);
    setTtsCurrentText("");
  }, []);

  const pauseTts = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setTtsPaused(true);
      setTtsPlaying(false);
    }
  }, []);

  const resumeTts = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setTtsPaused(false);
      setTtsPlaying(true);
    }
  }, []);

  const speakText = useCallback(
    (textToSpeak: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return;
      const cleanText = textToSpeak.trim();
      if (!cleanText) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = settings.ttsRate;
      utterance.pitch = settings.ttsPitch;

      if (settings.ttsVoiceURI && ttsVoices.length > 0) {
        const foundVoice = ttsVoices.find(
          (v) => v.voiceURI === settings.ttsVoiceURI,
        );
        if (foundVoice) utterance.voice = foundVoice;
      }

      utterance.onstart = () => {
        setTtsPlaying(true);
        setTtsPaused(false);
        setTtsCurrentText(cleanText);
      };

      utterance.onend = () => {
        setTtsPlaying(false);
        setTtsPaused(false);
        setTtsCurrentText("");
      };

      utterance.onerror = () => {
        setTtsPlaying(false);
        setTtsPaused(false);
        setTtsCurrentText("");
      };

      window.speechSynthesis.speak(utterance);
    },
    [settings.ttsRate, settings.ttsPitch, settings.ttsVoiceURI, ttsVoices],
  );

  const speakSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    const selected = window.getSelection()?.toString().trim();
    if (selected) {
      speakText(selected);
    } else {
      // If nothing selected, read main article / body content summary
      const mainContent =
        document.querySelector("main")?.innerText ||
        document.body.innerText ||
        "No readable content found on page.";
      // Limit to first ~1000 characters for instant read
      speakText(mainContent.slice(0, 1000));
    }
  }, [speakText]);

  // Setters
  const setDyslexicFont = (dyslexicFont: boolean) =>
    setSettings((prev) => ({ ...prev, dyslexicFont }));
  const setTextScale = (textScale: TextScale) =>
    setSettings((prev) => ({ ...prev, textScale }));
  const setLineSpacing = (lineSpacing: LineSpacing) =>
    setSettings((prev) => ({ ...prev, lineSpacing }));
  const setReducedMotion = (reducedMotion: boolean) =>
    setSettings((prev) => ({ ...prev, reducedMotion }));
  const setHighContrast = (highContrast: boolean) =>
    setSettings((prev) => ({ ...prev, highContrast }));
  const setColorFilter = (colorFilter: ColorFilterType) =>
    setSettings((prev) => ({ ...prev, colorFilter }));
  const setColorFilterIntensity = (colorFilterIntensity: number) =>
    setSettings((prev) => ({ ...prev, colorFilterIntensity }));
  const setReadingRulerEnabled = (readingRulerEnabled: boolean) =>
    setSettings((prev) => ({ ...prev, readingRulerEnabled }));
  const setReadingRulerHeight = (readingRulerHeight: number) =>
    setSettings((prev) => ({ ...prev, readingRulerHeight }));
  const setReadingRulerDim = (readingRulerDim: number) =>
    setSettings((prev) => ({ ...prev, readingRulerDim }));
  const setTtsEnabled = (ttsEnabled: boolean) => {
    if (!ttsEnabled) stopTts();
    setSettings((prev) => ({ ...prev, ttsEnabled }));
  };
  const setTtsRate = (ttsRate: number) =>
    setSettings((prev) => ({ ...prev, ttsRate }));
  const setTtsPitch = (ttsPitch: number) =>
    setSettings((prev) => ({ ...prev, ttsPitch }));
  const setTtsVoiceURI = (ttsVoiceURI: string | null) =>
    setSettings((prev) => ({ ...prev, ttsVoiceURI }));
  const setExamTimeMultiplier = (examTimeMultiplier: ExamMultiplier) =>
    setSettings((prev) => ({
      ...prev,
      examTimeMultiplier,
      studentAccommodations: {
        ...prev.studentAccommodations,
        examTimeMultiplier,
      },
    }));

  const updateAccommodations = (plan: Partial<SpecialNeedsAccommodations>) => {
    setSettings((prev) => {
      const updatedAccommodations = {
        ...prev.studentAccommodations,
        ...plan,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        examTimeMultiplier:
          plan.examTimeMultiplier !== undefined
            ? plan.examTimeMultiplier
            : prev.examTimeMultiplier,
        studentAccommodations: updatedAccommodations,
      };
    });
  };

  const resetToDefaults = () => {
    stopTts();
    setSettings(DEFAULT_SETTINGS);
  };

  const openAccessibilityModal = (
    tab: "visual" | "filter" | "reading" | "accommodations" = "visual",
  ) => {
    setActiveModalTab(tab);
    setIsAccessibilityModalOpen(true);
  };

  const closeAccessibilityModal = () => {
    setIsAccessibilityModalOpen(false);
  };

  const hasActiveFeatures = Boolean(
    settings.dyslexicFont ||
      settings.textScale !== 100 ||
      settings.lineSpacing !== "normal" ||
      settings.reducedMotion ||
      settings.highContrast ||
      settings.colorFilter !== "none" ||
      settings.readingRulerEnabled ||
      settings.ttsEnabled ||
      settings.examTimeMultiplier !== 1.0 ||
      settings.studentAccommodations.enabled,
  );

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        setDyslexicFont,
        setTextScale,
        setLineSpacing,
        setReducedMotion,
        setHighContrast,
        setColorFilter,
        setColorFilterIntensity,
        setReadingRulerEnabled,
        setReadingRulerHeight,
        setReadingRulerDim,
        setTtsEnabled,
        setTtsRate,
        setTtsPitch,
        setTtsVoiceURI,
        setExamTimeMultiplier,
        updateAccommodations,
        resetToDefaults,

        // TTS runtime
        ttsPlaying,
        ttsPaused,
        ttsCurrentText,
        ttsVoices,
        speakText,
        speakSelection,
        pauseTts,
        resumeTts,
        stopTts,

        // Modal
        isAccessibilityModalOpen,
        activeModalTab,
        openAccessibilityModal,
        closeAccessibilityModal,
        hasActiveFeatures,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider",
    );
  }
  return context;
};
