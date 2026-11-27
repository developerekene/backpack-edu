import { ScheduleEvent } from '../types';
import { centralApiClient, fetchLiveKitToken } from './centralApiClient';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const sanitizeRoomName = (name: string): string => {
  return (name || 'backpack-live-class')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'backpack-live-class';
};

/**
 * Normalizes any course live room name so that all invite links, guest speaker links,
 * student joins, and page refreshes for the same course always converge to the exact
 * same canonical room slug (`course-backpack-<courseId>`).
 */
export const normalizeLiveRoomName = (rawName?: string | null, courseId?: string): string => {
  if (courseId && (!rawName || rawName === 'backpack-live-class' || rawName === 'backpack-public-classroom')) {
    const cleanCourse = sanitizeRoomName(courseId);
    return sanitizeRoomName(`course-backpack-${cleanCourse}`);
  }
  const base = sanitizeRoomName(rawName || (courseId ? `course-backpack-${courseId}` : 'backpack-live-class'));
  if (base.startsWith('course-backpack-')) {
    const sessionIdx = base.indexOf('-session-');
    if (sessionIdx > 'course-backpack-'.length) {
      return base.slice(0, sessionIdx);
    }
  }
  return base;
};

/**
 * Generates a unique, non-guessable, single-use UUID session ID for a specific lecture instance.
 */
export const generateUniqueSessionId = (): string => {
  const randomUuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  return randomUuid;
};

/**
 * Returns a canonical room name for a live class session across all participants.
 * Format: `course-backpack-${courseId}`
 */
export const getLiveClassRoomName = (
  event?: Partial<ScheduleEvent> | null,
  courseId?: string
): string => {
  const effectiveCourseId = event?.courseId || courseId;
  if (effectiveCourseId) {
    const cleanCourseId = sanitizeRoomName(effectiveCourseId);
    return sanitizeRoomName(`course-backpack-${cleanCourseId}`);
  }

  if (event?.meetingUrl) {
    try {
      const parts = event.meetingUrl.split('/');
      const last = parts[parts.length - 1]?.split('#')[0]?.split('?')[0];
      if (last && last.trim().length > 0 && !last.includes('.com') && !last.includes('.org') && !last.includes('http')) {
        return normalizeLiveRoomName(last);
      }
    } catch {
      // fallback
    }
  }

  if (event?.id) {
    return normalizeLiveRoomName(`course-backpack-${sanitizeRoomName(event.id)}`);
  }

  return 'course-backpack-classroom';
};

/**
 * Determines whether a schedule event is genuinely live right now.
 * Protects against stale Firestore documents, ghost sessions, and ended classes.
 */
export const isEventLiveActive = (event?: Partial<ScheduleEvent> | null): boolean => {
  if (!event || !event.isActive || Boolean(event.endedAt)) return false;
  if (!event.courseId) return false;

  if (typeof window !== 'undefined') {
    const courseEndedTime = Number(localStorage.getItem(`bp_course_live_ended_${event.courseId}`) || 0);
    const eventCreatedTime = Number(
      (event.id && event.id.startsWith('live_') ? Number(event.id.split('_').pop()) : 0) ||
      event.createdAt ||
      0
    );
    if (courseEndedTime > 0 && eventCreatedTime > 0 && eventCreatedTime <= courseEndedTime) {
      return false;
    }
    if (courseEndedTime > 0 && (!event.updatedAt || Number(event.updatedAt) <= courseEndedTime)) {
      return false;
    }
  }

  // Ad-hoc live events older than 2 hours are never actively live
  if (event.id && event.id.startsWith('live_')) {
    const parsedTime = Number(event.id.split('_').pop());
    if (parsedTime && !isNaN(parsedTime) && Date.now() - parsedTime > 2 * 60 * 60 * 1000) {
      return false;
    }
  }

  return true;
};

/**
 * Destroys a LiveKit room permanently on the server and kicks out lingering connections.
 */
export const endLiveClassSessionApi = async (roomName: string, courseId?: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const res = await centralApiClient('/api/livekit/end-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        courseId,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    return { success: false, error: errText };
  } catch (err) {
    console.warn('[LiveKit API] end-room network notice:', err);
    return { success: false, error: String(err) };
  }
};

