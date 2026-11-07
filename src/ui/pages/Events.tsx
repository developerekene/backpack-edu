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
  Search,
  X,
  Building2,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useEventContext } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
import { EventCreation } from "../components/EventCreation";
import { EventDetailsModel } from "../components/EventDetailsModel";
import { CustomAlert } from "../components/CustomAlert";
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
/* Helpers & Types                                               */
/* ============================================================= */

type EventFilter = "all" | "online" | "onsite" | "attending";

/** Split an ISO date into formatted parts for the calendar card */
const formatDateParts = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { day: "--", month: "---", weekday: "---", full: "--" };
  }
  return {
    day: parsed.toLocaleDateString(undefined, { day: "2-digit" }),
    month: parsed
      .toLocaleDateString(undefined, { month: "short" })
      .toUpperCase(),
    weekday: parsed.toLocaleDateString(undefined, { weekday: "short" }),
    full: parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
};

const isToday = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toDateString() === new Date().toDateString();
};

const isTomorrow = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return parsed.toDateString() === tomorrow.toDateString();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<AppEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<AppEvent | null>(null);

  const isOrganization =
    currentUser?.role === "organization" ||
    currentUser?.role === "super_admin" ||
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com";

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

  /* Statistics calculation */
  const stats = useMemo(() => {
    let onlineCount = 0;
    let onsiteCount = 0;
    let myAttendingCount = 0;

    for (const evt of events) {
      const mode = normaliseEventMode(evt.mode);
      if (mode === "online") onlineCount++;
      else if (mode === "onsite") onsiteCount++;

      if (currentUser && isAttending(evt.id, currentUser.id)) {
        myAttendingCount++;
      }
    }

    return {
      total: events.length,
      online: onlineCount,
      onsite: onsiteCount,
      attending: myAttendingCount,
    };
  }, [events, currentUser, isAttending]);

  /* Filter and search pipeline */
  const visibleEvents = useMemo(() => {
    let list = sortedEvents;

    // Filter tab
    if (filter === "online") {
      list = list.filter((e) => normaliseEventMode(e.mode) === "online");
    } else if (filter === "onsite") {
      list = list.filter((e) => normaliseEventMode(e.mode) === "onsite");
    } else if (filter === "attending" && currentUser) {
      list = list.filter((e) => isAttending(e.id, currentUser.id));
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        return (
          e.title.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          e.location.toLowerCase().includes(q) ||
          (e.courseTitle && e.courseTitle.toLowerCase().includes(q)) ||
          (e.createdBy?.name && e.createdBy.name.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [filter, sortedEvents, searchQuery, currentUser, isAttending]);

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

  /* Organizations can remove their events */
  const handleDeleteEvent = (event: AppEvent) => {
    setEventToDelete(event);
  };

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 flex flex-col pb-16">
      {/* ======================================================== */}
      {/* 1. HERO SECTION (Fluent Brand Palette & Ambient Glow)     */}
      {/* ======================================================== */}
      <section className="relative w-full overflow-hidden rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-gradient-to-b from-[#f0f7fd]/95 via-white to-white dark:from-[#0f2231]/40 dark:via-[#0e1e2c] dark:to-[#0a1824] px-6 py-10 sm:px-10 sm:py-14 shadow-xs">
        {/* Ambient luminous glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-[#d6e9f8]/70 via-[#0078d4]/10 to-transparent dark:from-[#0078d4]/20 dark:via-[#0f2231]/30 dark:to-transparent rounded-full blur-3xl opacity-80" />
        </div>

        <div className="relative max-w-3xl">
          {/* Eyebrow badge */}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0078d4]/10 dark:bg-[#0078d4]/20 border border-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] text-xs font-bold font-heading uppercase tracking-wider">
            <CalendarDays className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
            Academic Schedules &amp; Live Classrooms
          </span>

          {/* Heading */}
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Events, Workshops &amp;
            <span className="block text-[#0078d4] dark:text-[#04a4ec] mt-1 sm:mt-2">
              Live Interactive Sessions.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-body">
            Attend live HD video lectures, campus workshops, and academic orientations across African institutions.
            Anyone can explore — sign in to reserve your seat and record verified attendance.
          </p>

          {/* Stat Pills */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec]" />
              <span>
                <strong className="font-bold text-slate-900 dark:text-white">{stats.total}</strong> Total {stats.total === 1 ? "Session" : "Sessions"}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Video className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>
                <strong className="font-bold text-slate-900 dark:text-white">{stats.online}</strong> Online Live
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong className="font-bold text-slate-900 dark:text-white">{stats.onsite}</strong> Campus Onsite
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {currentUser
                  ? `${myCourseIds.length} enrolled ${myCourseIds.length === 1 ? "course" : "courses"}`
                  : "Open access schedule"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. TOOLBAR: Search + Filter Tabs + Create Button          */}
      {/* ======================================================== */}
      <div className="mt-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by session title, subject, host, or venue..."
            className="w-full rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Filter tabs & Create button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter chips container */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              All Events ({events.length})
            </button>

            <button
              onClick={() => setFilter("online")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                filter === "online"
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              <Video className="w-3 h-3" />
              Online ({stats.online})
            </button>

            <button
              onClick={() => setFilter("onsite")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                filter === "onsite"
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              <MapPin className="w-3 h-3" />
              Onsite ({stats.onsite})
            </button>

            {currentUser && (
              <button
                onClick={() => setFilter("attending")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                  filter === "attending"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                }`}
              >
                <Check className="w-3 h-3" />
                My Schedule ({stats.attending})
              </button>
            )}
          </div>

          {/* Create Event — organizations and super admins only */}
          {isOrganization && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs hover:shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. EVENTS GRID & CARDS                                    */}
      {/* ======================================================== */}
      {visibleEvents.length === 0 ? (
        <div className="mt-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#d6e9f8]/60 dark:bg-[#0f2231] border border-[#0078d4]/20 flex items-center justify-center mx-auto text-[#0078d4] dark:text-[#04a4ec]">
            <CalendarDays className="w-8 h-8" />
          </div>

          <h3 className="mt-4 text-xl font-bold font-heading text-slate-900 dark:text-white">
            {searchQuery
              ? `No sessions found matching "${searchQuery}"`
              : filter === "attending"
              ? "You haven't registered for any events yet"
              : filter === "all"
              ? "No events scheduled right now"
              : `No ${EVENT_MODE_LABELS[filter]} sessions right now`}
          </h3>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-body">
            {searchQuery
              ? "Check your spelling or try clearing the search bar to view all scheduled events."
              : filter === "attending"
              ? "Browse the catalog below and click 'Join Session' to save events to your personalized schedule."
              : "Check back soon for new lectures, workshops, and institutional orientations."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold font-heading text-slate-700 dark:text-slate-200 hover:border-[#0078d4] hover:text-[#0078d4] transition cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}

            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
              >
                Show All Events
              </button>
            )}

            {!currentUser && (
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold font-heading transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Join
              </button>
            )}

            {isOrganization && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Schedule New Event
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {visibleEvents.map((evt) => {
            const mode = normaliseEventMode(evt.mode);
            const dateParts = formatDateParts(evt.date);
            const isEventToday = isToday(evt.date);
            const isEventTomorrow = isTomorrow(evt.date);
            const attending = currentUser && isAttending(evt.id, currentUser.id);
            const userCanJoin = canJoin(evt);
            const attendanceCount = getAttendanceCount(evt.id);

            // Dynamic top accent border
            const accentGradient =
              mode === "online"
                ? "from-[#0078d4] via-[#04a4ec] to-[#0078d4]"
                : mode === "onsite"
                ? "from-emerald-500 via-teal-400 to-emerald-500"
                : "from-sky-500 via-[#0078d4] to-cyan-400";

            // Target course/level label
            const targetAudience =
              evt.courseTitle ||
              (evt.courseType
                ? `${courseTypeLabel(evt.courseType)} students`
                : "Open to All Students");

            return (
              <article
                key={evt.id}
                className="group relative bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-700/70 hover:border-[#0078d4] dark:hover:border-[#04a4ec] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Mode accent strip */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${accentGradient} opacity-90`} />

                <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between gap-5">
                  {/* Card Header: Mode badge + Live/Upcoming pill + Actions */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event Mode Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold font-heading uppercase tracking-wider ${EVENT_MODE_BADGE_STYLES[mode]}`}
                        >
                          {mode === "online" ? (
                            <Video className="w-3 h-3" />
                          ) : mode === "onsite" ? (
                            <MapPin className="w-3 h-3" />
                          ) : (
                            <Globe className="w-3 h-3" />
                          )}
                          {EVENT_MODE_LABELS[mode]}
                        </span>

                        {/* Status badge: Today / Tomorrow / Upcoming */}
                        {isEventToday ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold font-heading uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Today
                          </span>
                        ) : isEventTomorrow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900/60 text-[#0078d4] dark:text-[#04a4ec] text-[10px] font-bold font-heading uppercase tracking-wider">
                            Tomorrow
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600/60 text-slate-600 dark:text-slate-300 text-[10px] font-bold font-heading uppercase tracking-wider">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Right Header: Attending status or Admin edit/delete */}
                      <div className="flex items-center gap-1.5">
                        {attending && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-heading">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Attending
                          </span>
                        )}

                        {isOrganization && (
                          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => setEditingEvent(evt)}
                              title="Edit Event"
                              aria-label="Edit Event"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt)}
                              title="Delete Event"
                              aria-label="Delete Event"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ticket Date Box + Event Title & Audience */}
                    <div className="mt-4 flex items-start gap-4">
                      {/* Ticket Calendar Badge */}
                      <div className="shrink-0 w-14 sm:w-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-center shadow-2xs group-hover:border-[#0078d4]/40 transition-colors">
                        <div className="bg-[#0078d4] text-white text-[10px] sm:text-[11px] font-heading font-extrabold uppercase tracking-wider py-0.5">
                          {dateParts.month}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/80 py-1 sm:py-1.5">
                          <p className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
                            {dateParts.day}
                          </p>
                          <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                            {dateParts.weekday}
                          </p>
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div className="flex-1 min-w-0">
                        {/* Course / Program Pill */}
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0078d4] dark:text-[#04a4ec] bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 px-2 py-0.5 rounded-md border border-[#0078d4]/20 dark:border-[#0078d4]/30 max-w-full truncate font-heading">
                            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{targetAudience}</span>
                          </span>
                        </div>

                        {/* Event Title */}
                        <h3
                          onClick={() => setDetailsEvent(evt)}
                          className="mt-1.5 text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition-colors line-clamp-2 leading-snug cursor-pointer"
                        >
                          {evt.title}
                        </h3>

                        {/* Subject */}
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate font-body">
                          {evt.subject}
                        </p>
                      </div>
                    </div>

                    {/* Event Description */}
                    <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-body leading-relaxed line-clamp-2">
                      {evt.description || evt.subject}
                    </p>
                  </div>

                  {/* Information Grid & Actions Area */}
                  <div className="space-y-4">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="inline-flex items-center gap-2 truncate">
                        <Clock className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                        <span className="truncate font-medium">{evt.time || "Scheduled"}</span>
                      </div>

                      <div className="inline-flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                        <span className="truncate font-medium">{evt.location}</span>
                      </div>

                      <div className="inline-flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                        <span className="truncate font-medium">{evt.createdBy?.name || "Verified Academy"}</span>
                      </div>

                      <div className="inline-flex items-center gap-2 truncate">
                        <Users className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                        <span className="truncate font-medium">
                          {attendanceCount} {attendanceCount === 1 ? "attending" : "attending"}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Instructor Facilitator Badge */}
                    {evt.facilitatorName && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-[#0078d4]/10 border border-blue-200/70 dark:border-[#0078d4]/30 text-xs text-slate-700 dark:text-slate-300 w-full">
                        <UserCheck className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                        <span className="truncate">
                          Facilitated by <strong className="font-semibold text-slate-900 dark:text-white">{evt.facilitatorName}</strong> (Instructor)
                        </span>
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2.5">
                      {/* Primary CTA */}
                      {!currentUser ? (
                        <button
                          onClick={() => navigate("/login")}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition-all shadow-xs hover:shadow-md cursor-pointer"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Sign In to Join</span>
                        </button>
                      ) : !userCanJoin ? (
                        <button
                          disabled
                          title={`Only students ${eventAudienceLabel(evt)} can join this event`}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-semibold font-heading cursor-not-allowed border border-slate-200 dark:border-slate-700"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Enrolled Only</span>
                        </button>
                      ) : attending ? (
                        <button
                          onClick={() => handleJoinToggle(evt)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Attending (Leave)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinToggle(evt)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition-all shadow-xs hover:shadow-md cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Session</span>
                        </button>
                      )}

                      {/* Secondary "Details" button */}
                      <button
                        onClick={() => setDetailsEvent(evt)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] dark:hover:border-[#04a4ec] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold font-heading hover:text-[#0078d4] dark:hover:text-[#04a4ec] bg-white dark:bg-slate-800 transition cursor-pointer shrink-0"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Eligibility notice hints */}
                    {currentUser && !userCanJoin && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span>Restricted to students enrolled in this curriculum.</span>
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. HOW IT WORKS / INSTITUTIONAL PORTAL GUIDE              */}
      {/* ======================================================== */}
      <section className="mt-14 rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-gradient-to-r from-[#f0f7fd]/80 via-white to-[#f0f7fd]/80 dark:from-[#0f2231]/40 dark:via-[#0e1e2c] dark:to-[#0f2231]/40 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-700/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0078d4]/10 dark:bg-[#0078d4]/20 border border-[#0078d4]/20 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white font-heading">
                How Academic Events Work on Backpack
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
                Integrated calendar, attendance telemetry, and verifiable digital participation.
              </p>
            </div>
          </div>

          {!currentUser && (
            <button
              onClick={() => navigate("/signup")}
              className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading rounded-xl transition shadow-xs cursor-pointer shrink-0"
            >
              Create Free Account
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-heading text-sm">
              <Globe className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
              <h4>Universal Public Browsing</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-body leading-relaxed">
              Anyone can view upcoming academic schedules, public workshops, and symposiums without an account.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-heading text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4>Verified Enrollment Gates</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-body leading-relaxed">
              Curriculum sessions verify student enrollment automatically, ensuring live class links remain exclusive to enrolled cohorts.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-heading text-sm">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h4>Attendance Telemetry</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-body leading-relaxed">
              Marking your attendance records participation directly onto your student transcript and institutional gradebook.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. MODALS & POPUPS                                        */}
      {/* ======================================================== */}

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

      {/* Event details modal */}
      {detailsEvent && (
        <EventDetailsModel
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {eventToDelete && (
        <CustomAlert
          isOpen={Boolean(eventToDelete)}
          title="Delete Event Permanently?"
          message={`Are you sure you want to delete "${eventToDelete.title}"? This cannot be undone.`}
          confirmText="Yes, Delete Event"
          cancelText="Cancel"
          type="danger"
          onConfirm={() => {
            deleteEvent(eventToDelete.id);
            setEventToDelete(null);
          }}
          onCancel={() => setEventToDelete(null)}
        />
      )}
    </div>
  );
};

export default Events;