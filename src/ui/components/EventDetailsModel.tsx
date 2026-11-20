import React, { useEffect, useState } from "react";
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
  UserCheck,
  Radio,
  Shield,
  Hourglass,
  Check,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext } from "../../store/EventContext";
import type { AppEvent } from "../../store/EventContext";
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
  saveGuestIdentity,
  useMyCourses,
} from "../../lib/eventEligibility";
import {
  getEventApprovalStatus,
  isEventApproved,
  isSuperAdminUser,
} from "../../lib/approval";

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
    <span className="shrink-0 w-9 h-9 rounded-xl bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 border border-[#0078d4]/20 dark:border-[#0078d4]/30 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec]">
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
  event: initialEvent,
  onClose,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    organizations,
    orgMembers,
    enrollmentRequests,
    orgJoinRequests,
    courses,
  } = useAppContext();
  const { myCourseIds, myCourseTypes, myCourses } = useMyCourses();
  const {
    events,
    markAttendance,
    removeAttendance,
    isAttending,
    getAttendanceCount,
    requestJoinEvent,
    leaveWaitingRoom,
    acceptWaitingRoomUser,
    acceptAllWaitingRoom,
    rejectWaitingRoomUser,
    getWaitingRoomStatus,
    getWaitingParticipants,
    approveEvent,
    rejectEvent,
    deleteEvent,
  } = useEventContext();

  // Read live snapshot of this event from context so waiting-room approvals update in real time
  const event = events.find((e) => e.id === initialEvent.id) || initialEvent;

  const mode = normaliseEventMode(event.mode);
  const eventType = normaliseEventType(event);
  const formatLabel = EVENT_FORMAT_LABELS[normaliseEventFormat(event.category)];
  const isAuthenticated = Boolean(currentUser);
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const isOrganizer = isEventOrganizer(event, currentUser, organizations);
  const eventApproved = isEventApproved(event);
  const approvalStatus = getEventApprovalStatus(event);

  const [guestIdentity, setGuestIdentity] = useState(() =>
    getStoredGuestIdentity(),
  );
  const [guestName, setGuestName] = useState(guestIdentity?.name || "");
  const [guestEmail, setGuestEmail] = useState(guestIdentity?.email || "");
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const activeParticipantId = currentUser?.id || guestIdentity?.id;

  const userCanJoin = canJoinEvent(event, myCourseIds, myCourseTypes, {
    currentUser,
    organizations,
    orgMembers,
    enrollmentRequests,
    orgJoinRequests,
    courses,
  });

  const attending = Boolean(
    activeParticipantId && isAttending(event.id, activeParticipantId),
  );
  const attendanceCount = getAttendanceCount(event.id);
  const waitingStatus = getWaitingRoomStatus(event.id, activeParticipantId);
  const waitingParticipants = getWaitingParticipants(event.id);
  const roomSlug = event.roomName || `evt-${event.id}`;

  const audienceLabel = eventAudienceLabel(event);
  const enrolledCourse = resolveEnrolledCourse(event, myCourses);

  /* ---- Actions ---- */
  const handleEnterLiveRoom = () => {
    const displayName =
      currentUser?.name || guestIdentity?.name || guestName.trim() || "Participant";
    onClose();
    navigate(
      `/live/${roomSlug}?name=${encodeURIComponent(displayName)}${
        event.courseId ? `&courseId=${encodeURIComponent(event.courseId)}` : ""
      }`,
    );
  };

  const handleJoinPrivateEvent = () => {
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

    if (!event.link && (mode === "online" || mode === "allevent")) {
      handleEnterLiveRoom();
    }
  };

  const handleJoinWaitingRoom = async () => {
    if (eventType !== "go_live") return;

    if (currentUser) {
      setIsBusy(true);
      await requestJoinEvent(event.id, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      });
      setIsBusy(false);
      return;
    }

    // Guest visitor
    if (!guestIdentity && !guestPromptOpen) {
      setGuestPromptOpen(true);
      return;
    }

    const finalName = (guestName || guestIdentity?.name || "").trim();
    if (!finalName) {
      setGuestPromptOpen(true);
      setGuestError("Please enter your name so the organizer can admit you.");
      return;
    }

    setGuestError("");
    const saved = saveGuestIdentity(
      finalName,
      guestEmail || guestIdentity?.email,
    );
    setGuestIdentity(saved);
    setGuestPromptOpen(false);
    setIsBusy(true);
    await requestJoinEvent(event.id, {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: "guest",
    });
    setIsBusy(false);
  };

  const handleLeave = async () => {
    if (!activeParticipantId) return;
    setIsBusy(true);
    if (eventType === "go_live") {
      await leaveWaitingRoom(event.id, activeParticipantId);
    } else {
      removeAttendance(event.id, activeParticipantId);
    }
    setIsBusy(false);
  };

  const handleRequestLogin = () => {
    onClose();
    navigate("/login");
  };

  const courseLabel =
    eventType === "go_live"
      ? "Open Access (Anyone can join via Waiting Room)"
      : event.courseTitle ||
        (event.courseType
          ? `${courseTypeLabel(event.courseType)} members`
          : `Accepted members of ${event.orgName || event.createdBy?.name || "Organization"}`);

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
              {eventType === "go_live" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-[#0078d4]/25 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-[10px] font-bold uppercase tracking-wider">
                  <Radio className="w-3 h-3" />
                  Go Live Event
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <Shield className="w-3 h-3" />
                  Private Event
                </span>
              )}

              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                {formatLabel}
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${EVENT_MODE_BADGE_STYLES[mode]}`}
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
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---------------- Body ---------------- */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!eventApproved && (
            <div
              className={`rounded-2xl border p-4 flex items-start gap-3 ${
                approvalStatus === "rejected"
                  ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
              }`}
            >
              <Hourglass className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">
                  {approvalStatus === "rejected"
                    ? "Declined by Super Admin"
                    : "Pending Super Admin Approval"}
                </p>
                <p className="mt-0.5 opacity-90">
                  {approvalStatus === "rejected"
                    ? event.rejectionReason ||
                      "This event has been declined and is hidden from platform users."
                    : "This event must be approved by a Super Admin before platform users can view or join it."}
                </p>
              </div>
            </div>
          )}

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
              label="Access & Format"
              value={`${eventType === "go_live" ? "Go Live" : "Private"} · ${formatLabel}`}
            />
            <DetailRow
              icon={GraduationCap}
              label="Eligibility"
              value={courseLabel}
            />
            <DetailRow
              icon={Users}
              label="Attendance"
              value={`${attendanceCount} admitted / attending`}
            />
            <DetailRow
              icon={Building2}
              label="Host / Organizer"
              value={event.orgName || event.createdBy?.name || "Organization"}
            />
            {event.facilitatorName && (
              <DetailRow
                icon={UserCheck}
                label="Facilitator (Instructor)"
                value={`${event.facilitatorName}${
                  event.facilitatorEmail ? ` (${event.facilitatorEmail})` : ""
                }`}
              />
            )}
            <DetailRow
              icon={Link2}
              label="Session Link"
              value={event.link || `Built-in Live Room (${roomSlug})`}
              mono
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

          {/* ---------------- ORGANIZER WAITING ROOM MODERATION ---------------- */}
          {isOrganizer && eventType === "go_live" && (
            <div className="rounded-2xl border border-[#0078d4]/25 bg-[#f0f7fd] dark:bg-[#132838] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Hourglass className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                    Waiting Room ({waitingParticipants.length} waiting)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Accept participants individually or admit everyone waiting into the event.
                  </p>
                </div>

                {waitingParticipants.length > 0 && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      await acceptAllWaitingRoom(event.id);
                      setIsBusy(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accept Everyone ({waitingParticipants.length})
                  </button>
                )}
              </div>

              {waitingParticipants.length === 0 ? (
                <div className="rounded-xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No participants currently waiting. When attendees join this Go Live event, they will appear here for approval.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {waitingParticipants.map((wp) => (
                    <div
                      key={wp.userId}
                      className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/70 rounded-xl px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {wp.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {wp.role === "guest" ? "Guest Visitor" : wp.role || "Member"}
                          {wp.email ? ` · ${wp.email}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setIsBusy(true);
                            await acceptWaitingRoomUser(event.id, wp.userId);
                            setIsBusy(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setIsBusy(true);
                            await rejectWaitingRoomUser(event.id, wp.userId);
                            setIsBusy(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold transition cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- PARTICIPANT STATUS BANNERS ---------------- */}
          {!isOrganizer && eventType === "go_live" && waitingStatus === "waiting" && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
              <Hourglass className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">
                  You are in the Waiting Room
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  Please stay on this page. As soon as the organizer accepts you (or accepts everyone), your live entry link will unlock automatically.
                </p>
              </div>
            </div>
          )}

          {!isOrganizer && eventType === "go_live" && waitingStatus === "rejected" && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-red-700 dark:text-red-300">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">
                Your request to join this session was declined by the organizer.
              </p>
            </div>
          )}

          {(attending || waitingStatus === "admitted") && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="text-xs font-semibold">
                {eventType === "go_live"
                  ? "You have been accepted into this Go Live event!"
                  : `You're attending this event${
                      enrolledCourse ? ` with ${enrolledCourse.title}` : ""
                    }.`}
              </p>
            </div>
          )}

          {/* Guest Quick Name Prompt (when not signed in and joining a Go Live event) */}
          {!currentUser && eventType === "go_live" && guestPromptOpen && !waitingStatus && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Enter your name to join the Waiting Room
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your full name *"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30"
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30"
                />
              </div>
              {guestError && (
                <p className="text-[11px] font-semibold text-red-500">{guestError}</p>
              )}
            </div>
          )}
        </div>

        {/* ---------------- Footer ---------------- */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
          {eventType === "private" && isAuthenticated && !userCanJoin && (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Private event: exclusive only to {audienceLabel}.
              </span>
            </p>
          )}

          {isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              {!eventApproved && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setIsBusy(true);
                    await approveEvent(event.id);
                    setIsBusy(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Event
                </button>
              )}
              {approvalStatus !== "rejected" && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setIsBusy(true);
                    await rejectEvent(event.id);
                    setIsBusy(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Decline Event
                </button>
              )}
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setIsBusy(true);
                  await deleteEvent(event.id);
                  setIsBusy(false);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer ml-auto"
              >
                Delete Event
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!eventApproved && !isSuperAdmin ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-semibold cursor-not-allowed"
              >
                <Hourglass className="w-4 h-4" />
                {approvalStatus === "rejected"
                  ? "Event Declined by Super Admin"
                  : "Waiting for Super Admin Approval"}
              </button>
            ) : isOrganizer ? (
              <>
                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open External Event Link
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnterLiveRoom}
                    className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition shadow-sm cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    Host Live Event Room
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : eventType === "go_live" ? (
              /* ---- GO LIVE PARTICIPANT FLOW (No org restriction; Waiting Room) ---- */
              waitingStatus === "admitted" || attending ? (
                <>
                  {event.link ? (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Enter Event Session
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnterLiveRoom}
                      className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      Enter Live Event
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleLeave}
                    className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Leave
                  </button>
                </>
              ) : waitingStatus === "waiting" ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleLeave}
                  className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-sm font-semibold transition cursor-pointer"
                >
                  <Hourglass className="w-4 h-4" />
                  Waiting for Organizer Acceptance (Leave Queue)
                </button>
              ) : waitingStatus === "rejected" ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-semibold cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  Request Declined
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleJoinWaitingRoom}
                  className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-sm font-semibold transition shadow-sm cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  {guestPromptOpen ? "Confirm & Enter Waiting Room" : "Join Waiting Room"}
                </button>
              )
            ) : !isAuthenticated ? (
              /* ---- PRIVATE EVENT: Must sign in ---- */
              <button
                type="button"
                onClick={handleRequestLogin}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Verify Organization Membership
              </button>
            ) : !userCanJoin ? (
              /* ---- PRIVATE EVENT: Exclusive to accepted org students & instructors ---- */
              <button
                type="button"
                disabled
                title={`Private event: ${audienceLabel}`}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-semibold cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                Accepted Organization Members Only
              </button>
            ) : attending ? (
              <>
                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Private Session Link
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnterLiveRoom}
                    className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition shadow-sm cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    Enter Private Event Room
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLeave}
                  className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Leave
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleJoinPrivateEvent}
                className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <Video className="w-4 h-4" />
                Join Private Event
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            {eventType === "go_live"
              ? "Go Live events are open to everyone. Participants wait in the Waiting Room until admitted by the organizer."
              : "Private events verify your accepted student or instructor membership with the hosting organization."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModel;

