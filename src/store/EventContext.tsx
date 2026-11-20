import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  AppEvent,
  EventAttendee,
  EventCreator,
  EventFacilitator,
  EventFormatCategory,
  EventVisibilityType,
  EventWaitingParticipant,
  Role,
} from "../types";
import { generateId } from "../lib/id";
import { normaliseEventType, type EventMode } from "../lib/eventMeta";
import { useAppContext } from "./AppContext";
import { useAuth } from "./AuthContext";
import { isSuperAdminUser } from "../lib/approval";
import {
  getUserData,
  sanitizeForFirestore,
  updateBackpackUserField,
} from "./utils/backpackUtils";

export type {
  AppEvent,
  EventAttendee,
  EventCreator,
  EventFacilitator,
  EventFormatCategory,
  EventVisibilityType,
  EventWaitingParticipant,
};

/** Payload accepted when creating an event (id/timestamps are generated). */
export type NewAppEvent = Omit<
  AppEvent,
  "id" | "createdAt" | "updatedAt" | "attendees"
> & {
  attendees?: EventAttendee[];
  waitingRoom?: EventWaitingParticipant[];
  facilitatorId?: string;
  facilitatorName?: string;
  facilitatorEmail?: string;
  facilitators?: EventFacilitator[];
};

/** Minimal attendee info required when marking attendance or joining waiting room. */
export interface EventAttendeeInput {
  id: string;
  name: string;
  email?: string;
  role?: Role | "guest";
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

  /** Create an event on the backend (`backpack/{uid}.user.course.events`) and return it. */
  addEvent: (input: NewAppEvent) => AppEvent;
  updateEvent: (
    id: string,
    updates: Partial<Omit<AppEvent, "id" | "createdAt">>,
  ) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  approveEvent: (id: string) => Promise<void>;
  rejectEvent: (id: string, reason?: string) => Promise<void>;
  clearEvents: () => void;
  getEventById: (id: string) => AppEvent | undefined;

  /** Events that belong to a specific course. */
  eventsByCourse: (courseId: string) => AppEvent[];
  /** Events sorted chronologically, excluding those already past. */
  upcomingEvents: () => AppEvent[];

  /** Direct attendance (used for Private events or already-admitted Go Live participants). */
  markAttendance: (eventId: string, attendee: EventAttendeeInput) => void;
  removeAttendance: (eventId: string, userId: string) => void;
  isAttending: (eventId: string, userId: string) => boolean;
  getAttendees: (eventId: string) => EventAttendee[];
  getAttendanceCount: (eventId: string) => number;

  /** Go Live Waiting Room controls. */
  requestJoinEvent: (
    eventId: string,
    participant: EventAttendeeInput,
  ) => Promise<void>;
  leaveWaitingRoom: (eventId: string, userId: string) => Promise<void>;
  acceptWaitingRoomUser: (eventId: string, userId: string) => Promise<void>;
  acceptAllWaitingRoom: (eventId: string) => Promise<void>;
  rejectWaitingRoomUser: (eventId: string, userId: string) => Promise<void>;
  getWaitingRoomStatus: (
    eventId: string,
    userId?: string,
  ) => "waiting" | "admitted" | "rejected" | null;
  getWaitingParticipants: (eventId: string) => EventWaitingParticipant[];
}

const STORAGE_KEY = "bp_cache_events";

