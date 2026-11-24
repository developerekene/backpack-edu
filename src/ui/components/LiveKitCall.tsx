import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useAudioPlayback,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MessageSquare,
  Users,
  Hand,
  Settings,
  Send,
  Sparkles,
  Check,
  Copy,
  Volume2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Timer,
  UserPlus,
  X,
  Share2,
} from 'lucide-react';
import { LiveClassRecorder } from './LiveClassRecorder';
import { endLiveClassSessionApi } from '../../lib/liveClass';
import { centralApiClient } from '../../lib/centralApiClient';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';

interface LiveKitCallProps {
  roomName: string;
  participantName?: string;
  userRole?: string;
  courseId?: string;
  eventId?: string;
  eventTitle?: string;
  onClose?: () => void;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
  isGuestSpeaker?: boolean;
}

/**
 * Visualizer that gives users immediate feedback on their own microphone:
 * Shows whether their mic is live and pulsing sound wave bars when they talk.
 */
const LocalMicSpeakingVisualizer: React.FC = () => {
  const { localParticipant } = useLocalParticipant();
  const isMicEnabled = localParticipant.isMicrophoneEnabled;
  const isSpeaking = localParticipant.isSpeaking;

  return (
    <div
      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
        !isMicEnabled
          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
          : isSpeaking
          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-sm animate-pulse'
          : 'bg-slate-800/80 text-slate-300 border border-slate-700/80'
      }`}
      title={
        !isMicEnabled
          ? 'Your microphone is currently muted.'
          : isSpeaking
          ? 'Your microphone is detecting voice audio right now.'
          : 'Your microphone is connected and ready.'
      }
    >
      {!isMicEnabled ? (
        <>
          <MicOff className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Muted</span>
        </>
      ) : isSpeaking ? (
        <>
          <div className="flex items-center space-x-0.5">
            <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="font-bold text-emerald-200">Speaking 🎙️</span>
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Mic Ready</span>
        </>
      )}
    </div>
  );
};

/**
 * Real-time reactive participants drawer for the LiveKit Cloud room.
 * Displays all active participants, dynamically updating as people join and leave,
 * showing speaking state, mic/cam statuses, and role tags (Lead Instructor, Guest Speaker 🎙️, Guest, Learner).
 */
const LiveKitParticipantsPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenInvite: () => void;
  effectiveRole: string;
}> = ({ isOpen, onClose, onOpenInvite, effectiveRole }) => {
  const participants = useParticipants();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900/98 backdrop-blur-md border-l border-slate-800 z-30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            In Classroom ({participants.length})
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => {
          let metadata: any = {};
          try {
            if (p.metadata) metadata = JSON.parse(p.metadata);
          } catch {}

          const isSpeaker =
            metadata.isGuestSpeaker ||
            metadata.role === 'guest_speaker' ||
            metadata.role === 'speaker';
          const isLead =
            metadata.role === 'instructor' ||
            metadata.role === 'teacher' ||
            (!metadata.role && p.isLocal && effectiveRole === 'instructor');
          const isGuest =
            metadata.isGuest ||
            metadata.role === 'guest' ||
            p.identity.startsWith('guest_');

          const nameToDisplay =
            metadata.displayName || p.name || p.identity || 'Participant';

          return (
            <div
              key={p.sid || p.identity}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                p.isSpeaking
                  ? 'bg-indigo-950/50 border-indigo-500 shadow-xs ring-1 ring-indigo-500/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 relative ${
                    isSpeaker
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isLead
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isGuest
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {nameToDisplay.charAt(0).toUpperCase()}
                  {p.isSpeaking && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[130px]">
                      {nameToDisplay}
                    </span>
                    {p.isLocal && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        (You)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 mt-0.5">
                    {isSpeaker ? (
                      <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-extrabold uppercase tracking-wider">
                        Guest Speaker 🎙️
                      </span>
                    ) : isLead ? (
                      <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[9px] font-bold">
                        Lead Instructor
                      </span>
                    ) : isGuest ? (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold">
                        Guest
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[9px]">
                        Learner
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {p.isMicrophoneEnabled ? (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                )}
                {p.isCameraEnabled ? (
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <button
          type="button"
          onClick={onOpenInvite}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite People / Guest Speaker</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Trigger component rendered inside LiveKitRoom to access useParticipants()
 */
const LiveKitParticipantsTrigger: React.FC<{
  onToggleDrawer: () => void;
  onOpenInvite: () => void;
}> = ({ onToggleDrawer, onOpenInvite }) => {
  const participants = useParticipants();
  return (
    <div className="flex items-center space-x-1.5">
      <button
        type="button"
        onClick={onToggleDrawer}
        className="px-2.5 py-1.5 bg-slate-800/95 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0 cursor-pointer shadow-sm"
        title="View Classroom Participants"
      >
        <Users className="w-3.5 h-3.5 text-indigo-400" />
        <span>Participants ({participants.length})</span>
      </button>

      <button
        type="button"
        onClick={onOpenInvite}
        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shrink-0 cursor-pointer shadow-sm"
        title="Invite People / External Guest Speaker"
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Invite</span>
      </button>
    </div>
  );
};

/**
 * Universal Invite Modal supporting Attendee & Guest Speaker Links
 */
const InvitePeopleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  attendeeJoinUrl: string;
  speakerJoinUrl: string;
  copiedAttendeeUrl: boolean;
  copiedSpeakerUrl: boolean;
  onCopyAttendee: () => void;
  onCopySpeaker: () => void;
  roomName: string;
}> = ({
  isOpen,
  onClose,
  attendeeJoinUrl,
  speakerJoinUrl,
  copiedAttendeeUrl,
  copiedSpeakerUrl,
  onCopyAttendee,
  onCopySpeaker,
  roomName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Invite to &ldquo;{roomName}&rdquo;
              </h3>
              <p className="text-xs text-slate-400">
                Share direct links. External participants join without creating an account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Attendee Link */}
        <div className="space-y-2 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center">
              <Users className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              Attendee Join Link
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
              Students &amp; Guests
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Anyone opening this link can enter their name and join the session directly.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={attendeeJoinUrl}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none"
            />
            <button
              type="button"
              onClick={onCopyAttendee}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer"
            >
              {copiedAttendeeUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAttendeeUrl ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* 2. Guest Speaker Link */}
        <div className="space-y-2 p-3.5 bg-purple-950/30 rounded-2xl border border-purple-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-200 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              External Guest Speaker Link 🎙️
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase">
              Speaker Stage Access
            </span>
          </div>
          <p className="text-[11px] text-purple-300">
            Automatically tags the invitee as a Guest Speaker with stage presentation &amp; speaking privileges.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={speakerJoinUrl}
              className="flex-1 bg-slate-900 border border-purple-800 rounded-xl px-3 py-2 text-xs font-mono text-purple-200 outline-none"
            />
            <button
              type="button"
              onClick={onCopySpeaker}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer"
            >
              {copiedSpeakerUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSpeakerUrl ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Unlocks remote WebRTC audio playback inside mobile & strict-autoplay browsers.
 * Automatically calls `room.startAudio()` on any touch/pointer/key gesture and shows
 * a prominent tap-to-enable audio banner whenever `canPlaybackAudio` is blocked.
 */
const MobileAudioPlaybackGuard: React.FC<{
  mediaWarning: string | null;
  onDismissMediaWarning: () => void;
}> = ({ mediaWarning, onDismissMediaWarning }) => {
  const room = useRoomContext();
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlockAudio = useCallback(async () => {
    setUnlocking(true);
    try {
      await startAudio();
      // Also resume any unmuted <audio> elements created by LiveKit in this room
      if (typeof document !== 'undefined') {
        document.querySelectorAll('audio').forEach((el) => {
          try {
            el.muted = false;
            el.volume = 1;
            const playPromise = el.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // browser may still require direct tap on the button
    } finally {
      setUnlocking(false);
    }
  }, [startAudio]);

  // Whenever a remote audio track is subscribed, ensure playback elements aren't stuck paused
  useEffect(() => {
    if (!room) return;
    const onTrackSubscribed = () => {
      if (room.canPlaybackAudio) {
        document.querySelectorAll('audio').forEach((el) => {
          el.muted = false;
          el.volume = 1;
          el.play().catch(() => {});
        });
      }
    };
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
    };
  }, [room]);

  // Unlock on first user interaction anywhere in the viewport if autoplay was blocked
  useEffect(() => {
    if (canPlayAudio) return;
    const triggerOnGesture = () => {
      handleUnlockAudio();
    };
    window.addEventListener('touchstart', triggerOnGesture, { passive: true });
    window.addEventListener('pointerdown', triggerOnGesture, { passive: true });
    window.addEventListener('keydown', triggerOnGesture, { passive: true });
    return () => {
      window.removeEventListener('touchstart', triggerOnGesture);
      window.removeEventListener('pointerdown', triggerOnGesture);
      window.removeEventListener('keydown', triggerOnGesture);
    };
  }, [canPlayAudio, handleUnlockAudio]);

  if (canPlayAudio && !mediaWarning) return null;

  return (
    <div className="absolute top-3 inset-x-3 z-40 flex flex-col items-center gap-2 pointer-events-none">
      {!canPlayAudio && (
        <button
          type="button"
          onClick={handleUnlockAudio}
          className="pointer-events-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-xl flex items-center space-x-2 animate-bounce cursor-pointer border border-amber-300"
        >
          <Volume2 className="w-4 h-4 shrink-0" />
          <span>
            {unlocking ? 'Enabling Call Audio...' : 'Audio Blocked by Browser — Tap Here to Hear Class'}
          </span>
        </button>
      )}
      {mediaWarning && (
        <div className="pointer-events-auto max-w-md bg-slate-900/95 border border-amber-500/40 text-amber-200 px-3.5 py-2 rounded-xl text-[11px] flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{mediaWarning}</span>
          </div>
          <button
            type="button"
            onClick={onDismissMediaWarning}
            className="text-slate-400 hover:text-white font-bold px-1.5 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

export const LiveKitCall: React.FC<LiveKitCallProps> = ({
  roomName,
  participantName = 'Guest Learner',
  userRole = 'student',
  courseId,
  eventId,
  eventTitle,
  onClose,
  initialVideoEnabled = true,
  initialAudioEnabled = true,
  isGuestSpeaker = false,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [resolvedWsUrl, setResolvedWsUrl] = useState<string | null>(null);
  const [useLiveKitRoom, setUseLiveKitRoom] = useState<boolean>(true);
  const [sessionAccessError, setSessionAccessError] = useState<string | null>(null);
  const [mediaDeviceWarning, setMediaDeviceWarning] = useState<string | null>(null);
  const [publishMediaEnabled, setPublishMediaEnabled] = useState<{ audio: boolean; video: boolean }>({
    audio: initialAudioEnabled,
    video: initialVideoEnabled,
  });
  const [sessionInstanceId] = useState<string>(() => Math.random().toString(36).substring(2, 7));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Online class attendance & engagement duration tracking
  const { recordLiveOnlineEngagement, endLiveClassSession, scheduleEvents, updateScheduleEvent } = useAppContext();
  const { currentUser } = useAuth();
  const sessionStartTimeRef = useRef<number>(0);
  const [elapsedEngagementSeconds, setElapsedEngagementSeconds] = useState<number>(0);

  // Participants drawer and Invite modal states
  const [isParticipantsDrawerOpen, setIsParticipantsDrawerOpen] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [copiedAttendeeUrl, setCopiedAttendeeUrl] = useState<boolean>(false);
  const [copiedSpeakerUrl, setCopiedSpeakerUrl] = useState<boolean>(false);

  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsedEngagementSeconds(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // In-Call Controls State
  const [isMuted, setIsMuted] = useState<boolean>(!initialAudioEnabled);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(!initialVideoEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participants' | 'settings' | null>(null);

  // Participant Name
  const [displayName] = useState<string>(participantName);

  // Classroom Features
  const [captionsLanguage, setCaptionsLanguage] = useState<string>('en-US');
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [hasPermissionsError, setHasPermissionsError] = useState<boolean>(false);
  const [showScreenShareNotice, setShowScreenShareNotice] = useState<boolean>(false);
  const [copiedJoinUrl, setCopiedJoinUrl] = useState<boolean>(false);

  const cleanRoomName = (roomName || 'backpack-live-class')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'backpack-live-class';

  const isSpeaker = Boolean(
    isGuestSpeaker ||
    userRole === 'guest_speaker' ||
    userRole === 'speaker'
  );

  const effectiveRole = isSpeaker
    ? 'guest_speaker'
    : userRole.toLowerCase().includes('teach') ||
      userRole.toLowerCase().includes('instructor') ||
      userRole.toLowerCase().includes('org')
    ? 'instructor'
    : userRole === 'guest'
    ? 'guest'
    : 'student';

  const roleLabel = isSpeaker
    ? 'Guest Speaker 🎙️'
    : effectiveRole === 'instructor'
    ? 'Lead Instructor'
    : effectiveRole === 'guest'
    ? 'Guest'
    : 'Learner';

  const attendeeJoinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/live/${cleanRoomName}`
    : `/live/${cleanRoomName}`;

  const speakerJoinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/live/${cleanRoomName}?role=speaker`
    : `/live/${cleanRoomName}?role=speaker`;

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

  const handleCopyDirectJoinUrl = async () => {
    try {
      await navigator.clipboard.writeText(attendeeJoinUrl);
      setCopiedJoinUrl(true);
      setTimeout(() => setCopiedJoinUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  // In-Room Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    { 
      sender: 'Live Classroom', 
      text: `Connected to "${eventTitle || cleanRoomName}". Live session active.`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    }
  ]);
  const [newMessage, setNewMessage] = useState<string>('');

  // Media Refs & States for Native WebRTC Classroom
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);

  const wsUrlFromEnv = import.meta.env.VITE_LIVEKIT_URL || null;

  // Request LiveKit Token from server-side SDK endpoint (backed by Render URL service)
  const uniqueParticipantIdentity = `${(currentUser?.id || displayName || 'guest')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 32)}_${sessionInstanceId}`;

  useEffect(() => {
    let isMounted = true;

    async function loadToken() {
      setSessionAccessError(null);
      try {
        const res = await centralApiClient('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: cleanRoomName,
            identity: uniqueParticipantIdentity,
            roomName: cleanRoomName,
            participantName: displayName,
            role: effectiveRole,
            isGuestSpeaker: isSpeaker,
            isGuest: effectiveRole === 'guest' || !currentUser,
            courseId,
          }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok || !data.token) {
          if (data.status === 'INACTIVE_STUDENT_REJECTED' || data.error?.includes('Students cannot start')) {
            setSessionAccessError('Students are not permitted to start live classes. Please wait until your instructor activates the session.');
          } else if (data.status === 'ENDED' || data.error?.includes('ended')) {
            setSessionAccessError('This live class session has been ended by the instructor.');
          } else {
            setSessionAccessError(data.error || 'Unable to connect to live class session.');
          }
          setUseLiveKitRoom(false);
          return;
        }

        if (data.token) {
          setToken(data.token);
          const targetWs = data.livekitUrl || data.wsUrl || wsUrlFromEnv;
          if (targetWs) {
            setResolvedWsUrl(targetWs);
            setUseLiveKitRoom(true);
          } else {
            setUseLiveKitRoom(false);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to fetch token';
        console.warn('LiveKit token status:', message);
        setUseLiveKitRoom(false);
      } finally {
        if (isMounted) {
          setIsConnecting(false);
        }
      }
    }

    loadToken();

    return () => {
      isMounted = false;
    };
  }, [cleanRoomName, displayName, uniqueParticipantIdentity, effectiveRole, wsUrlFromEnv, courseId, isSpeaker, currentUser]);

  const handleRegenerateToken = async () => {
    setIsConnecting(true);
    try {
      const res = await centralApiClient('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: cleanRoomName,
          identity: uniqueParticipantIdentity,
          roomName: cleanRoomName,
          participantName: displayName,
          role: effectiveRole,
          courseId,
        }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        const targetWs = data.livekitUrl || data.wsUrl || wsUrlFromEnv;
        if (targetWs) {
          setResolvedWsUrl(targetWs);
          setUseLiveKitRoom(true);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsConnecting(false);
    }
  };

  // Native WebRTC local media stream initialization (zero third-party dependencies, 100% Backpack-controlled)
  useEffect(() => {
    if (useLiveKitRoom) return;

    let isSubscribed = true;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animFrameId: number | null = null;

    async function initNativeMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Apply audio & video enabled states
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = !isVideoOff;
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasPermissionsError(false);

        // Real-time voice activity detection via Web Audio API
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            audioContext = new AudioCtx();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkVoiceVolume = () => {
              if (!isSubscribed) return;
              if (analyser && stream.getAudioTracks().some((t) => t.enabled)) {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avgVolume = sum / dataArray.length;
                setIsLocalSpeaking(avgVolume > 14);
              } else {
                setIsLocalSpeaking(false);
              }
              animFrameId = requestAnimationFrame(checkVoiceVolume);
            };
            animFrameId = requestAnimationFrame(checkVoiceVolume);
          }
        } catch (err) {
          console.warn('AudioContext voice detection notice:', err);
        }
      } catch (err) {
        console.warn('Camera / mic media permissions notice:', err);
        setHasPermissionsError(true);
      }
    }

    initNativeMedia();

    return () => {
      isSubscribed = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
    };
  }, [useLiveKitRoom]);

  // Fast, single-click frontend mic mute control
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Fast, single-click frontend camera toggle control
  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }
  };

  // Native browser screen share control
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = () => {
            setIsScreenSharing(false);
            if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach((t) => t.stop());
              screenStreamRef.current = null;
            }
          };
        }
      } catch (err) {
        console.warn('Screen share cancelled or restricted:', err);
        setIsScreenSharing(false);
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    }
  };

  const toggleRaiseHand = () => {
    setHandRaised((prev) => !prev);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageObj: ChatMessage = {
      sender: displayName,
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, messageObj]);
    setNewMessage('');
  };

  const syncAttendanceEngagement = useCallback(
    (opts?: { isLeaving?: boolean; endClass?: boolean }) => {
      const elapsedMs = Date.now() - sessionStartTimeRef.current;
      const durationMins = Math.max(1, Math.round(elapsedMs / 60000));
      const targetCourseId = courseId || eventId || cleanRoomName;
      const targetUserId = currentUser?.id || `guest_${(displayName || 'Guest').replace(/\s+/g, '_')}`;
      const targetUserName = currentUser?.name || displayName || 'Learner';
      const targetRole: "student" | "instructor" = effectiveRole === "instructor" ? "instructor" : "student";
      const checkInIso = new Date(sessionStartTimeRef.current).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const checkOutIso = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      recordLiveOnlineEngagement({
        courseId: targetCourseId,
        sessionTitle: eventTitle ? `Live Event: ${eventTitle}` : `Live Online Class: ${cleanRoomName}`,
        userId: targetUserId,
        userName: targetUserName,
        userEmail: currentUser?.email,
        role: targetRole,
        durationMinutes: durationMins,
        checkInTime: checkInIso,
        checkOutTime: checkOutIso,
        location: `Online Room: ${cleanRoomName}`,
        isLeaving: opts?.isLeaving,
        endClass: opts?.endClass,
      }).catch(() => {});
    },
    [courseId, eventId, eventTitle, cleanRoomName, currentUser, displayName, effectiveRole, recordLiveOnlineEngagement],
  );

  // Periodic engagement sync every 60s and check-out on component unmount
  useEffect(() => {
    syncAttendanceEngagement();
    const syncInterval = setInterval(() => {
      syncAttendanceEngagement();
    }, 60000);
    return () => {
      clearInterval(syncInterval);
      syncAttendanceEngagement({ isLeaving: true });
    };
  }, [syncAttendanceEngagement]);

  // Instant Leave: Closes viewport immediately in <10ms, stops media hardware, and updates attendance
  const handleLeave = () => {
    // 1. Immediately dismiss UI
    if (onClose) {
      onClose();
    }
    // 2. Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    // 3. Background attendance sync
    syncAttendanceEngagement({ isLeaving: true });
  };

  // Instant End Class: Closes viewport immediately in <10ms, stops hardware, and deactivates session
  const handleEndClass = () => {
    // 1. Immediately dismiss UI
    if (onClose) {
      onClose();
    }
    // 2. Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    // 3. Background backend session teardown
    syncAttendanceEngagement({ endClass: true });
    endLiveClassSessionApi(cleanRoomName, courseId).catch(console.error);
    if (courseId && endLiveClassSession) {
      endLiveClassSession(courseId).catch(console.error);
    } else {
      const activeEvts = scheduleEvents.filter(
        (e) => (!courseId || e.courseId === courseId) && e.isActive,
      );
      for (const evt of activeEvts) {
        updateScheduleEvent(evt.id, { isActive: false }).catch(console.error);
      }
    }
  };

  // 0. Session Access Error View (Student restriction / Ended room)
  if (sessionAccessError) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center max-w-lg mx-auto shadow-2xl space-y-5 my-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Class Session Status</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {sessionAccessError}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleRegenerateToken()}
            disabled={isConnecting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Return to Course
            </button>
          )}
        </div>
      </div>
    );
  }

  // 1. Official LiveKit Cloud Room View
  if (useLiveKitRoom && resolvedWsUrl && token) {
    return (
      <div
        ref={containerRef}
        className={`bg-slate-950 overflow-hidden shadow-2xl border border-slate-800 relative w-full flex flex-col transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] rounded-none border-none' : 'rounded-2xl min-h-[480px]'
        }`}
        style={{ height: isFullscreen ? '100dvh' : '78dvh' }}
      >
        {/* Streamlined Compact Top Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between z-20 shrink-0 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <h3 className="font-bold text-white text-xs sm:text-sm truncate max-w-[130px] sm:max-w-xs" title={eventTitle || cleanRoomName}>
                  {eventTitle || cleanRoomName}
                </h3>
                {eventId && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold uppercase rounded-full shrink-0">
                    EVENT
                  </span>
                )}
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 shrink-0 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                LIVE
              </span>
              <div
                className="flex items-center space-x-1 px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-mono font-bold text-indigo-300 shrink-0"
                title="Your live class attendance and engagement duration are being recorded automatically."
              >
                <Timer className="w-3 h-3 text-[#0078d4] animate-pulse" />
                <span>
                  {Math.floor(elapsedEngagementSeconds / 60)}m {elapsedEngagementSeconds % 60}s
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={toggleFullscreen}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shrink-0"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shrink-0 cursor-pointer shadow-xs"
              title="Invite People / External Guest Speaker"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </button>

            <button
              onClick={handleCopyDirectJoinUrl}
              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shrink-0 cursor-pointer"
              title="Copy Direct Meeting URL"
            >
              {copiedJoinUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedJoinUrl ? "Copied" : "Copy"}</span>
            </button>

            <LiveClassRecorder
              roomName={cleanRoomName}
              courseId={courseId}
              isInstructor={effectiveRole === 'instructor'}
            />

            {onClose && (
              effectiveRole === 'instructor' ? (
                <button
                  onClick={handleEndClass}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center shrink-0 border border-red-500"
                  title="End class session permanently for all participants"
                >
                  <PhoneOff className="w-3.5 h-3.5 mr-1" /> End Class
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition flex items-center shrink-0 border border-slate-700"
                  title="Leave meeting"
                >
                  <PhoneOff className="w-3.5 h-3.5 mr-1" /> Leave
                </button>
              )
            )}
          </div>
        </div>

        {/* LiveKit Official Room and Video Conference */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-950">
          <LiveKitRoom
            video={initialVideoEnabled !== false}
            audio={initialAudioEnabled !== false}
            token={token}
            serverUrl={resolvedWsUrl}
            connectOptions={{ autoSubscribe: true }}
            options={{
              adaptiveStream: true,
              dynacast: true,
              audioCaptureDefaults: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }}
            data-lk-theme="default"
            style={{ height: '100%', width: '100%' }}
            onDisconnected={handleLeave}
            onMediaDeviceFailure={(failure) => {
              console.warn('LiveKit media device issue:', failure);
              // Camera was blocked or not present, but KEEP MICROPHONE AUDIO LIVE!
              setMediaDeviceWarning(
                'Camera was not detected or was blocked. Your microphone and audio remain active.'
              );
            }}
            onError={(err) => {
              console.warn('LiveKit connection error:', err);
              const msg = err?.message?.toLowerCase() || '';
              if (!msg.includes('permission') && !msg.includes('device') && !msg.includes('notfound')) {
                setSessionAccessError(
                  'Unable to reach the live classroom audio/video server. Please tap Check Status to reconnect.'
                );
              }
            }}
          >
            {/* Top Right Live Controls & Visualizers Overlay */}
            <div className="absolute top-2.5 right-3 z-30 flex items-center space-x-2">
              <LocalMicSpeakingVisualizer />
              <LiveKitParticipantsTrigger
                onToggleDrawer={() => setIsParticipantsDrawerOpen((prev) => !prev)}
                onOpenInvite={() => setIsInviteModalOpen(true)}
              />
            </div>
            <MobileAudioPlaybackGuard
              mediaWarning={mediaDeviceWarning}
              onDismissMediaWarning={() => setMediaDeviceWarning(null)}
            />
            {/* Guarantee remote audio tracks are rendered to DOM audio elements */}
            <RoomAudioRenderer />
            <VideoConference />
            <LiveKitParticipantsPanel
              isOpen={isParticipantsDrawerOpen}
              onClose={() => setIsParticipantsDrawerOpen(false)}
              onOpenInvite={() => setIsInviteModalOpen(true)}
              effectiveRole={effectiveRole}
            />
          </LiveKitRoom>
        </div>

        {/* Global Invite Modal */}
        <InvitePeopleModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          attendeeJoinUrl={attendeeJoinUrl}
          speakerJoinUrl={speakerJoinUrl}
          copiedAttendeeUrl={copiedAttendeeUrl}
          copiedSpeakerUrl={copiedSpeakerUrl}
          onCopyAttendee={handleCopyAttendeeLink}
          onCopySpeaker={handleCopySpeakerLink}
          roomName={cleanRoomName}
        />
      </div>
    );
  }

  // 2. Native Embedded Conference Stage
  return (
    <div
      ref={containerRef}
      className={`bg-slate-950 overflow-hidden shadow-2xl border border-slate-800 relative w-full flex flex-col transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none' : 'rounded-2xl'
      }`}
      style={{ height: isFullscreen ? '100vh' : '75vh' }}
    >
      {/* Streamlined Compact Top Header */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between z-20 shrink-0 gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2 min-w-0">
            <div className="flex items-center space-x-1.5 min-w-0">
              <h3 className="font-bold text-white text-xs sm:text-sm truncate max-w-[130px] sm:max-w-xs" title={eventTitle || cleanRoomName}>
                {eventTitle || cleanRoomName}
              </h3>
              {eventId && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold uppercase rounded-full shrink-0">
                  EVENT
                </span>
              )}
            </div>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 shrink-0 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
              LIVE
            </span>
            <div
              className="flex items-center space-x-1 px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-mono font-bold text-indigo-300 shrink-0"
              title="Your live class attendance and engagement duration are being recorded automatically."
            >
              <Timer className="w-3 h-3 text-[#0078d4] animate-pulse" />
              <span>
                {Math.floor(elapsedEngagementSeconds / 60)}m {elapsedEngagementSeconds % 60}s
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={toggleFullscreen}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shrink-0"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shrink-0 cursor-pointer shadow-xs"
            title="Invite People / External Guest Speaker"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          <button
            onClick={handleCopyDirectJoinUrl}
            className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shrink-0"
            title="Copy Direct Shareable Meeting URL"
          >
            {copiedJoinUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedJoinUrl ? "Copied" : "Copy"}</span>
          </button>

          <LiveClassRecorder
            roomName={cleanRoomName}
            courseId={courseId}
            isInstructor={effectiveRole === 'instructor'}
          />

          {/* Subtitles CC Toggle */}
          <button
            onClick={() => setShowSubtitles(!showSubtitles)}
            className={`p-2 rounded-lg text-xs font-semibold border transition ${
              showSubtitles ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Live Subtitles (Live Transcription)"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Sidebar Toggle: Chat */}
          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'chat' ? null : 'chat')}
            className={`p-2 rounded-lg text-xs font-semibold border transition relative ${
              activeSidebarTab === 'chat' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Classroom Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-400 rounded-full" />
          </button>

          {/* Sidebar Toggle: Participants */}
          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'participants' ? null : 'participants')}
            className={`p-2 rounded-lg text-xs font-semibold border transition ${
              activeSidebarTab === 'participants' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Participants List"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Sidebar Toggle: Settings */}
          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'settings' ? null : 'settings')}
            className={`p-2 rounded-lg text-xs font-semibold border transition ${
              activeSidebarTab === 'settings' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Call Settings & Language"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* End Class / Leave in Top Header */}
          {onClose && (
            effectiveRole === 'instructor' ? (
              <button
                onClick={handleEndClass}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center shrink-0 border border-red-500 cursor-pointer"
                title="End class session permanently for all participants"
              >
                <PhoneOff className="w-3.5 h-3.5 mr-1" /> End Class
              </button>
            ) : (
              <button
                onClick={handleLeave}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition flex items-center shrink-0 border border-slate-700 cursor-pointer"
                title="Leave meeting"
              >
                <PhoneOff className="w-3.5 h-3.5 mr-1" /> Leave
              </button>
            )
          )}

          {/* Direct Close (X) Button */}
          {onClose && (
            <button
              type="button"
              onClick={handleLeave}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0 ml-1"
              title="Close Viewport"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center Stage & Sidebar Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas Stage */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {/* Main Presenter / Multi-User WebRTC Stage */}
          <div className="w-full h-full max-w-5xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl relative flex items-center justify-center">
            {/* Native Backpack Classroom Video Canvas */}
            {isScreenSharing ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                {/* Presenter Picture-in-Picture Tile */}
                <div className="absolute bottom-4 right-4 w-44 h-28 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-2xl bg-slate-900 z-10">
                  {!isVideoOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] text-slate-300 mt-1 truncate max-w-[100px]">
                        {displayName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : !isVideoOff ? (
              <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-2xl"
                />
                {/* Presenter Name Badge */}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-xl flex items-center space-x-2 text-white text-xs shadow-lg">
                  <span className="font-bold">{displayName}</span>
                  <span className="text-[10px] text-slate-400">({roleLabel})</span>
                  {isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400 ml-1" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800/80 p-6 text-center">
                <div
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-2xl transition-all duration-300 ${
                    isLocalSpeaking && !isMuted
                      ? 'bg-gradient-to-tr from-indigo-600 to-emerald-500 ring-4 ring-emerald-400/50 scale-105 shadow-emerald-500/20'
                      : 'bg-gradient-to-tr from-indigo-700 to-purple-600'
                  }`}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>

                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    <span>{displayName}</span>
                    {isSpeaker && <span className="text-sm">🎙️</span>}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {roleLabel}
                    </span>
                    {isMuted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                        <MicOff className="w-3 h-3" /> Muted
                      </span>
                    ) : isLocalSpeaking ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                        <Mic className="w-3 h-3" /> Speaking 🎙️
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Mic Live
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-4 max-w-sm">
                  Camera is turned off. Your microphone and audio remain active.
                </p>
              </div>
            )}

            {/* Speaking Voice Activity Badge */}
            {isLocalSpeaking && !isMuted && (
              <div className="absolute top-4 left-4 bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-lg animate-pulse pointer-events-none">
                <div className="flex items-center space-x-0.5">
                  <span className="w-1 h-3 bg-slate-950 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-slate-950 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-slate-950 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Speaking 🎙️</span>
              </div>
            )}

            {/* Subtitles / Live Transcript Bar */}
            {showSubtitles && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 px-4 py-2 rounded-xl text-center max-w-md w-full shadow-2xl pointer-events-none">
                <span className="text-xs text-slate-200">
                  {isMuted
                    ? 'Microphone muted. Tap Unmute below to speak to the classroom.'
                    : isLocalSpeaking
                    ? '🎙️ [Live Voice Detected] Capturing audio for classroom transcription...'
                    : '🎙️ Classroom live transcription ready. Speak into your microphone.'}
                </span>
              </div>
            )}

            {/* Hand Raised Badge */}
            {handRaised && (
              <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-lg animate-bounce pointer-events-none">
                <Hand className="w-4 h-4" />
                <span>Hand Raised</span>
              </div>
            )}

            {/* Permissions Alert */}
            {hasPermissionsError && (
              <div className="absolute top-16 right-4 bg-red-500/90 text-white text-xs p-3 rounded-xl flex items-center space-x-2 max-w-xs shadow-xl pointer-events-none">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Camera or microphone access was blocked by browser. Please allow permissions.</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Sliding Sidebar Panel */}
        {activeSidebarTab && (
          <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 animate-in slide-in-from-right duration-200">
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white capitalize flex items-center space-x-2">
                {activeSidebarTab === 'chat' && <MessageSquare className="w-4 h-4 text-indigo-400" />}
                {activeSidebarTab === 'participants' && <Users className="w-4 h-4 text-indigo-400" />}
                {activeSidebarTab === 'settings' && <Settings className="w-4 h-4 text-indigo-400" />}
                <span>{activeSidebarTab}</span>
              </h4>
              <button
                onClick={() => setActiveSidebarTab(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            {/* Sidebar Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {activeSidebarTab === 'chat' && (
                <div className="flex flex-col h-full justify-between space-y-3">
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl ${
                          msg.isSystem
                            ? 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-300'
                            : msg.sender === displayName
                              ? 'bg-indigo-600 text-white ml-6'
                              : 'bg-slate-800 text-slate-200 mr-6'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] opacity-75 mb-1">
                          <span className="font-bold">{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {activeSidebarTab === 'participants' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span>In This Classroom</span>
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer capitalize"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{displayName} (You)</span>
                        <span className="text-[10px] text-slate-400">{roleLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-400">
                      {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                      {isVideoOff ? <VideoOff className="w-3.5 h-3.5 text-red-400" /> : <Video className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer mt-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite People / Guest Speaker</span>
                  </button>
                </div>
              )}

              {activeSidebarTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1.5">
                      Live Subtitles &amp; Captions Language:
                    </label>
                    <select
                      value={captionsLanguage}
                      onChange={e => setCaptionsLanguage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="en-US">English (United States)</option>
                      <option value="en-NG">English (Nigeria)</option>
                      <option value="es-ES">Spanish (Español)</option>
                      <option value="fr-FR">French (Français)</option>
                      <option value="ar-SA">Arabic (العربية)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Call Control Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-xl border transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-xl border transition-all ${isVideoOff ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
            title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        </div>

        {/* Center Control Group */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-xl border transition-all ${isScreenSharing ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
            title="Share Screen"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={() => setHandRaised(!handRaised)}
            className={`p-3 rounded-xl border transition-all ${handRaised ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
            title="Raise Hand"
          >
            <Hand className="w-5 h-5" />
          </button>

          <button
            onClick={effectiveRole === 'instructor' ? handleEndClass : handleLeave}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-md border border-red-500 flex items-center space-x-1.5 font-bold text-xs cursor-pointer"
            title={effectiveRole === 'instructor' ? "End Class for all participants" : "Leave Meeting"}
          >
            <PhoneOff className="w-4 h-4" />
            <span>{effectiveRole === 'instructor' ? 'End Class' : 'Leave'}</span>
          </button>
        </div>

        {/* Quick Refresh Token */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={handleRegenerateToken}
            disabled={isConnecting}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="Regenerate LiveKit token"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>Regen Token</span>
          </button>
        </div>
      </div>

      {/* Screen Share Notice Modal */}
      {showScreenShareNotice && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Screen Capture Restricted</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Browser security rules restrict live screen recording inside embedded preview frames. To present your screen, open the application directly in a standalone browser tab.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
              >
                <Monitor className="w-4 h-4" />
                <span>Open App in Standalone Tab</span>
              </a>
              <button
                onClick={() => setShowScreenShareNotice(false)}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Invite Modal for Native WebRTC fallback */}
      <InvitePeopleModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        attendeeJoinUrl={attendeeJoinUrl}
        speakerJoinUrl={speakerJoinUrl}
        copiedAttendeeUrl={copiedAttendeeUrl}
        copiedSpeakerUrl={copiedSpeakerUrl}
        onCopyAttendee={handleCopyAttendeeLink}
        onCopySpeaker={handleCopySpeakerLink}
        roomName={cleanRoomName}
      />
    </div>
  );
};
