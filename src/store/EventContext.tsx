import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role } from "../types";
import { generateId } from "../lib/id";
import type { EventMode } from "../lib/eventMeta";

/* ============================================================= */
/* Types                                                         */
/* ============================================================= */

/** The user who created an event. */
export interface EventCreator {
  id: string;
  name: string;
  email?: string;
  role?: Role;
}

/** A single attendance record for an event. */
export interface EventAttendee {
  userId: string;
  name: string;
  email?: string;
  role?: Role;
  status: "going" | "maybe" | "not_going";
  /** The course the attendee is enrolled in for this event. */
  courseId?: string;
  /** Course name captured at the time of joining, for display. */
  courseTitle?: string;
  joinedAt: string;
}

/** The core event shape stored & displayed by the app. */
export interface AppEvent {
  id: string;
  /** Event title, e.g. "Orientation & Platform Tour". */
  title: string;
  /** Short subject / summary line for the event. */
  subject: string;
  /** Optional longer description. */
  description?: string;
  /** Date string (ISO `YYYY-MM-DD` recommended). */
  date: string;
  /** Time string, e.g. "10:00 AM". */
  time: string;
  /** Physical or virtual location label, e.g. "Main Auditorium / Zoom". */
  location: string;
  /** Meeting / registration link. */
  link?: string;
  /** Related course id (if the event belongs to a course). */
  courseId?: string;
  /** Related course name for display. */
  courseTitle?: string;
  /** Qualification level this event targets, e.g. "bachelors". */
  courseType?: string;
  /** How the event takes place — online, onsite, or general. */
  mode?: EventMode;
  /** The user that created the event. */
  createdBy: EventCreator;
  /** Everyone who has been marked as attending (or maybe / not going). */
  attendees: EventAttendee[];
  createdAt: string;
  updatedAt?: string;
}

/** Payload accepted when creating an event (id/timestamps are generated). */
export type NewAppEvent = Omit<
  AppEvent,
  "id" | "createdAt" | "updatedAt" | "attendees"
> & {
  attendees?: EventAttendee[];
};

/** Minimal attendee info required when marking attendance. */
export interface EventAttendeeInput {
  id: string;
  name: string;
  email?: string;
  role?: Role;
  status?: "going" | "maybe" | "not_going";
  /** Course the attendee is enrolled in (the one that grants access). */
  courseId?: string;
  /** Course name for display. */
  courseTitle?: string;
}

/** Flat, display-ready view of an event. */
export interface EventSummary {
  date: string;
  time: string;
  createdBy: string;
  title: string;
  subject: string;
  location: string;
  link: string;
  course: string;
  attendance: string;
}

interface EventContextType {
  events: AppEvent[];

  /** Create an event and return the stored record. */
  addEvent: (input: NewAppEvent) => AppEvent;
  updateEvent: (
    id: string,
    updates: Partial<Omit<AppEvent, "id" | "createdAt">>,
  ) => void;
  deleteEvent: (id: string) => void;
  clearEvents: () => void;
  getEventById: (id: string) => AppEvent | undefined;

  /** Events that belong to a specific course. */
  eventsByCourse: (courseId: string) => AppEvent[];
  /** Events sorted chronologically, excluding those already past. */
  upcomingEvents: () => AppEvent[];

  /** Attendance helpers. */
  markAttendance: (eventId: string, attendee: EventAttendeeInput) => void;
  removeAttendance: (eventId: string, userId: string) => void;
  isAttending: (eventId: string, userId: string) => boolean;
  getAttendees: (eventId: string) => EventAttendee[];
  getAttendanceCount: (eventId: string) => number;
}

/* ============================================================= */
/* Persistence (mirrors the app's bp_cache_* local cache)        */
/* ============================================================= */

const STORAGE_KEY = "bp_cache_events";

const loadEvents = (): AppEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppEvent[]) : [];
  } catch {
    /* Corrupt cache — fall back to an empty list. */
    return [];
  }
};

const saveEvents = (events: AppEvent[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* Storage might be full or unavailable — safe to ignore. */
  }
};

