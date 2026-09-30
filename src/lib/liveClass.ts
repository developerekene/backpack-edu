import { ScheduleEvent } from '../types';

export const sanitizeRoomName = (name: string): string => {
  return (name || 'backpack-live-class')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'backpack-live-class';
};

/**
 * Returns a deterministic, consistent room name for live classes across all participants.
 * If meetingUrl is provided, it extracts the room name from it.
 * Otherwise, it constructs a shared canonical room name based on courseId.
 */
export const getLiveClassRoomName = (
  event?: Partial<ScheduleEvent> | null,
  courseId?: string
): string => {
  if (event?.meetingUrl) {
    try {
      const parts = event.meetingUrl.split('/');
      const last = parts[parts.length - 1]?.split('#')[0]?.split('?')[0];
      if (last && last.trim().length > 0 && !last.includes('.com') && !last.includes('.org')) {
        return sanitizeRoomName(last);
      }
    } catch {
      // fallback
    }
  }

  const effectiveCourseId = event?.courseId || courseId || 'classroom';
  return sanitizeRoomName(`backpack-live-${effectiveCourseId}`);
};

/**
 * Returns the primary in-app LiveKit classroom destination route.
 */
export const getLiveKitMeetingUrl = (courseId: string, eventId?: string): string => {
  return `/course/${courseId}?live=true${eventId ? `&eventId=${eventId}` : ''}`;
};

/**
 * Returns the full Jitsi Meet URL as an external fallback when LiveKit cloud WebSocket is not configured
 */
export const getJitsiMeetingUrl = (roomName: string, displayName?: string): string => {
  const clean = sanitizeRoomName(roomName);
  const nameParam = displayName ? `&userInfo.displayName=${encodeURIComponent(displayName)}` : '';
  return `https://meet.jit.si/${clean}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true${nameParam}`;
};
