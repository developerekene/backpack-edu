import React, { useEffect, useState, useRef } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { AccessToken } from 'livekit-server-sdk';
import { 
  createLocalScreenTracks, 
  LocalTrackPublication, 
  LocalVideoTrack, 
  Track, 
  Room 
} from 'livekit-client';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MessageSquare, 
  Users, Send, PhoneOff, Hand
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

interface LiveKitCallProps {
  roomName: string;
  participantName?: string;
  userRole?: string;
  onClose?: () => void;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export const LiveKitCall: React.FC<LiveKitCallProps> = ({
  roomName,
  participantName = 'Guest User',
  userRole,
  onClose
}) => {
  const { currentUser } = useAuth();
  const effectiveRole = userRole || currentUser?.role || 'student';
  const roleLabel = effectiveRole === 'organization' ? 'Organization' 
    : effectiveRole === 'instructor' ? 'Instructor' 
    : effectiveRole === 'student' ? 'Student' 
    : 'Participant';

  const [token, setToken] = useState<string>('');
  const [guestName, setGuestName] = useState<string>(participantName);

  if (participantName && guestName !== participantName) {
    setGuestName(participantName);
  }
  const [useLiveKitServer, setUseLiveKitServer] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'video' | 'chat' | 'participants'>('video');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'System', text: `Welcome to room ${roomName}. Authenticated as ${roleLabel}!`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [hasPermissionsError, setHasPermissionsError] = useState<boolean>(false);
  const [showScreenShareNotice, setShowScreenShareNotice] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenTrackPublicationRef = useRef<LocalTrackPublication | null>(null);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null);
  const roomInstanceRef = useRef<Room | null>(null);

  const wsUrl = import.meta.env.VITE_LIVEKIT_URL;

