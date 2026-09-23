import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Globe,
  Info,
  Lock,
  CheckCircle2,
  LogIn,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useEventContext } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
import { EventCreation } from "../components/EventCreation";
import { EventDetailsModel } from "../components/EventDetailsModel";
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
/* Helpers                                                       */
/* ============================================================= */

type EventFilter = "all" | "online" | "onsite";

/** Split an ISO date into a short day + month for the date block. */
const formatDateParts = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return { day: "--", month: "---" };
  return {
    day: parsed.toLocaleDateString(undefined, { day: "2-digit" }),
    month: parsed
      .toLocaleDateString(undefined, { month: "short" })
      .toUpperCase(),
  };
};

const isToday = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toDateString() === new Date().toDateString();
};

/* ============================================================= */
/* Component                                                     */
/* ============================================================= */

const Events: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { myCourseIds, myCourseTypes, myCourses } = useMyCourses();
  const {
    events,
    markAttendance,
    removeAttendance,
    isAttending,
    getAttendanceCount,
    deleteEvent,
  } = useEventContext();

  const [filter, setFilter] = useState<EventFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<AppEvent | null>(null);

  const isOrganization = currentUser?.role === "organization";

  /**
   * Course events are limited to that course's students, level events to
   * students at that level, and general events are open to any signed-in user.
   */
  const canJoin = (event: AppEvent) =>
    Boolean(currentUser) && canJoinEvent(event, myCourseIds, myCourseTypes);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
      ),
    [events],
  );

  /* Filter tabs work off the event's mode: All / Online / Onsite. */
  const visibleEvents = useMemo(() => {
    if (filter === "all") return sortedEvents;
    return sortedEvents.filter(
      (event) => normaliseEventMode(event.mode) === filter,
    );
  }, [filter, sortedEvents]);

  const handleJoinToggle = (event: AppEvent) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!canJoin(event)) return;

    if (isAttending(event.id, currentUser.id)) {
      removeAttendance(event.id, currentUser.id);
    } else {
      /* Store the course the person is enrolled in for this event. */
      const enrolledCourse = resolveEnrolledCourse(event, myCourses);

      markAttendance(event.id, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        courseId: enrolledCourse?.id,
        courseTitle: enrolledCourse?.title,
      });
    }
  };

  /* Organizations can remove their events. */
  const handleDeleteEvent = (event: AppEvent) => {
    const confirmed = window.confirm(
      `Delete "${event.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    deleteEvent(event.id);
  };

  return (
    <div className="pb-12">
      {/* ========================================== */}
      {/* HERO */}
      {/* ========================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <CalendarDays className="w-4 h-4" />
            Events
          </span>

          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Events &amp; Live Sessions
          </h1>

          <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
            Live classes, orientations, workshops, and institutional events.
            Anyone can browse — sign in to join an event and mark your
            attendance.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Browse freely — no account needed
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              {currentUser
                ? `${myCourseIds.length} of your courses`
                : "Sign in to join events"}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* TOOLBAR: Filter + Create (organizations)   */}
      {/* ========================================== */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filter chips */}
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
          {[
            { key: "all" as const, label: "All Events" },
            { key: "online" as const, label: "Online" },
            { key: "onsite" as const, label: "Onsite" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create button — organizations only */}
        {isOrganization && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>

      {/* ========================================== */}
      {/* EVENTS GRID                                */}
      {/* ========================================== */}
      {visibleEvents.length === 0 ? (
        <div className="mt-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 py-16 px-6">
          <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            {filter === "all"
              ? "No events in this view yet"
              : `No ${EVENT_MODE_LABELS[filter]} events right now`}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {filter === "all"
              ? "Try again later, or check back soon for scheduled sessions."
              : 'Switch to "All Events" to see everything happening on Backpack.'}
          </p>

          {!currentUser && (
            <button
              onClick={() => navigate("/login")}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </button>
          )}

          {isOrganization && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Create the first event
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleEvents.map((evt) => (
            <article
              key={evt.id}
              className="group bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Top accent strip */}
              <div className="h-1.5 bg-linear-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-60" />

              <div className="p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  {/* Date block */}
                  <div className="shrink-0 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-center py-3">
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                      {formatDateParts(evt.date).day}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400/80">
                      {formatDateParts(evt.date).month}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                          EVENT_MODE_BADGE_STYLES[normaliseEventMode(evt.mode)]
                        }`}
                      >
                        {isToday(evt.date) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {EVENT_MODE_LABELS[normaliseEventMode(evt.mode)]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {isToday(evt.date) ? "Today" : "Upcoming"}
                        </span>

                        {/* Edit / Delete — organizations only */}
                        {isOrganization && (
                          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => setEditingEvent(evt)}
                              title="Edit event"
                              aria-label="Edit event"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt)}
                              title="Delete event"
                              aria-label="Delete event"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {evt.title}
                    </h3>

                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      <GraduationCap className="w-3 h-3" />
                      {evt.courseTitle ||
                        `${courseTypeLabel(evt.courseType)} students`}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {evt.subject}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {evt.description || evt.subject}
                </p>

                {/* Meta */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {getAttendanceCount(evt.id)} attending
                  </span>
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.createdBy?.name || "Organization"}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-3">
                  {!currentUser ? (
                    <button
                      onClick={() => navigate("/login")}
                      className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign in to join
                    </button>
                  ) : !canJoin(evt) ? (
                    <button
                      disabled
                      title={`Only students enrolled in ${
                        evt.courseTitle || "this course"
                      } can join`}
                      className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-semibold cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      Enrolled students only
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinToggle(evt)}
                      className={`inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
                        isAttending(evt.id, currentUser.id)
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {isAttending(evt.id, currentUser.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Attending — leave
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4" />
                          Join Event
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setDetailsEvent(evt)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                  >
                    Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Status hints */}
                {currentUser && !canJoin(evt) && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <Lock className="w-3 h-3" />
                    Only students {eventAudienceLabel(evt)} can join
                  </p>
                )}
                {currentUser &&
                  canJoin(evt) &&
                  isAttending(evt.id, currentUser.id) && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      You're attending this event
                    </p>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* HOW IT WORKS                              */}
      {/* ========================================== */}
      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 p-5 text-sky-700 dark:text-sky-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold">How joining works</p>
          <p className="text-sm leading-relaxed">
            Anyone can browse events. You must be signed in to join, and
            course-linked events can only be joined by students enrolled in that
            course. Events are created by organizations.
          </p>
        </div>
      </div>

      {/* Create Event modal — organizations only */}
      {showCreate && isOrganization && (
        <EventCreation onClose={() => setShowCreate(false)} />
      )}

      {/* Edit Event modal — organizations only */}
      {editingEvent && isOrganization && (
        <EventCreation
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Event details modal — resolves its own eligibility */}
      {detailsEvent && (
        <EventDetailsModel
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
        />
      )}
    </div>
  );
};

export default Events;
