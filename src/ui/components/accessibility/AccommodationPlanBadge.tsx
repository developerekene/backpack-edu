import React, { useState } from "react";
import { SpecialNeedsAccommodations } from "../../../types";
import {
  Accessibility,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";

interface AccommodationPlanBadgeProps {
  accommodations?: SpecialNeedsAccommodations;
  compact?: boolean;
}

export const AccommodationPlanBadge: React.FC<AccommodationPlanBadgeProps> = ({
  accommodations,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (
    !accommodations ||
    (!accommodations.enabled &&
      (!accommodations.disabilityCategories ||
        accommodations.disabilityCategories.length === 0) &&
      (!accommodations.medicalNotes || !accommodations.medicalNotes.trim()) &&
      accommodations.examTimeMultiplier === 1.0)
  ) {
    return null;
  }

  const categoryLabels: Record<string, string> = {
    visual_impairment: "Visual Impairment",
    hearing_impairment: "Hearing Impairment",
    adhd_neurodivergent: "ADHD / Neurodivergent",
    dyslexia_reading: "Dyslexia / Reading",
    motor_mobility: "Motor & Mobility",
    chronic_illness: "Chronic Illness",
    mental_health: "Mental Health / Anxiety",
    temporary_injury: "Temporary Injury",
    other: "Other Special Need",
  };

  const serviceLabels: Record<string, string> = {
    captions_transcripts: "Captions & Transcripts",
    extra_exam_time: "Extra Exam Time",
    dyslexia_formatting: "Dyslexia / Large Text",
    flexible_deadlines: "Flexible Deadlines",
    peer_notetaker: "Notetaker Support",
    screen_reader_opt: "Screen Reader Optimizations",
  };

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
        <Accessibility className="w-3.5 h-3.5 text-indigo-500" />
        <span>Accommodation Plan Attached</span>
        {accommodations.examTimeMultiplier > 1.0 && (
          <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px]">
            {accommodations.examTimeMultiplier}x Exam Time
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Accessibility className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Special Needs & Health Accommodation Plan
              </span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Confidential student health and academic support requirements.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition text-xs font-bold flex items-center space-x-1"
        >
          <span>{expanded ? "Collapse" : "View Details"}</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Primary Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {accommodations.examTimeMultiplier > 1.0 && (
          <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Exam Time Multiplier
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {accommodations.examTimeMultiplier}x (+
                {Math.round((accommodations.examTimeMultiplier - 1) * 100)}%
                Time on Quizzes/Exams)
              </span>
            </div>
          </div>
        )}

        {accommodations.disabilityCategories &&
          accommodations.disabilityCategories.length > 0 && (
            <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-500 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Categories ({accommodations.disabilityCategories.length})
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {accommodations.disabilityCategories
                    .map((c) => categoryLabels[c] || c)
                    .join(", ")}
                </span>
              </div>
            </div>
          )}
      </div>

      {/* Expanded Accommodation Details */}
      {expanded && (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 space-y-3 text-xs">
          {/* Categories List */}
          {accommodations.disabilityCategories &&
            accommodations.disabilityCategories.length > 0 && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 text-[11px] uppercase">
                  Condition & Learning Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {accommodations.disabilityCategories.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 text-xs font-semibold border border-indigo-200 dark:border-indigo-800"
                    >
                      {categoryLabels[c] || c}
                    </span>
                  ))}
                  {accommodations.otherCategoryDescription && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs font-semibold border border-purple-200 dark:border-purple-800">
                      Note: {accommodations.otherCategoryDescription}
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* Requested Services */}
          {accommodations.requestedServices &&
            accommodations.requestedServices.length > 0 && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 text-[11px] uppercase">
                  Requested Academic & Classroom Services:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {accommodations.requestedServices.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                      {serviceLabels[s] || s}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Confidential Instructor Notes */}
          {accommodations.medicalNotes && (
            <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1">
              <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300 uppercase flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Confidential Instructor & Health Notes:
              </span>
              <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">
                "{accommodations.medicalNotes}"
              </p>
            </div>
          )}

          {/* Emergency Alert */}
          {accommodations.emergencyHealthNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1 text-amber-900 dark:text-amber-200">
              <span className="font-bold text-[11px] uppercase flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Emergency Health Notice:
              </span>
              <p className="text-xs">{accommodations.emergencyHealthNotice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