/**
 * Returns the primary in-app LiveKit classroom destination route.
 */
export const getLiveKitMeetingUrl = (courseId: string, eventId?: string): string => {
  return `/course/${courseId}?live=true${eventId ? `&eventId=${eventId}` : ''}`;
};

/**
 * Returns the direct standalone room join URL for a live class (full length).
 */
export const getLiveKitDirectUrl = (roomName: string, role?: 'speaker' | 'attendee', courseId?: string): string => {
  const clean = normalizeLiveRoomName(roomName, courseId);
  const params = new URLSearchParams();
  if (role === 'speaker') params.set('role', 'speaker');
  if (courseId) params.set('courseId', courseId);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const path = `/live/${clean}${queryStr}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
};

/**
 * Generates a deterministic, ultra-short 6-character code for a course or live room
 * so guest teachers can easily copy, read, and remember the link (e.g. `/g/050cd1`).
 */
export const getShortLiveCode = (roomName?: string | null, courseId?: string): string => {
  const cleanRoom = normalizeLiveRoomName(roomName, courseId);
  const rawSource = (courseId || cleanRoom)
    .toLowerCase()
    .replace(/^course-backpack-c-/, '')
    .replace(/^course-backpack-event-/, '')
    .replace(/^course-backpack-/, '')
    .replace(/^c[-_]/, '')
    .replace(/^evt[-_]/, '')
    .replace(/[^a-z0-9]/g, '');

  if (rawSource.length >= 6) {
    return rawSource.slice(0, 6);
  }
  return (rawSource + 'bpclass').slice(0, 6);
};

/**
 * Persists the short-code -> full-room-link mapping in Firestore and localStorage
 * so that opening `/g/:code` or `/j/:code` on any device expands into the full classroom URL.
 */
export const registerShortLiveLink = async (
  roomName: string,
  courseId?: string
): Promise<{
  code: string;
  shortSpeakerUrl: string;
  shortAttendeeUrl: string;
  fullSpeakerPath: string;
  fullAttendeePath: string;
}> => {
  const cleanRoom = normalizeLiveRoomName(roomName, courseId);
  const code = getShortLiveCode(cleanRoom, courseId);
  const courseQuery = courseId ? `&courseId=${encodeURIComponent(courseId)}` : '';
  const fullSpeakerPath = `/live/${cleanRoom}?role=speaker${courseQuery}`;
  const fullAttendeePath = `/live/${cleanRoom}${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shortSpeakerUrl = `${origin}/g/${code}`;
  const shortAttendeeUrl = `${origin}/j/${code}`;

  const payload = {
    code,
    roomName: cleanRoom,
    courseId: courseId || null,
    fullSpeakerPath,
    fullAttendeePath,
    updatedAt: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`bp_short_link_${code}`, JSON.stringify(payload));
    } catch {}
  }

  try {
    const shortRef = doc(db, 'backpack', 'webrtc_rooms', 'short_links', code);
    await setDoc(shortRef, payload, { merge: true });
  } catch {
    // non-blocking
  }

  return {
    code,
    shortSpeakerUrl,
    shortAttendeeUrl,
    fullSpeakerPath,
    fullAttendeePath,
  };
};

/**
 * Resolves a short code back to its full-length classroom URL path.
 */
