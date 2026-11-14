import React, { useEffect, useMemo, useState } from "react";
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
  UserCheck,
  Video,
  Radio,
  Shield,
  Tag,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext, userToCreator } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
import type { EventFormatCategory, EventVisibilityType } from "../../types";
import {
  COURSE_TYPE_OPTIONS,
  COURSE_TYPE_PREFIX,
  EVENT_FORMAT_OPTIONS,
  courseTypeFromValue,
  courseTypeLabel,
  normaliseEventFormat,
  normaliseEventType,
  type EventMode,
} from "../../lib/eventMeta";
import { matchesOrgIdentifier } from "../../lib/eventEligibility";

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
  "w-full rounded-xl border bg-white dark:bg-slate-800/70 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] transition";

const borderFor = (error?: string) =>
  error
    ? "border-red-400 dark:border-red-500/60"
    : "border-slate-200 dark:border-slate-700 focus:border-[#0078d4]";

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
/* Field wrapper                                                 */
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
  const { courses, organizations, allUsers, orgMembers } = useAppContext();
  const { addEvent, updateEvent } = useEventContext();

  const isEditMode = Boolean(existingEvent);
  const EVENT_DRAFT_KEY = "bp_draft_event_creation";

  const isOrganizationOrSuperAdmin =
    currentUser?.role === "organization" ||
    currentUser?.role === "super_admin" ||
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com";

  const isInstructor = currentUser?.role === "instructor" && !isOrganizationOrSuperAdmin;
  const canCreateEvent = isOrganizationOrSuperAdmin || isInstructor;

  const getEventDraft = () => {
    try {
      const raw = localStorage.getItem(EVENT_DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
      }
    } catch (e) {
      console.error("Error loading event draft", e);
    }
    return null;
  };

  const initialDraft = !isEditMode ? getEventDraft() : null;

  const [form, setForm] = useState(() => ({
    title: existingEvent?.title ?? initialDraft?.title ?? "",
    subject: existingEvent?.subject ?? initialDraft?.subject ?? "",
    description: existingEvent?.description ?? initialDraft?.description ?? "",
    date: existingEvent?.date ?? initialDraft?.date ?? "",
    time: existingEvent ? to24Hour(existingEvent.time) : (initialDraft?.time ?? ""),
    location: existingEvent?.location ?? initialDraft?.location ?? "",
    link: existingEvent?.link ?? initialDraft?.link ?? "",
    mode: (existingEvent?.mode ?? initialDraft?.mode ?? "online") as string,
    eventType: (existingEvent
      ? normaliseEventType(existingEvent)
      : isInstructor
        ? "go_live"
        : (initialDraft?.eventType ?? "go_live")) as EventVisibilityType,
    category: (existingEvent
      ? normaliseEventFormat(existingEvent.category)
      : (initialDraft?.category ?? "webinar")) as EventFormatCategory,
    facilitatorName:
      existingEvent?.facilitatorName ??
      initialDraft?.facilitatorName ??
      (isInstructor && currentUser?.name ? currentUser.name : ""),
    facilitatorEmail:
      existingEvent?.facilitatorEmail ??
      initialDraft?.facilitatorEmail ??
      (isInstructor && currentUser?.email ? currentUser.email : ""),
    courseId: existingEvent?.courseType
      ? `${COURSE_TYPE_PREFIX}${existingEvent.courseType}`
      : (existingEvent?.courseId ?? initialDraft?.courseId ?? ""),
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(() => Boolean(initialDraft));

  // Instructor suggestions from backend instructor accounts (never super_admin), org members, and courses
  const instructorsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string }>();
    allUsers.forEach((u) => {
      const emailLower = (u.email || "").trim().toLowerCase();
      if (
        u.role !== "instructor" ||
        u.isDeleted ||
        u.isSuspended ||
        emailLower === "ekenehq@gmail.com"
      ) {
        return;
      }
      const key = u.name.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, { id: u.id, name: u.name.trim(), email: u.email });
      }
    });
    orgMembers.forEach((m) => {
      if (m.role !== "instructor") return;
      const emailLower = (m.email || "").trim().toLowerCase();
      if (emailLower === "ekenehq@gmail.com") return;
      const key = m.name.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          id: m.userId || m.id,
          name: m.name.trim(),
          email: m.email,
        });
      }
    });
    courses.forEach((c) => {
      if (c.instructorName && c.instructorName.trim()) {
        const key = c.instructorName.trim().toLowerCase();
        if (!map.has(key)) {
          const instructorEmail =
            (c as typeof c & { instructorEmail?: string }).instructorEmail || "";
          map.set(key, {
            id: c.instructorId || `inst_${key}`,
            name: c.instructorName.trim(),
            email: instructorEmail,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [allUsers, orgMembers, courses]);

  // Auto-save event draft when user changes fields
  useEffect(() => {
    if (!isOpen || isEditMode) return;
    const isAnyFieldFilled =
      Boolean(form.title.trim()) ||
      Boolean(form.subject.trim()) ||
      Boolean(form.description.trim()) ||
      Boolean(form.location.trim());

    if (isAnyFieldFilled) {
      localStorage.setItem(EVENT_DRAFT_KEY, JSON.stringify(form));
    }
  }, [isOpen, isEditMode, form]);

  const clearEventDraft = () => {
    localStorage.removeItem(EVENT_DRAFT_KEY);
    setForm({
      title: "",
      subject: "",
      description: "",
      date: "",
      time: "",
      location: "",
      link: "",
      mode: "online",
      eventType: "go_live",
      category: "webinar",
      facilitatorName: isInstructor && currentUser?.name ? currentUser.name : "",
      facilitatorEmail: isInstructor && currentUser?.email ? currentUser.email : "",
      courseId: "",
    });
    setIsDraftRestored(false);
  };

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

  if (!isOpen) return null;

  /* ---- Organization / Instructor gate (block students & unauthenticated) ---- */
  if (!currentUser || !canCreateEvent) {
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
              Organizations &amp; Instructors Only
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Organizations can create both Go Live and Private events. Instructors can create Go Live webinars, summits, and workshops.
            </p>
            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Resolve host organization for storageUid & Private event scoping ---- */
  const matchedOrg =
    organizations.find(
      (org) => org.ownerId === currentUser.id || org.id === currentUser.id,
    ) ||
    organizations.find(
      (org) =>
        currentUser.orgId &&
        matchesOrgIdentifier(currentUser.orgId, org.id, organizations),
    ) ||
    (() => {
      const member = orgMembers.find(
        (m) =>
          m.status === "active" &&
          ((m.userId && m.userId === currentUser.id) ||
            (currentUser.email &&
              m.email?.toLowerCase() === currentUser.email.toLowerCase())),
      );
      return member
        ? organizations.find((o) =>
            matchesOrgIdentifier(member.orgId, o.id, organizations),
          )
        : undefined;
    })();

  const organizationCourses = courses.filter((course) =>
    matchesOrgIdentifier(
      course.orgId,
      matchedOrg?.id || currentUser.orgId || currentUser.id,
      organizations,
    ),
  );

  const effectiveEventType: EventVisibilityType = isInstructor
    ? "go_live"
    : form.eventType;

  const selectedCourse =
    effectiveEventType === "private"
      ? organizationCourses.find((c) => c.id === form.courseId)
      : undefined;
  const selectedCourseType =
    effectiveEventType === "private"
      ? courseTypeFromValue(form.courseId)
      : undefined;

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

    const assignedFacilitator = instructorsList.find(
      (inst) =>
        inst.name.toLowerCase() === form.facilitatorName.trim().toLowerCase(),
    );

    const resolvedStorageUid =
      existingEvent?.storageUid ||
      matchedOrg?.ownerId ||
      currentUser.id;
    const resolvedOrgId =
      existingEvent?.orgId ||
      matchedOrg?.id ||
      currentUser.orgId ||
      currentUser.id;
    const resolvedOrgName =
      existingEvent?.orgName ||
      matchedOrg?.name ||
      (currentUser.role === "organization" ? currentUser.name : undefined);

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      description: form.description.trim() || undefined,
      date: form.date,
      time: to12Hour(form.time),
      location: form.location.trim(),
      link: form.link.trim() || undefined,
      mode: (form.mode || "online") as EventMode,
      eventType: effectiveEventType,
      category: form.category || "webinar",
      orgId: resolvedOrgId,
      orgName: resolvedOrgName,
      storageUid: resolvedStorageUid,
      facilitatorName: form.facilitatorName.trim() || undefined,
      facilitatorEmail:
        form.facilitatorEmail.trim() || assignedFacilitator?.email || undefined,
      facilitatorId:
        assignedFacilitator?.id ||
        (isInstructor
          ? currentUser.id
          : form.facilitatorName.trim()
            ? "inst_assigned"
            : undefined),
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

    localStorage.removeItem(EVENT_DRAFT_KEY);
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
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] border border-[#0078d4]/20 text-[10px] font-bold uppercase tracking-wider">
                {effectiveEventType === "go_live" ? (
                  <Radio className="w-3 h-3 mr-1" />
                ) : (
                  <Building2 className="w-3 h-3 mr-1" />
                )}
                {effectiveEventType === "go_live"
                  ? "Go Live Event"
                  : "Private Organization Event"}
              </span>
              {!isEditMode && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Draft auto-saved
                </span>
              )}
            </div>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {isEditMode
                ? "Edit Event"
                : isInstructor
                  ? "Create Go Live Event"
                  : "Create Event"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditMode ? "Editing as " : "Publishing as "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {matchedOrg?.name || currentUser.name}
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isDraftRestored && !isEditMode && (
              <button
                type="button"
                onClick={clearEventDraft}
                className="px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition cursor-pointer"
                title="Discard draft and reset fields"
              >
                Clear Draft
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ---------------- Body ---------------- */}
        <form
          id="event-creation-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto flex-1 space-y-5"
        >
          {/* Event Type: Go Live vs Private */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Event Access Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setField("eventType", "go_live");
                  setField("courseId", "");
                }}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                  effectiveEventType === "go_live"
                    ? "border-[#0078d4] bg-[#0078d4]/10 dark:bg-[#0078d4]/15 ring-1 ring-[#0078d4]/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-[#0078d4]/50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Radio className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                  <span>Go Live Event</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open to anyone — guests join the Waiting Room until you accept them or accept everyone.
                </p>
              </button>

              <button
                type="button"
                disabled={isInstructor}
                onClick={() => setField("eventType", "private")}
                title={
                  isInstructor
                    ? "Only organizations can create Private events"
                    : "Create a private organization event"
                }
                className={`p-3.5 rounded-2xl border text-left transition ${
                  isInstructor
                    ? "border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/30 opacity-60 cursor-not-allowed"
                    : effectiveEventType === "private"
                      ? "border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-500/30 cursor-pointer"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-emerald-500/50 cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Private Event</span>
                  </span>
                  {isInstructor && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isInstructor
                    ? "Organizations only — instructors can create Go Live events."
                    : "Exclusive to accepted students and instructors in your organization."}
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                placeholder="e.g. Cloud Engineering Webinar"
                className={`${inputBase} ${borderFor(errors.title)}`}
              />
            </Field>

            <div>
              <label
                htmlFor="event-category"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Event Format
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="event-category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[#0078d4] bg-white dark:bg-slate-800/70 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 transition"
                >
                  {EVENT_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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

          {/* Description */}
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
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[#0078d4] bg-white dark:bg-slate-800/70 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 transition resize-none"
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

          {/* Location + Audience / Course */}
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
                placeholder="e.g. Virtual Live Room / Main Hall"
                className={`${inputBase} ${borderFor(errors.location)}`}
              />
            </Field>

            {effectiveEventType === "private" ? (
              <div>
                <label
                  htmlFor="event-course"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Organization Audience
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    id="event-course"
                    value={form.courseId}
                    onChange={(e) => setField("courseId", e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[#0078d4] bg-white dark:bg-slate-800/70 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 transition"
                  >
                    <option value="">
                      All Accepted Organization Students &amp; Instructors
                    </option>
                    {organizationCourses.length > 0 && (
                      <optgroup label="Specific course">
                        {organizationCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Course level (within organization)">
                      {COURSE_TYPE_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={`${COURSE_TYPE_PREFIX}${option.value}`}
                        >
                          {option.label}
                        </option>
                      ))}
                    </optgroup>

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
                  Exclusive only to accepted students and instructors of your organization.
                </p>
              </div>
            ) : (
              <div className="flex flex-col justify-center rounded-2xl border border-[#0078d4]/20 bg-[#0078d4]/5 dark:bg-[#0078d4]/10 p-3.5">
                <p className="text-xs font-bold text-[#0078d4] dark:text-[#04a4ec] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  Open Access + Waiting Room
                </p>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Anyone can join without belonging to your organization. All participants enter the Waiting Room until you accept them.
                </p>
              </div>
            )}
          </div>

          {/* Event Mode & Assigned Facilitator (Instructor) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="event-mode"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Delivery Mode
              </label>
              <div className="relative">
                <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="event-mode"
                  value={form.mode}
                  onChange={(e) => setField("mode", e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[#0078d4] bg-white dark:bg-slate-800/70 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 transition"
                >
                  <option value="online">Online Live (Interactive Classroom)</option>
                  <option value="onsite">Campus Onsite (Physical Lecture Hall)</option>
                  <option value="allevent">Hybrid / General Symposium</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="event-facilitator"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Session Facilitator (Instructor)
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="event-facilitator"
                  type="text"
                  list="instructors-datalist"
                  value={form.facilitatorName}
                  onChange={(e) => setField("facilitatorName", e.target.value)}
                  placeholder="e.g. Dr. Adaora Eze (or select instructor)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[#0078d4] bg-white dark:bg-slate-800/70 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 transition"
                />
                <datalist id="instructors-datalist">
                  {instructorsList.map((inst) => (
                    <option key={inst.id} value={inst.name}>
                      {inst.name} {inst.email ? `(${inst.email})` : ""}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Link */}
          <Field
            label="External Meeting Link (Optional)"
            htmlFor="event-link"
            icon={Link2}
            error={errors.link}
            hint="Leave empty to use the built-in Backpack live room with Waiting Room control."
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
              {effectiveEventType === "go_live"
                ? "This Go Live event will be saved to the backend and visible on both the Home and Events pages. Anyone can request to join, and they will wait in the Waiting Room until you accept them or accept everyone."
                : "This Private event is saved securely to the backend and exclusive to accepted students and instructors of your organization."}
            </p>
          </div>
        </form>

        {/* ---------------- Footer ---------------- */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="event-creation-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-sm font-bold transition shadow-sm cursor-pointer"
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
                : effectiveEventType === "go_live"
                  ? "Publish Go Live Event"
                  : "Create Private Event"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCreation;

