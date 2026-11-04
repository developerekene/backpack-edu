/* ============================================================= */
/* Shared event metadata                                         */
/* Used by EventContext, EventCreation and the Events page.      */
/* ============================================================= */

/** How an event takes place. */
export type EventMode = "online" | "onsite" | "allevent";

export const EVENT_MODE_OPTIONS: { value: EventMode; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "onsite", label: "Onsite" },
  { value: "allevent", label: "All Events" },
];

export const EVENT_MODE_LABELS: Record<EventMode, string> = {
  online: "Online",
  onsite: "Onsite",
  allevent: "All Events",
};

export const EVENT_MODE_BADGE_STYLES: Record<EventMode, string> = {
  online:
    "bg-[#0078d4]/10 border-[#0078d4]/25 text-[#0078d4] dark:text-[#04a4ec] dark:bg-[#0078d4]/15 dark:border-[#0078d4]/30",
  onsite:
    "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/30",
  allevent:
    "bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-400 dark:bg-sky-500/15 dark:border-sky-500/30",
};

/** Fall back to "general" for events saved before modes existed. */
export const normaliseEventMode = (value?: string): EventMode =>
  value === "online" || value === "onsite" || value === "allevent"
    ? value
    : "allevent";

/* ------------------------------------------------------------- */
/* Course (qualification) levels                                  */
/* ------------------------------------------------------------- */

/**
 * Course levels an event can target. Selecting one means:
 * "everyone enrolled in a course of this level can participate".
 */
export const COURSE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "doctorate", label: "Doctorate Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certification" },
  { value: "professional", label: "Professional" },
];

/** Select values for course levels look like `type:bachelors`. */
export const COURSE_TYPE_PREFIX = "type:";

export const courseTypeLabel = (value?: string): string =>
  COURSE_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
  "Course";

export const isCourseTypeValue = (value: string): boolean =>
  value.startsWith(COURSE_TYPE_PREFIX);

export const courseTypeFromValue = (value: string): string | undefined =>
  isCourseTypeValue(value)
    ? value.slice(COURSE_TYPE_PREFIX.length) || undefined
    : undefined;
