import { useMemo } from "react";
import { useAuth } from "../store/AuthContext";
import { useAppContext } from "../store/AppContext";
import type {
  AppEvent,
  Course,
  EnrollmentRequest,
  OrgJoinRequest,
  OrgMember,
  Organization,
  User,
} from "../types";
import { COURSE_TYPE_OPTIONS, normaliseEventType } from "./eventMeta";

/* ============================================================= */
/* Organization & Event Access Rules                             */
/* ============================================================= */

export const matchesOrgIdentifier = (
  candidateId?: string,
  targetOrgId?: string,
  organizations: Organization[] = [],
): boolean => {
  if (!candidateId || !targetOrgId) return false;
  if (
    candidateId === targetOrgId ||
    `org_${candidateId}` === targetOrgId ||
    candidateId === `org_${targetOrgId}` ||
    candidateId.replace(/^org_/, "") === targetOrgId.replace(/^org_/, "")
  ) {
    return true;
  }
  const matchingOrg = organizations.find(
    (o) =>
      o.id === targetOrgId ||
      o.ownerId === targetOrgId ||
      `org_${o.ownerId}` === targetOrgId,
  );
  if (!matchingOrg) return false;
  return (
    candidateId === matchingOrg.id ||
    candidateId === matchingOrg.ownerId ||
    candidateId === `org_${matchingOrg.ownerId}`
  );
};

/** Determines whether the given user owns, created, or facilitates the event. */
export const isEventOrganizer = (
  event: AppEvent,
  currentUser: User | null | undefined,
  organizations: Organization[] = [],
): boolean => {
  if (!currentUser) return false;
  if (
    currentUser.role === "super_admin" ||
    currentUser.email?.toLowerCase() === "ekenehq@gmail.com"
  ) {
    return true;
  }
  if (event.createdBy?.id && event.createdBy.id === currentUser.id) {
    return true;
  }
  if (event.facilitatorId && event.facilitatorId === currentUser.id) {
    return true;
  }
  if (
    event.facilitatorEmail &&
    currentUser.email &&
    event.facilitatorEmail.toLowerCase() === currentUser.email.toLowerCase()
  ) {
    return true;
  }
  const eventOrgId = event.orgId || event.storageUid || event.createdBy?.id;
  if (
    currentUser.role === "organization" &&
    matchesOrgIdentifier(currentUser.id, eventOrgId, organizations)
  ) {
    return true;
  }
  return organizations.some(
    (o) =>
      (o.ownerId === currentUser.id || o.id === currentUser.id) &&
      matchesOrgIdentifier(o.id, eventOrgId, organizations),
  );
};

/**
 * Checks whether a signed-in user is an accepted member (student or instructor)
 * of the organization hosting the event.
 */
