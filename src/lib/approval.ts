import { AppEvent, Course, Organization, OrgMember, User } from "../types";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export function isSuperAdminUser(
  user?: { email?: string | null; role?: string | null } | null,
): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return (user.email || "").trim().toLowerCase() === "ekenehq@gmail.com";
}

export function getCourseApprovalStatus(
  course?: Pick<Course, "approvalStatus"> | null,
): ApprovalStatus {
  if (!course) return "pending";
  if (course.approvalStatus === "approved") return "approved";
  if (course.approvalStatus === "rejected") return "rejected";
  return "pending";
}

export function isCourseApproved(
  course?: Pick<Course, "approvalStatus"> | null,
): boolean {
  return getCourseApprovalStatus(course) === "approved";
}

export function getEventApprovalStatus(
  event?: Pick<AppEvent, "approvalStatus"> | null,
): ApprovalStatus {
  if (!event) return "pending";
  if (event.approvalStatus === "approved") return "approved";
  if (event.approvalStatus === "rejected") return "rejected";
  return "pending";
}

export function isEventApproved(
  event?: Pick<AppEvent, "approvalStatus"> | null,
): boolean {
  return getEventApprovalStatus(event) === "approved";
}

export function canManageOrPreviewCourse(
  course: Course | null | undefined,
  currentUser: User | null | undefined,
  organizations: Organization[] = [],
  orgMembers: OrgMember[] = [],
): boolean {
  if (!course || !currentUser) return false;
  if (isSuperAdminUser(currentUser)) return true;

  const uid = currentUser.id;
  if (
    course.createdBy === uid ||
    course.instructorId === uid ||
    (Array.isArray(course.instructors) && course.instructors.includes(uid)) ||
    course.orgId === uid ||
    course.orgId === `org_${uid}`
  ) {
    return true;
  }

  const ownsOrg = organizations.some(
    (o) =>
      o.ownerId === uid &&
      (o.id === course.orgId || `org_${o.ownerId}` === course.orgId),
  );
  if (ownsOrg) return true;

  const normalizedOrgId = course.orgId?.replace(/^org_/, "");
  return orgMembers.some(
    (m) =>
      m.status === "active" &&
      (m.userId === uid ||
        (!!currentUser.email &&
          m.email?.toLowerCase() === currentUser.email.toLowerCase())) &&
      (m.orgId === course.orgId ||
        m.orgId === normalizedOrgId ||
        `org_${m.orgId}` === course.orgId) &&
      (m.role === "org_admin" ||
        m.role === "admin" ||
        m.role === "instructor" ||
        (m.assignedCourses || []).includes(course.id)),
  );
}

export function isEventOrganizer(
  event: AppEvent | null | undefined,
  currentUser: User | null | undefined,
  organizations: Organization[] = [],
): boolean {
  if (!event || !currentUser) return false;
  if (isSuperAdminUser(currentUser)) return true;

  const uid = currentUser.id;
  const normalizedEmail = currentUser.email?.trim().toLowerCase();

  if (
    event.createdBy?.id === uid ||
    event.storageUid === uid ||
    event.facilitatorId === uid ||
    event.orgId === uid ||
    event.orgId === `org_${uid}` ||
    (event.facilitators || []).some(
      (f) =>
        f.id === uid ||
        (normalizedEmail && f.email?.trim().toLowerCase() === normalizedEmail),
    )
  ) {
    return true;
  }

  return organizations.some(
    (o) =>
      o.ownerId === uid &&
      (o.id === event.orgId ||
        o.ownerId === event.storageUid ||
        `org_${o.ownerId}` === event.orgId),
  );
}
