import React, { useState } from "react";
import {
  useAccessibility,
  TextScale,
  LineSpacing,
  ColorFilterType,
  ExamMultiplier,
} from "../../../store/AccessibilityContext";
import { useAuth } from "../../../store/AuthContext";
import { useAppContext } from "../../../store/AppContext";
import {
  X,
  Sparkles,
  Type,
  Sliders,
  Eye,
  Volume2,
  Clock,
  CheckCircle2,
  RotateCcw,
  Zap,
  Accessibility,
  Check,
  ShieldCheck,
  Save,
  VolumeX,
} from "lucide-react";

export const UniversalAccessibilityModal: React.FC = () => {
  const {
    isAccessibilityModalOpen,
    activeModalTab,
    openAccessibilityModal,
    closeAccessibilityModal,
    dyslexicFont,
    setDyslexicFont,
    textScale,
    setTextScale,
    lineSpacing,
    setLineSpacing,
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    colorFilter,
    setColorFilter,
    colorFilterIntensity,
    setColorFilterIntensity,
    readingRulerEnabled,
    setReadingRulerEnabled,
    readingRulerHeight,
    setReadingRulerHeight,
    ttsEnabled,
    setTtsEnabled,
    ttsRate,
    setTtsRate,
    ttsVoiceURI,
    setTtsVoiceURI,
    ttsVoices,
    speakText,
    stopTts,
    examTimeMultiplier,
    setExamTimeMultiplier,
    studentAccommodations,
    updateAccommodations,
    resetToDefaults,
  } = useAccessibility();

  const { currentUser } = useAuth();
  const { updateUserProfile } = useAppContext();
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Local state for health/disability categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    studentAccommodations.disabilityCategories || [],
  );
  const [otherDescription, setOtherDescription] = useState(
    studentAccommodations.otherCategoryDescription || "",
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(
    studentAccommodations.requestedServices || [],
  );
  const [medicalNotes, setMedicalNotes] = useState(
    studentAccommodations.medicalNotes || "",
  );
  const [emergencyNotice, setEmergencyNotice] = useState(
    studentAccommodations.emergencyHealthNotice || "",
  );
  const [accommodationsEnabled] = useState(
    studentAccommodations.enabled || false,
  );

  if (!isAccessibilityModalOpen) return null;

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId],
    );
  };

  const handleToggleService = (svcId: string) => {
    setSelectedServices((prev) =>
      prev.includes(svcId) ? prev.filter((s) => s !== svcId) : [...prev, svcId],
    );
  };

  const handleSaveAccommodations = async () => {
    const updatedPlan = {
      enabled: accommodationsEnabled || selectedCategories.length > 0,
      disabilityCategories: selectedCategories,
      otherCategoryDescription: otherDescription.trim() || undefined,
      examTimeMultiplier,
      requestedServices: selectedServices,
      medicalNotes: medicalNotes.trim() || undefined,
      emergencyHealthNotice: emergencyNotice.trim() || undefined,
      allowInstructorVisibility: true,
      allowReviewerVisibility: true,
      updatedAt: new Date().toISOString(),
    };

    updateAccommodations(updatedPlan);

    // If logged in, also sync to user profile
    if (currentUser?.id && updateUserProfile) {
      try {
        await updateUserProfile({
          ...currentUser,
          accommodations: updatedPlan,
        });
      } catch (err) {
        console.error("Failed to sync accommodations with profile", err);
      }
    }

    setSaveSuccessMsg("Accommodations saved to your student profile!");
    setTimeout(() => setSaveSuccessMsg(""), 3500);
  };

  const categories = [
    {
      id: "visual_impairment",
      label: "Visual Impairment",
      desc: "Low vision, photophobia, color blindness, or partial sight",
    },
    {
      id: "hearing_impairment",
      label: "Hearing Impairment",
      desc: "Deaf, hard of hearing, requires captions/transcripts",
    },
    {
      id: "adhd_neurodivergent",
      label: "ADHD & Neurodivergent",
      desc: "Executive function, sensory processing, or pacing support",
    },
    {
      id: "dyslexia_reading",
      label: "Dyslexia & Reading",
      desc: "Phonological decoding, reading processing, or visual fatigue",
    },
    {
      id: "motor_mobility",
      label: "Motor & Mobility",
      desc: "Dexterity, keyboard navigation, or physical mobility support",
    },
    {
      id: "chronic_illness",
      label: "Chronic Health Condition",
      desc: "Fatigue, pain, frequent medical breaks or flare-ups",
    },
    {
      id: "mental_health",
      label: "Mental Health & Anxiety",
      desc: "Test anxiety, panic conditions, sensory overstimulation",
    },
    {
      id: "temporary_injury",
      label: "Temporary Medical Injury",
      desc: "Concussion, broken wrist/hand, surgery recovery",
    },
    {
      id: "other",
      label: "Other Health Need",
      desc: "Custom health or special learning need",
    },
  ];

  const serviceOptions = [
    {
      id: "captions_transcripts",
      label: "Live Captions & Audio Transcripts",
    },
    {
      id: "extra_exam_time",
      label: "Extra Time on Quizzes & Assessments",
    },
    {
      id: "dyslexia_formatting",
      label: "Dyslexia-Friendly & Large-Print Formats",
    },
    {
      id: "flexible_deadlines",
      label: "Flexible Assignment Submission Windows",
    },
    {
      id: "peer_notetaker",
      label: "Notetaking Assistance / AI Transcripts",
    },
    {
      id: "screen_reader_opt",
      label: "Screen-Reader & High-Contrast Optimization",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Accessibility className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Special Needs & Accessibility Suite
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Universal Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tailor typography, color filters, reading tools, and health
                accommodations.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetToDefaults}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition flex items-center space-x-1"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={closeAccessibilityModal}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shrink-0 text-xs font-bold">
          {[
            {
              key: "visual" as const,
              label: "Visual & Typography",
              icon: Type,
            },
            {
              key: "filter" as const,
              label: "Eye-Strain Filters",
              icon: Eye,
            },
            {
              key: "reading" as const,
              label: "Reading & Audio",
              icon: Volume2,
            },
            {
              key: "accommodations" as const,
              label: "Exam & Health Accommodations",
              icon: Clock,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModalTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => openAccessibilityModal(tab.key)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: VISUAL & TYPOGRAPHY */}
          {activeModalTab === "visual" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Dyslexia Font */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Dyslexia-Friendly Typography
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      Lexend & OpenDyslexic
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                    Optimizes letter weight, baseline spacing, and character
                    distinction to ease reading fatigue.
                  </p>
                </div>
                <button
                  onClick={() => setDyslexicFont(!dyslexicFont)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    dyslexicFont ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      dyslexicFont ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Text Scaling */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Text Scaling (Font Size)
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Magnify all application text without breaking responsive
                      layouts.
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {textScale}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {([100, 115, 130, 145] as TextScale[]).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setTextScale(scale)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition border ${
                        textScale === scale
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {scale === 100 ? "100% (Default)" : `${scale}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Spacing */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Custom Line Spacing
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Increase vertical line height to prevent visual crowding.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "normal",
                      label: "Standard (1.5)",
                      desc: "Default spacing",
                    },
                    {
                      id: "relaxed",
                      label: "Relaxed (1.85)",
                      desc: "Enhanced breathing room",
                    },
                    {
                      id: "loose",
                      label: "Loose (2.2)",
                      desc: "Maximum line separation",
                    },
                  ].map((spacing) => (
                    <button
                      key={spacing.id}
                      onClick={() =>
                        setLineSpacing(spacing.id as LineSpacing)
                      }
                      className={`p-3 rounded-xl text-left border transition ${
                        lineSpacing === spacing.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      <div className="font-bold text-xs">{spacing.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          lineSpacing === spacing.id
                            ? "text-indigo-100"
                            : "text-slate-400"
                        }`}
                      >
                        {spacing.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion & Contrast Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                      Reduced Motion
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Disables moving animations & quickens transitions.
                    </span>
                  </div>
                  <button
                    onClick={() => setReducedMotion(!reducedMotion)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      reducedMotion ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                        reducedMotion ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                      High Contrast Mode
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Boosts contrast ratio for maximum sharpness.
                    </span>
                  </div>
                  <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      highContrast ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                        highContrast ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EYE-STRAIN COLOR FILTER OVERLAYS */}
          {activeModalTab === "filter" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Eye-Strain Color Filter Overlays
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Applies full-screen clinical tint overlays designed to reduce
                  photophobia, migraine triggers, and visual stress.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "none",
                    label: "No Filter (Normal)",
                    desc: "Standard display colors",
                    colorBox: "bg-slate-200 dark:bg-slate-700",
                  },
                  {
                    id: "soft-yellow",
                    label: "Soft Yellow Overlay",
                    desc: "Reduces harsh glare & photophobia",
                    colorBox: "bg-amber-200 border border-amber-300",
                  },
                  {
                    id: "warm-sepia",
                    label: "Warm Sepia Overlay",
                    desc: "Cuts blue light & eases night eye strain",
                    colorBox: "bg-amber-600 border border-amber-700",
                  },
                  {
                    id: "calm-sage",
                    label: "Calm Sage Overlay",
                    desc: "Soft green tint for ADHD focus & soothing",
                    colorBox: "bg-emerald-300 border border-emerald-400",
                  },
                  {
                    id: "high-contrast",
                    label: "High Contrast Blue-Wash",
                    desc: "Crisp letter edges for low vision",
                    colorBox: "bg-blue-900 border border-blue-800",
                  },
                  {
                    id: "dark-high-contrast",
                    label: "Dark High Contrast Tone",
                    desc: "Dim dark mode overlay for OLED screens",
                    colorBox: "bg-black border border-slate-800",
                  },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setColorFilter(filter.id as ColorFilterType)}
                    className={`p-3.5 rounded-2xl text-left border flex items-start space-x-3 transition ${
                      colorFilter === filter.id
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl shrink-0 mt-0.5 shadow-sm ${filter.colorBox}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {filter.label}
                        </span>
                        {colorFilter === filter.id && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {filter.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {colorFilter !== "none" && (
                <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Filter Tint Intensity
                    </span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {Math.round(colorFilterIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.55"
                    step="0.02"
                    value={colorFilterIntensity}
                    onChange={(e) =>
                      setColorFilterIntensity(parseFloat(e.target.value))
                    }
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Subtle (8%)</span>
                    <span>Medium (25%)</span>
                    <span>Intense (55%)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: READING & AUDIO ASSISTANCE */}
          {activeModalTab === "reading" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Reading Focus Ruler */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        Visual Reading Focus Ruler
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tracks your cursor to illuminate the current line and
                        mask distractions above & below.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setReadingRulerEnabled(!readingRulerEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      readingRulerEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                        readingRulerEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {readingRulerEnabled && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      Focus Band Height:
                    </span>
                    <div className="flex items-center space-x-2">
                      {[40, 64, 96, 120].map((h) => (
                        <button
                          key={h}
                          onClick={() => setReadingRulerHeight(h)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            readingRulerHeight === h
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {h}px
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text-to-Speech Reader */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        Interactive Text-to-Speech (TTS) Reader
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Listen to course pages, modules, or highlighted text
                        with variable playback rates.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      ttsEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                        ttsEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {ttsEnabled && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-3 text-xs">
                    {/* Speed Controls */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        Playback Speed:
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => setTtsRate(rate)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                              ttsRate === rate
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Selection */}
                    {ttsVoices.length > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Speech Voice:
                        </span>
                        <select
                          value={ttsVoiceURI || ""}
                          onChange={(e) =>
                            setTtsVoiceURI(e.target.value || null)
                          }
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white text-xs max-w-xs"
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

                    {/* Test Audio Button */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() =>
                          speakText(
                            "Welcome to the Special Needs & Accessibility Suite. Your Text-to-Speech audio reader is active and ready.",
                          )
                        }
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Test Speech Audio</span>
                      </button>
                      <button
                        onClick={stopTts}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EXAM & HEALTH ACCOMMODATIONS */}
          {activeModalTab === "accommodations" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Exam Timer Multipliers */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1.5 text-indigo-500" />
                      Automatic Exam Timer Multiplier
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Automatically extends countdown timers across quizzes,
                      proctored tests, and final exams.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                    {examTimeMultiplier === 1.0
                      ? "1.0x (Standard)"
                      : `${examTimeMultiplier}x Multiplier`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      val: 1.0,
                      label: "1.0x (Standard)",
                      desc: "Default time limit",
                    },
                    {
                      val: 1.25,
                      label: "1.25x (+25%)",
                      desc: "+15m on 60m exam",
                    },
                    {
                      val: 1.5,
                      label: "1.5x (+50%)",
                      desc: "+30m on 60m exam",
                    },
                    {
                      val: 2.0,
                      label: "2.0x (Double)",
                      desc: "2 hrs on 60m exam",
                    },
                  ].map((mult) => (
                    <button
                      key={mult.val}
                      onClick={() =>
                        setExamTimeMultiplier(mult.val as ExamMultiplier)
                      }
                      className={`p-3 rounded-xl text-left border transition ${
                        examTimeMultiplier === mult.val
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      <div className="font-bold text-xs">{mult.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          examTimeMultiplier === mult.val
                            ? "text-indigo-100"
                            : "text-slate-400"
                        }`}
                      >
                        {mult.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Disability & Health Condition Category Selectors */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Health Condition & Disability Categories
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select all applicable categories to notify admissions
                    reviewers and course instructors.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{cat.label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {cat.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedCategories.includes("other") && (
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Specify Other Health or Learning Condition:
                    </label>
                    <input
                      type="text"
                      value={otherDescription}
                      onChange={(e) => setOtherDescription(e.target.value)}
                      placeholder="e.g. Auditory processing delay, vestibular condition..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Requested Support Services */}
              <div className="p-4.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                  Requested Academic & Classroom Services
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {serviceOptions.map((svc) => {
                    const isSelected = selectedServices.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => handleToggleService(svc.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 text-xs transition ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center border ${
                            isSelected
                              ? "bg-white text-indigo-600"
                              : "border-slate-400"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          )}
                        </span>
                        <span className="truncate">{svc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confidential Notes */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      Confidential Instructor & Reviewer Notes
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Encrypted & Private
                    </span>
                  </label>
                  <textarea
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe specific accommodations needed for exams, assignments, or live video sessions..."
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white mt-1 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                    <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    Emergency Health Notice (Optional)
                  </label>
                  <input
                    type="text"
                    value={emergencyNotice}
                    onChange={(e) => setEmergencyNotice(e.target.value)}
                    placeholder="e.g. Epilepsy protocol, severe sensory overstimulation response..."
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white mt-1 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Save Plan Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                {saveSuccessMsg ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> {saveSuccessMsg}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saved plans automatically attach to course admission
                    applications.
                  </span>
                )}

                <button
                  onClick={handleSaveAccommodations}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md hover:shadow-indigo-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Accommodations Plan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Universal Accommodation Standards (WCAG 2.1 AAA Compliant)</span>
          </div>

          <button
            onClick={closeAccessibilityModal}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
