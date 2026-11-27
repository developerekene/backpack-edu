import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PhoneCall, PhoneOff, Volume2, VolumeX, Video, Building } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { isEventLiveActive, getLiveClassRoomName, normalizeLiveRoomName } from "../../lib/liveClass";
import { endWebRtcClassroom } from "../../lib/webrtcSignaling";

/**
 * Microsoft Teams-style Incoming Live Class Ringing Call Modal for Online Enrolled Students.
 * Whenever an organization or instructor starts a live class for a course that the logged-in
 * student is enrolled in (or added to), this popup rings out audibly and lets the student
 * answer and join the live class with a single click—no invite link required.
 */
export const IncomingLiveClassCallModal: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    courses,
    organizations,
    scheduleEvents,
    enrollmentRequests,
    orgMembers,
    refreshData,
    endLiveClassSession,
  } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [dismissedEventKeys, setDismissedEventKeys] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("bp_dismissed_live_calls");
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set();
  });

  const [isRingMuted, setIsRingMuted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Determine which courses the current user is enrolled in or added to as a student
  const myStudentCourseIds = useMemo(() => {
    const ids = new Set<string>();
    if (!currentUser) return ids;

    // 1. Approved course enrollments
    for (const req of enrollmentRequests) {
      if (
        (req.userId === currentUser.id || req.studentId === currentUser.id) &&
        req.status === "approved" &&
        req.courseId
      ) {
        ids.add(req.courseId);
      }
    }

    // 2. Added to organization/course via orgMembers
    const myEmail = currentUser.email?.toLowerCase().trim();
    for (const member of orgMembers) {
      const isMe =
        (currentUser.id && (member.userId === currentUser.id || member.id === currentUser.id)) ||
        (myEmail && member.email?.toLowerCase().trim() === myEmail);

      if (isMe && member.status !== "invited") {
        if (Array.isArray(member.courseIds)) {
          member.courseIds.forEach((cid) => ids.add(cid));
        }
        // If added to an organization as a student, include courses belonging to that org
        if (member.role === "student" && member.orgId) {
          for (const c of courses) {
            if (
              c.orgId === member.orgId ||
              `org_${c.orgId}` === member.orgId ||
              c.orgId === `org_${member.orgId}`
            ) {
              ids.add(c.id);
            }
          }
        }
      }
    }

    return ids;
  }, [currentUser, enrollmentRequests, orgMembers, courses]);

  // Real-time Firestore listener on student's backpack doc & enrolled course org docs
  // so that the moment an organization starts a live class, the student's screen rings immediately
  useEffect(() => {
    if (!currentUser?.id || currentUser.role === "organization") return;

    const watchedDocIds = new Set<string>([currentUser.id]);
    for (const cid of myStudentCourseIds) {
      const c = courses.find((course) => course.id === cid);
      if (c?.orgId) {
        watchedDocIds.add(c.orgId);
        if (c.orgId.startsWith("org_")) {
          watchedDocIds.add(c.orgId.replace(/^org_/, ""));
        }
      }
      if (c?.createdBy) {
        watchedDocIds.add(c.createdBy);
      }
    }

    let isInitial = true;
    const unsubs = Array.from(watchedDocIds)
      .slice(0, 10)
      .map((uid) =>
        onSnapshot(
          doc(db, "backpack", uid),
          () => {
            if (!isInitial) {
              refreshData().catch(() => {});
            }
          },
          () => {}
        )
      );

    const timer = setTimeout(() => {
      isInitial = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }, [currentUser?.id, currentUser?.role, myStudentCourseIds, courses, refreshData]);

  // Check if the user is already inside a live call viewport
  const isAlreadyInLiveViewport = useMemo(() => {
    if (location.pathname.startsWith("/live")) return true;
    const params = new URLSearchParams(location.search);
    if (
      location.pathname.startsWith("/course/") &&
      (params.get("live") === "true" || params.get("joinLive") === "true")
    ) {
      return true;
    }
    return false;
  }, [location.pathname, location.search]);

  // Check if the user is an instructor/organization with an ongoing live class they left running
  const instructorOngoingCall = useMemo(() => {
    if (!currentUser || isAlreadyInLiveViewport) return null;
    // If already on that exact course page, CourseDetails renders its own prominent Live Session Active banner
    for (const evt of scheduleEvents) {
      if (!isEventLiveActive(evt) || !evt.courseId) continue;
      if (location.pathname === `/course/${evt.courseId}`) continue;

      const course = courses.find((c) => c.id === evt.courseId);
      if (!course) continue;

      const isCourseHost =
        course.instructorId === currentUser.id ||
        course.createdBy === currentUser.id ||
        course.orgId === currentUser.id ||
        course.orgId === `org_${currentUser.id}` ||
        (Array.isArray(course.instructors) && course.instructors.includes(currentUser.id)) ||
        orgMembers.some(
          (m) =>
            m.role === "instructor" &&
            (m.userId === currentUser.id ||
              (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase())) &&
            (m.courseIds?.includes(course.id) ||
              m.orgId === course.orgId ||
              `org_${m.orgId}` === course.orgId)
        );

      if (isCourseHost) {
        return { event: evt, course };
      }
    }
    return null;
  }, [currentUser, isAlreadyInLiveViewport, scheduleEvents, location.pathname, courses, orgMembers]);

  // Find any actively ringing live class event for one of the student's courses
  const incomingCall = useMemo(() => {
    if (!currentUser || isAlreadyInLiveViewport) return null;
    if (currentUser.role === "organization") return null;

    for (const evt of scheduleEvents) {
      if (!isEventLiveActive(evt) || !evt.courseId) continue;
      if (!myStudentCourseIds.has(evt.courseId)) continue;

      const course = courses.find((c) => c.id === evt.courseId);
      if (!course) continue;

      // Do not ring the instructor/creator who started the class
      if (
        course.instructorId === currentUser.id ||
        course.createdBy === currentUser.id ||
        course.orgId === currentUser.id ||
        course.orgId === `org_${currentUser.id}`
      ) {
        continue;
      }

      const callKey = `${evt.id}_${evt.updatedAt || ""}`;
      if (dismissedEventKeys.has(callKey) || dismissedEventKeys.has(evt.id)) {
        continue;
      }

      const org = organizations.find(
        (o) =>
          o.id === course.orgId ||
          `org_${o.id}` === course.orgId ||
          o.id === `org_${course.orgId}`
      );

      return {
        event: evt,
        course,
        org,
        callKey,
      };
    }

    return null;
  }, [
    currentUser,
    isAlreadyInLiveViewport,
    scheduleEvents,
    myStudentCourseIds,
    courses,
    organizations,
    dismissedEventKeys,
  ]);

  // Synthesize a pleasant Microsoft Teams-style polyphonic incoming call ringtone using Web Audio API
  useEffect(() => {
    if (!incomingCall || isRingMuted) return;

    let isCancelled = false;

    const playTeamsChime = () => {
      if (isCancelled || isRingMuted) return;
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        // Teams-inspired warm harmonic arpeggio (D5 -> F#5 -> A5 -> D6 -> A5)
        const notes = [
          { freq: 587.33, delay: 0.0, duration: 0.35 },   // D5
          { freq: 739.99, delay: 0.18, duration: 0.35 },  // F#5
          { freq: 880.0, delay: 0.36, duration: 0.4 },    // A5
          { freq: 1174.66, delay: 0.56, duration: 0.65 }, // D6
          { freq: 880.0, delay: 0.95, duration: 0.55 },   // A5
        ];

        const now = ctx.currentTime;
        for (const n of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(n.freq, now + n.delay);

          gain.gain.setValueAtTime(0.0001, now + n.delay);
          gain.gain.exponentialRampToValueAtTime(0.14, now + n.delay + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.delay + n.duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + n.delay);
          osc.stop(now + n.delay + n.duration + 0.05);
        }
      } catch {
        // Browser may require gesture before audio playback
      }
    };

    // Play immediately and repeat every 2.8 seconds while ringing
    playTeamsChime();
    const interval = setInterval(playTeamsChime, 2800);

    // Unlock audio context if the user moves/clicks anywhere while ringing
    const unlockOnGesture = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlockOnGesture, { passive: true });
    window.addEventListener("keydown", unlockOnGesture, { passive: true });

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
    };
  }, [incomingCall, isRingMuted]);

  const markCallHandled = (eventId: string, callKey: string) => {
    setDismissedEventKeys((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      next.add(callKey);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "bp_dismissed_live_calls",
            JSON.stringify(Array.from(next))
          );
        } catch {}
      }
      return next;
    });
  };

  if (!incomingCall && instructorOngoingCall) {
    const { event, course } = instructorOngoingCall;
    const roomName = normalizeLiveRoomName(getLiveClassRoomName(event, course.id), course.id);

    const handleRejoinOngoingCall = () => {
      navigate(`/course/${course.id}?live=true&eventId=${encodeURIComponent(event.id)}`);
    };

    const handleEndOngoingCallForAll = async () => {
      await endWebRtcClassroom(roomName, currentUser?.id || "instructor").catch(() => {});
      if (endLiveClassSession) {
        await endLiveClassSession(course.id, event.id).catch(() => {});
      }
    };

    return (
      <div className="fixed top-4 right-4 z-[10000] max-w-sm w-[calc(100vw-2rem)] animate-in slide-in-from-top-5 fade-in duration-300">
        <div className="bg-slate-900/98 backdrop-blur-xl border border-rose-500/70 rounded-3xl p-4 shadow-2xl text-white">
          <div className="flex items-center space-x-2 mb-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-300">
              Live Call Still Going On
            </span>
          </div>

          <h4 className="font-bold text-sm text-white truncate">{course.title}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3.5">
            Participants are still in this live call. You can go back to rejoin or end the call for everyone.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEndOngoingCallForAll}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>

            <button
              type="button"
              onClick={handleRejoinOngoingCall}
              className="flex-1 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Go Back to Call</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!incomingCall) return null;

  const { event, course, org, callKey } = incomingCall;

  const handleAnswerCall = () => {
    markCallHandled(event.id, callKey);
    navigate(`/course/${course.id}?live=true&eventId=${encodeURIComponent(event.id)}`);
  };

  const handleDeclineCall = () => {
    markCallHandled(event.id, callKey);
  };

  return (
    <div className="fixed top-4 right-4 z-[10000] max-w-sm w-[calc(100vw-2rem)] animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="bg-slate-900/98 backdrop-blur-xl border-2 border-indigo-500/80 rounded-3xl p-5 shadow-[0_20px_60px_rgba(79,70,229,0.45)] text-white relative overflow-hidden">
        {/* Ambient pulsing glow background */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />

        {/* Header Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
              Incoming Live Class Call...
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsRingMuted((prev) => !prev)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={isRingMuted ? "Unmute ringtone" : "Mute ringtone"}
          >
            {isRingMuted ? (
              <VolumeX className="w-4 h-4 text-amber-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-indigo-400 animate-bounce" />
            )}
          </button>
        </div>

        {/* Caller / Course Info */}
        <div className="flex items-center space-x-3.5 mb-5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-lg ring-4 ring-indigo-500/30 animate-pulse">
              {course.title.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <Video className="w-3 h-3 text-slate-950" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
              {course.title}
            </h4>
            <p className="text-xs text-indigo-300 font-semibold truncate mt-0.5">
              {course.instructorName || org?.name || "Course Instructor"} started a live class
            </p>
            {org && (
              <div className="flex items-center text-[11px] text-slate-400 mt-1 truncate">
                <Building className="w-3 h-3 mr-1 shrink-0 text-slate-500" />
                <span className="truncate">{org.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Call Action Buttons (Teams / Meet Style) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDeclineCall}
            className="px-4 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Dismiss</span>
          </button>

          <button
            type="button"
            onClick={handleAnswerCall}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 cursor-pointer animate-pulse"
          >
            <PhoneCall className="w-4 h-4 fill-current" />
            <span>Join Live Class</span>
          </button>
        </div>
      </div>
    </div>
  );
};
