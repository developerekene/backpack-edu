import React, { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { LiveKitCall } from "../components/LiveKitCall";
import {
  Copy,
  Check,
  ArrowLeft,
  Globe,
  Lock,
  Hourglass,
  CheckCircle2,
  XCircle,
  Radio,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  Share2,
  Volume2,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext } from "../../store/EventContext";
import { normaliseEventType } from "../../lib/eventMeta";
import {
  normalizeLiveRoomName,
  getShortSpeakerJoinUrl,
  getShortAttendeeJoinUrl,
} from "../../lib/liveClass";
import {
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
  } = useAppContext();
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
  const queryRole = searchParams.get("role") || "";
  const queryIsSpeaker =
    queryRole.toLowerCase() === "speaker" ||
    queryRole.toLowerCase() === "guest_speaker" ||
    searchParams.get("speaker") === "true" ||
    searchParams.get("speaker") === "1";

  // Resolved clean room name (normalized so all links for a course converge to the same room)
  const effectiveRoomName = useMemo(() => {
    const raw =
      paramRoomName || searchParams.get("room") || "backpack-public-classroom";
    return normalizeLiveRoomName(raw, queryCourseId);
  }, [paramRoomName, searchParams, queryCourseId]);

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

  // Google Meet-style Pre-join gate:
  // If not logged in, ask for name before entering call
  const [hasEnteredName, setHasEnteredName] = useState<boolean>(() =>
    Boolean(
      currentUser ||
      (guestIdentity &&
        guestIdentity.name &&
        guestIdentity.name.trim() !== "" &&
        guestIdentity.name !== "Guest Participant")
    )
  );

  const [guestNameInput, setGuestNameInput] = useState<string>(() =>
    queryName.trim() ||
    (guestIdentity?.name !== "Guest Participant" ? guestIdentity?.name || "" : "")
  );
  const [guestEmailInput, setGuestEmailInput] = useState<string>(
    guestIdentity?.email || ""
  );
  const [isGuestSpeaker, setIsGuestSpeaker] = useState<boolean>(() =>
    Boolean(
      queryIsSpeaker ||
      guestIdentity?.isGuestSpeaker ||
      guestIdentity?.role === "guest_speaker" ||
      guestIdentity?.role === "speaker"
    )
  );

  // Pre-join camera and mic preview state
  const [previewMicMuted, setPreviewMicMuted] = useState(false);
  const [previewCamOff, setPreviewCamOff] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // Spin up camera/mic preview for the Google Meet pre-join lobby
  useEffect(() => {
    if (!currentUser && !hasEnteredName) {
      let isSubscribed = true;
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (!isSubscribed) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          previewStreamRef.current = stream;
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
          setCameraPermissionError(false);
        })
        .catch((err) => {
          console.warn("Camera preview unavailable:", err);
          setCameraPermissionError(true);
        });

      return () => {
        isSubscribed = false;
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach((t) => t.stop());
          previewStreamRef.current = null;
        }
      };
    }
  }, [currentUser, hasEnteredName]);

  const togglePreviewMic = () => {
    setPreviewMicMuted((prev) => {
      const next = !prev;
      if (previewStreamRef.current) {
        previewStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const togglePreviewCam = () => {
    setPreviewCamOff((prev) => {
      const next = !prev;
      if (previewStreamRef.current) {
        previewStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const handlePreJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guestNameInput.trim();
    if (!clean) return;

    // Stop preview stream so LiveKit WebRTC engine can acquire clean hardware handles
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }

    const saved = saveGuestIdentity(
      clean,
      guestEmailInput.trim() || undefined,
      isGuestSpeaker ? "guest_speaker" : "guest",
      isGuestSpeaker
    );
    setGuestIdentity(saved);
    // Give browser driver 120ms to release hardware mic before LiveKit mounts
    setTimeout(() => {
      setHasEnteredName(true);
    }, 120);

    // If this room has an organizer waiting room, immediately dispatch entry request
    if (matchedEvent && eventType === "go_live") {
      requestJoinEvent(matchedEvent.id, {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        role: (isGuestSpeaker ? "instructor" : "guest") as any,
      });
    }
  };

  const [isBusy, setIsBusy] = useState(false);

  // Display name for LiveKit call
  const participantName = useMemo(() => {
    if (currentUser?.name) return currentUser.name;
    if (guestNameInput.trim()) return guestNameInput.trim();
    if (guestIdentity?.name) return guestIdentity.name;
    if (queryName.trim()) return queryName.trim();
    return "Guest Participant";
  }, [currentUser?.name, guestNameInput, guestIdentity?.name, queryName]);

  const [copiedAttendeeUrl, setCopiedAttendeeUrl] = useState(false);
  const [copiedSpeakerUrl, setCopiedSpeakerUrl] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [roomInput, setRoomInput] = useState<string>(effectiveRoomName);

  // Event security & waiting-room state
  const eventType = matchedEvent ? normaliseEventType(matchedEvent) : "go_live";
  const isOrganizer = matchedEvent
    ? isEventOrganizer(matchedEvent, currentUser, organizations)
    : false;
  const activeParticipantId = currentUser?.id || guestIdentity?.id;

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

  // Shortened join URLs that automatically expand to the full classroom link when visited
  const attendeeJoinUrl = useMemo(() => {
    return getShortAttendeeJoinUrl(effectiveRoomName, matchedEvent?.courseId || queryCourseId);
  }, [effectiveRoomName, matchedEvent?.courseId, queryCourseId]);

  const speakerJoinUrl = useMemo(() => {
    return getShortSpeakerJoinUrl(effectiveRoomName, matchedEvent?.courseId || queryCourseId);
  }, [effectiveRoomName, matchedEvent?.courseId, queryCourseId]);

  const handleCopyAttendeeLink = async () => {
    try {
      await navigator.clipboard.writeText(attendeeJoinUrl);
      setCopiedAttendeeUrl(true);
      setTimeout(() => setCopiedAttendeeUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopySpeakerLink = async () => {
    try {
      await navigator.clipboard.writeText(speakerJoinUrl);
      setCopiedSpeakerUrl(true);
      setTimeout(() => setCopiedSpeakerUrl(false), 2500);
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
                {matchedEvent ? matchedEvent.title : "Live Classroom:"}{" "}
                {!matchedEvent && (
                  <span className="font-mono text-[#0078d4] dark:text-[#04a4ec]">
                    {effectiveRoomName}
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap gap-y-1">
              <span className="inline-flex items-center text-[#0078d4] dark:text-[#04a4ec] font-semibold">
                <Globe className="w-3.5 h-3.5 mr-1" />
                {matchedEvent ? "Scheduled Class Session" : "Direct Link Open Access"}
              </span>
              {!currentUser && hasEnteredName && (
                <span className="text-slate-400">
                  · Connected as: <strong className="text-slate-700 dark:text-slate-200">{participantName}</strong>
                  {isGuestSpeaker && (
                    <span className="ml-1 text-purple-600 dark:text-purple-400 font-bold">(Guest Speaker 🎙️)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setHasEnteredName(false)}
                    className="ml-2 text-[#0078d4] hover:underline"
                  >
                    Change
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Share & Invite Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite &amp; Share Call</span>
          </button>

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

      {/* Share / Invite Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Invite Anyone to this Call
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Share links for attendees or external guest speakers. No account required.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* 1. Standard Attendee Link */}
            <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  Attendee Direct Join Link
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                  For Students &amp; Guests
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={attendeeJoinUrl}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyAttendeeLink}
                  className="px-3 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0"
                >
                  {copiedAttendeeUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAttendeeUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* 2. Guest Speaker Link */}
            <div className="space-y-2 p-3.5 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600 dark:text-purple-400" />
                  External Guest Speaker Link 🎙️
                </span>
                <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Speaker Stage Access
                </span>
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Grants the Guest Speaker badge, elevated presentation stage permissions, and priority unmuted audio.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={speakerJoinUrl}
                  className="flex-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 text-xs font-mono text-purple-900 dark:text-purple-200 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopySpeakerLink}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0"
                >
                  {copiedSpeakerUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSpeakerUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organizer Live Waiting Room Banner */}
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
                      {(wp.role as string) === "guest_speaker"
                        ? "Guest Speaker 🎙️"
                        : wp.role === "guest"
                        ? "Guest"
                        : wp.role || "Member"}
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

      {/* Main Content:
          Case A: Google Meet-style Pre-Join Name & Camera Setup Modal (When not signed in & hasn't entered name)
          Case B: Waiting Room Gate (If host moderation is active)
          Case C: Video Call Viewport (<LiveKitCall>)
      */}
      {!currentUser && !hasEnteredName ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden max-w-4xl mx-auto p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Video / Audio Preview (Google Meet Style) */}
            <div className="space-y-4">
              <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover mirror ${
                    previewCamOff || cameraPermissionError ? "hidden" : "block"
                  }`}
                />

                {(previewCamOff || cameraPermissionError) && (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-lg">
                      {(guestNameInput.trim().charAt(0) || "G").toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {cameraPermissionError ? "Camera unavailable or blocked" : "Camera is off"}
                    </p>
                  </div>
                )}

                {/* Floating Preview Controls at bottom of video */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 z-10">
                  <button
                    type="button"
                    onClick={togglePreviewMic}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                      previewMicMuted
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "bg-slate-700/80 text-white hover:bg-slate-600"
                    }`}
                    title={previewMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                  >
                    {previewMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={togglePreviewCam}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                      previewCamOff
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "bg-slate-700/80 text-white hover:bg-slate-600"
                    }`}
                    title={previewCamOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {previewCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="flex items-center">
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {previewMicMuted ? "Mic muted before joining" : "Mic will be live"}
                </span>
                <span>
                  {previewCamOff ? "Camera starts disabled" : "Camera starts live"}
                </span>
              </div>
            </div>

            {/* Right: Name Input & Join Form */}
            <div className="space-y-5">
              <div>
                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center">
                  <Radio className="w-3 h-3 mr-1 animate-pulse" /> Live Call Lobby
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                  Ready to join?
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Enter your name so participants can recognize you. No account required.
                </p>
              </div>

              <form onSubmit={handlePreJoinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                    placeholder="Enter your full name (e.g. Dr. Sarah Jenkins)"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={guestEmailInput}
                    onChange={(e) => setGuestEmailInput(e.target.value)}
                    placeholder="you@example.com (optional)"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
                  />
                </div>

                {/* Guest Speaker Toggle */}
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-1.5">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGuestSpeaker}
                      onChange={(e) => setIsGuestSpeaker(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                      Join as External Guest Speaker 🎙️
                    </span>
                  </label>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 pl-6">
                    Check this if you were invited as a keynote speaker or presenter for this live session.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!guestNameInput.trim()}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white font-bold text-sm transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Call Now</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-500">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#0078d4] font-semibold hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
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
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Hourglass className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                You Are in the Waiting Room
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Welcome, <strong>{participantName}</strong>! Please stay on this screen.
                You will enter <strong>{matchedEvent.title}</strong> automatically as soon as
                the organizer admits you.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="w-full">
          <LiveKitCall
            roomName={effectiveRoomName}
            participantName={participantName}
            userRole={isGuestSpeaker ? "guest_speaker" : currentUser?.role || "guest"}
            courseId={matchedEvent?.courseId || queryCourseId}
            eventId={matchedEvent?.id}
            eventTitle={matchedEvent?.title}
            initialVideoEnabled={!previewCamOff}
            initialAudioEnabled={!previewMicMuted}
            isGuestSpeaker={isGuestSpeaker}
            onLeaveOnly={() => navigate("/")}
            onClose={() => navigate("/")}
          />
        </div>
      )}

      {/* Direct Access Strip */}
      <div className="p-4 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-[#0078d4] shrink-0" />
          <span>
            <strong>Public Direct Link:</strong> Anyone with this link can join this call without an account.
          </span>
        </div>
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <span className="font-mono text-[11px] text-slate-500">
            Room: {effectiveRoomName}
          </span>
          <button
            type="button"
            onClick={handleCopyAttendeeLink}
            className="text-[#0078d4] dark:text-[#04a4ec] hover:underline font-bold cursor-pointer"
          >
            {copiedAttendeeUrl ? "Link Copied!" : "Copy Attendee Link"}
          </button>
          <button
            type="button"
            onClick={handleCopySpeakerLink}
            className="text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
          >
            {copiedSpeakerUrl ? "Speaker Link Copied!" : "Copy Guest Speaker Link 🎙️"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRoomPage;