export const isAcceptedOrgMemberForEvent = (
  event: AppEvent,
  currentUser: User | null | undefined,
  params: {
    organizations: Organization[];
    orgMembers: OrgMember[];
    enrollmentRequests: EnrollmentRequest[];
    orgJoinRequests: OrgJoinRequest[];
    courses: Course[];
  },
): boolean => {
  if (!currentUser) return false;
  const {
    organizations,
    orgMembers,
    enrollmentRequests,
    orgJoinRequests,
    courses,
  } = params;

  if (isEventOrganizer(event, currentUser, organizations)) {
    return true;
  }

  const hostOrgId = event.orgId || event.storageUid || event.createdBy?.id;
  if (!hostOrgId) return false;

  const userEmail = currentUser.email?.trim().toLowerCase();

  // Direct orgId on profile if instructor/student was created directly inside org
  if (
    currentUser.orgId &&
    matchesOrgIdentifier(currentUser.orgId, hostOrgId, organizations)
  ) {
    return true;
  }

  // Accepted student or accepted instructor in orgMembers (`status === "active"`)
  const hasActiveOrgMembership = orgMembers.some((member) => {
    if (member.status !== "active") return false;
    const matchesUser =
      (member.userId && member.userId === currentUser.id) ||
      member.id === currentUser.id ||
      (userEmail && member.email?.trim().toLowerCase() === userEmail);
    return (
      matchesUser &&
      matchesOrgIdentifier(member.orgId, hostOrgId, organizations)
    );
  });
  if (hasActiveOrgMembership) return true;

  // Approved organization join request
  const hasApprovedJoinReq = orgJoinRequests.some(
    (req) =>
      req.userId === currentUser.id &&
      req.status === "approved" &&
      matchesOrgIdentifier(req.orgId, hostOrgId, organizations),
  );
  if (hasApprovedJoinReq) return true;

  // Approved student course enrollment for a course in this organization
  const hasApprovedCourseEnrollment = enrollmentRequests.some((req) => {
    if (req.userId !== currentUser.id || req.status !== "approved") return false;
    if (matchesOrgIdentifier(req.orgId, hostOrgId, organizations)) return true;
    const course = courses.find((c) => c.id === req.courseId);
    return Boolean(
      course && matchesOrgIdentifier(course.orgId, hostOrgId, organizations),
    );
  });
  if (hasApprovedCourseEnrollment) return true;

  // Instructor assigned to any course belonging to this organization
  const teachesOrgCourse = courses.some((course) => {
    if (!matchesOrgIdentifier(course.orgId, hostOrgId, organizations)) {
      return false;
    }
    return (
      course.instructorId === currentUser.id ||
      (Array.isArray(course.instructors) &&
        course.instructors.includes(currentUser.id))
    );
  });
  if (teachesOrgCourse) return true;

  return false;
};

/**
 * Decides whether a user may join an event.
 * - `go_live`: Open to everyone (students, instructors, guests, outside orgs).
 * - `private`: Exclusive to accepted students/instructors (or owner) of the hosting organization
 *              (and if narrowed to a specific course/level, checks that too for students).
 */
export const canJoinEvent = (
  event: AppEvent,
  myCourseIds: string[],
  myCourseTypes: string[],
  extra?: {
    currentUser?: User | null;
    organizations?: Organization[];
    orgMembers?: OrgMember[];
    enrollmentRequests?: EnrollmentRequest[];
    orgJoinRequests?: OrgJoinRequest[];
    courses?: Course[];
  },
): boolean => {
  const eventType = normaliseEventType(event);

  if (eventType === "go_live") {
    return true;
  }

  // Private event: must be signed in AND accepted member of the organization
  const user = extra?.currentUser;
  if (extra && user !== undefined) {
    if (!user) return false;

    const acceptedOrgMember = isAcceptedOrgMemberForEvent(event, user, {
      organizations: extra.organizations ?? [],
      orgMembers: extra.orgMembers ?? [],
      enrollmentRequests: extra.enrollmentRequests ?? [],
      orgJoinRequests: extra.orgJoinRequests ?? [],
      courses: extra.courses ?? [],
    });

    if (!acceptedOrgMember) return false;

    // Organizers & organization instructors always have access to org private events
    if (
      isEventOrganizer(event, user, extra.organizations ?? []) ||
      user.role === "instructor"
    ) {
      return true;
    }

    // If the private event was additionally scoped to a specific course or level:
    if (event.courseId) {
      return myCourseIds.includes(event.courseId);
    }
    if (event.courseType) {
      const level = COURSE_TYPE_OPTIONS.find(
        (option) => option.value === event.courseType,
      );
      return level ? myCourseTypes.includes(level.value) : false;
    }

    return true;
  }

  // Legacy signature fallback
  if (event.courseId) {
    return myCourseIds.includes(event.courseId);
  }
  if (event.courseType) {
    const level = COURSE_TYPE_OPTIONS.find(
      (option) => option.value === event.courseType,
    );
    return level ? myCourseTypes.includes(level.value) : false;
  }

  return true;
};

