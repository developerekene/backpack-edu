import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeLiveRoomName } from './liveClass';

export interface WebRtcParticipant {
  id: string;
  displayName: string;
  role: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  handRaised?: boolean;
  isSpeaking?: boolean;
  joinedAt?: number;
  lastSeen?: number;
}

export interface WebRtcSignal {
  id?: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  targetId: string | null;
  type:
    | 'offer'
    | 'answer'
    | 'candidate'
    | 'mute-state'
    | 'video-state'
    | 'hand-state'
    | 'chat'
    | 'room-ended';
  data?: any;
  createdAt: number;
}

/**
 * Production-ready WebRTC ICE Servers.
 * Combines Google & Cloudflare global STUN with OpenRelay worldwide TURN relays (UDP & TCP port 443)
 * ensuring connections succeed across different networks, mobile carriers, NATs, and firewalls.
 */
export const WEBRTC_ICE_SERVERS: RTCIceServer[] = [
  // Google Global Public STUN
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // OpenRelay Public STUN (Port 80)
  { urls: 'stun:openrelay.metered.ca:80' },
  // OpenRelay Public TURN (UDP Port 80 & 443 + TCP/TLS Port 443 for strict mobile/corporate NATs)
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

/**
 * Registers participant in Firestore room and maintains real-time presence & signaling listeners.
 * Works globally in production (Firebase Hosting) and localhost with zero custom server dependency.
 */
export function joinWebRtcRoom(
  roomName: string,
  participant: WebRtcParticipant,
  onPeersUpdate: (peers: WebRtcParticipant[]) => void,
  onSignal: (signal: WebRtcSignal) => void
): () => void {
  const cleanRoom = normalizeLiveRoomName(roomName);
  const roomDocRef = doc(db, 'backpack', 'webrtc_rooms', 'rooms', cleanRoom);
  const participantRef = doc(
    db,
    'backpack',
    'webrtc_rooms',
    'rooms',
    cleanRoom,
    'participants',
    participant.id
  );

  const now = Date.now();
  const sessionStartTime = now;

  // 0. Mark room active in Firestore
  setDoc(
    roomDocRef,
    {
      roomName: cleanRoom,
      status: 'active',
      updatedAt: now,
    },
    { merge: true }
  ).catch(() => {});

  // 1. Write initial participant presence record
  setDoc(
    participantRef,
    {
      id: participant.id,
      displayName: participant.displayName || 'Participant',
      role: participant.role || 'student',
      isMuted: Boolean(participant.isMuted),
      isVideoOff: Boolean(participant.isVideoOff),
      handRaised: Boolean(participant.handRaised),
      joinedAt: now,
      lastSeen: now,
    },
    { merge: true }
  ).catch((err) => {
    console.warn('[WebRTC Firestore] Join presence write notice:', err);
  });

  // 2. Heartbeat timer: keep lastSeen updated every 12s
  const heartbeatTimer = setInterval(() => {
    setDoc(
      participantRef,
      {
        lastSeen: Date.now(),
      },
      { merge: true }
    ).catch(() => {});
  }, 12000);

  // 3. Listen to participants subcollection in real time
  const participantsCol = collection(
    db,
    'backpack',
    'webrtc_rooms',
    'rooms',
    cleanRoom,
    'participants'
  );

  const unsubParticipants: Unsubscribe = onSnapshot(
    participantsCol,
    (snapshot) => {
      const activePeers: WebRtcParticipant[] = [];
      const currentCutoff = Date.now() - 60000; // filter out crashed tabs inactive for >60s

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WebRtcParticipant;
        if (data && data.id && data.id !== participant.id) {
          if (!data.lastSeen || data.lastSeen > currentCutoff) {
            activePeers.push(data);
          }
        }
      });

      onPeersUpdate(activePeers);
    },
    (err) => {
      console.warn('[WebRTC Firestore] participants snapshot warning:', err);
    }
  );

  // 4. Listen to incoming signals subcollection in real time
  const signalsCol = collection(
    db,
    'backpack',
    'webrtc_rooms',
    'rooms',
    cleanRoom,
    'signals'
  );

  const processedSignalIds = new Set<string>();

  const unsubSignals: Unsubscribe = onSnapshot(
    signalsCol,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          if (processedSignalIds.has(docId)) return;
          processedSignalIds.add(docId);

          const signal = change.doc.data() as WebRtcSignal;
          if (!signal || signal.senderId === participant.id) return;

          // Only process signals intended for this participant or broadcast to all
          const isForMe =
            signal.targetId === participant.id ||
            signal.targetId === null ||
            signal.targetId === 'all';

          // Ignore stale signals from older sessions (>45s before we joined)
          if (isForMe && (!signal.createdAt || signal.createdAt >= sessionStartTime - 45000)) {
            onSignal({ ...signal, id: docId });

            // Automatically delete processed point-to-point signals to keep subcollection fast & clean
            if (signal.targetId === participant.id) {
              deleteDoc(change.doc.ref).catch(() => {});
            }
          }
        }
      });
    },
    (err) => {
      console.warn('[WebRTC Firestore] signals snapshot warning:', err);
    }
  );

  // 5. Cleanup on unload / leave
  const cleanup = () => {
    clearInterval(heartbeatTimer);
    unsubParticipants();
    unsubSignals();
    deleteDoc(participantRef).catch(() => {});
  };

  const handleBeforeUnload = () => {
    deleteDoc(participantRef).catch(() => {});
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    }
    cleanup();
  };
}

