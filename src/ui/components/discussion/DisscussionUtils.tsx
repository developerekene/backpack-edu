const readLS = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLS = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/serialization errors -- unread badges are a nicety, not
    // something worth surfacing an error to the user for
  }
};

export function getLastRead(
  courseId: string,
  channelId: string,
  userId: string,
): number {
  const map = readLS<Record<string, number>>(`bp_disc_lastread_${userId}`, {});
  return map[`${courseId}_${channelId}`] || 0;
}

export function markChannelRead(
  courseId: string,
  channelId: string,
  userId: string,
) {
  const key = `bp_disc_lastread_${userId}`;
  const map = readLS<Record<string, number>>(key, {});
  map[`${courseId}_${channelId}`] = Date.now();
  writeLS(key, map);
}

export function getSavedMessageIds(userId: string): string[] {
  return readLS<string[]>(`bp_disc_saved_${userId}`, []);
}

export function toggleSavedMessage(
  userId: string,
  messageId: string,
): string[] {
  const key = `bp_disc_saved_${userId}`;
  const current = readLS<string[]>(key, []);
  const next = current.includes(messageId)
    ? current.filter((id) => id !== messageId)
    : [...current, messageId];
  writeLS(key, next);
  return next;
}

export function getSubscribedLocally(
  userId: string,
  channelId: string,
): boolean {
  return readLS<string[]>(`bp_disc_subs_${userId}`, []).includes(channelId);
}

/** Buckets message timestamps into day-by-day counts for the last N days,
 *  for the activity sparkline. Derived entirely from data already loaded --
 *  no separate "analytics" storage needed. */
export function bucketActivity(
  timestamps: number[],
  days = 7,
): { label: string; count: number }[] {
  const buckets: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const count = timestamps.filter((t) => t >= dayStart && t < dayEnd).length;
    buckets.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count,
    });
  }
  return buckets;
}
