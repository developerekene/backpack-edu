import { useMemo } from "react";
import { useAuth } from "../store/AuthContext";
import { useAppContext } from "../store/AppContext";
import type { AppEvent } from "../store/EventContext";
import type { Course } from "../types";
import { COURSE_TYPE_OPTIONS } from "./eventMeta";

/* ============================================================= */
/* Course participation rules                                    */
/* ============================================================= */

/**
 * Decides whether a user may join an event.
 *
 * - The organization picked a **specific course** (`courseId`) → only students
 *   enrolled in that course can join.
 * - The organization picked a **course level** (`courseType`, one of
 *   `COURSE_TYPE_OPTIONS`) → only students enrolled in a course of that level
 *   can join.
 * - Neither set → it's a General event, open to any signed-in user.
 */
export const canJoinEvent = (
  event: AppEvent,
  myCourseIds: string[],
  myCourseTypes: string[],
): boolean => {
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
  if (event.courseTitle) return `enrolled in ${event.courseTitle}`;

  if (event.courseType) {
    const level = COURSE_TYPE_OPTIONS.find(
      (option) => option.value === event.courseType,
    );
    return `enrolled in a ${level?.label ?? "matching"} course`;
  }

  return "enrolled in this course";
};

/**
 * The course that grants this user access to the event: a specific course, or
 * (for level-based events) their own course at that level. This is the course
 * stored on the attendance record when they join.
 */
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
/* Hook                                                          */
/* ============================================================= */

export interface MyCourses {
  /** Ids of every course the signed-in user belongs to. */
  myCourseIds: string[];
  /** Course levels (qualifications) covered by those courses. */
  myCourseTypes: string[];
  /** The enrolled course objects themselves. */
  myCourses: Course[];
}

/**
 * Resolves the signed-in user's courses from memberships, approved
 * enrollments, progress, and (for organizations) the courses they own.
 */
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
      const matchesUser =
        (member.userId && member.userId === currentUser.id) ||
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

    /* An organization also owns the courses it created. */
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

  /* The actual course objects the user belongs to. */
  const myCourses = useMemo(
    () => courses.filter((course) => myCourseIds.includes(course.id)),
    [courses, myCourseIds],
  );

  return { myCourseIds, myCourseTypes, myCourses };
};