/**
 * Removes a leaving participant from Firestore and checks whether any active participants remain.
 * If 0 active participants remain (the last person just left), marks the room as 'empty' / dropped
 * and returns `{ isRoomNowEmpty: true }` so the caller can drop the live session completely.
 */
export async function leaveWebRtcRoomAndCheckEmpty(
  roomName: string,
  userId: string
): Promise<{ isRoomNowEmpty: boolean; remainingCount: number }> {
  const cleanRoom = normalizeLiveRoomName(roomName);
  const roomDocRef = doc(db, 'backpack', 'webrtc_rooms', 'rooms', cleanRoom);
  const participantRef = doc(
    db,
    'backpack',
    'webrtc_rooms',
    'rooms',
    cleanRoom,
    'participants',
    userId
  );

  try {
    await deleteDoc(participantRef);
  } catch {}

  try {
    const participantsCol = collection(
      db,
      'backpack',
      'webrtc_rooms',
      'rooms',
      cleanRoom,
      'participants'
    );
    const snap = await getDocs(participantsCol);
    const currentCutoff = Date.now() - 60000;
    let remainingCount = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as WebRtcParticipant;
      if (data && data.id && data.id !== userId) {
        if (!data.lastSeen || data.lastSeen > currentCutoff) {
          remainingCount++;
        } else {
          // Clean up stale crashed tab record
          deleteDoc(docSnap.ref).catch(() => {});
        }
      }
    });

    if (remainingCount === 0) {
      await setDoc(
        roomDocRef,
        {
          roomName: cleanRoom,
          status: 'empty',
          endedAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch(() => {});
      return { isRoomNowEmpty: true, remainingCount: 0 };
    }

    return { isRoomNowEmpty: false, remainingCount };
  } catch {
    return { isRoomNowEmpty: false, remainingCount: 0 };
  }
}

/**
 * Sends a WebRTC signal (offer, answer, ICE candidate, mute/video state, chat) via Firestore.
 * Plain-serializes SDP & ICE candidate objects so Firestore never rejects browser prototype objects.
 */
export async function sendWebRtcSignal(
  roomName: string,
  signal: Omit<WebRtcSignal, 'createdAt'>
): Promise<void> {
  const cleanRoom = normalizeLiveRoomName(roomName);
  const signalsCol = collection(
    db,
    'backpack',
    'webrtc_rooms',
    'rooms',
    cleanRoom,
    'signals'
  );
  const signalDoc = doc(signalsCol);

  let serializedData: any = null;
  if (signal.data !== undefined && signal.data !== null) {
    try {
      serializedData = JSON.parse(JSON.stringify(signal.data));
    } catch {
      serializedData = null;
    }
  }

  await setDoc(signalDoc, {
    senderId: signal.senderId,
    senderName: signal.senderName || 'Participant',
    senderRole: signal.senderRole || 'student',
    targetId: signal.targetId ?? null,
    type: signal.type,
    data: serializedData,
    createdAt: Date.now(),
  }).catch((err) => {
    console.warn('[WebRTC Firestore] Failed to send signal:', err);
  });
}

/**
 * Updates participant media/profile state (name, microphone muted, camera off, hand raised) in Firestore.
 */
export async function updateParticipantMediaState(
  roomName: string,
  userId: string,
  state: {
    displayName?: string;
    role?: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
    handRaised?: boolean;
  }
): Promise<void> {
  const cleanRoom = normalizeLiveRoomName(roomName);
  const participantRef = doc(
    db,
    'backpack',
    'webrtc_rooms',
    'rooms',
    cleanRoom,
    'participants',
    userId
  );
  await setDoc(
    participantRef,
    {
      ...state,
      lastSeen: Date.now(),
    },
    { merge: true }
  ).catch(() => {});
}

/**
 * Ends a WebRTC classroom session across all participants (throws everyone out of the call).
 */
export async function endWebRtcClassroom(
  roomName: string,
  senderId: string
): Promise<void> {
  const cleanRoom = normalizeLiveRoomName(roomName);
  const roomDocRef = doc(db, 'backpack', 'webrtc_rooms', 'rooms', cleanRoom);

  await sendWebRtcSignal(cleanRoom, {
    senderId,
    senderName: 'Host',
    targetId: null,
    type: 'room-ended',
  });

  await setDoc(
    roomDocRef,
    {
      roomName: cleanRoom,
      status: 'ended',
      endedAt: Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  ).catch(() => {});

  // Delete all participant documents so the room is completely cleared
  try {
    const participantsCol = collection(
      db,
      'backpack',
      'webrtc_rooms',
      'rooms',
      cleanRoom,
      'participants'
    );
    const snap = await getDocs(participantsCol);
    snap.forEach((docSnap) => {
      deleteDoc(docSnap.ref).catch(() => {});
    });
  } catch {
    const participantRef = doc(
      db,
      'backpack',
      'webrtc_rooms',
      'rooms',
      cleanRoom,
      'participants',
      senderId
    );
    await deleteDoc(participantRef).catch(() => {});
  }
}
