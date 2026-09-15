import React, { useEffect, useState } from "react";
import {
  X,
  Building2,
  Type,
  AlignLeft,
  CalendarDays,
  Clock,
  MapPin,
  BookOpen,
  Link2,
  Info,
  CalendarPlus,
  Lock,
  AlertCircle,
  ChevronDown,
  Save,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext, userToCreator } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
import {
  COURSE_TYPE_OPTIONS,
  COURSE_TYPE_PREFIX,
  courseTypeFromValue,
  courseTypeLabel,
} from "../../lib/eventMeta";

/* ============================================================= */
/* Props                                                         */
/* ============================================================= */

interface EventCreationProps {
  /** Optional — defaults to true so the parent can render it conditionally. */
  isOpen?: boolean;
  /** Pass an existing event to edit it instead of creating a new one. */
  event?: AppEvent;
  onClose: () => void;
  /** Fired after the event is created or updated. */
  onCreated?: (event: AppEvent) => void;
}

/* ============================================================= */
/* Helpers                                                       */
/* ============================================================= */

const inputBase =
  "w-full rounded-xl border bg-white dark:bg-slate-800/70 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition";

const borderFor = (error?: string) =>
  error
    ? "border-red-400 dark:border-red-500/60"
    : "border-slate-200 dark:border-slate-700 focus:border-indigo-400";

/** Convert a 24h "14:30" input value into a friendly "2:30 PM" label. */
const to12Hour = (value: string): string => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalised = hours % 12 === 0 ? 12 : hours % 12;
  return `${normalised}:${minutesRaw ?? "00"} ${suffix}`;
};

/** Convert a stored "2:30 PM" label back into a 24h "14:30" input value. */
const to24Hour = (value: string): string => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2];
  const suffix = match[3]?.toUpperCase();
  if (suffix === "PM" && hours < 12) hours += 12;
  if (suffix === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

/* ============================================================= */
/* Field wrapper (module-level so it isn't recreated each render) */
/* ============================================================= */

interface FieldProps {
  label: string;
  htmlFor: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  icon: Icon,
  required,
  error,
  hint,
  children,
}) => (
  <div>
    <label
      htmlFor={htmlFor}
      className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
    >
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      {children}
    </div>

    {hint && !error && (
      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    )}
    {error && (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-500">
        <AlertCircle className="w-3 h-3" /> {error}
      </p>
    )}
  </div>
);

/* ============================================================= */
/* Modal                                                         */
/* ============================================================= */

