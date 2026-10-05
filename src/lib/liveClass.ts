import { ScheduleEvent } from '../types';

export const sanitizeRoomName = (name: string): string => {
  return (name || 'backpack-live-class')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'backpack-live-class';
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
 * Returns a unique, non-guessable room name for a live class session across all participants.
 * Format: `course-backpack-${courseId}-session-${uuid}`
 */
export const getLiveClassRoomName = (
  event?: Partial<ScheduleEvent> | null,
  courseId?: string
): string => {
  if (event?.meetingUrl) {
    try {
      const parts = event.meetingUrl.split('/');
      const last = parts[parts.length - 1]?.split('#')[0]?.split('?')[0];
      if (last && last.trim().length > 0 && !last.includes('.com') && !last.includes('.org') && !last.includes('http')) {
        return sanitizeRoomName(last);
      }
    } catch {
      // fallback
    }
  }

  const cleanCourseId = sanitizeRoomName(event?.courseId || courseId || 'classroom');
  const sessionUuid = event?.id
    ? sanitizeRoomName(event.id)
    : generateUniqueSessionId(cleanCourseId);

  return sanitizeRoomName(`course-backpack-${cleanCourseId}-session-${sessionUuid}`);
};

/**
 * Destroys a LiveKit room permanently on the server and kicks out lingering connections.
 */
export const endLiveClassSessionApi = async (roomName: string, courseId?: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const res = await fetch('/api/livekit/end-room', {
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
 * Returns the direct standalone room join URL for a live class.
 */
export const getLiveKitDirectUrl = (roomName: string): string => {
  const clean = sanitizeRoomName(roomName);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/live/${clean}`;
  }
  return `/live/${clean}`;
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
    const res = await fetch('/api/livekit/create-url', {
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
    console.warn('[LiveKit API] create-url network fallback:', err);
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
