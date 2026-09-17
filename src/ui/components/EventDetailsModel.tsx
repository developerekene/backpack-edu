import React, { useEffect } from "react";
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Link2,
  Video,
  LogIn,
  Lock,
  CheckCircle2,
  ArrowRight,
  Building2,
  FileText,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useEventContext } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
import {
  courseTypeLabel,
  EVENT_MODE_BADGE_STYLES,
  EVENT_MODE_LABELS,
  normaliseEventMode,
} from "../../lib/eventMeta";
import {
  canJoinEvent,
  eventAudienceLabel,
  resolveEnrolledCourse,
  useMyCourses,
} from "../../lib/eventEligibility";

/* ============================================================= */
/* Props                                                         */
/* ============================================================= */

interface EventDetailsModelProps {
  event: AppEvent;
  onClose: () => void;
}

/* ============================================================= */
/* Helpers                                                       */
/* ============================================================= */

const isToday = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toDateString() === new Date().toDateString();
};

const formatLongDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date || "—";
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({
  icon: Icon,
  label,
  value,
  mono,
}) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4">
    <span className="shrink-0 w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
      <Icon className="w-4 h-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold text-slate-900 dark:text-white wrap-break-word ${
          mono ? "font-mono text-xs sm:text-[13px]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

/* ============================================================= */
/* Modal                                                         */
/* ============================================================= */

export const EventDetailsModel: React.FC<EventDetailsModelProps> = ({
  event,
  onClose,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { myCourseIds, myCourseTypes, myCourses } = useMyCourses();
  const { markAttendance, removeAttendance, isAttending, getAttendanceCount } =
    useEventContext();

  const mode = normaliseEventMode(event.mode);

  const isAuthenticated = Boolean(currentUser);

  /*
   * Eligibility is resolved here (not passed in): a specific course id, or a
   * course level looked up in COURSE_TYPE_OPTIONS, decides who can join.
   */
  const userCanJoin = canJoinEvent(event, myCourseIds, myCourseTypes);
  const attending = Boolean(
    currentUser && isAttending(event.id, currentUser.id),
  );
  const attendanceCount = getAttendanceCount(event.id);

  const audienceLabel = eventAudienceLabel(event);

  /* The course this user is enrolled in that grants access to the event. */
  const enrolledCourse = resolveEnrolledCourse(event, myCourses);

  /* ---- Actions ---- */
  const handleOpenLink = () => {
    if (!event.link) return;
    window.open(event.link, "_blank", "noopener,noreferrer");
  };

  const handleJoin = () => {
    if (!currentUser || !userCanJoin) return;

    if (!isAttending(event.id, currentUser.id)) {
      markAttendance(event.id, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        courseId: enrolledCourse?.id,
        courseTitle: enrolledCourse?.title,
      });
    }

    handleOpenLink();
  };

  const handleLeave = () => {
    if (!currentUser) return;
    removeAttendance(event.id, currentUser.id);
  };

  const handleRequestLogin = () => {
    onClose();
    navigate("/login");
  };

  const courseLabel =
    event.courseTitle ||
    (event.courseType
      ? `${courseTypeLabel(event.courseType)} students`
      : "General (open to everyone)");

  /* Close on Escape + lock background scroll while open. */
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

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
        <div className="flex justify-between items-start gap-4 p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${EVENT_MODE_BADGE_STYLES[mode]}`}
              >
                <Globe className="w-3 h-3" />
                {EVENT_MODE_LABELS[mode]}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {isToday(event.date) ? "Today" : "Upcoming"}
              </span>
            </div>

            <h3 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              {event.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {event.subject}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---------------- Body ---------------- */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Primary facts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow
              icon={CalendarDays}
              label="Date"
              value={formatLongDate(event.date)}
            />
            <DetailRow icon={Clock} label="Time" value={event.time || "—"} />
            <DetailRow
              icon={MapPin}
              label="Location"
              value={event.location || "—"}
            />
            <DetailRow
              icon={Globe}
              label="Mode"
              value={EVENT_MODE_LABELS[mode]}
            />
            <DetailRow
              icon={GraduationCap}
              label="Course"
              value={courseLabel}
            />
            <DetailRow
              icon={Users}
              label="Attendance"
              value={`${attendanceCount} attending`}
            />
            <DetailRow
              icon={Building2}
              label="Created by"
              value={event.createdBy?.name || "Organization"}
            />
            <DetailRow
              icon={Link2}
              label="Link"
              value={event.link || "No link provided for this event"}
              mono={Boolean(event.link)}
            />
          </div>

          {/* Description */}
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <FileText className="w-3.5 h-3.5" />
              About this event
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {event.description || event.subject}
            </p>
          </div>

          {/* Attendee note */}
          {attending && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="text-xs font-semibold">
                You're attending this event
                {enrolledCourse ? ` with ${enrolledCourse.title}` : ""}.
              </p>
            </div>
          )}
        </div>

        {/* ---------------- Footer ---------------- */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
          {isAuthenticated && !userCanJoin && (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              Only students {audienceLabel} can join. You can still browse the
              details.
            </p>
          )}

          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <button
                onClick={handleRequestLogin}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign in to join
              </button>
            ) : !userCanJoin ? (
              <button
                disabled
                title={`Only students ${audienceLabel} can join`}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-semibold cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                Enrolled students only
              </button>
            ) : attending && event.link ? (
              <button
                onClick={handleOpenLink}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm"
              >
                <Video className="w-4 h-4" />
                Open Event Link
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : attending ? (
              <button
                onClick={handleLeave}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Attending — leave
              </button>
            ) : (
              <button
                onClick={handleJoin}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm"
              >
                <Video className="w-4 h-4" />
                {event.link ? "Join & Open Link" : "Join Event"}
              </button>
            )}

            {attending && event.link && (
              <button
                onClick={handleLeave}
                className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Leave
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            {event.link
              ? "Joining marks your attendance and opens the event link."
              : "Joining marks your attendance for this event."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModel;
