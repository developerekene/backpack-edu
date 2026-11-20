import React, { useEffect, useMemo, useState } from "react";
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
  UserCheck,
  Radio,
  Shield,
  Hourglass,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
import { EventCreation } from "../components/EventCreation";
import { EventDetailsModel } from "../components/EventDetailsModel";
import { CustomAlert } from "../components/CustomAlert";
import { Pagination } from "../components/Pagination";
import {
  courseTypeLabel,
  EVENT_FORMAT_LABELS,
  EVENT_MODE_BADGE_STYLES,
  EVENT_MODE_LABELS,
  normaliseEventFormat,
  normaliseEventMode,
  normaliseEventType,
} from "../../lib/eventMeta";
import {
  canJoinEvent,
  eventAudienceLabel,
  getStoredGuestIdentity,
  isEventOrganizer,
  resolveEnrolledCourse,
  useMyCourses,
} from "../../lib/eventEligibility";
import {
  getEventApprovalStatus,
  isEventApproved,
  isSuperAdminUser,
} from "../../lib/approval";
import Footer from "../components/Footer";

/* ============================================================= */
/* Helpers & Types                                               */
/* ============================================================= */

type EventFilter =
  | "all"
  | "go_live"
  | "private"
  | "online"
  | "onsite"
  | "attending";

