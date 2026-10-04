import React, { useState } from 'react';
import { 
  useLocalParticipant, 
  useRemoteParticipants,
  useIsSpeaking 
} from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, 
  Volume2, Search, Crown
} from 'lucide-react';

interface PresenceUser {
  userId: string;
  userName: string;
  role: string;
}

interface LiveClassParticipantListProps {
  onlinePresenceList?: PresenceUser[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  isInstructor?: boolean;
}

export const LiveKitParticipantItem: React.FC<{
  participant: Participant;
  isLocal?: boolean;
}> = ({ participant, isLocal }) => {
  const isSpeaking = useIsSpeaking(participant);
  const isMuted = !participant.isMicrophoneEnabled;
  const isVideoOff = !participant.isCameraEnabled;
  const isScreenSharing = participant.isScreenShareEnabled;

  const displayName = participant.name || participant.identity || (isLocal ? 'You' : 'Participant');
  
  let role = 'student';
  try {
    if (participant.metadata) {
      const meta = JSON.parse(participant.metadata);
      if (meta.role) role = meta.role;
    }
  } catch {
    // fallback
  }

  const roleLabel = role === 'instructor' ? 'Instructor' : role === 'organization' ? 'Organization' : 'Student';
  const roleBadgeColor = role === 'instructor' 
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : role === 'organization'
    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

  return (
    <div className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
      isSpeaking 
        ? 'bg-indigo-950/60 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30' 
        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-800'
    }`}>
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-purple-600 text-white border border-slate-600 flex items-center justify-center font-bold text-xs shadow-sm">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          {isSpeaking && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          )}
        </div>

        <div className="truncate">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-bold text-white text-xs truncate">{displayName}</span>
            {isLocal && (
              <span className="text-[10px] text-emerald-400 font-semibold">(You)</span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider ${roleBadgeColor}`}>
              {roleLabel}
            </span>
            {isSpeaking && (
              <span className="text-[10px] text-emerald-400 flex items-center">
                <Volume2 className="w-3 h-3 mr-0.5 animate-bounce" /> Speaking
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1 text-slate-400">
        {isScreenSharing && (
          <span className="p-1 rounded bg-indigo-500/20 text-indigo-300" title="Sharing screen">
            <Monitor className="w-3.5 h-3.5 animate-pulse" />
          </span>
        )}
        <span className={`p-1 rounded ${isVideoOff ? 'text-red-400 bg-red-500/10' : 'text-slate-300'}`} title={isVideoOff ? 'Camera off' : 'Camera on'}>
          {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
        </span>
        <span className={`p-1 rounded ${isMuted ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`} title={isMuted ? 'Muted' : 'Unmuted'}>
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </span>
      </div>
    </div>
  );
};

// Hooked roster when inside LiveKitRoom
export const LiveKitConnectedRoster: React.FC<{ searchTerm?: string }> = ({ searchTerm = '' }) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {localParticipant && (
        <LiveKitParticipantItem participant={localParticipant} isLocal={true} />
      )}
      {remoteParticipants
        .filter(p => (p.name || p.identity || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .map(p => (
          <LiveKitParticipantItem key={p.sid || p.identity} participant={p} isLocal={false} />
        ))}
    </div>
  );
};

// Standalone presence & roster view with search & roles
export const LiveClassParticipantList: React.FC<LiveClassParticipantListProps> = ({
  onlinePresenceList = [],
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPresence = onlinePresenceList.filter(p => 
    p.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter classroom members..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300">Classroom Members ({onlinePresenceList.length})</span>
        <span className="text-[10px] text-emerald-400 flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
          Connected
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredPresence.map(p => {
          const isMe = p.userId === currentUserId;
          const isTeach = p.role === 'instructor' || p.role === 'organization';
          
          return (
            <div
              key={p.userId}
              className="p-2.5 bg-slate-800/85 hover:bg-slate-800 rounded-xl border border-slate-700/60 flex items-center justify-between shadow-sm transition"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-purple-600 text-white border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                  {p.userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="font-bold text-white text-xs truncate">{p.userName}</span>
                    {isMe && <span className="text-[10px] text-emerald-400 font-bold">(You)</span>}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider ${
                      p.role === 'instructor'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : p.role === 'organization'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}>
                      {p.role}
                    </span>
                    {isTeach && (
                      <span className="text-[10px] text-amber-400 flex items-center">
                        <Crown className="w-3 h-3 mr-0.5" /> Host
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