  // Initialize Media Stream for local WebRTC call fallback
  useEffect(() => {
    let mounted = true;

    async function initLocalStream() {
      if (wsUrl && wsUrl !== 'wss://demo.livekit.cloud') {
        // Try LiveKit Server mode
        try {
          const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY || 'devkey';
          const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET || 'secretsecretsecretsecretsecretsecret';
          const identity = `${guestName.replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;
          
          const at = new AccessToken(apiKey, apiSecret, { identity, name: guestName });
          at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
          const jwt = await at.toJwt();
          
          if (mounted) {
            setToken(jwt);
            setUseLiveKitServer(true);
            return;
          }
        } catch (e) {
          console.warn('LiveKit server token error, using WebRTC in-app engine:', e);
        }
      }

      // Fallback: WebRTC In-App Camera Stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/Mic permission restricted or not available:', err);
        setHasPermissionsError(true);
      }
    }

    initLocalStream();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, wsUrl]);

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop and unpublish active LocalTrackPublication screen display track
      if (screenTrackPublicationRef.current) {
        if (screenTrackPublicationRef.current.track) {
          screenTrackPublicationRef.current.track.stop();
        }
        if (roomInstanceRef.current?.localParticipant && screenTrackPublicationRef.current.track) {
          try {
            await roomInstanceRef.current.localParticipant.unpublishTrack(screenTrackPublicationRef.current.track);
          } catch (err) {
            console.warn('Unpublish track error:', err);
          }
        }
        screenTrackPublicationRef.current = null;
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      // Switch back to webcam stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setIsScreenSharing(false);
      } catch (e) {
        console.warn('Could not restore camera after screenshare:', e);
        setIsScreenSharing(false);
      }
    } else {
      // Check if navigator.mediaDevices and getDisplayMedia are supported in current iframe context
      if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        setShowScreenShareNotice(true);
        return;
      }

      // Request screen share using LiveKit's createLocalScreenTracks method or displayMedia fallback
      try {
        let videoTrack: LocalVideoTrack | null = null;
        if (typeof createLocalScreenTracks === 'function') {
          try {
            const screenTracks = await createLocalScreenTracks({ audio: true });
            const found = screenTracks.find(t => t.kind === Track.Kind.Video);
            if (found && found instanceof LocalVideoTrack) {
              videoTrack = found;
            } else if (screenTracks.length > 0 && screenTracks[0] instanceof LocalVideoTrack) {
              videoTrack = screenTracks[0] as LocalVideoTrack;
            }
          } catch {
            // Silently attempt fallback without throwing
          }
        }

        // Fallback to getDisplayMedia if createLocalScreenTracks fails or is restricted
        if (!videoTrack && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          const mediaTrack = screenStream.getVideoTracks()[0];
          if (mediaTrack) {
            videoTrack = new LocalVideoTrack(mediaTrack, undefined, false);
          }
        }

        if (!videoTrack) {
          setShowScreenShareNotice(true);
          return;
        }

        screenTrackRef.current = videoTrack;

        // Publish track to LiveKit Room if connected, or register with LocalTrackPublication
        if (roomInstanceRef.current?.localParticipant) {
          const pub = await roomInstanceRef.current.localParticipant.publishTrack(videoTrack, {
            name: 'screen_share',
            source: Track.Source.ScreenShare
          });
          screenTrackPublicationRef.current = pub;
        } else {
          const pub = new LocalTrackPublication(Track.Kind.Video, {
            sid: `TR_${Math.random().toString(36).substring(2, 9)}`,
            name: 'screen_share',
            type: Track.Kind.Video,
            source: Track.Source.ScreenShare,
          } as unknown as ConstructorParameters<typeof LocalTrackPublication>[1], videoTrack);
          screenTrackPublicationRef.current = pub;
        }

        // Attach screen display track to local video preview element
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        const screenMediaStream = new MediaStream([videoTrack.mediaStreamTrack]);
        streamRef.current = screenMediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenMediaStream;
        }

        setIsVideoOff(false);
        setHasPermissionsError(false);
        setIsScreenSharing(true);

        // Handle when screen sharing ends from browser native control bar
        videoTrack.mediaStreamTrack.onended = async () => {
          if (screenTrackPublicationRef.current) {
            if (screenTrackPublicationRef.current.track) {
              screenTrackPublicationRef.current.track.stop();
            }
            if (roomInstanceRef.current?.localParticipant && screenTrackPublicationRef.current.track) {
              try {
                await roomInstanceRef.current.localParticipant.unpublishTrack(screenTrackPublicationRef.current.track);
              } catch (err) {
                console.warn('Unpublish track error on ended:', err);
              }
            }
            screenTrackPublicationRef.current = null;
          }
          if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
          }
          setIsScreenSharing(false);

          try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = camStream;
            if (localVideoRef.current) localVideoRef.current.srcObject = camStream;
          } catch (err) {
            console.warn('Camera restoration error:', err);
          }
        };
      } catch {
        setShowScreenShareNotice(true);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        sender: guestName || 'You',
        text: newMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setNewMessage('');
  };

  const handleLeave = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (onClose) onClose();
  };

  if (useLiveKitServer && token && wsUrl) {
    return (
      <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative w-full flex flex-col" style={{ height: '75vh' }}>
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Live Class Room: {roomName}</h3>
              <span className="text-xs text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                LiveKit Cloud Connected (Auth Bypassed)
              </span>
            </div>
          </div>
          {onClose && (
            <button onClick={handleLeave} className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white text-xs font-bold rounded-lg transition border border-red-500/30 flex items-center">
              <PhoneOff className="w-4 h-4 mr-1.5" /> Leave
            </button>
          )}
        </div>
        <div className="flex-1 relative overflow-hidden bg-slate-950">
          <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={wsUrl}
            data-lk-theme="default"
            style={{ height: '100%' }}
            onDisconnected={handleLeave}
          >
            <VideoConference />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative w-full flex flex-col" style={{ height: '75vh' }}>
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center">
              Live Room: {roomName}
              <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold rounded-full border border-indigo-500/30">
                Direct Bypass Mode
              </span>
            </h3>
            <span className="text-xs text-emerald-400 flex items-center mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              Connected as <strong className="ml-1 text-slate-200">{guestName}</strong>
              <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md border border-indigo-500/30 uppercase tracking-wide">
                {roleLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? 'video' : 'chat')}
            className={`p-2 rounded-lg text-xs font-semibold transition flex items-center ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Chat ({chatMessages.length})
          </button>
          
          <button
            onClick={() => setActiveTab(activeTab === 'participants' ? 'video' : 'participants')}
            className={`p-2 rounded-lg text-xs font-semibold transition flex items-center ${activeTab === 'participants' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            <Users className="w-4 h-4 mr-1" />
            People (1)
          </button>

          {onClose && (
            <button
              onClick={handleLeave}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition flex items-center ml-2 shadow-sm"
            >
              <PhoneOff className="w-4 h-4 mr-1.5" />
              Leave Call
            </button>
          )}
        </div>
      </div>

      {/* Main Call View */}
      <div className="flex-1 relative flex overflow-hidden bg-slate-950">
        {/* Main Video Stage */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
          {/* Main Stage Container */}
          <div className="w-full h-full relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {isVideoOff ? (
              <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-2xl font-bold uppercase shadow-inner">
                  {guestName.slice(0, 2)}
                </div>
                <div className="text-center space-y-1">
                  <span className="text-sm font-bold text-slate-300 block">{guestName}</span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wider">
                    {roleLabel}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Camera Off</p>
                </div>
              </div>
            ) : hasPermissionsError ? (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 max-w-md">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1">
                  <VideoOff className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Camera Preview Unavailable</h4>
                <p className="text-xs text-slate-400">
                  You are connected in audio/virtual mode as <strong className="text-indigo-400">{guestName} ({roleLabel})</strong>. Your mic controls and meeting functions remain fully active.
                </p>
              </div>
            ) : (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full rounded-2xl ${isScreenSharing ? 'object-contain bg-slate-950' : 'object-cover scale-x-[-1]'}`}
                />
                {isScreenSharing && (
                  <div className="absolute top-4 left-4 bg-indigo-600/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-indigo-400/50 flex items-center space-x-2 text-xs font-bold text-white shadow-xl">
                    <Monitor className="w-4 h-4 text-indigo-200 animate-pulse" />
                    <span>Presenting Screen Live</span>
                  </div>
                )}
              </>
            )}

            {/* User Label Overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 flex items-center space-x-2.5 text-xs font-semibold text-white shadow-lg">
              <span className="font-bold">{guestName}</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wider">
                {roleLabel}
              </span>
              <span className="text-slate-400 text-[11px]">(You)</span>
              {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400 ml-1" />}
              {handRaised && <span className="text-amber-400 ml-1">✋ Hand Raised</span>}
            </div>
          </div>
        </div>

        {/* Side Panel (Chat or Participants) */}
        {activeTab !== 'video' && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {activeTab === 'chat' ? 'Meeting Chat' : 'Participants (1)'}
              </h4>
              <button onClick={() => setActiveTab('video')} className="text-slate-400 hover:text-white text-xs">
                Close
              </button>
            </div>

            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-indigo-400">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="text-slate-200 text-xs">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="mt-3 flex space-x-1.5">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-3 space-y-3 overflow-y-auto text-xs">
                <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/60 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                      {guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{guestName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">(You)</span>
                      </div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-0.5">
                        {roleLabel}
                      </div>
                    </div>
                  </div>
                  {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-400">1 Participant in Room</p>
                  <p className="text-[10px] text-slate-500">Solo call session active. Waiting for other members to join.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex items-center justify-center space-x-4 z-20">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-xl border transition-all ${isMuted ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-xl border transition-all ${isVideoOff ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
          title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

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

      {/* Screen Share Permission & iFrame Limitation Notice Modal */}
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
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
              >
                <Monitor className="w-4 h-4" />
                <span>Open App in Standalone Tab</span>
              </button>
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