/* ============================================================= */
/* Display helpers                                               */
/* ============================================================= */

/** Convert any user-like object into an event creator. */
// eslint-disable-next-line react-refresh/only-export-components
export const userToCreator = (user: {
  id: string;
  name: string;
  email?: string;
  role?: Role;
}): EventCreator => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

/** Human friendly date, e.g. "Mon, 15 Sep 2026". Falls back to the raw value. */
// eslint-disable-next-line react-refresh/only-export-components
export const formatEventDate = (date: string): string => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Best-effort timestamp used for sorting / filtering. */
const eventTimestamp = (event: AppEvent): number => {
  const raw = `${event.date ?? ""} ${event.time ?? ""}`.trim();
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Everything the UI needs to display an event in one flat object:
 * date, time, creator, title, subject, location, link, course, attendance.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const getEventSummary = (event: AppEvent): EventSummary => {
  const attending = (event.attendees ?? []).filter((a) => a.status === "going");
  return {
    date: event.date || "—",
    time: event.time || "—",
    createdBy: event.createdBy?.name || "Unknown",
    title: event.title || "Untitled event",
    subject: event.subject || "—",
    location: event.location || "—",
    link: event.link || "—",
    course: event.courseTitle || "General",
    attendance: `${attending.length} attending`,
  };
};

/* ============================================================= */
/* Context + Provider                                            */
/* ============================================================= */

const EventContext = createContext<EventContextType | undefined>(undefined);

/* Sample events so the Events page has content before organizations publish. */
const SEED_EVENTS: AppEvent[] = [
  {
    id: "evt_seed_1",
    title: "Orientation & Platform Tour",
    subject: "A guided walkthrough of Backpack for new members",
    description:
      "A guided walkthrough of Backpack for new students, instructors, and organizations joining this semester.",
    date: "2026-09-18",
    time: "10:00 AM",
    location: "Main Auditorium / Zoom",
    link: "https://meet.example.com/backpack-orientation",
    mode: "allevent",
    createdBy: {
      id: "org_backpack",
      name: "Backpack Learning Team",
      role: "organization",
    },
    attendees: [],
    createdAt: "2026-09-15T09:00:00.000Z",
  },
  {
    id: "evt_seed_2",
    title: "Live Class: Introduction to Data Science",
    subject: "Instructor-led live session covering core concepts",
    description:
      "Instructor-led live session covering core data science concepts, tools, and a hands-on walkthrough.",
    date: "2026-09-22",
    time: "02:00 PM",
    location: "Online (LiveKit)",
    link: "https://meet.example.com/data-science",
    mode: "online",
    createdBy: {
      id: "org_backpack",
      name: "Backpack Learning Team",
      role: "organization",
    },
    attendees: [],
    createdAt: "2026-09-15T09:05:00.000Z",
  },
  {
    id: "evt_seed_3",
    title: "End of Term Project Showcase",
    subject: "Students present their term projects",
    description:
      "Students present their term projects. Instructors and partner organizations are invited to join as judges.",
    date: "2026-09-28",
    time: "11:00 AM",
    location: "Academy Hall",
    mode: "onsite",
    createdBy: {
      id: "org_backpack",
      name: "Backpack Learning Team",
      role: "organization",
    },
    attendees: [],
    createdAt: "2026-09-15T09:10:00.000Z",
  },
  {
    id: "evt_seed_4",
    title: "Instructor Workshop: Engaging Remote Learners",
    subject: "Practical techniques for remote and hybrid teaching",
    description:
      "A practical workshop for instructors on keeping remote and hybrid learners engaged through the platform.",
    date: "2026-10-02",
    time: "03:00 PM",
    location: "Online (LiveKit)",
    link: "https://meet.example.com/instructor-workshop",
    mode: "online",
    createdBy: {
      id: "org_backpack",
      name: "Backpack Educator Network",
      role: "organization",
    },
    attendees: [],
    createdAt: "2026-09-15T09:15:00.000Z",
  },
];

const hasStoredEvents = () =>
  typeof window !== "undefined" &&
  window.localStorage.getItem(STORAGE_KEY) !== null;

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<AppEvent[]>(() =>
    hasStoredEvents() ? loadEvents() : SEED_EVENTS,
  );

  /* Persist to the local cache whenever events change. */
  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const addEvent = useCallback((input: NewAppEvent): AppEvent => {
    const newEvent: AppEvent = {
      id: generateId("evt"),
      title: input.title,
      subject: input.subject,
      description: input.description,
      date: input.date,
      time: input.time,
      location: input.location,
      link: input.link,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
      createdBy: input.createdBy,
      attendees: input.attendees ?? [],
      createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  }, []);

  const updateEvent = useCallback(
    (id: string, updates: Partial<Omit<AppEvent, "id" | "createdAt">>) => {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === id
            ? { ...evt, ...updates, updatedAt: new Date().toISOString() }
            : evt,
        ),
      );
    },
    [],
  );

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((evt) => evt.id !== id));
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  const getEventById = useCallback(
    (id: string) => events.find((evt) => evt.id === id),
    [events],
  );

  const eventsByCourse = useCallback(
    (courseId: string) => events.filter((evt) => evt.courseId === courseId),
    [events],
  );

  const upcomingEvents = useCallback(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const threshold = startOfToday.getTime();

    return [...events]
      .filter((evt) => {
        const ts = eventTimestamp(evt);
        // Keep events we can't parse so nothing silently disappears.
        return ts === 0 || ts >= threshold;
      })
      .sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  }, [events]);

  /* ---------------- Attendance ---------------- */

  const markAttendance = useCallback(
    (eventId: string, attendee: EventAttendeeInput) => {
      setEvents((prev) =>
        prev.map((evt) => {
          if (evt.id !== eventId) return evt;

          const record: EventAttendee = {
            userId: attendee.id,
            name: attendee.name,
            email: attendee.email,
            role: attendee.role,
            status: attendee.status ?? "going",
            courseId: attendee.courseId,
            courseTitle: attendee.courseTitle,
            joinedAt: new Date().toISOString(),
          };

          const attendees = [...(evt.attendees ?? [])];
          const index = attendees.findIndex((a) => a.userId === attendee.id);

          if (index >= 0) {
            attendees[index] = { ...attendees[index], ...record };
          } else {
            attendees.push(record);
          }

          return { ...evt, attendees };
        }),
      );
    },
    [],
  );

  const removeAttendance = useCallback((eventId: string, userId: string) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? {
              ...evt,
              attendees: (evt.attendees ?? []).filter(
                (a) => a.userId !== userId,
              ),
            }
          : evt,
      ),
    );
  }, []);

  const getAttendees = useCallback(
    (eventId: string) =>
      events.find((evt) => evt.id === eventId)?.attendees ?? [],
    [events],
  );

  const isAttending = useCallback(
    (eventId: string, userId: string) =>
      (events.find((evt) => evt.id === eventId)?.attendees ?? []).some(
        (a) => a.userId === userId && a.status === "going",
      ),
    [events],
  );

  const getAttendanceCount = useCallback(
    (eventId: string) =>
      (events.find((evt) => evt.id === eventId)?.attendees ?? []).filter(
        (a) => a.status === "going",
      ).length,
    [events],
  );

  const value = useMemo<EventContextType>(
    () => ({
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      clearEvents,
      getEventById,
      eventsByCourse,
      upcomingEvents,
      markAttendance,
      removeAttendance,
      isAttending,
      getAttendees,
      getAttendanceCount,
    }),
    [
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      clearEvents,
      getEventById,
      eventsByCourse,
      upcomingEvents,
      markAttendance,
      removeAttendance,
      isAttending,
      getAttendees,
      getAttendanceCount,
    ],
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
};

/* ============================================================= */
/* Hooks                                                         */
/* ============================================================= */

// eslint-disable-next-line react-refresh/only-export-components
export const useEventContext = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useEvents = useEventContext;