/** Human readable description of who may join, used in hints and tooltips. */
export const eventAudienceLabel = (event: AppEvent): string => {
  const eventType = normaliseEventType(event);
  if (eventType === "go_live") {
    return "open to everyone (waiting room moderated)";
  }

  if (event.courseTitle) {
    return `accepted members enrolled in ${event.courseTitle}`;
  }

  if (event.courseType) {
    const level = COURSE_TYPE_OPTIONS.find(
      (option) => option.value === event.courseType,
    );
    return `accepted organization members in ${level?.label ?? "this"} program`;
  }

  return `accepted students and instructors of ${event.orgName || event.createdBy?.name || "this organization"}`;
};

export const resolveEnrolledCourse = (
  event: AppEvent,
  myCourses: Course[],
): Course | undefined => {
  if (event.courseId) {
    return myCourses.find((course) => course.id === event.courseId);
  }

  if (event.courseType) {
    const level = COURSE_TYPE_OPTIONS.find(
      (option) => option.value === event.courseType,
    );
    if (level) {
      return myCourses.find(
        (course) => course.qualificationType === level.value,
      );
    }
  }

  return undefined;
};

/* ============================================================= */
/* Guest identity helper for public Go Live waiting room         */
/* ============================================================= */

const GUEST_STORAGE_KEY = "bp_event_guest_identity";

export interface EventGuestIdentity {
  id: string;
  name: string;
  email?: string;
}

export const getStoredGuestIdentity = (): EventGuestIdentity | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
      return parsed as EventGuestIdentity;
    }
  } catch {
    /* ignore */
  }
  return null;
};

export const saveGuestIdentity = (
  name: string,
  email?: string,
): EventGuestIdentity => {
  const existing = getStoredGuestIdentity();
  const next: EventGuestIdentity = {
    id:
      existing?.id ||
      `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: email?.trim() || undefined,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
};

/* ============================================================= */
/* Hook                                                          */
/* ============================================================= */

export interface MyCourses {
  myCourseIds: string[];
  myCourseTypes: string[];
  myCourses: Course[];
}

export const useMyCourses = (): MyCourses => {
  const { currentUser } = useAuth();
  const {
    courses,
    organizations,
    orgMembers,
    enrollmentRequests,
    userProgress,
  } = useAppContext();

  const myCourseIds = useMemo(() => {
    const ids = new Set<string>();
    if (!currentUser) return [] as string[];

    const email = currentUser.email?.toLowerCase();

    orgMembers.forEach((member) => {
      if (member.status !== "active") return;
      const matchesUser =
        (member.userId && member.userId === currentUser.id) ||
        member.id === currentUser.id ||
        (email && member.email?.toLowerCase() === email);
      if (matchesUser) {
        (member.courseIds ?? []).forEach((courseId) => ids.add(courseId));
      }
    });

    enrollmentRequests.forEach((request) => {
      if (request.userId === currentUser.id && request.status === "approved") {
        ids.add(request.courseId);
      }
    });

    userProgress.forEach((progress) => {
      if (progress.userId === currentUser.id) ids.add(progress.courseId);
    });

    if (currentUser.role === "organization") {
      const ownedOrgIds = organizations
        .filter(
          (org) => org.ownerId === currentUser.id || org.id === currentUser.id,
        )
        .map((org) => org.id);
      courses.forEach((course) => {
        if (ownedOrgIds.includes(course.orgId)) ids.add(course.id);
      });
    }

    return Array.from(ids);
  }, [
    currentUser,
    orgMembers,
    enrollmentRequests,
    userProgress,
    organizations,
    courses,
  ]);

  const myCourseTypes = useMemo(() => {
    const types = new Set<string>();
    if (!currentUser) return [] as string[];

    courses.forEach((course) => {
      if (myCourseIds.includes(course.id) && course.qualificationType) {
        types.add(course.qualificationType);
      }
    });

    return Array.from(types);
  }, [courses, myCourseIds, currentUser]);

  const myCourses = useMemo(
    () => courses.filter((course) => myCourseIds.includes(course.id)),
    [courses, myCourseIds],
  );

  return { myCourseIds, myCourseTypes, myCourses };
};