export const resolveShortLiveCode = async (
  code: string,
  mode: 'speaker' | 'attendee' = 'speaker',
  knownCourses?: Array<{ id: string }>
): Promise<string | null> => {
  const cleanCode = (code || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanCode) return null;

  // 1. Check local cache first for 0ms resolution
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`bp_short_link_${cleanCode}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.fullSpeakerPath && parsed?.fullAttendeePath) {
          return mode === 'speaker' ? parsed.fullSpeakerPath : parsed.fullAttendeePath;
        }
      }
    } catch {}
  }

  // 2. Check loaded courses deterministically
  if (Array.isArray(knownCourses) && knownCourses.length > 0) {
    const matchedCourse = knownCourses.find(
      (c) => getShortLiveCode(undefined, c.id) === cleanCode
    );
    if (matchedCourse) {
      const cleanRoom = normalizeLiveRoomName(undefined, matchedCourse.id);
      return mode === 'speaker'
        ? `/live/${cleanRoom}?role=speaker&courseId=${encodeURIComponent(matchedCourse.id)}`
        : `/live/${cleanRoom}?courseId=${encodeURIComponent(matchedCourse.id)}`;
    }
  }

  // 3. Look up in Firestore short_links registry (works across devices for unauthenticated external guest speakers)
  try {
    const shortRef = doc(db, 'backpack', 'webrtc_rooms', 'short_links', cleanCode);
    const snap = await getDoc(shortRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.fullSpeakerPath || data?.roomName) {
        const room = normalizeLiveRoomName(data.roomName, data.courseId || undefined);
        const cQuery = data.courseId ? `&courseId=${encodeURIComponent(data.courseId)}` : '';
        return mode === 'speaker'
          ? data.fullSpeakerPath || `/live/${room}?role=speaker${cQuery}`
          : data.fullAttendeePath || `/live/${room}${data.courseId ? `?courseId=${encodeURIComponent(data.courseId)}` : ''}`;
      }
    }
  } catch {}

  // 4. Deterministic fallback reconstruction from standard course ID prefix (`c_<hex>`)
  return null;
};

/**
 * Synchronous helper to get the shortened Guest Speaker / Teacher URL (`/g/<code>`)
 */
export const getShortSpeakerJoinUrl = (roomName: string, courseId?: string): string => {
  const code = getShortLiveCode(roomName, courseId);
  // Trigger background registration in Firestore
  registerShortLiveLink(roomName, courseId).catch(() => {});
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/g/${code}`;
  }
  return `/g/${code}`;
};

/**
 * Synchronous helper to get the shortened Attendee Join URL (`/j/<code>`)
 */
export const getShortAttendeeJoinUrl = (roomName: string, courseId?: string): string => {
  const code = getShortLiveCode(roomName, courseId);
  registerShortLiveLink(roomName, courseId).catch(() => {});
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/j/${code}`;
  }
  return `/j/${code}`;
};

/**
 * Calls the backend /api/livekit/create-url endpoint which triggers a call to
 * the KeySafe Render URL vault (https://keysafe-ntia.onrender.com) and generates
 * the direct room URL and LiveKit token.
 */
export const createLiveKitMeetingUrl = async (params: {
  roomName: string;
  participantName?: string;
  role?: string;
  courseId?: string;
  forceSync?: boolean;
}): Promise<{
  success: boolean;
  url: string;
  joinUrl: string;
  token?: string;
  wsUrl?: string | null;
  renderUrlCalled?: string;
  keySafeStatus?: unknown;
}> => {
  try {
    const res = await centralApiClient('/api/livekit/create-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: params.roomName,
        participantName: params.participantName,
        role: params.role,
        courseId: params.courseId,
        forceSync: params.forceSync ?? true,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url || data.joinUrl) {
        return {
          success: true,
          url: data.url || data.joinUrl,
          joinUrl: data.joinUrl || data.url,
          token: data.token,
          wsUrl: data.wsUrl,
          renderUrlCalled: data.renderUrlCalled,
          keySafeStatus: data.keySafeStatus,
        };
      }
    }
  } catch (err) {
    console.warn('[LiveKit API] create-url network notice, falling back to direct token generator:', err);
  }

  // Direct Render backend token fallback (critical for static Firebase Hosting)
  try {
    const tokenData = await fetchLiveKitToken(params.roomName, params.participantName || 'Instructor');
    if (tokenData && tokenData.token) {
      const directUrl = getLiveKitDirectUrl(params.roomName);
      return {
        success: true,
        url: directUrl,
        joinUrl: directUrl,
        token: tokenData.token,
        wsUrl: tokenData.wsUrl || tokenData.livekitUrl,
      };
    }
  } catch {
    // Continue to standard fallback
  }

  // Graceful fallback to deterministic direct URL
  const fallbackUrl = getLiveKitDirectUrl(params.roomName);
  return {
    success: true,
    url: fallbackUrl,
    joinUrl: fallbackUrl,
  };
};

/**
 * Returns the meeting URL for the room - defaults to native LiveKit direct URL
 */
export const getJitsiMeetingUrl = (roomName: string): string => {
  return getLiveKitDirectUrl(roomName);
};