export const EventCreation: React.FC<EventCreationProps> = ({
  isOpen = true,
  event: existingEvent,
  onClose,
  onCreated,
}) => {
  const { currentUser } = useAuth();
  const { courses, organizations } = useAppContext();
  const { addEvent, updateEvent } = useEventContext();

  const isEditMode = Boolean(existingEvent);

  const [form, setForm] = useState({
    title: existingEvent?.title ?? "",
    subject: existingEvent?.subject ?? "",
    description: existingEvent?.description ?? "",
    date: existingEvent?.date ?? "",
    time: existingEvent ? to24Hour(existingEvent.time) : "",
    location: existingEvent?.location ?? "",
    link: existingEvent?.link ?? "",
    courseId: existingEvent?.courseType
      ? `${COURSE_TYPE_PREFIX}${existingEvent.courseType}`
      : (existingEvent?.courseId ?? ""),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Close on Escape + lock background scroll while open. */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const isOrganization = currentUser?.role === "organization";

  /* ---- Organization-only gate ---- */
  if (!isOpen) return null;

  if (!currentUser || !isOrganization) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Organizations only
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Only organization accounts can create events. Please sign in with
              an organization account to publish an event.
            </p>
            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Current organization + its courses ---- */
  const organization = organizations.find(
    (org) => org.ownerId === currentUser.id || org.id === currentUser.id,
  );

  const organizationIds = [
    currentUser.id,
    organization?.id,
    organization?.ownerId,
  ].filter((value): value is string => Boolean(value));

  const organizationCourses = courses.filter((course) =>
    organizationIds.includes(course.orgId),
  );

  const selectedCourse = organizationCourses.find(
    (c) => c.id === form.courseId,
  );
  const selectedCourseType = courseTypeFromValue(form.courseId);

  /* ---- Form handling ---- */
  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Event title is required";
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.date) next.date = "Date is required";
    if (!form.time) next.time = "Time is required";
    if (!form.location.trim()) next.location = "Location is required";
    if (form.link.trim() && !/^https?:\/\/.+/i.test(form.link.trim())) {
      next.link = "Enter a valid link starting with http:// or https://";
    }
    return next;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      description: form.description.trim() || undefined,
      date: form.date,
      time: to12Hour(form.time),
      location: form.location.trim(),
      link: form.link.trim() || undefined,
      courseId: selectedCourse?.id,
      courseTitle: selectedCourse?.title,
      courseType: selectedCourseType,
    };

    if (existingEvent) {
      updateEvent(existingEvent.id, payload);
      onCreated?.({
        ...existingEvent,
        ...payload,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const created = addEvent({
        ...payload,
        createdBy: userToCreator({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        }),
      });
      onCreated?.(created);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------------- Header ---------------- */}
        <div className="flex justify-between items-start p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
              <Building2 className="w-3 h-3 mr-1" />
              Organization Event
            </span>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? "Edit Event" : "Create Event"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditMode ? "Editing as " : "Publishing as "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {organization?.name || currentUser.name}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---------------- Body ---------------- */}
        <form
          id="event-creation-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto flex-1 space-y-5"
        >
          <Field
            label="Event Title"
            htmlFor="event-title"
            icon={Type}
            required
            error={errors.title}
          >
            <input
              id="event-title"
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Orientation & Platform Tour"
              className={`${inputBase} ${borderFor(errors.title)}`}
            />
          </Field>

          <Field
            label="Subject"
            htmlFor="event-subject"
            icon={AlignLeft}
            required
            error={errors.subject}
          >
            <input
              id="event-subject"
              type="text"
              value={form.subject}
              onChange={(e) => setField("subject", e.target.value)}
              placeholder="Short summary shown on the event card"
              className={`${inputBase} ${borderFor(errors.subject)}`}
            />
          </Field>

          {/* Description (textarea, no leading icon) */}
          <div>
            <label
              htmlFor="event-description"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="event-description"
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Optional details about the event, agenda, or what attendees should expect…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 focus:border-indigo-400 bg-white dark:bg-slate-800/70 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition resize-none"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Date"
              htmlFor="event-date"
              icon={CalendarDays}
              required
              error={errors.date}
            >
              <input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
                className={`${inputBase} ${borderFor(errors.date)}`}
              />
            </Field>

            <Field
              label="Time"
              htmlFor="event-time"
              icon={Clock}
              required
              error={errors.time}
            >
              <input
                id="event-time"
                type="time"
                value={form.time}
                onChange={(e) => setField("time", e.target.value)}
                className={`${inputBase} ${borderFor(errors.time)}`}
              />
            </Field>
          </div>

          {/* Location + Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Location"
              htmlFor="event-location"
              icon={MapPin}
              required
              error={errors.location}
            >
              <input
                id="event-location"
                type="text"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="e.g. Main Auditorium / Zoom"
                className={`${inputBase} ${borderFor(errors.location)}`}
              />
            </Field>

            <div>
              <label
                htmlFor="event-course"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Course
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="event-course"
                  value={form.courseId}
                  onChange={(e) => setField("courseId", e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 focus:border-indigo-400 bg-white dark:bg-slate-800/70 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
                >
                  {organizationCourses.length > 0 && (
                    <optgroup label="My courses">
                      {organizationCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="Course level (all enrolled students)">
                    {COURSE_TYPE_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={`${COURSE_TYPE_PREFIX}${option.value}`}
                      >
                        {option.label}
                      </option>
                    ))}
                  </optgroup>

                  {/* Keeps an older level value visible while editing */}
                  {existingEvent?.courseType &&
                    !COURSE_TYPE_OPTIONS.some(
                      (option) => option.value === existingEvent?.courseType,
                    ) && (
                      <option
                        value={`${COURSE_TYPE_PREFIX}${existingEvent.courseType}`}
                      >
                        {courseTypeLabel(existingEvent.courseType)} (current)
                      </option>
                    )}

                  {existingEvent?.courseId &&
                    !existingEvent.courseType &&
                    !organizationCourses.some(
                      (course) => course.id === existingEvent.courseId,
                    ) && (
                      <option value={existingEvent.courseId}>
                        {existingEvent.courseTitle || "Current course"}
                      </option>
                    )}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {form.courseId
                  ? "Only students enrolled in this course (or level) can participate."
                  : "General events can be joined by any signed-in user."}
              </p>
            </div>
          </div>

          {/* Link */}
          <Field
            label="Link"
            htmlFor="event-link"
            icon={Link2}
            error={errors.link}
            hint="Meeting or registration link (optional)"
          >
            <input
              id="event-link"
              type="url"
              value={form.link}
              onChange={(e) => setField("link", e.target.value)}
              placeholder="https://meet.example.com/your-event"
              className={`${inputBase} ${borderFor(errors.link)}`}
            />
          </Field>

          {/* Info note */}
          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 p-4 text-sky-700 dark:text-sky-300">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs leading-relaxed">
              {isEditMode
                ? "Your changes are saved to the Events page immediately. Existing attendees keep their RSVP."
                : "This event will be published under your organization and appear on the Events page. Students and instructors will be able to view and mark their attendance."}
            </p>
          </div>
        </form>

        {/* ---------------- Footer ---------------- */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="event-creation-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-sm"
          >
            {isEditMode ? (
              <Save className="w-4 h-4" />
            ) : (
              <CalendarPlus className="w-4 h-4" />
            )}
            {isSubmitting
              ? isEditMode
                ? "Saving…"
                : "Creating…"
              : isEditMode
                ? "Save Changes"
                : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCreation;