const saveEventsCache = (events: AppEvent[]) => {
  if (typeof window === "undefined") return;
  try {
    const clean = events.filter(
      (evt) => evt && typeof evt.id === "string" && !evt.id.startsWith("evt_seed_"),
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
};

const makeRoomSlug = (title: string, id: string): string => {
  const base = (title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = id.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
  return `evt-${base || "live"}-${suffix || "room"}`;
};

/* ============================================================= */
/* Display helpers                                               */
/* ============================================================= */

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

const eventTimestamp = (event: AppEvent): number => {
  const raw = `${event.date ?? ""} ${event.time ?? ""}`.trim();
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

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
  const {
    appEvents,
    setAppEvents,
    notifySuperAdmins,
    sendDirectNotification,
  } = useAppContext();
  const { currentUser } = useAuth();

  const events = appEvents;

  /* Mirror state into localStorage cache whenever events update. */
  useEffect(() => {
    saveEventsCache(events);
  }, [events]);

  /** Helper to mutate an event both optimistically and inside its Firestore backpack doc. */
  const mutateEventInBackend = useCallback(
    async (
      eventId: string,
      mutator: (evt: AppEvent) => AppEvent,
    ): Promise<void> => {
      let targetUid = "";
      let updatedSnapshot: AppEvent | undefined;

      setAppEvents((prev) =>
        prev.map((evt) => {
          if (evt.id !== eventId) return evt;
          targetUid =
            evt.storageUid ||
            evt.orgId ||
            evt.createdBy?.id ||
            currentUser?.id ||
            "";
          updatedSnapshot = mutator(evt);
          return updatedSnapshot;
        }),
      );

      if (!targetUid) {
        const found = events.find((e) => e.id === eventId);
        targetUid =
          found?.storageUid ||
          found?.orgId ||
          found?.createdBy?.id ||
          currentUser?.id ||
          "";
      }

      if (!targetUid) return;

      try {
        await updateBackpackUserField<AppEvent>(
          targetUid,
          "course.events",
          (list) => {
            const existsInDoc = list.some((e) => e.id === eventId);
            if (existsInDoc) {
              return list.map((e) =>
                e.id === eventId ? sanitizeForFirestore(mutator(e)) : e,
              );
            }
            if (updatedSnapshot) {
              return [...list, sanitizeForFirestore(updatedSnapshot)];
            }
            return list;
          },
        );
      } catch (err) {
        console.error("Failed to sync event mutation to backend:", err);
      }
    },
    [events, currentUser?.id, setAppEvents],
  );

  const addEvent = useCallback(
    (input: NewAppEvent): AppEvent => {
      const id = generateId("evt");
      const storageUid =
        input.storageUid ||
        input.orgId ||
        input.createdBy?.id ||
        currentUser?.id ||
        "";
      const resolvedEventType = normaliseEventType(input);
      const roomName =
        input.roomName || makeRoomSlug(input.title, id);

      const isSuperAdmin = isSuperAdminUser(currentUser);
      const approvalStatus = isSuperAdmin
        ? "approved"
        : input.approvalStatus || "pending";
      const nowIso = new Date().toISOString();

      const newEvent: AppEvent = sanitizeForFirestore({
        id,
        title: input.title,
        subject: input.subject,
        description: input.description,
        date: input.date,
        time: input.time,
        location: input.location,
        link: input.link,
        roomName,
        eventType: resolvedEventType,
        category: input.category || "webinar",
        orgId: input.orgId || storageUid,
        orgName: input.orgName,
        storageUid,
        courseId: input.courseId,
        courseTitle: input.courseTitle,
        courseType: input.courseType,
        mode: (input.mode || "online") as EventMode,
        facilitatorId: input.facilitatorId,
        facilitatorName: input.facilitatorName,
        facilitatorEmail: input.facilitatorEmail,
        facilitators:
          input.facilitators ??
          (input.facilitatorName
            ? [
                {
                  id: input.facilitatorId || generateId("fac"),
                  name: input.facilitatorName,
                  email: input.facilitatorEmail,
                  role: "instructor",
                },
              ]
            : []),
        createdBy: input.createdBy,
        attendees: input.attendees ?? [],
        waitingRoom: input.waitingRoom ?? [],
        approvalStatus,
        submittedAt: nowIso,
        approvedAt: approvalStatus === "approved" ? nowIso : undefined,
        approvedBy: approvalStatus === "approved" ? currentUser?.id : undefined,
        createdAt: nowIso,
      });

      setAppEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== id)]);

      if (storageUid) {
        updateBackpackUserField<AppEvent>(
          storageUid,
          "course.events",
          (list) => [
            newEvent,
            ...list.filter((e) => e.id !== newEvent.id),
          ],
        ).catch((err) => {
          console.error("Failed to persist event to backend:", err);
        });
      }

      if (approvalStatus === "pending") {
        notifySuperAdmins({
          title: "Event Awaiting Super Admin Approval",
          message: `"${newEvent.title}" submitted by ${newEvent.orgName || newEvent.createdBy?.name || "an organization"} needs approval before appearing publicly.`,
          type: "info",
          notificationCategory: "approval_request",
          senderId: currentUser?.id || newEvent.createdBy?.id,
          senderName: currentUser?.name || newEvent.createdBy?.name,
          senderEmail: currentUser?.email || newEvent.createdBy?.email,
          linkUrl: "/admin?tab=events",
        }).catch(console.error);
      }

      return newEvent;
    },
    [currentUser, notifySuperAdmins, setAppEvents],
  );

  const updateEvent = useCallback(
    async (
      id: string,
      updates: Partial<Omit<AppEvent, "id" | "createdAt">>,
    ) => {
      await mutateEventInBackend(id, (evt) => ({
        ...evt,
        ...updates,
        updatedAt: new Date().toISOString(),
      }));
    },
    [mutateEventInBackend],
  );

  const approveEvent = useCallback(
    async (id: string) => {
      const target = events.find((e) => e.id === id);
      const approvedAt = new Date().toISOString();
      await updateEvent(id, {
        approvalStatus: "approved",
        approvedAt,
        approvedBy: currentUser?.id || "super_admin",
        rejectedAt: undefined,
        rejectionReason: undefined,
      });
      if (target) {
        const recipientId =
          target.createdBy?.id ||
          target.storageUid ||
          target.orgId?.replace(/^org_/, "") ||
          "";
        if (recipientId) {
          sendDirectNotification(
            recipientId,
            "Event Approved",
            `Your event "${target.title}" has been approved by Super Admin and is now visible to users across the platform.`,
            "info",
            "/events",
            { notificationCategory: "approval_decision" },
          ).catch(console.error);
        }
      }
    },
    [events, updateEvent, currentUser?.id, sendDirectNotification],
  );

  const rejectEvent = useCallback(
    async (id: string, reason?: string) => {
      const target = events.find((e) => e.id === id);
      const rejectedAt = new Date().toISOString();
      const cleanReason =
        reason?.trim() || "Event did not meet platform publishing requirements.";
      await updateEvent(id, {
        approvalStatus: "rejected",
        rejectedAt,
        rejectionReason: cleanReason,
      });
      if (target) {
        const recipientId =
          target.createdBy?.id ||
          target.storageUid ||
          target.orgId?.replace(/^org_/, "") ||
          "";
        if (recipientId) {
          sendDirectNotification(
            recipientId,
            "Event Not Approved",
            `Your event "${target.title}" was declined by Super Admin: ${cleanReason}`,
            "info",
            "/events",
            { notificationCategory: "approval_decision" },
          ).catch(console.error);
        }
      }
    },
    [events, updateEvent, sendDirectNotification],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const existing = events.find((e) => e.id === id);
      setAppEvents((prev) => prev.filter((evt) => evt.id !== id));

      const targetUids = new Set<string>();
      if (existing?.storageUid) targetUids.add(existing.storageUid);
      if (existing?.orgId) {
        targetUids.add(existing.orgId);
        if (existing.orgId.startsWith("org_")) {
          targetUids.add(existing.orgId.replace("org_", ""));
        }
      }
      if (existing?.createdBy?.id) targetUids.add(existing.createdBy.id);
      if (currentUser?.id) targetUids.add(currentUser.id);

      for (const uid of targetUids) {
        try {
          await updateBackpackUserField<AppEvent>(uid, "course.events", (list) =>
            list.filter((evt) => evt.id !== id),
          );
        } catch (err) {
          console.warn(`Could not delete event from backpack/${uid}:`, err);
        }
      }

      // Sweep across backpack docs in case event lived under an alias org/owner doc
      try {
        const snap = await getDocs(collection(db, "backpack"));
        for (const docSnap of snap.docs) {
          if (targetUids.has(docSnap.id)) continue;
          const userObj = getUserData(docSnap.data());
          const courseObj = (userObj.course as Record<string, unknown>) || {};
          if (
            Array.isArray(courseObj.events) &&
            courseObj.events.some((e: AppEvent) => e.id === id)
          ) {
            await updateBackpackUserField<AppEvent>(
              docSnap.id,
              "course.events",
              (list) => list.filter((e) => e.id !== id),
            );
          }
        }
      } catch (err) {
        console.warn("Sweep delete event notice:", err);
      }
    },
    [events, currentUser?.id, setAppEvents],
  );

  const clearEvents = useCallback(() => setAppEvents([]), [setAppEvents]);

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
        return ts === 0 || ts >= threshold;
      })
      .sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  }, [events]);

  /* ---------------- Direct Attendance ---------------- */

  const markAttendance = useCallback(
    (eventId: string, attendee: EventAttendeeInput) => {
      mutateEventInBackend(eventId, (evt) => {
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

        return { ...evt, attendees, updatedAt: new Date().toISOString() };
      });
    },
    [mutateEventInBackend],
  );

  const removeAttendance = useCallback(
    (eventId: string, userId: string) => {
      mutateEventInBackend(eventId, (evt) => ({
        ...evt,
        attendees: (evt.attendees ?? []).filter((a) => a.userId !== userId),
        waitingRoom: (evt.waitingRoom ?? []).filter(
          (w) => w.userId !== userId,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [mutateEventInBackend],
  );

  /* ---------------- Go Live Waiting Room ---------------- */

  const requestJoinEvent = useCallback(
    async (eventId: string, participant: EventAttendeeInput) => {
      await mutateEventInBackend(eventId, (evt) => {
        const existingQueue = [...(evt.waitingRoom ?? [])];
        const idx = existingQueue.findIndex(
          (w) => w.userId === participant.id,
        );
        // Preserve already-admitted status if they already got accepted
        if (idx >= 0 && existingQueue[idx].status === "admitted") {
          return evt;
        }
        const entry: EventWaitingParticipant = {
          userId: participant.id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
          requestedAt: new Date().toISOString(),
          status: "waiting",
        };
        if (idx >= 0) {
          existingQueue[idx] = entry;
        } else {
          existingQueue.push(entry);
        }
        return {
          ...evt,
          waitingRoom: existingQueue,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [mutateEventInBackend],
  );

  const leaveWaitingRoom = useCallback(
    async (eventId: string, userId: string) => {
      await mutateEventInBackend(eventId, (evt) => ({
        ...evt,
        waitingRoom: (evt.waitingRoom ?? []).filter(
          (w) => w.userId !== userId,
        ),
        attendees: (evt.attendees ?? []).filter((a) => a.userId !== userId),
        updatedAt: new Date().toISOString(),
      }));
    },
    [mutateEventInBackend],
  );

  const acceptWaitingRoomUser = useCallback(
    async (eventId: string, userId: string) => {
      const now = new Date().toISOString();
      await mutateEventInBackend(eventId, (evt) => {
        const target = (evt.waitingRoom ?? []).find(
          (w) => w.userId === userId,
        );
        const updatedQueue: EventWaitingParticipant[] = (
          evt.waitingRoom ?? []
        ).map((w) =>
          w.userId === userId
            ? { ...w, status: "admitted", admittedAt: now }
            : w,
        );

        const attendees = [...(evt.attendees ?? [])];
        if (target && !attendees.some((a) => a.userId === userId)) {
          attendees.push({
            userId: target.userId,
            name: target.name,
            email: target.email,
            role: target.role,
            status: "going",
            joinedAt: now,
          });
        }

        return {
          ...evt,
          waitingRoom: updatedQueue,
          attendees,
          updatedAt: now,
        };
      });
    },
    [mutateEventInBackend],
  );

  const acceptAllWaitingRoom = useCallback(
    async (eventId: string) => {
      const now = new Date().toISOString();
      await mutateEventInBackend(eventId, (evt) => {
        const waitingUsers = (evt.waitingRoom ?? []).filter(
          (w) => w.status === "waiting",
        );
        const updatedQueue: EventWaitingParticipant[] = (
          evt.waitingRoom ?? []
        ).map((w) =>
          w.status === "waiting"
            ? { ...w, status: "admitted", admittedAt: now }
            : w,
        );

        const attendees = [...(evt.attendees ?? [])];
        waitingUsers.forEach((wu) => {
          const existingIdx = attendees.findIndex(
            (a) => a.userId === wu.userId,
          );
          if (existingIdx >= 0) {
            attendees[existingIdx] = {
              ...attendees[existingIdx],
              status: "going",
            };
          } else {
            attendees.push({
              userId: wu.userId,
              name: wu.name,
              email: wu.email,
              role: wu.role,
              status: "going",
              joinedAt: now,
            });
          }
        });

        return {
          ...evt,
          waitingRoom: updatedQueue,
          attendees,
          updatedAt: now,
        };
      });
    },
    [mutateEventInBackend],
  );

  const rejectWaitingRoomUser = useCallback(
    async (eventId: string, userId: string) => {
      await mutateEventInBackend(eventId, (evt) => ({
        ...evt,
        waitingRoom: (evt.waitingRoom ?? []).map((w) =>
          w.userId === userId ? { ...w, status: "rejected" } : w,
        ),
        attendees: (evt.attendees ?? []).filter((a) => a.userId !== userId),
        updatedAt: new Date().toISOString(),
      }));
    },
    [mutateEventInBackend],
  );

  const getWaitingRoomStatus = useCallback(
    (eventId: string, userId?: string) => {
      if (!userId) return null;
      const evt = events.find((e) => e.id === eventId);
      const entry = (evt?.waitingRoom ?? []).find((w) => w.userId === userId);
      return entry?.status ?? null;
    },
    [events],
  );

  const getWaitingParticipants = useCallback(
    (eventId: string) => {
      const evt = events.find((e) => e.id === eventId);
      return (evt?.waitingRoom ?? []).filter((w) => w.status === "waiting");
    },
    [events],
  );

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
      approveEvent,
      rejectEvent,
      clearEvents,
      getEventById,
      eventsByCourse,
      upcomingEvents,
      markAttendance,
      removeAttendance,
      isAttending,
      getAttendees,
      getAttendanceCount,
      requestJoinEvent,
      leaveWaitingRoom,
      acceptWaitingRoomUser,
      acceptAllWaitingRoom,
      rejectWaitingRoomUser,
      getWaitingRoomStatus,
      getWaitingParticipants,
    }),
    [
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      approveEvent,
      rejectEvent,
      clearEvents,
      getEventById,
      eventsByCourse,
      upcomingEvents,
      markAttendance,
      removeAttendance,
      isAttending,
      getAttendees,
      getAttendanceCount,
      requestJoinEvent,
      leaveWaitingRoom,
      acceptWaitingRoomUser,
      acceptAllWaitingRoom,
      rejectWaitingRoomUser,
      getWaitingRoomStatus,
      getWaitingParticipants,
    ],
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
};

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
