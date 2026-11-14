import React, { useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { LiveKitCall } from "../components/LiveKitCall";
import {
  Copy,
  Check,
  ArrowLeft,
  ShieldOff,
  Globe,
  Lock,
  Hourglass,
  CheckCircle2,
  XCircle,
  Radio,
  Users,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext } from "../../store/EventContext";
import { normaliseEventType } from "../../lib/eventMeta";
import {
  canJoinEvent,
  getStoredGuestIdentity,
  isEventOrganizer,
  saveGuestIdentity,
  useMyCourses,
} from "../../lib/eventEligibility";

export const LiveRoomPage: React.FC = () => {
  const { roomName: paramRoomName } = useParams<{ roomName?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    organizations,
    orgMembers,
    enrollmentRequests,
    orgJoinRequests,
    courses,
  } = useAppContext();
  const { myCourseIds, myCourseTypes } = useMyCourses();
  const {
    events,
    requestJoinEvent,
    acceptWaitingRoomUser,
    acceptAllWaitingRoom,
    rejectWaitingRoomUser,
    getWaitingRoomStatus,
    getWaitingParticipants,
    isAttending,
  } = useEventContext();

  const queryName = searchParams.get("name") || "";
  const queryCourseId = searchParams.get("courseId") || undefined;

  // Resolved clean room name
  const effectiveRoomName = useMemo(() => {
    const raw =
      paramRoomName || searchParams.get("room") || "backpack-public-classroom";
    return (
      raw
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "backpack-public-classroom"
    );
  }, [paramRoomName, searchParams]);

  // Match any backend AppEvent bound to this room slug
  const matchedEvent = useMemo(
    () =>
      events.find(
        (e) =>
          (e.roomName && e.roomName.toLowerCase() === effectiveRoomName) ||
          `evt-${e.id}`.toLowerCase() === effectiveRoomName,
      ),
    [events, effectiveRoomName],
  );

  const [guestIdentity, setGuestIdentity] = useState(() =>
    getStoredGuestIdentity(),
  );
  const [guestNameInput, setGuestNameInput] = useState(
    queryName.trim() || guestIdentity?.name || "",
  );
  const [guestEmailInput, setGuestEmailInput] = useState(
    guestIdentity?.email || "",
  );
  const [isBusy, setIsBusy] = useState(false);

  // Display name for LiveKit call
  const participantName = useMemo(() => {
    if (currentUser?.name) return currentUser.name;
    if (guestIdentity?.name) return guestIdentity.name;
    if (queryName.trim()) return queryName.trim();
    return "Guest Participant";
  }, [currentUser?.name, guestIdentity?.name, queryName]);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [roomInput, setRoomInput] = useState<string>(effectiveRoomName);

  // Event security & waiting-room state
  const eventType = matchedEvent ? normaliseEventType(matchedEvent) : "go_live";
  const isOrganizer = matchedEvent
    ? isEventOrganizer(matchedEvent, currentUser, organizations)
    : false;
  const activeParticipantId = currentUser?.id || guestIdentity?.id;

  const canEnterPrivate = matchedEvent
    ? canJoinEvent(matchedEvent, myCourseIds, myCourseTypes, {
        currentUser,
        organizations,
        orgMembers,
        enrollmentRequests,
        orgJoinRequests,
        courses,
      })
    : true;

  const waitingStatus = matchedEvent
    ? getWaitingRoomStatus(matchedEvent.id, activeParticipantId)
    : null;
  const attending = matchedEvent && activeParticipantId
    ? isAttending(matchedEvent.id, activeParticipantId)
    : false;
  const waitingParticipants = matchedEvent
    ? getWaitingParticipants(matchedEvent.id)
    : [];

  const isAdmittedGoLive =
    !matchedEvent ||
    eventType !== "go_live" ||
    isOrganizer ||
    waitingStatus === "admitted" ||
    attending;

  // Full shareable direct join URL
  const shareableJoinUrl = useMemo(() => {
    if (typeof window === "undefined") return `/live/${effectiveRoomName}`;
    return `${window.location.origin}/live/${effectiveRoomName}`;
  }, [effectiveRoomName]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableJoinUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const cleaned = roomInput
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    navigate(`/live/${cleaned}`);
  };

  const handleEnterWaitingRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedEvent) return;

    if (currentUser) {
      setIsBusy(true);
      await requestJoinEvent(matchedEvent.id, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      });
      setIsBusy(false);
      return;
    }

    const cleanName = guestNameInput.trim();
    if (!cleanName) return;
    const saved = saveGuestIdentity(cleanName, guestEmailInput);
    setGuestIdentity(saved);
    setIsBusy(true);
    await requestJoinEvent(matchedEvent.id, {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: "guest",
    });
    setIsBusy(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to={matchedEvent ? "/events" : "/courses"}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
            title={matchedEvent ? "Back to Events" : "Back to Catalog"}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {matchedEvent ? matchedEvent.title : "Live Class:"}{" "}
                {!matchedEvent && (
                  <span className="font-mono text-[#0078d4] dark:text-[#04a4ec]">
                    {effectiveRoomName}
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap gap-y-1">
              {matchedEvent && eventType === "private" ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Private Organization Event
                </span>
              ) : (
                <span className="inline-flex items-center text-[#0078d4] dark:text-[#04a4ec] font-semibold">
                  <ShieldOff className="w-3.5 h-3.5 mr-1" />
                  {matchedEvent
                    ? "Go Live Event · Organizer Waiting Room"
                    : "Open Guest Access"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Share URL Actions */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={shareableJoinUrl}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono rounded-xl pl-3 pr-20 py-2 text-slate-600 dark:text-slate-300 w-52 sm:w-64 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="absolute right-1 px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              {copiedUrl ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedUrl ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          <form
            onSubmit={handleSwitchRoom}
            className="hidden lg:flex items-center space-x-1"
          >
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Switch room..."
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-900 dark:text-white w-32 focus:outline-none focus:border-[#0078d4]"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Organizer Live Waiting Room Strip (shows above call so host can admit live) */}
      {matchedEvent &&
        isOrganizer &&
        eventType === "go_live" &&
        waitingParticipants.length > 0 && (
          <div className="bg-[#f0f7fd] dark:bg-[#132838] border border-[#0078d4]/30 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {waitingParticipants.length}{" "}
                  {waitingParticipants.length === 1
                    ? "participant is"
                    : "participants are"}{" "}
                  waiting to enter
                </span>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setIsBusy(true);
                  await acceptAllWaitingRoom(matchedEvent.id);
                  setIsBusy(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accept Everyone ({waitingParticipants.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {waitingParticipants.map((wp) => (
                <div
                  key={wp.userId}
                  className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {wp.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {wp.role === "guest" ? "Guest" : wp.role || "Member"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        acceptWaitingRoomUser(matchedEvent.id, wp.userId)
                      }
                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        rejectWaitingRoomUser(matchedEvent.id, wp.userId)
                      }
                      className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Main Content: Private Gate OR Go Live Waiting Room Gate OR Video Viewport */}
      {matchedEvent && eventType === "private" && !canEnterPrivate ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Private Organization Event
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            This event is exclusive only to accepted students and instructors of{" "}
            <strong>{matchedEvent.orgName || matchedEvent.createdBy?.name || "the hosting organization"}</strong>.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            {!currentUser && (
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-bold transition"
              >
                Sign In to Verify Membership
              </Link>
            )}
            <Link
              to="/events"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Back to Events
            </Link>
          </div>
        </div>
      ) : matchedEvent && !isAdmittedGoLive ? (
        <div className="rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-white dark:bg-slate-800/80 p-8 sm:p-10 text-center max-w-xl mx-auto space-y-5 shadow-xs">
          {waitingStatus === "rejected" ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                Entry Request Declined
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                The event organizer did not admit your request for this session.
              </p>
            </>
          ) : waitingStatus === "waiting" ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Hourglass className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                You Are in the Waiting Room
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Please stay on this screen. You will enter{" "}
                <strong>{matchedEvent.title}</strong> automatically as soon as
                the organizer accepts you or accepts everyone.
              </p>
            </>
          ) : (
            <form onSubmit={handleEnterWaitingRoom} className="space-y-4 text-left">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#0078d4]/10 border border-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center mx-auto">
                  <Radio className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                  Enter Go Live Waiting Room
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Anyone can join this session. Submit your request below to enter the organizer's waiting room.
                </p>
              </div>

              {!currentUser && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestNameInput}
                      onChange={(e) => setGuestNameInput(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={guestEmailInput}
                      onChange={(e) => setGuestEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-sm font-bold transition cursor-pointer"
              >
                {isBusy ? "Joining Waiting Room..." : "Join Waiting Room"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="w-full">
          <LiveKitCall
            roomName={effectiveRoomName}
            participantName={participantName}
            userRole={currentUser?.role || "student"}
            courseId={matchedEvent?.courseId || queryCourseId}
            onClose={() => navigate(matchedEvent ? "/events" : "/courses")}
          />
        </div>
      )}

      {/* Direct Access Strip */}
      <div className="p-4 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-[#0078d4] shrink-0" />
          <span>
            <strong>Direct Room URL:</strong> Share this session link with invited participants.
          </span>
        </div>
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <span className="font-mono text-[11px] text-slate-500">
            Room: {effectiveRoomName}
          </span>
          <button
            onClick={handleCopyLink}
            className="text-[#0078d4] dark:text-[#04a4ec] hover:underline font-bold cursor-pointer"
          >
            {copiedUrl ? "Link Copied!" : "Copy Full Invitation Link"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRoomPage;