const EVENTS_PER_PAGE = 10;

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
  const {
    organizations,
    orgMembers,
    enrollmentRequests,
    orgJoinRequests,
    courses,
    refreshData,
  } = useAppContext();
  const { myCourseIds, myCourseTypes, myCourses } = useMyCourses();
  const {
    events,
    markAttendance,
    removeAttendance,
    isAttending,
    getAttendanceCount,
    deleteEvent,
    requestJoinEvent,
    getWaitingRoomStatus,
    getWaitingParticipants,
  } = useEventContext();

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const [filter, setFilter] = useState<EventFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const eventsFilterKey = `${filter}::${searchQuery}`;
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: eventsFilterKey,
    page: 1,
  });
  const currentPage = pageState.key === eventsFilterKey ? pageState.page : 1;
  const setCurrentPage = (page: number) =>
    setPageState({ key: eventsFilterKey, page });
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<AppEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<AppEvent | null>(null);

  const isOrganization =
    currentUser?.role === "organization" ||
    currentUser?.role === "super_admin" ||
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com";

  const isInstructor = currentUser?.role === "instructor" && !isOrganization;
  const canCreateEvent = isOrganization || isInstructor;

  const guestIdentity = getStoredGuestIdentity();
  const activeParticipantId = currentUser?.id || guestIdentity?.id;

  const canJoin = (event: AppEvent) =>
    canJoinEvent(event, myCourseIds, myCourseTypes, {
      currentUser,
      organizations,
      orgMembers,
      enrollmentRequests,
      orgJoinRequests,
      courses,
    });

  const isSuperAdmin = isSuperAdminUser(currentUser);

  const visiblePlatformEvents = useMemo(
    () =>
      events.filter(
        (evt) =>
          isEventApproved(evt) ||
          isSuperAdmin ||
          isEventOrganizer(evt, currentUser, organizations),
      ),
    [events, isSuperAdmin, currentUser, organizations],
  );

  const sortedEvents = useMemo(
    () =>
      [...visiblePlatformEvents].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
      ),
    [visiblePlatformEvents],
  );

  /* Statistics calculation */
  const stats = useMemo(() => {
    let goLiveCount = 0;
    let privateCount = 0;
    let onlineCount = 0;
    let onsiteCount = 0;
    let myAttendingCount = 0;

    for (const evt of visiblePlatformEvents) {
      const eventType = normaliseEventType(evt);
      if (eventType === "go_live") goLiveCount++;
      else privateCount++;

      const mode = normaliseEventMode(evt.mode);
      if (mode === "online") onlineCount++;
      else if (mode === "onsite") onsiteCount++;

      if (activeParticipantId && isAttending(evt.id, activeParticipantId)) {
        myAttendingCount++;
      }
    }

    return {
      total: visiblePlatformEvents.length,
      goLive: goLiveCount,
      privateEvents: privateCount,
      online: onlineCount,
      onsite: onsiteCount,
      attending: myAttendingCount,
    };
  }, [visiblePlatformEvents, activeParticipantId, isAttending]);

  /* Filter and search pipeline */
  const visibleEvents = useMemo(() => {
    let list = sortedEvents;

    if (filter === "go_live") {
      list = list.filter((e) => normaliseEventType(e) === "go_live");
    } else if (filter === "private") {
      list = list.filter((e) => normaliseEventType(e) === "private");
    } else if (filter === "online") {
      list = list.filter((e) => normaliseEventMode(e.mode) === "online");
    } else if (filter === "onsite") {
      list = list.filter((e) => normaliseEventMode(e.mode) === "onsite");
    } else if (filter === "attending" && activeParticipantId) {
      list = list.filter((e) => isAttending(e.id, activeParticipantId));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        return (
          e.title.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          e.location.toLowerCase().includes(q) ||
          (e.orgName && e.orgName.toLowerCase().includes(q)) ||
          (e.courseTitle && e.courseTitle.toLowerCase().includes(q)) ||
          (e.createdBy?.name && e.createdBy.name.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [filter, sortedEvents, searchQuery, activeParticipantId, isAttending]);

  const totalPages = Math.max(1, Math.ceil(visibleEvents.length / EVENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEvents = useMemo(
    () =>
      visibleEvents.slice(
        (safePage - 1) * EVENTS_PER_PAGE,
        safePage * EVENTS_PER_PAGE,
      ),
    [visibleEvents, safePage],
  );

  const handlePrimaryAction = async (event: AppEvent) => {
    const organizer = isEventOrganizer(event, currentUser, organizations);
    if (organizer) {
      setDetailsEvent(event);
      return;
    }

    const eventType = normaliseEventType(event);
    if (eventType === "go_live") {
      const status = getWaitingRoomStatus(event.id, activeParticipantId);
      const attending = activeParticipantId
        ? isAttending(event.id, activeParticipantId)
        : false;
      if (status || attending) {
        setDetailsEvent(event);
        return;
      }
      if (currentUser) {
        await requestJoinEvent(event.id, {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        });
      }
      setDetailsEvent(event);
      return;
    }

    // Private event flow
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!canJoin(event)) return;

    if (isAttending(event.id, currentUser.id)) {
      removeAttendance(event.id, currentUser.id);
    } else {
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

  const handleDeleteEvent = (event: AppEvent) => {
    setEventToDelete(event);
  };

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 flex flex-col pb-16">
      {/* ======================================================== */}
      {/* 1. HERO SECTION                                          */}
      {/* ======================================================== */}
      <section className="relative w-full overflow-hidden rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-gradient-to-b from-[#f0f7fd]/95 via-white to-white dark:from-[#0f2231]/40 dark:via-[#0e1e2c] dark:to-[#0a1824] px-6 py-10 sm:px-10 sm:py-14 shadow-xs">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-[#d6e9f8]/70 via-[#0078d4]/10 to-transparent dark:from-[#0078d4]/20 dark:via-[#0f2231]/30 dark:to-transparent rounded-full blur-3xl opacity-80" />
        </div>

        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0078d4]/10 dark:bg-[#0078d4]/20 border border-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] text-xs font-bold font-heading uppercase tracking-wider">
            <CalendarDays className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
            Academic Schedules &amp; Live Sessions
          </span>

          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Webinars, Summits &amp;
            <span className="block text-[#0078d4] dark:text-[#04a4ec] mt-1 sm:mt-2">
              Live Interactive Events.
            </span>
          </h1>

          <p className="mt-3.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-body">
            Join open Go Live workshops, summits, and webinars through our organizer-moderated Waiting Room, or attend private organization sessions reserved for accepted students and instructors.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec]" />
              <span>
                <strong className="font-bold text-slate-900 dark:text-white">{stats.total}</strong> Total {stats.total === 1 ? "Event" : "Events"}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Radio className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec]" />
              <span>
                <strong className="font-bold text-slate-900 dark:text-white">{stats.goLive}</strong> Go Live
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong className="font-bold text-slate-900 dark:text-white">{stats.privateEvents}</strong> Private
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-[#d6e9f8] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{stats.online} Online · {stats.onsite} Onsite</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. TOOLBAR: Search + Filter Tabs + Create Button          */}
      {/* ======================================================== */}
      <div className="mt-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, organization, or venue..."
            className="w-full rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              All ({events.length})
            </button>

            <button
              onClick={() => setFilter("go_live")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                filter === "go_live"
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              <Radio className="w-3 h-3" />
              Go Live ({stats.goLive})
            </button>

            <button
              onClick={() => setFilter("private")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
                filter === "private"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              <Shield className="w-3 h-3" />
              Private ({stats.privateEvents})
            </button>

            <button
              onClick={() => setFilter("online")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer ${
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

          {canCreateEvent && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs hover:shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isInstructor ? "Create Go Live Event" : "Create Event"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. EVENTS GRID & CARDS (10 per page)                     */}
      {/* ======================================================== */}
      {visibleEvents.length === 0 ? (
        <div className="mt-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#d6e9f8]/60 dark:bg-[#0f2231] border border-[#0078d4]/20 flex items-center justify-center mx-auto text-[#0078d4] dark:text-[#04a4ec]">
            <CalendarDays className="w-8 h-8" />
          </div>

          <h3 className="mt-4 text-xl font-bold font-heading text-slate-900 dark:text-white">
            {searchQuery
              ? `No events found matching "${searchQuery}"`
              : filter === "attending"
                ? "You haven't joined any events yet"
                : filter === "go_live"
                  ? "No Go Live events scheduled right now"
                  : filter === "private"
                    ? "No Private events scheduled right now"
                    : filter === "all"
                      ? "No events scheduled right now"
                      : `No ${EVENT_MODE_LABELS[filter]} sessions right now`}
          </h3>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-body">
            {searchQuery
              ? "Check your spelling or try clearing the search bar to view all scheduled events."
              : "Check back soon or explore other categories."}
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

            {canCreateEvent && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isInstructor ? "Create Go Live Event" : "Schedule New Event"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {paginatedEvents.map((evt) => {
              const mode = normaliseEventMode(evt.mode);
              const eventType = normaliseEventType(evt);
              const formatLabel =
                EVENT_FORMAT_LABELS[normaliseEventFormat(evt.category)];
              const dateParts = formatDateParts(evt.date);
              const isEventToday = isToday(evt.date);
              const isEventTomorrow = isTomorrow(evt.date);
              const organizer = isEventOrganizer(evt, currentUser, organizations);
              const attending = Boolean(
                activeParticipantId && isAttending(evt.id, activeParticipantId),
              );
              const waitingStatus = getWaitingRoomStatus(
                evt.id,
                activeParticipantId,
              );
              const waitingCount = getWaitingParticipants(evt.id).length;
              const userCanJoin = canJoin(evt);
              const attendanceCount = getAttendanceCount(evt.id);

              const accentGradient =
                eventType === "go_live"
                  ? "from-[#0078d4] via-[#04a4ec] to-[#0078d4]"
                  : "from-emerald-600 via-teal-500 to-emerald-600";

              const targetAudience =
                eventType === "go_live"
                  ? "Open to All (Waiting Room)"
                  : evt.courseTitle ||
                    (evt.courseType
                      ? `${courseTypeLabel(evt.courseType)} members`
                      : `Accepted ${evt.orgName || evt.createdBy?.name || "Org"} Members`);

              return (
                <article
                  key={evt.id}
                  className="group relative bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-700/70 hover:border-[#0078d4] dark:hover:border-[#04a4ec] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div
                    className={`h-1.5 w-full bg-gradient-to-r ${accentGradient} opacity-90`}
                  />

                  <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between gap-5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {eventType === "go_live" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#0078d4]/25 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-[10px] font-bold font-heading uppercase tracking-wider">
                              <Radio className="w-3 h-3" />
                              Go Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold font-heading uppercase tracking-wider">
                              <Shield className="w-3 h-3" />
                              Private
                            </span>
                          )}

                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                            {formatLabel}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold font-heading uppercase tracking-wider ${EVENT_MODE_BADGE_STYLES[mode]}`}
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

                          {isEventToday ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                              Today
                            </span>
                          ) : isEventTomorrow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900/60 text-[#0078d4] dark:text-[#04a4ec] text-[10px] font-bold uppercase tracking-wider">
                              Tomorrow
                            </span>
                          ) : null}

                          {!isEventApproved(evt) && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
                                getEventApprovalStatus(evt) === "rejected"
                                  ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                  : "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {getEventApprovalStatus(evt) === "rejected"
                                ? "Rejected"
                                : "Pending Approval"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {organizer && eventType === "go_live" && waitingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setDetailsEvent(evt)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold cursor-pointer"
                            >
                              <Hourglass className="w-3 h-3" />
                              {waitingCount} waiting
                            </button>
                          )}

                          {organizer && (
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

                      <div className="mt-4 flex items-start gap-4">
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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0078d4] dark:text-[#04a4ec] bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 px-2 py-0.5 rounded-md border border-[#0078d4]/20 dark:border-[#0078d4]/30 max-w-full truncate font-heading">
                              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{targetAudience}</span>
                            </span>
                          </div>

                          <h3
                            onClick={() => setDetailsEvent(evt)}
                            className="mt-1.5 text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition-colors line-clamp-2 leading-snug cursor-pointer"
                          >
                            {evt.title}
                          </h3>

                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate font-body">
                            {evt.subject}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-body leading-relaxed line-clamp-2">
                        {evt.description || evt.subject}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="inline-flex items-center gap-2 truncate">
                          <Clock className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                          <span className="truncate font-medium">
                            {evt.time || "Scheduled"}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                          <span className="truncate font-medium">{evt.location}</span>
                        </div>

                        <div className="inline-flex items-center gap-2 truncate">
                          <Building2 className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                          <span className="truncate font-medium">
                            {evt.orgName || evt.createdBy?.name || "Verified Academy"}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-2 truncate">
                          <Users className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                          <span className="truncate font-medium">
                            {attendanceCount} admitted / attending
                          </span>
                        </div>
                      </div>

                      {evt.facilitatorName && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-[#0078d4]/10 border border-blue-200/70 dark:border-[#0078d4]/30 text-xs text-slate-700 dark:text-slate-300 w-full">
                          <UserCheck className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                          <span className="truncate">
                            Facilitated by{" "}
                            <strong className="font-semibold text-slate-900 dark:text-white">
                              {evt.facilitatorName}
                            </strong>{" "}
                            (Instructor)
                          </span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2.5">
                        {!isEventApproved(evt) && !isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => setDetailsEvent(evt)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-semibold font-heading transition cursor-pointer"
                          >
                            <Hourglass className="w-4 h-4" />
                            <span>
                              {getEventApprovalStatus(evt) === "rejected"
                                ? "Declined by Super Admin"
                                : "Awaiting Super Admin Approval"}
                            </span>
                          </button>
                        ) : organizer ? (
                          <button
                            onClick={() => handlePrimaryAction(evt)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition-all shadow-xs cursor-pointer"
                          >
                            <Users className="w-4 h-4" />
                            <span>
                              {eventType === "go_live" && waitingCount > 0
                                ? `Review Waiting Room (${waitingCount})`
                                : "Host / Manage Event"}
                            </span>
                          </button>
                        ) : eventType === "go_live" ? (
                          waitingStatus === "admitted" || attending ? (
                            <button
                              onClick={() => setDetailsEvent(evt)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Accepted — Enter Event</span>
                            </button>
                          ) : waitingStatus === "waiting" ? (
                            <button
                              onClick={() => setDetailsEvent(evt)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-semibold font-heading transition cursor-pointer"
                            >
                              <Hourglass className="w-4 h-4" />
                              <span>In Waiting Room</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePrimaryAction(evt)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition-all shadow-xs hover:shadow-md cursor-pointer"
                            >
                              <Radio className="w-4 h-4" />
                              <span>Join Waiting Room</span>
                            </button>
                          )
                        ) : !currentUser ? (
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
                            title={`Restricted to ${eventAudienceLabel(evt)}`}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-semibold font-heading cursor-not-allowed border border-slate-200 dark:border-slate-700"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Org Members Only</span>
                          </button>
                        ) : attending ? (
                          <button
                            onClick={() => handlePrimaryAction(evt)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Attending (Leave)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePrimaryAction(evt)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition-all shadow-xs hover:shadow-md cursor-pointer"
                          >
                            <Video className="w-4 h-4" />
                            <span>Join Private Event</span>
                          </button>
                        )}

                        <button
                          onClick={() => setDetailsEvent(evt)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] dark:hover:border-[#04a4ec] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold font-heading hover:text-[#0078d4] dark:hover:text-[#04a4ec] bg-white dark:bg-slate-800 transition cursor-pointer shrink-0"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {eventType === "private" && currentUser && !userCanJoin && (
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>
                            Exclusive to accepted students and instructors of{" "}
                            {evt.orgName || evt.createdBy?.name || "this organization"}.
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            currentPage={safePage}
            totalItems={visibleEvents.length}
            pageSize={EVENTS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemLabel="events"
            className="mt-8"
          />
        </>
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
                Go Live &amp; Private Events
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
                Flexible event access with organizer waiting room controls and organization membership protection.
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
              <Radio className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
              <h4>Go Live Waiting Room</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-body leading-relaxed">
              Organizations and instructors can host open Go Live webinars, summits, and workshops. Anyone can join and wait in the Waiting Room until accepted.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-heading text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4>Private Org Sessions</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-body leading-relaxed">
              Organizations can create Private webinars, summits, and workshops exclusive only to their accepted students and instructors.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-heading text-sm">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h4>Instant Approval Controls</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-body leading-relaxed">
              Event organizers can admit Waiting Room participants one by one or admit everyone at once with a single click.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. MODALS & POPUPS                                        */}
      {/* ======================================================== */}
      {showCreate && canCreateEvent && (
        <EventCreation onClose={() => setShowCreate(false)} />
      )}

      {editingEvent && canCreateEvent && (
        <EventCreation
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {detailsEvent && (
        <EventDetailsModel
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
        />
      )}

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
      <Footer />
    </div>
  );
};

export default Events;