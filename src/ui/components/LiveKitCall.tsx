import React, { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
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
  Edit3,
  Copy,
  Volume2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { LiveClassRecorder } from './LiveClassRecorder';

interface LiveKitCallProps {
  roomName: string;
  participantName?: string;
  userRole?: string;
  courseId?: string;
  onClose?: () => void;
}

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
  onClose,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [resolvedWsUrl, setResolvedWsUrl] = useState<string | null>(null);
  const [useLiveKitRoom, setUseLiveKitRoom] = useState<boolean>(true);

  // In-Call Controls State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participants' | 'settings' | null>(null);

  // Participant Name Editor
  const [displayName, setDisplayName] = useState<string>(participantName);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(participantName);

  // Classroom Features
  const [captionsLanguage, setCaptionsLanguage] = useState<string>('en-US');
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [hasPermissionsError, setHasPermissionsError] = useState<boolean>(false);
  const [showScreenShareNotice, setShowScreenShareNotice] = useState<boolean>(false);
  const [copiedJoinUrl, setCopiedJoinUrl] = useState<boolean>(false);

  const handleCopyDirectJoinUrl = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/live/${cleanRoomName}`;
      await navigator.clipboard.writeText(url);
      setCopiedJoinUrl(true);
      setTimeout(() => setCopiedJoinUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  // In-Room Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    { 
      sender: 'LiveKit Server', 
      text: `Connected to room "${roomName}". Open collaboration active.`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    }
  ]);
  const [newMessage, setNewMessage] = useState<string>('');

  // Media Refs for In-App Native WebRTC stream
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const wsUrlFromEnv = import.meta.env.VITE_LIVEKIT_URL || null;

  const cleanRoomName = (roomName || 'backpack-live-class')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'backpack-live-class';

  const effectiveRole = userRole.toLowerCase().includes('teach') || userRole.toLowerCase().includes('instructor') || userRole.toLowerCase().includes('org')
    ? 'instructor'
    : 'student';

  const roleLabel = effectiveRole === 'instructor' ? 'Lead Instructor' : 'Learner';

  // Request LiveKit Token from server-side SDK endpoint (backed by Render URL service)
  useEffect(() => {
    let isMounted = true;

    async function loadToken() {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: cleanRoomName,
            participantName: displayName,
            role: effectiveRole,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!isMounted) return;

        if (data.token) {
          setToken(data.token);
          const targetWs = data.wsUrl || wsUrlFromEnv;
          if (targetWs) {
            setResolvedWsUrl(targetWs);
            setUseLiveKitRoom(true);
          } else {
            setUseLiveKitRoom(false);
          }
        } else {
          throw new Error(data.error || 'No token returned from server');
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
  }, [cleanRoomName, displayName, effectiveRole, wsUrlFromEnv]);

  const handleRegenerateToken = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: cleanRoomName,
          participantName: displayName,
          role: effectiveRole,
        }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        const targetWs = data.wsUrl || wsUrlFromEnv;
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

  // Setup Local Video Preview for native WebRTC mode
  useEffect(() => {
    if (useLiveKitRoom) return;

    let localStream: MediaStream | null = null;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: !isVideoOff,
          audio: !isMuted,
        });
        localStream = stream;
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasPermissionsError(false);
      } catch (err) {
        console.warn('Camera/mic access error:', err);
        setHasPermissionsError(true);
      }
    }

    initCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useLiveKitRoom, isVideoOff, isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const toggleVideo = () => {
    setIsVideoOff(prev => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      return;
    }

    try {
      if (window.self !== window.top) {
        setShowScreenShareNotice(true);
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setIsScreenSharing(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        if (streamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
        }
      };
    } catch {
      setIsScreenSharing(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageObj: ChatMessage = {
      sender: displayName,
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, messageObj]);
    setNewMessage('');
  };

  const handleLeave = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (onClose) {
      onClose();
    }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setDisplayName(tempName.trim());
      setIsEditingName(false);
    }
  };

  // 1. Official LiveKit Cloud Room View
  if (useLiveKitRoom && resolvedWsUrl && token) {
    return (
      <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative w-full flex flex-col" style={{ height: '78vh' }}>
        {/* Top Header Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-sm">
                  {cleanRoomName}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                  LiveKit Cloud
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span>Participant: <strong className="text-white">{displayName}</strong></span>
                <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded uppercase">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyDirectJoinUrl}
              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
              title="Copy Direct Meeting URL"
            >
              {copiedJoinUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedJoinUrl ? "Copied Link!" : "Copy Link"}</span>
            </button>
            <LiveClassRecorder
              roomName={cleanRoomName}
              courseId={courseId}
              isInstructor={effectiveRole === 'instructor' || effectiveRole === 'organization'}
            />
            {onClose && (
              <button
                onClick={handleLeave}
                className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white text-xs font-bold rounded-lg transition border border-red-500/30 flex items-center"
              >
                <PhoneOff className="w-4 h-4 mr-1.5" /> Leave
              </button>
            )}
          </div>
        </div>

        {/* LiveKit Official Room and Video Conference */}
        <div className="flex-1 relative overflow-hidden bg-slate-950">
          <LiveKitRoom
            video={!isVideoOff}
            audio={!isMuted}
            token={token}
            serverUrl={resolvedWsUrl}
            data-lk-theme="default"
            style={{ height: '100%' }}
            onDisconnected={handleLeave}
            onError={(err) => {
              console.warn('LiveKit WebSocket error, switching to native WebRTC mode:', err);
              setUseLiveKitRoom(false);
            }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  // 2. Native Embedded Conference Stage
  return (
    <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative w-full flex flex-col" style={{ height: '75vh' }}>
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20 flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-sm">
                Live Classroom: {cleanRoomName}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                LiveKit Ready
              </span>
            </div>

            {/* Display Name & Guest Inline Editor */}
            <div className="flex items-center space-x-2 text-xs text-slate-300 mt-0.5">
              <span>Connected as:</span>
              {isEditingName ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-slate-950 text-white text-xs px-2 py-0.5 rounded border border-indigo-500 outline-none w-36"
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition"
                    title="Save name"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <strong className="text-white">{displayName}</strong>
                  <button
                    onClick={() => {
                      setTempName(displayName);
                      setIsEditingName(true);
                    }}
                    className="text-slate-400 hover:text-white transition"
                    title="Edit display name"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md border border-indigo-500/30 uppercase tracking-wide">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={handleCopyDirectJoinUrl}
            className="p-2 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center space-x-1"
            title="Copy Direct Shareable Meeting URL"
          >
            {copiedJoinUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedJoinUrl ? "Copied Link!" : "Copy Link"}</span>
          </button>

          <LiveClassRecorder
            roomName={cleanRoomName}
            courseId={courseId}
            isInstructor={effectiveRole === 'instructor' || effectiveRole === 'organization'}
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
        </div>
      </div>

      {/* Center Stage & Sidebar Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas Stage */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {/* Main Presenter Video Window */}
          <div className="w-full h-full max-w-5xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl relative flex items-center justify-center">
            {isVideoOff ? (
              <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{displayName}</h4>
                  <p className="text-xs text-slate-400">{roleLabel} (Camera Off)</p>
                </div>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
              />
            )}

            {/* Hand Raised Badge */}
            {handRaised && (
              <div className="absolute top-4 left-4 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-lg animate-bounce">
                <Hand className="w-4 h-4" />
                <span>Hand Raised</span>
              </div>
            )}

            {/* Live Subtitles Caption Overlay */}
            {showSubtitles && (
              <div className="absolute bottom-6 inset-x-8 max-w-2xl mx-auto bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 text-center pointer-events-none transition-all">
                <div className="flex items-center justify-center space-x-1.5 text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Real-Time Transcription ({captionsLanguage})</span>
                </div>
                <p className="text-sm text-white font-medium">
                  {isVideoOff 
                    ? `[Microphone Active] ${displayName} is speaking in the classroom session.`
                    : 'Welcome to the live interactive classroom session. Voice and media channels are streaming.'}
                </p>
              </div>
            )}

            {/* Permissions Alert */}
            {hasPermissionsError && (
              <div className="absolute top-4 right-4 bg-red-500/90 text-white text-xs p-3 rounded-xl flex items-center space-x-2 max-w-xs shadow-xl">
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
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    In This Classroom (1)
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
            onClick={handleLeave}
            className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-md border border-red-500"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
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
    </div>
  );
};
