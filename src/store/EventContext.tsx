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

/** Assigned instructor facilitator for the event. */
export interface EventFacilitator {
  id: string;
  name: string;
  email?: string;
  role?: Role;
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
  /** Assigned facilitator (instructor or speaker) who leads the session */
  facilitatorId?: string;
  facilitatorName?: string;
  facilitatorEmail?: string;
  facilitators?: EventFacilitator[];
  /** The user that created the event (organization or super admin). */
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
  facilitatorId?: string;
  facilitatorName?: string;
  facilitatorEmail?: string;
  facilitators?: EventFacilitator[];
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
    if (!Array.isArray(parsed)) return [];
    // Strict filter: Remove any dummy seed events previously saved in the user's browser
    return (parsed as AppEvent[]).filter(
      (evt) =>
        evt &&
        typeof evt.id === "string" &&
        !evt.id.startsWith("evt_seed_") &&
        evt.title !== "Orientation & Platform Tour" &&
        evt.title !== "Live Class: Introduction to Data Science" &&
        evt.title !== "End of Term Project Showcase" &&
        evt.title !== "Instructor Workshop: Engaging Remote Learners",
    );
  } catch {
    /* Corrupt cache — fall back to an empty list. */
    return [];
  }
};

const saveEvents = (events: AppEvent[]) => {
  if (typeof window === "undefined") return;
  try {
    // Only save authentic non-dummy events
    const clean = events.filter(
      (evt) => evt && typeof evt.id === "string" && !evt.id.startsWith("evt_seed_"),
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
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

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<AppEvent[]>(() => {
    const loaded = loadEvents();
    return loaded;
  });

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
      courseType: input.courseType,
      mode: input.mode,
      facilitatorId: input.facilitatorId,
      facilitatorName: input.facilitatorName,
      facilitatorEmail: input.facilitatorEmail,
      facilitators: input.facilitators ?? (input.facilitatorName ? [{
        id: input.facilitatorId || generateId("fac"),
        name: input.facilitatorName,
        email: input.facilitatorEmail,
        role: "instructor",
      }] : []),
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
