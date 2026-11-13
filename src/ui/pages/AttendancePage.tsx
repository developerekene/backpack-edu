import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { useEventContext } from "../../store/EventContext";
import { Course, AttendanceEntry, AttendanceMode, AttendanceRecord } from "../../types";
import { TeacherDutyModal } from "../components/TeacherDutyModal";
import { ClassRollCallModal } from "../components/ClassRollCallModal";
import { CustomAlert } from "../components/CustomAlert";
import {
  parseAttendanceImportFile,
  buildSampleAttendanceCsv,
  ParsedAttendancePerson,
} from "../../lib/attendanceImport";
import {
  Clock,
  CheckCircle2,
  Building2,
  Video,
  Briefcase,
  Users,
  Download,
  Plus,
  Search,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  Globe,
  LogIn,
  LogOut,
  DoorOpen,
  UserPlus,
  Trash2,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
} from "lucide-react";

const captureClockSnapshot = () => {
  const now = new Date();
  return {
    nowMs: now.getTime(),
    nowTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

export const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    courses,
    attendanceRecords,
    teacherDutyRecords,
    enrollmentRequests,
    organizations,
    orgMembers,
    allUsers,
    offlineRosterStudents,
    addOfflineRosterStudentsBatch,
    removeOfflineRosterStudent,
    schoolOfflineMembers,
    addSchoolOfflineMember,
    addSchoolOfflineMembersBatch,
    removeSchoolOfflineMember,
    gateLogs,
    gateClockIn,
    gateClockOut,
    deleteGateLog,
    addAttendanceRecord,
    deleteAttendanceRecord,
  } = useAppContext();
  const { events } = useEventContext();

  // Role detection
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isOrganization = currentUser?.role === "organization" || isSuperAdmin;
  const isInstructor = currentUser?.role === "instructor";
  const isStudent = currentUser?.role === "student";

  // Check if current user is an org admin
  const userOrg = organizations.find(
    (o) =>
      o.ownerId === currentUser?.id ||
      o.id === currentUser?.id ||
      (o.adminUserIds && currentUser?.id && o.adminUserIds.includes(currentUser.id))
  );
  const isOrgAdmin = Boolean(userOrg);
  const isSchoolStaff = isOrganization || isOrgAdmin || isSuperAdmin;
  const primaryOrgId =
    userOrg?.id ||
    currentUser?.orgId ||
    (isOrganization ? currentUser?.id : "") ||
    "";

  // Navigation tab for school managers & teachers
  const [managerTab, setManagerTab] = useState<
    "gate" | "students" | "faculty" | "truancy"
  >("students");

  // Live Clock for Campus Gate Terminal
  const [liveClockTime, setLiveClockTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Gate Terminal filters, note & offline member creation state
  const [gateDateFilter, setGateDateFilter] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [gateRoleFilter, setGateRoleFilter] = useState<
    "all" | "teacher" | "student"
  >("all");
  const [gateTypeFilter, setGateTypeFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const [gateStatusFilter, setGateStatusFilter] = useState<
    "all" | "on_campus" | "left_campus" | "not_arrived"
  >("all");
  const [personalGateNote, setPersonalGateNote] = useState<string>("");
  const [gateOperatorNote, setGateOperatorNote] = useState<string>("");
  const [gateActionBusyId, setGateActionBusyId] = useState<string | null>(null);
  const [gateFeedback, setGateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showAddGateMember, setShowAddGateMember] = useState<boolean>(false);
  const [newGateMemberRole, setNewGateMemberRole] = useState<"student" | "teacher">("student");
  const [newGateMemberName, setNewGateMemberName] = useState<string>("");
  const [newGateMemberCode, setNewGateMemberCode] = useState<string>("");
  const [newGateMemberEmail, setNewGateMemberEmail] = useState<string>("");
  const [newGateMemberDept, setNewGateMemberDept] = useState<string>("");

  // Gate File Import state (teachers & students from CSV/TSV/TXT/JSON)
  const [showGateImportDrawer, setShowGateImportDrawer] = useState<boolean>(false);
  const [gateImportDefaultRole, setGateImportDefaultRole] = useState<"student" | "teacher">("student");
  const [gateImportTargetMode, setGateImportTargetMode] = useState<"gate_only" | "gate_and_class">("gate_only");
  const [gateImportTargetCourseId, setGateImportTargetCourseId] = useState<string>("");
  const [gateImportFileName, setGateImportFileName] = useState<string>("");
  const [gateImportRawText, setGateImportRawText] = useState<string>("");
  const [gateImportParsed, setGateImportParsed] = useState<ParsedAttendancePerson[]>([]);
  const [gateImportWarnings, setGateImportWarnings] = useState<string[]>([]);
  const [isImportingGateFile, setIsImportingGateFile] = useState<boolean>(false);

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [selectedModeFilter, setSelectedModeFilter] = useState<"all" | AttendanceMode>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Associated-Class Roll Call selection (never auto-select an unintended course)
  const [showDutyModal, setShowDutyModal] = useState<boolean>(false);
  const [showRollCallModal, setShowRollCallModal] = useState<boolean>(false);
  const [targetRollCallCourse, setTargetRollCallCourse] = useState<Course | null>(null);
  const [targetRollCallRecord, setTargetRollCallRecord] = useState<AttendanceRecord | null>(null);
  const [rollCallInitialTab, setRollCallInitialTab] = useState<"roster" | "terminal">("terminal");

  // Institutional Class Sessions & Student Registers view state
  const [selectedRegisterViewCourseId, setSelectedRegisterViewCourseId] = useState<string>("");
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: "info" | "warning" | "error" | "success" | "danger";
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
  });

  // Student pin self-verification state
  const [studentPinInput, setStudentPinInput] = useState<string>("");
  const [studentPinFeedback, setStudentPinFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // My Courses (strictly filtered for instructor, organization, or student)
  const myCourses = useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) {
      return courses;
    }
    if (isOrganization || isOrgAdmin) {
      return courses.filter(
        (c) =>
          c.orgId === currentUser.id ||
          c.createdBy === currentUser.id ||
          (userOrg && c.orgId === userOrg.id)
      );
    }
    if (isInstructor) {
      return courses.filter(
        (c) =>
          c.instructorId === currentUser.id ||
          c.instructors?.includes(currentUser.id) ||
          c.createdBy === currentUser.id
      );
    }
    // Student enrolled courses
    const activeCourseIds = enrollmentRequests
      .filter((r) => r.userId === currentUser.id && r.status !== "rejected")
      .map((r) => r.courseId);
    return courses.filter(
      (c) =>
        activeCourseIds.includes(c.id) ||
        currentUser.enrolledCourseIds?.includes(c.id) ||
        currentUser.courseIds?.includes(c.id)
    );
  }, [currentUser, courses, isOrganization, isOrgAdmin, isSuperAdmin, isInstructor, userOrg, enrollmentRequests]);

  // Relevant Attendance Records (strictly associated with user/organization courses)
  const relevantAttendanceRecords = useMemo(() => {
    if (isSuperAdmin) return attendanceRecords;
    const myCourseIds = new Set(myCourses.map((c) => c.id));
    return attendanceRecords.filter((r) =>
      myCourseIds.has(r.courseId) ||
      (r.orgId && (r.orgId === currentUser?.id || (userOrg && r.orgId === userOrg.id)))
    );
  }, [isSuperAdmin, myCourses, attendanceRecords, currentUser, userOrg]);

  // Relevant Teacher Duty Records
  const relevantTeacherDutyRecords = useMemo(() => {
    if (isSchoolStaff) {
      return teacherDutyRecords.filter(
        (r) =>
          r.orgId === currentUser?.id ||
          (userOrg && r.orgId === userOrg.id) ||
          myCourses.some((c) => c.instructorId === r.teacherId)
      );
    }
    if (isInstructor) {
      return teacherDutyRecords.filter((r) => r.teacherId === currentUser?.id);
    }
    return [];
  }, [isSchoolStaff, isInstructor, teacherDutyRecords, currentUser, userOrg, myCourses]);

  // Check if current instructor is currently on duty
  const activeInstructorDuty = useMemo(() => {
    if (!isInstructor) return null;
    return teacherDutyRecords.find(
      (r) => r.teacherId === currentUser?.id && r.status === "on_duty"
    ) || null;
  }, [isInstructor, teacherDutyRecords, currentUser?.id]);

  // Today's date key & personal school gate status (for Teachers & Students)
  const todayDateStr = new Date().toISOString().split("T")[0];
  const personalTodayGateLog = useMemo(() => {
    if (!currentUser) return null;
    return (
      gateLogs.find(
        (g) => g.personId === currentUser.id && g.date === todayDateStr
      ) || null
    );
  }, [gateLogs, currentUser, todayDateStr]);

  // Pooled School Directory for Campus Gate Attendance (STRICTLY online instructors & students added to any of the organization's courses + school offline teachers & students)
  const gateDirectoryPeople = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        email?: string;
        code?: string;
        department?: string;
        role: "teacher" | "student";
        type: "online" | "offline";
        orgId: string;
        isSchoolOfflineMember?: boolean;
        courses: string[];
      }
    >();

    const relevantCourseIds = new Set(myCourses.map((c) => c.id));
    const schoolOrgIds = new Set<string>();
    if (primaryOrgId) schoolOrgIds.add(primaryOrgId);
    if (userOrg?.id) schoolOrgIds.add(userOrg.id);
    if (currentUser?.orgId) schoolOrgIds.add(currentUser.orgId);
    myCourses.forEach((c) => {
      if (c.orgId) schoolOrgIds.add(c.orgId);
    });

    const matchesSchoolOrg = (oid?: string) =>
      isSuperAdmin || (Boolean(oid) && schoolOrgIds.has(oid!));

    const upsertPerson = (entry: {
      id: string;
      name: string;
      email?: string;
      code?: string;
      department?: string;
      role: "teacher" | "student";
      type: "online" | "offline";
      orgId: string;
      isSchoolOfflineMember?: boolean;
      courseTitle?: string;
    }) => {
      const existing = map.get(entry.id);
      if (!existing) {
        map.set(entry.id, {
          id: entry.id,
          name: entry.name,
          email: entry.email,
          code: entry.code,
          department: entry.department,
          role: entry.role,
          type: entry.type,
          orgId: entry.orgId,
          isSchoolOfflineMember: entry.isSchoolOfflineMember,
          courses: entry.courseTitle ? [entry.courseTitle] : [],
        });
      } else {
        if (!existing.email && entry.email) existing.email = entry.email;
        if (!existing.code && entry.code) existing.code = entry.code;
        if (!existing.department && entry.department) existing.department = entry.department;
        if (entry.type === "online") existing.type = "online";
        if (entry.role === "teacher") existing.role = "teacher";
        if (entry.isSchoolOfflineMember) existing.isSchoolOfflineMember = true;
        if (entry.courseTitle && !existing.courses.includes(entry.courseTitle)) {
          existing.courses.push(entry.courseTitle);
        }
      }
    };

    // 1. Online Instructors & Online Students explicitly assigned to or enrolled in the organization's courses
    myCourses.forEach((c) => {
      // Primary instructor ONLY when actually assigned to an online instructor user or active org instructor
      if (c.instructorId) {
        const matchedUser = allUsers.find((u) => u.id === c.instructorId);
        const matchedMember = orgMembers.find(
          (m) =>
            (m.status === "active" || !m.status) &&
            (m.userId === c.instructorId || m.id === c.instructorId) &&
            (m.role === "instructor" || m.role === "org_admin")
        );
        if (matchedUser || matchedMember) {
          upsertPerson({
            id: c.instructorId,
            name: matchedUser?.name || matchedMember?.name || c.instructorName || "Instructor",
            email: matchedUser?.email || matchedMember?.email,
            role: "teacher",
            type: "online",
            orgId: c.orgId || primaryOrgId || "school",
            courseTitle: c.title,
          });
        }
      }

      if (c.instructors && c.instructors.length > 0) {
        c.instructors.forEach((instId) => {
          const matchedUser = allUsers.find((u) => u.id === instId);
          const matchedMember = orgMembers.find(
            (m) =>
              (m.status === "active" || !m.status) &&
              (m.userId === instId || m.id === instId)
          );
          if (matchedUser || matchedMember) {
            upsertPerson({
              id: instId,
              name: matchedUser?.name || matchedMember?.name || "Instructor",
              email: matchedUser?.email || matchedMember?.email,
              role: "teacher",
              type: "online",
              orgId: c.orgId || primaryOrgId || "school",
              courseTitle: c.title,
            });
          }
        });
      }

      // Online enrolled students stored directly on course.enrolledStudentIds
      if (c.enrolledStudentIds && c.enrolledStudentIds.length > 0) {
        c.enrolledStudentIds.forEach((sid) => {
          const matchedUser = allUsers.find((u) => u.id === sid);
          if (matchedUser) {
            upsertPerson({
              id: matchedUser.id,
              name: matchedUser.name,
              email: matchedUser.email,
              role: "student",
              type: "online",
              orgId: c.orgId || primaryOrgId || "school",
              courseTitle: c.title,
            });
          }
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseObj = c as any;
      if (Array.isArray(courseObj.students)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        courseObj.students.forEach((st: any) => {
          const sid = typeof st === "string" ? st : st.id || st.userId;
          if (!sid) return;
          const matchedUser = allUsers.find((u) => u.id === sid);
          if (!matchedUser && typeof st !== "object") return;
          upsertPerson({
            id: sid,
            name:
              (typeof st === "object" && (st.name || st.userName)) ||
              matchedUser?.name ||
              "Enrolled Student",
            email: (typeof st === "object" ? st.email : undefined) || matchedUser?.email,
            role: "student",
            type: "online",
            orgId: c.orgId || primaryOrgId || "school",
            courseTitle: c.title,
          });
        });
      }
    });

    // 2. Active Org Members ONLY if specifically assigned to or enrolled in at least one of the organization's courses
    orgMembers
      .filter((m) => {
        if (m.status && m.status !== "active") return false;
        const assignedCourseIds = [
          ...(m.courseIds || []),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(((m as any).enrolledCourseIds as string[] | undefined) || []),
        ];
        return assignedCourseIds.some((cid) => relevantCourseIds.has(cid));
      })
      .forEach((m) => {
        const pid = m.userId || m.id;
        const assignedCourseIds = [
          ...(m.courseIds || []),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(((m as any).enrolledCourseIds as string[] | undefined) || []),
        ].filter((cid) => relevantCourseIds.has(cid));

        const matchedCourseTitles = assignedCourseIds
          .map((cid) => myCourses.find((c) => c.id === cid)?.title)
          .filter(Boolean) as string[];

        matchedCourseTitles.forEach((title) => {
          upsertPerson({
            id: pid,
            name: m.name,
            email: m.email,
            role:
              m.role === "instructor" || m.role === "org_admin"
                ? "teacher"
                : "student",
            type: "online",
            orgId: m.orgId || primaryOrgId || "school",
            courseTitle: title,
          });
        });
      });

    // 3. Approved Course Enrollments (Online Students strictly enrolled in organization courses)
    enrollmentRequests
      .filter((r) => r.status === "approved" && relevantCourseIds.has(r.courseId))
      .forEach((r) => {
        const courseObj = myCourses.find((c) => c.id === r.courseId);
        const matchedUser = allUsers.find((u) => u.id === r.userId);
        upsertPerson({
          id: r.userId,
          name: r.userName || matchedUser?.name || "Student",
          email: r.userEmail || matchedUser?.email,
          role: "student",
          type: "online",
          orgId: r.orgId || primaryOrgId || "school",
          courseTitle: courseObj?.title,
        });
      });

    // 4. Course-Level Offline Roster Students (added/imported onto organization courses)
    offlineRosterStudents
      .filter((s) => relevantCourseIds.has(s.courseId))
      .forEach((s) => {
        const courseObj = myCourses.find((c) => c.id === s.courseId);
        upsertPerson({
          id: s.id,
          name: s.name,
          email: s.email,
          code: s.code,
          role: "student",
          type: "offline",
          orgId: s.orgId || primaryOrgId || "school",
          courseTitle: courseObj?.title,
        });
      });

    // 5. School-Level Offline & Imported Members (Offline Teachers & Students explicitly added/imported for attendance)
    schoolOfflineMembers
      .filter(
        (m) =>
          matchesSchoolOrg(m.orgId) ||
          (Boolean(m.addedBy) && m.addedBy === currentUser?.id)
      )
      .forEach((m) => {
        upsertPerson({
          id: m.id,
          name: m.name,
          email: m.email,
          code: m.code,
          department: m.department,
          role: m.role,
          type: "offline",
          orgId: m.orgId || primaryOrgId || "school",
          isSchoolOfflineMember: true,
        });
      });

    return Array.from(map.values()).sort((a, b) => {
      if (a.role !== b.role) return a.role === "teacher" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [
    myCourses,
    orgMembers,
    allUsers,
    enrollmentRequests,
    offlineRosterStudents,
    schoolOfflineMembers,
    isSuperAdmin,
    primaryOrgId,
    userOrg,
    currentUser?.orgId,
    currentUser?.id,
  ]);

  const relevantGateLogs = useMemo(() => {
    const dirIds = new Set(gateDirectoryPeople.map((p) => p.id));
    const perPerson = new Map<string, typeof gateLogs[number]>();
    gateLogs
      .filter((g) => g.date === gateDateFilter && dirIds.has(g.personId))
      .forEach((g) => {
        const prev = perPerson.get(g.personId);
        if (!prev || (g.updatedAt || "") >= (prev.updatedAt || "")) {
          perPerson.set(g.personId, g);
        }
      });
    return Array.from(perPerson.values());
  }, [gateLogs, gateDateFilter, gateDirectoryPeople]);

  const onCampusTodayCount = useMemo(() => {
    const dirIds = new Set(gateDirectoryPeople.map((p) => p.id));
    const perPerson = new Map<string, typeof gateLogs[number]>();
    gateLogs
      .filter((g) => g.date === todayDateStr && dirIds.has(g.personId))
      .forEach((g) => {
        const prev = perPerson.get(g.personId);
        if (!prev || (g.updatedAt || "") >= (prev.updatedAt || "")) {
          perPerson.set(g.personId, g);
        }
      });
    return Array.from(perPerson.values()).filter((g) => g.status === "on_campus").length;
  }, [gateLogs, todayDateStr, gateDirectoryPeople]);

  const gateTerminalStats = useMemo(() => {
    let onCampus = 0;
    let teachersIn = 0;
    let teachersTotal = 0;
    let studentsIn = 0;
    let studentsTotal = 0;
    let leftCampus = 0;

    gateDirectoryPeople.forEach((person) => {
      const log = relevantGateLogs.find((g) => g.personId === person.id);
      const isIn = log?.status === "on_campus";
      const hasLeft = log?.status === "left_campus";

      if (person.role === "teacher") {
        teachersTotal += 1;
        if (isIn) teachersIn += 1;
      } else {
        studentsTotal += 1;
        if (isIn) studentsIn += 1;
      }

      if (isIn) onCampus += 1;
      if (hasLeft) leftCampus += 1;
    });

    return {
      total: gateDirectoryPeople.length,
      onCampus,
      teachersIn,
      teachersTotal,
      studentsIn,
      studentsTotal,
      leftCampus,
    };
  }, [gateDirectoryPeople, relevantGateLogs]);

  const filteredGateDirectoryPeople = useMemo(() => {
    return gateDirectoryPeople
      .filter((p) => gateRoleFilter === "all" || p.role === gateRoleFilter)
      .filter((p) => gateTypeFilter === "all" || p.type === gateTypeFilter)
      .filter((p) => {
        if (gateStatusFilter === "all") return true;
        const log = relevantGateLogs.find((g) => g.personId === p.id);
        if (gateStatusFilter === "on_campus") return log?.status === "on_campus";
        if (gateStatusFilter === "left_campus") return log?.status === "left_campus";
        return !log;
      })
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q)) ||
          p.courses.some((c) => c.toLowerCase().includes(q))
        );
      });
  }, [
    gateDirectoryPeople,
    gateRoleFilter,
    gateTypeFilter,
    gateStatusFilter,
    relevantGateLogs,
    searchQuery,
  ]);

  // Truancy calculation across courses (online + offline learners)
  const truancyReport = useMemo(() => {
    const list: Array<{
      studentId: string;
      studentName: string;
      studentEmail?: string;
      studentType: "online" | "offline";
      courseId: string;
      courseTitle: string;
      totalSessions: number;
      attendedSessions: number;
      unexcusedAbsences: number;
      excusedAbsences: number;
      lateArrivals: number;
      attendanceRate: number;
      truancyLevel: "good" | "warning" | "critical";
    }> = [];

    const targetCourses = myCourses;

    targetCourses.forEach((c) => {
      const studentMap = new Map<
        string,
        { id: string; name: string; email?: string; studentType: "online" | "offline" }
      >();
      enrollmentRequests
        .filter((r) => r.courseId === c.id && r.status === "approved")
        .forEach((r) => {
          studentMap.set(r.userId, {
            id: r.userId,
            name: r.userName || "Student",
            email: r.userEmail,
            studentType: "online",
          });
        });

      offlineRosterStudents
        .filter((s) => s.courseId === c.id)
        .forEach((s) => {
          if (!studentMap.has(s.id)) {
            studentMap.set(s.id, {
              id: s.id,
              name: s.name,
              email: s.email,
              studentType: "offline",
            });
          }
        });

      if (isStudent && currentUser) {
        studentMap.clear();
        studentMap.set(currentUser.id, {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          studentType: "online",
        });
      }

      const courseRecords = attendanceRecords.filter((r) => r.courseId === c.id);
      const totalSessions = courseRecords.length;

      studentMap.forEach((student) => {
        let attended = 0;
        let unexcused = 0;
        let excused = 0;
        let late = 0;

        courseRecords.forEach((rec) => {
          const entry = rec.entries?.find((e) => e.userId === student.id);
          if (entry) {
            if (entry.status === "present") attended += 1;
            else if (entry.status === "late") {
              attended += 1;
              late += 1;
            } else if (entry.status === "excused") {
              attended += 1;
              excused += 1;
            } else if (entry.status === "absent") {
              unexcused += 1;
            }
          }
        });

        const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
        const absencePercentage = totalSessions > 0 ? Math.round((unexcused / totalSessions) * 100) : 0;

        let truancyLevel: "good" | "warning" | "critical" = "good";
        if (absencePercentage >= 50) {
          truancyLevel = "critical";
        } else if (absencePercentage >= 10) {
          truancyLevel = "warning";
        }

        list.push({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentType: student.studentType,
          courseId: c.id,
          courseTitle: c.title,
          totalSessions,
          attendedSessions: attended,
          unexcusedAbsences: unexcused,
          excusedAbsences: excused,
          lateArrivals: late,
          attendanceRate: rate,
          truancyLevel,
        });
      });
    });

    return list;
  }, [myCourses, enrollmentRequests, offlineRosterStudents, isStudent, currentUser, attendanceRecords]);

  // At-risk truancy cases count (Persistent >=10% & Severe >=50% absence)
  const criticalTruancyCount = useMemo(() => {
    return truancyReport.filter((t) => t.truancyLevel === "critical" || t.truancyLevel === "warning").length;
  }, [truancyReport]);

  // Overall student attendance rate
  const overallStudentRate = useMemo(() => {
    if (truancyReport.length === 0) return 100;
    const total = truancyReport.reduce((acc, curr) => acc + curr.attendanceRate, 0);
    return Math.round(total / truancyReport.length);
  }, [truancyReport]);

  // Total teacher duty hours logged
  const totalTeacherHours = useMemo(() => {
    const totalMins = relevantTeacherDutyRecords.reduce((acc, curr) => acc + (curr.totalMinutes || 0), 0);
    return (totalMins / 60).toFixed(1);
  }, [relevantTeacherDutyRecords]);

  const activeTeachersOnDutyCount = useMemo(() => {
    return relevantTeacherDutyRecords.filter((r) => r.status === "on_duty").length;
  }, [relevantTeacherDutyRecords]);

  // Active today's scheduled class events and roll calls for student 1-tap check-in / check-out
  const activeStudentSessions = useMemo(() => {
    if (!isStudent || !currentUser) return [];
    const today = new Date().toISOString().split("T")[0];
    const studentCourseIds = new Set(myCourses.map((c) => c.id));
    const items: Array<{
      id: string;
      recordId?: string;
      title: string;
      courseTitle: string;
      courseId: string;
      pin: string;
      mode: AttendanceMode;
      location?: string;
      time?: string;
      isCheckedIn: boolean;
      activeInClass: boolean;
      checkInTime?: string;
      checkOutTime?: string;
      durationMinutes?: number;
      sessionStatus?: "live" | "ended";
    }> = [];

    // 1. Active roll calls created by instructors today
    attendanceRecords.forEach((rec) => {
      if (rec.date === today && (studentCourseIds.has(rec.courseId) || studentCourseIds.size === 0)) {
        const myEntry = (rec.entries || []).find((e) => e.userId === currentUser.id);
        const isCheckedIn = Boolean(
          myEntry && (myEntry.status === "present" || myEntry.status === "late")
        );
        const pin =
          rec.verificationCode ||
          String(
            100000 +
              (Math.abs(
                rec.id.split("").reduce((a, b) => {
                  a = (a << 5) - a + b.charCodeAt(0);
                  return a & a;
                }, 0)
              ) %
                900000)
          );
        items.push({
          id: rec.id,
          recordId: rec.id,
          title: rec.sessionTitle || "Live Roll Call Session",
          courseTitle: rec.courseTitle || "Course",
          courseId: rec.courseId,
          pin,
          mode: rec.mode || "physical",
          location: rec.location || "Classroom",
          time: rec.startTime || "Today",
          isCheckedIn,
          activeInClass: Boolean(myEntry?.activeInClass),
          checkInTime: myEntry?.checkInTime,
          checkOutTime: myEntry?.checkOutTime,
          durationMinutes: myEntry?.durationMinutes,
          sessionStatus: rec.sessionStatus,
        });
      }
    });

    // 2. Scheduled class events today for student courses
    events.forEach((evt) => {
      const evtDate = evt.date ? evt.date.split("T")[0] : today;
      const matchesCourse = evt.courseId ? studentCourseIds.has(evt.courseId) : true;
      if (evtDate === today && matchesCourse) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evtPin = (evt as any).verificationCode || String(100000 + (Math.abs(evt.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)) % 900000));
        
        const matchingRecord = attendanceRecords.find(
          (r) => r.verificationCode === evtPin && r.date === today
        );
        const myEntry = matchingRecord
          ? (matchingRecord.entries || []).find((e) => e.userId === currentUser.id)
          : undefined;
        const isCheckedIn = Boolean(
          myEntry && (myEntry.status === "present" || myEntry.status === "late")
        );

        if (!items.some((i) => i.pin === evtPin)) {
          items.push({
            id: `evt_${evt.id}`,
            recordId: matchingRecord?.id,
            title: evt.title,
            courseTitle: evt.courseTitle || "Scheduled Class Event",
            courseId: evt.courseId || "event_course",
            pin: evtPin,
            mode: evt.mode === "onsite" ? "physical" : "online",
            location: evt.location || "Scheduled Venue",
            time: evt.startTime || evt.time || "Scheduled Class",
            isCheckedIn,
            activeInClass: Boolean(myEntry?.activeInClass),
            checkInTime: myEntry?.checkInTime,
            checkOutTime: myEntry?.checkOutTime,
            durationMinutes: myEntry?.durationMinutes,
            sessionStatus: matchingRecord?.sessionStatus,
          });
        }
      }
    });

    return items;
  }, [isStudent, currentUser, myCourses, attendanceRecords, events]);

  // Student 1-tap Class Check-In / Check-Out handler
  const handleStudentClassCheckOut = async (recordId: string) => {
    const match = attendanceRecords.find((r) => r.id === recordId);
    if (!match || !currentUser) return;
    const now = new Date();
    const nowMs = now.getTime();
    const nowTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const existingEntries = match.entries || [];
    const idx = existingEntries.findIndex((e) => e.userId === currentUser.id);
    if (idx < 0) return;

    const currentEntry = existingEntries[idx];
    const elapsedMins =
      currentEntry.checkInMs && nowMs > currentEntry.checkInMs
        ? Math.max(1, Math.round((nowMs - currentEntry.checkInMs) / 60000))
        : currentEntry.durationMinutes || 1;
    const nextTotalMins = (currentEntry.durationMinutes || 0) + elapsedMins;
    const nextMovements = [
      ...(currentEntry.movements || []),
      {
        action: "out" as const,
        time: nowTime,
        timestampMs: nowMs,
        channel: (currentEntry.participantType || "online") as "online" | "offline",
      },
    ];

    const updatedEntries = [...existingEntries];
    updatedEntries[idx] = {
      ...currentEntry,
      activeInClass: false,
      checkOutTime: nowTime,
      checkOutMs: nowMs,
      durationMinutes: nextTotalMins,
      movements: nextMovements,
    };

    try {
      await addAttendanceRecord({
        ...match,
        entries: updatedEntries,
        updatedAt: now.toISOString(),
      });
      setStudentPinFeedback({
        type: "success",
        message: `Checked out of ${match.courseTitle || "class"} at ${nowTime} (${nextTotalMins}m total engagement recorded).`,
      });
      setTimeout(() => setStudentPinFeedback(null), 5000);
    } catch {
      setStudentPinFeedback({
        type: "error",
        message: "Failed to record class check-out. Try again.",
      });
    }
  };

  // Student pin self-verification handler (supports initial check-in & re-entry)
  const performPinVerification = async (pinToVerify: string) => {
    const pin = pinToVerify.trim();
    if (!pin || pin.length < 4) {
      setStudentPinFeedback({ type: "error", message: "Please enter a valid session attendance code." });
      return;
    }

    const now = new Date();
    const nowMs = now.getTime();
    const today = now.toISOString().split("T")[0];
    const matchingEvent = events.find((evt) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evtPin = (evt as any).verificationCode || String(100000 + (Math.abs(evt.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)) % 900000));
      const evtDate = evt.date ? evt.date.split("T")[0] : today;
      return evtPin === pin && evtDate === today;
    });

    const match = attendanceRecords.find(
      (r) =>
        (r.verificationCode === pin && r.date === today) ||
        (matchingEvent && r.id === `att_event_${matchingEvent.id}_${today}`) ||
        (matchingEvent && r.courseId === matchingEvent.courseId && r.date === today && r.sessionStatus === "live")
    );

    if (!match) {
      if (matchingEvent) {
        const nowTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const channelType = matchingEvent.mode === "onsite" ? "offline" : "online";
        const newRecord: AttendanceRecord = {
          id: `att_event_${matchingEvent.id}_${today}`,
          courseId: matchingEvent.courseId || "event_course",
          courseTitle: matchingEvent.courseTitle || matchingEvent.title,
          date: today,
          mode: matchingEvent.mode === "onsite" ? "physical" : "online",
          sessionStatus: "live",
          sessionTitle: matchingEvent.title,
          location: matchingEvent.location || "Scheduled Class Event",
          startTime: nowTime,
          startMs: nowMs,
          verificationCode: pin,
          entries: [
            {
              id: `entry_${currentUser?.id}_${Date.now()}`,
              userId: currentUser?.id || "guest",
              userName: currentUser?.name || "Student",
              userEmail: currentUser?.email,
              role: "student",
              participantType: channelType,
              status: "present",
              activeInClass: true,
              checkInTime: nowTime,
              checkInMs: nowMs,
              movements: [
                {
                  action: "in",
                  time: nowTime,
                  timestampMs: nowMs,
                  channel: channelType,
                },
              ],
              durationMinutes: 0,
              location: matchingEvent.location || "Scheduled Class Event",
              method: "verification_code",
              verifiedBy: "1-Tap Session Verification",
            },
          ],
          records: { [currentUser?.id || "guest"]: true },
          totalAttendees: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        try {
          await addAttendanceRecord(newRecord);
          setStudentPinFeedback({
            type: "success",
            message: `1-Tap Check-In recorded at ${nowTime} for scheduled event "${matchingEvent.title}".`,
          });
          setStudentPinInput("");
          return;
        } catch {
          // Fallback
        }
      }
    }

    if (!match) {
      setStudentPinFeedback({
        type: "error",
        message: "Check-in unavailable. Students cannot check in unless an instructor starts an active roll call session with a PIN or a scheduled class event is currently active.",
      });
      return;
    }

    if (match.sessionStatus === "ended") {
      setStudentPinFeedback({
        type: "error",
        message: "This class session has already ended.",
      });
      return;
    }

    const nowTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const existingEntries = match.entries || [];
    const studentEntryIdx = existingEntries.findIndex((e) => e.userId === currentUser?.id);
    const channelType = match.mode === "online" ? "online" : "offline";

    let updatedEntries: AttendanceEntry[];
    if (studentEntryIdx >= 0) {
      const prevEntry = existingEntries[studentEntryIdx];
      updatedEntries = [...existingEntries];
      updatedEntries[studentEntryIdx] = {
        ...prevEntry,
        participantType: prevEntry.participantType || channelType,
        status: prevEntry.status === "late" ? "late" : "present",
        activeInClass: true,
        checkInTime: prevEntry.checkInTime || nowTime,
        checkInMs: nowMs,
        checkOutTime: undefined,
        movements: [
          ...(prevEntry.movements || []),
          {
            action: "in",
            time: nowTime,
            timestampMs: nowMs,
            channel: prevEntry.participantType || channelType,
          },
        ],
        method: "verification_code",
      };
    } else {
      const newEntry: AttendanceEntry = {
        id: `entry_${currentUser?.id}_${Date.now()}`,
        userId: currentUser?.id || "guest",
        userName: currentUser?.name || "Student",
        userEmail: currentUser?.email,
        role: "student",
        participantType: channelType,
        status: "present",
        activeInClass: true,
        checkInTime: nowTime,
        checkInMs: nowMs,
        movements: [
          {
            action: "in",
            time: nowTime,
            timestampMs: nowMs,
            channel: channelType,
          },
        ],
        durationMinutes: 0,
        location: match.location || "Classroom",
        method: "verification_code",
        verifiedBy: "1-Tap Session Verification",
      };
      updatedEntries = [...existingEntries, newEntry];
    }

    try {
      await addAttendanceRecord({
        ...match,
        sessionStatus: match.sessionStatus || "live",
        entries: updatedEntries,
        records: {
          ...(match.records || {}),
          [currentUser?.id || "guest"]: true,
        },
        totalAttendees: updatedEntries.filter((e) => e.status === "present" || e.status === "late").length,
        updatedAt: now.toISOString(),
      });

      setStudentPinFeedback({
        type: "success",
        message: `Checked in at ${nowTime} for ${match.courseTitle || "class"} (${match.sessionTitle || "Lecture"}).`,
      });
      setStudentPinInput("");
      setTimeout(() => setStudentPinFeedback(null), 5000);
    } catch {
      setStudentPinFeedback({ type: "error", message: "Failed to submit attendance verification. Try again." });
    }
  };

  const handleStudentPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performPinVerification(studentPinInput);
  };

  // Format duration helper
  const formatGateMinutes = (mins: number) => {
    if (!mins || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Export Gate Logs CSV
  const handleExportGateCSV = () => {
    const headers = [
      "Date",
      "Name",
      "Email",
      "Role",
      "Type",
      "Current Status",
      "First Arrival",
      "Last Check-Out",
      "Total Campus Minutes",
      "Movements Timeline",
    ];
    const rows = relevantGateLogs.map((g) => [
      g.date,
      `"${g.personName.replace(/"/g, '""')}"`,
      `"${g.personEmail || ""}"`,
      g.personRole,
      g.personType || "online",
      g.status,
      g.firstArrivalTime || "",
      g.lastCheckOutTime || "",
      String(g.totalCampusMinutes || 0),
      `"${(g.movements || []).map((m) => `${m.timeDisplay} ${m.type.toUpperCase()}${m.note ? ` (${m.note})` : ""}`).join(" -> ")}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Backpack_Campus_Gate_Log_${gateDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Academic Broadsheet (CSV)
  const handleExportBroadsheet = () => {
    const headers = [
      "Session Date",
      "Course Title",
      "Session Title",
      "Environment (Mode)",
      "Location",
      "Instructor",
      "Total Attendees",
      "Student Name",
      "Student Email",
      "Attendance Status",
      "Check-In Time",
      "Duration (Minutes)",
      "Excuse Reason",
      "Truancy Warning",
    ];

    const rows: string[][] = [];
    relevantAttendanceRecords.forEach((rec) => {
      if (rec.entries && rec.entries.length > 0) {
        rec.entries.forEach((entry) => {
          rows.push([
            rec.date,
            `"${rec.courseTitle || ""}"`,
            `"${rec.sessionTitle || ""}"`,
            rec.mode || "physical",
            `"${rec.location || ""}"`,
            `"${rec.instructorEngagement?.instructorName || ""}"`,
            String(rec.totalAttendees || 0),
            `"${entry.userName}"`,
            `"${entry.userEmail || ""}"`,
            entry.status,
            `"${entry.checkInTime || ""}"`,
            String(entry.durationMinutes || 0),
            `"${entry.excuseReason || ""}"`,
            entry.truancyWarning ? "YES - Critical" : "No",
          ]);
        });
      } else {
        rows.push([
          rec.date,
          `"${rec.courseTitle || ""}"`,
          `"${rec.sessionTitle || ""}"`,
          rec.mode || "physical",
          `"${rec.location || ""}"`,
          `"${rec.instructorEngagement?.instructorName || ""}"`,
          String(rec.totalAttendees || 0),
          "N/A",
          "",
          "No roster entries",
          "",
          "0",
          "",
          "No",
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Backpack_Academic_Attendance_Broadsheet_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Faculty Timesheet (CSV)
  const handleExportFacultyTimesheet = () => {
    const headers = [
      "Date",
      "Teacher Name",
      "Teacher Email",
      "Environment Mode",
      "Duty Type",
      "Location",
      "Check-In Time",
      "Check-Out Time",
      "Total Hours",
      "Status",
      "Work Notes",
      "Associated Course",
    ];

    const rows = relevantTeacherDutyRecords.map((r) => [
      r.date,
      `"${r.teacherName}"`,
      `"${r.teacherEmail || ""}"`,
      r.mode,
      r.dutyType,
      `"${r.location || ""}"`,
      `"${r.checkInTime}"`,
      `"${r.checkOutTime || "Ongoing"}"`,
      r.totalMinutes ? (r.totalMinutes / 60).toFixed(2) : "0",
      r.status,
      `"${r.workNotes || ""}"`,
      `"${r.courseTitle || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Backpack_Faculty_Duty_Timesheet_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-16 font-body">
      {/* Top Banner / Hero */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-xs font-bold border border-[#0078d4]/20 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Institutional Attendance & Engagement
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
              Dual Tracking: Staff & Students
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
            {isSchoolStaff
              ? "School Attendance Management"
              : isInstructor
              ? "Attendance Register"
              : "My Academic Attendance & Class Standing"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            {isSchoolStaff
              ? "Unified oversight of teacher check-in/out work hours, timesheets, classroom roll calls, student truancy detection, and physical/online presence."
              : isInstructor
              ? "Clock in for teaching and office hour duty, take lecture roll calls with student pins, and audit cohort truancy."
              : "Monitor your overall class attendance rate, required academic threshold, and verify attendance for active lecture sessions."}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {(isSchoolStaff || isInstructor) && (
            <>
              <button
                onClick={() => setShowDutyModal(true)}
                className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center space-x-2 whitespace-nowrap cursor-pointer"
              >
                <Briefcase className="w-4 h-4" />
                <span>Duty Timesheet</span>
              </button>

              {myCourses.length > 0 && (
                <button
                  onClick={() => {
                    setTargetRollCallCourse(null);
                    setTargetRollCallRecord(null);
                    setRollCallInitialTab("terminal");
                    setShowRollCallModal(true);
                  }}
                  title="Open Attendance Register & Roll Call and choose a class"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-2 whitespace-nowrap cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Take Class Attendance</span>
                </button>
              )}
            </>
          )}

          {isSchoolStaff && (
            <button
              onClick={handleExportBroadsheet}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition text-xs border border-slate-200 dark:border-slate-600 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
              title="Download academic broadsheet report for institutional compliance"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Broadsheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Institutional KPI Command Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Student Attendance Rate */}
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Student Attendance</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                overallStudentRate >= 85
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : overallStudentRate >= 75
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              Threshold: 75%
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {overallStudentRate}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {overallStudentRate >= 75 ? "Good Academic Standing" : "Truancy Remediation Required"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Combined academic attendance rate across physical campuses and online classrooms.
          </p>
        </div>

        {/* Metric 2: Truancy Alerts */}
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Truancy Monitoring</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-extrabold">
              ≥10% Absence
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-red-600 dark:text-red-400">
              {criticalTruancyCount}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              High-Risk Students Flagged
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Automated alerts for learners approaching or exceeding maximum unexcused absences. Persistent (≥10%) and severe (≥50%) absence tracking for school truancy intervention.
          </p>
        </div>

        {/* Metric 3: On Campus / Active Now */}
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Campus Gate &amp; Faculty</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              Today
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
              {onCampusTodayCount}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              On Campus · {activeTeachersOnDutyCount} On Duty
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Teachers and students clocked in through the campus gate today.
          </p>
        </div>

        {/* Metric 4: Total Staff Work Hours */}
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Staff Timesheets</span>
            <span className="px-2 py-0.5 rounded-full bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-[10px] font-extrabold">
              Verified Hours
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalTeacherHours}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Staff Hours Logged
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Verified working hours logged for teaching, laboratory supervision, and consultations.
          </p>
        </div>
      </div>

      {/* TIER 1: Personal School Gate Daily Clock-In / Clock-Out Banner (Teachers & Students) */}
      {(isStudent || isInstructor) && currentUser && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  personalTodayGateLog?.status === "on_campus"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-500 border-slate-200 dark:border-slate-600"
                }`}
              >
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                    School Gate Clock-In &amp; Campus Movement
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      personalTodayGateLog?.status === "on_campus"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        : personalTodayGateLog?.status === "left_campus"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {personalTodayGateLog?.status === "on_campus"
                      ? "On Campus"
                      : personalTodayGateLog?.status === "left_campus"
                      ? "Left Campus"
                      : "Not Clocked In Today"}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                  {personalTodayGateLog ? (
                    <>
                      <span>Arrival: {personalTodayGateLog.firstArrivalTime || "--"}</span>
                      <span>·</span>
                      <span>
                        Last Out: {personalTodayGateLog.lastCheckOutTime || "--"}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Campus Time: {formatGateMinutes(personalTodayGateLog.totalCampusMinutes)}
                      </span>
                    </>
                  ) : (
                    <span>
                      Clock in at the school gate upon arrival and clock out whenever stepping off campus.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <input
                type="text"
                value={personalGateNote}
                onChange={(e) => setPersonalGateNote(e.target.value)}
                placeholder="Note (e.g. Morning arrival, Lunch)"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0078d4] w-48 sm:w-52"
              />
              {personalTodayGateLog?.status === "on_campus" ? (
                <button
                  type="button"
                  disabled={gateActionBusyId === currentUser.id}
                  onClick={async () => {
                    setGateActionBusyId(currentUser.id);
                    try {
                      await gateClockOut({
                        orgId: primaryOrgId || myCourses[0]?.orgId || "school",
                        personId: currentUser.id,
                        personName: currentUser.name,
                        note: personalGateNote.trim() || undefined,
                      });
                      setPersonalGateNote("");
                    } finally {
                      setGateActionBusyId(null);
                    }
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Gate Clock Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={gateActionBusyId === currentUser.id}
                  onClick={async () => {
                    setGateActionBusyId(currentUser.id);
                    try {
                      await gateClockIn({
                        orgId: primaryOrgId || myCourses[0]?.orgId || "school",
                        personId: currentUser.id,
                        personName: currentUser.name,
                        personEmail: currentUser.email,
                        personRole: isInstructor ? "teacher" : "student",
                        personType: "online",
                        note: personalGateNote.trim() || undefined,
                      });
                      setPersonalGateNote("");
                    } finally {
                      setGateActionBusyId(null);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {personalTodayGateLog ? "Gate Re-Entry (In)" : "Gate Clock In"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {personalTodayGateLog && personalTodayGateLog.movements.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
              <span className="font-sans font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Today&apos;s Gate Log:
              </span>
              {personalTodayGateLog.movements.map((mv, idx) => (
                <span key={mv.id} className="inline-flex items-center space-x-1">
                  {idx > 0 && <span className="text-slate-300 dark:text-slate-600 mr-1">·</span>}
                  <span
                    className={
                      mv.type === "in"
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-amber-600 dark:text-amber-400 font-bold"
                    }
                  >
                    {mv.timeDisplay} {mv.type === "in" ? "IN" : "OUT"}
                  </span>
                  {mv.note && <span className="text-slate-400">({mv.note})</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT ROLE SPECIAL PANEL: Class Session 1-Tap Check-In & Check-Out */}
      {isStudent && (
        <div className="bg-gradient-to-r from-[#0078d4]/10 via-blue-500/10 to-indigo-500/10 rounded-3xl p-6 sm:p-8 border border-[#0078d4]/20 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-[#0078d4] dark:text-[#04a4ec]" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Classroom Check-In &amp; Check-Out Portal
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Check into active physical, online, or hybrid classes in <strong>1 tap</strong>, or check out if stepping out of class to record exact engagement duration.
              </p>
            </div>

            {/* Manual PIN Form fallback */}
            <form onSubmit={handleStudentPinSubmit} className="flex items-center space-x-2 w-full md:w-auto">
              <input
                type="text"
                maxLength={6}
                value={studentPinInput}
                onChange={(e) => setStudentPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit PIN"
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono tracking-widest font-bold w-36 text-center focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center space-x-1.5 shrink-0 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Code</span>
              </button>
            </form>
          </div>

          {/* Active Today's Class Sessions & Events */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Today&apos;s Class Sessions &amp; Events
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                1-Tap Class Engagement Tracking
              </span>
            </div>

            {activeStudentSessions.length === 0 ? (
              <div className="p-4 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 text-center">
                No live roll call or scheduled class event active right now. When an instructor starts a roll call or a class event begins, your 1-Tap check-in button will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeStudentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs hover:border-[#0078d4]/40 transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center ${
                            session.mode === "online"
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                              : session.mode === "hybrid"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {session.mode === "online" ? (
                            <Video className="w-3 h-3 mr-1" />
                          ) : session.mode === "hybrid" ? (
                            <Globe className="w-3 h-3 mr-1" />
                          ) : (
                            <Building2 className="w-3 h-3 mr-1" />
                          )}
                          <span>
                            {session.mode === "online"
                              ? "Online Live"
                              : session.mode === "hybrid"
                              ? "Hybrid Class"
                              : "Physical Campus"}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-[#0078d4] dark:text-[#04a4ec] font-bold bg-[#0078d4]/10 px-2 py-0.5 rounded-md">
                          PIN: {session.pin}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {session.title}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono tabular-nums">
                        {session.courseTitle} · {session.time}
                        {session.location ? ` · ${session.location}` : ""}
                      </p>

                      {session.isCheckedIn && (
                        <p className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          In: {session.checkInTime || "Checked in"}
                          {session.checkOutTime ? ` · Out: ${session.checkOutTime}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {session.sessionStatus === "ended" ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold text-xs whitespace-nowrap">
                          Class Ended
                        </span>
                      ) : session.isCheckedIn && session.activeInClass && session.recordId ? (
                        <button
                          type="button"
                          onClick={() => handleStudentClassCheckOut(session.recordId!)}
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Check Out</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => performPinVerification(session.pin)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{session.isCheckedIn ? "Re-Enter Class" : "1-Tap Check-In"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {studentPinFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2.5 border ${
                studentPinFeedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-500/20"
              }`}
            >
              {studentPinFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{studentPinFeedback.message}</span>
            </div>
          )}
        </div>
      )}

      {/* INSTRUCTOR ROLE SPECIAL PANEL: Live Duty Status Bar */}
      {isInstructor && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                activeInstructorDuty
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500"
              }`}
            >
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  {activeInstructorDuty ? "You are Currently ON DUTY" : "You are Currently OFF DUTY"}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    activeInstructorDuty
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                  }`}
                >
                  {activeInstructorDuty ? "Shift Active" : "Shift Inactive"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeInstructorDuty
                  ? `Clocked in at ${activeInstructorDuty.checkInTime} (${activeInstructorDuty.mode === "physical" ? "Physical Campus" : activeInstructorDuty.mode === "hybrid" ? "Hybrid" : "Online Virtual"}) · ${activeInstructorDuty.location}`
                  : "Clock in to record your teaching, laboratory supervision, or office hours to the school register."}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDutyModal(true)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm whitespace-nowrap ${
              activeInstructorDuty
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-[#0078d4] hover:bg-[#006cbd] text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{activeInstructorDuty ? "Conclude Duty Shift" : "Clock In for Duty"}</span>
          </button>
        </div>
      )}

      {/* Main Tabs (School Leadership, Admins & Instructors) */}
      {(isSchoolStaff || isInstructor) && (
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-700 gap-x-6 gap-y-2">
          <button
            onClick={() => setManagerTab("gate")}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              managerTab === "gate"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>Gate Attendance ({gateDirectoryPeople.length})</span>
          </button>

          <button
            onClick={() => setManagerTab("students")}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              managerTab === "students"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Sessions &amp; Student Registers ({relevantAttendanceRecords.length})</span>
          </button>

          <button
            onClick={() => setManagerTab("truancy")}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              managerTab === "truancy"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Truancy &amp; Academic Risk Register ({criticalTruancyCount})</span>
          </button>

          {isSchoolStaff && (
            <button
              onClick={() => setManagerTab("faculty")}
              className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                managerTab === "faculty"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Teacher Timesheets &amp; Work Hours ({relevantTeacherDutyRecords.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Filter Toolbar (non-Gate tabs) */}
      {managerTab !== "gate" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student, teacher, or class..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            {/* Course Filter — strictly scoped to associated courses */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden"
            >
              <option value="all">All Associated Courses</option>
              {myCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Environment Filter: Physical vs Online vs Hybrid */}
            <select
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value as "all" | AttendanceMode)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden"
            >
              <option value="all">All Environments</option>
              <option value="physical">Physical Campus Only</option>
              <option value="online">Online Live Only</option>
              <option value="hybrid">Hybrid (Campus + Online)</option>
            </select>
          </div>

          {managerTab === "faculty" && isSchoolStaff && (
            <button
              onClick={handleExportFacultyTimesheet}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-1.5 transition text-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Timesheets (CSV)</span>
            </button>
          )}
        </div>
      )}

      {/* TAB 0: GATE ATTENDANCE TERMINAL (Offline Campus Terminal UX + Full School Directory of Online & Offline Teachers & Students) */}
      {managerTab === "gate" && (isSchoolStaff || isInstructor) && (
        <div className="space-y-4">
          {/* Top Live Clock & Campus Status Summary Banner */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0078d4] dark:text-[#04a4ec]">
                <DoorOpen className="w-4 h-4" />
                <span>Main Campus Gate · School Entry &amp; Exit Terminal</span>
              </div>
              <div className="text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white tracking-wider mt-1">
                {liveClockTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {liveClockTime.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · All Online &amp; Offline Teachers &amp; Students · {gateTerminalStats.total} Registered
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs tabular-nums">
              <div>
                <span className="block text-[11px] text-slate-400">On Campus Now</span>
                <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {gateTerminalStats.onCampus}/{gateTerminalStats.total}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Teachers In</span>
                <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {gateTerminalStats.teachersIn}/{gateTerminalStats.teachersTotal}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Students In</span>
                <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {gateTerminalStats.studentsIn}/{gateTerminalStats.studentsTotal}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Left Campus</span>
                <span className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {gateTerminalStats.leftCampus}
                </span>
              </div>
            </div>
          </div>

          {/* Terminal Toolbar, Optional Movement Note & Add Offline Teacher/Student Trigger */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teacher, student, ID, class..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                  />
                </div>

                <select
                  value={gateRoleFilter}
                  onChange={(e) =>
                    setGateRoleFilter(e.target.value as "all" | "teacher" | "student")
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
                >
                  <option value="all">All Roles (Teachers &amp; Students)</option>
                  <option value="teacher">Teachers Only</option>
                  <option value="student">Students Only</option>
                </select>

                <select
                  value={gateTypeFilter}
                  onChange={(e) =>
                    setGateTypeFilter(e.target.value as "all" | "online" | "offline")
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
                >
                  <option value="all">Online + Offline</option>
                  <option value="online">Online Accounts Only</option>
                  <option value="offline">Offline Records Only</option>
                </select>

                <select
                  value={gateStatusFilter}
                  onChange={(e) =>
                    setGateStatusFilter(
                      e.target.value as "all" | "on_campus" | "left_campus" | "not_arrived"
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
                >
                  <option value="all">All Gate Statuses</option>
                  <option value="on_campus">On Campus</option>
                  <option value="left_campus">Left Campus</option>
                  <option value="not_arrived">Not Clocked In</option>
                </select>

                <input
                  type="date"
                  value={gateDateFilter}
                  onChange={(e) => setGateDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGateMember(false);
                    setShowGateImportDrawer((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold flex items-center space-x-1.5 transition text-xs whitespace-nowrap cursor-pointer"
                >
                  {showGateImportDrawer ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#0078d4]" />
                  )}
                  <span>
                    {showGateImportDrawer ? "Close Import" : "Import from File"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowGateImportDrawer(false);
                    setShowAddGateMember((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold flex items-center space-x-1.5 transition text-xs whitespace-nowrap cursor-pointer"
                >
                  {showAddGateMember ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showAddGateMember ? "Close Form" : "+ Add Offline Teacher / Student"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleExportGateCSV}
                  disabled={relevantGateLogs.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-1.5 transition text-xs whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Gate CSV</span>
                </button>
              </div>
            </div>

            {/* Optional Gate Note Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                1-Tap Arrival &amp; Departure Logging: optionally attach a note (e.g., Morning arrival, Lunch break, Early dismissal) before clicking Clock In / Out.
              </span>
              <input
                type="text"
                value={gateOperatorNote}
                onChange={(e) => setGateOperatorNote(e.target.value)}
                placeholder="Optional gate note..."
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white w-full sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            {/* Inline Import Teachers & Students from File Drawer */}
            {showGateImportDrawer && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (gateImportParsed.length === 0) return;

                  const teachersToImport = gateImportParsed.filter(
                    (p) => p.role === "teacher"
                  );
                  const studentsToImport = gateImportParsed.filter(
                    (p) => p.role === "student"
                  );

                  if (
                    gateImportTargetMode === "gate_and_class" &&
                    studentsToImport.length > 0 &&
                    myCourses.length > 1 &&
                    !gateImportTargetCourseId
                  ) {
                    setGateFeedback({
                      type: "error",
                      message:
                        "Please select the specific target class before importing students onto a class roster.",
                    });
                    return;
                  }

                  const targetCourseObj =
                    myCourses.length === 1
                      ? myCourses[0]
                      : myCourses.find((c) => c.id === gateImportTargetCourseId);

                  setIsImportingGateFile(true);
                  try {
                    let addedGateCount = 0;
                    let addedClassCount = 0;

                    if (gateImportTargetMode === "gate_and_class" && targetCourseObj) {
                      if (teachersToImport.length > 0) {
                        const resTeachers = await addSchoolOfflineMembersBatch(
                          teachersToImport.map((t) => ({
                            orgId: primaryOrgId || targetCourseObj.orgId || "school",
                            name: t.name,
                            role: "teacher",
                            code: t.code,
                            email: t.email,
                            department: t.department,
                            addedBy: currentUser?.id,
                          }))
                        );
                        addedGateCount += resTeachers.length;
                      }
                      if (studentsToImport.length > 0) {
                        const resStudents = await addOfflineRosterStudentsBatch(
                          studentsToImport.map((s) => ({
                            courseId: targetCourseObj.id,
                            orgId: targetCourseObj.orgId || primaryOrgId || "school",
                            name: s.name,
                            code: s.code,
                            email: s.email,
                            addedBy: currentUser?.name || "Faculty",
                          }))
                        );
                        addedClassCount += resStudents.length;
                      }
                    } else {
                      const resAll = await addSchoolOfflineMembersBatch(
                        gateImportParsed.map((p) => ({
                          orgId: primaryOrgId || myCourses[0]?.orgId || "school",
                          name: p.name,
                          role: p.role,
                          code: p.code,
                          email: p.email,
                          department: p.department,
                          addedBy: currentUser?.id,
                        }))
                      );
                      addedGateCount += resAll.length;
                    }

                    const summaryParts: string[] = [];
                    if (addedGateCount > 0) {
                      summaryParts.push(`${addedGateCount} added to Gate Attendance`);
                    }
                    if (addedClassCount > 0 && targetCourseObj) {
                      summaryParts.push(
                        `${addedClassCount} student(s) registered onto "${targetCourseObj.title}"`
                      );
                    }

                    setGateFeedback({
                      type: "success",
                      message: `File import complete: ${summaryParts.join(" · ")}.`,
                    });
                    setTimeout(() => setGateFeedback(null), 6000);
                    setGateImportFileName("");
                    setGateImportRawText("");
                    setGateImportParsed([]);
                    setGateImportWarnings([]);
                    setShowGateImportDrawer(false);
                  } catch {
                    setGateFeedback({
                      type: "error",
                      message:
                        "Failed to import file records. Please check the file format and try again.",
                    });
                  } finally {
                    setIsImportingGateFile(false);
                  }
                }}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Upload className="w-4 h-4 text-[#0078d4]" />
                    <span>
                      Import Teachers &amp; Students into Attendance from File (CSV, TSV, TXT, JSON)
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = buildSampleAttendanceCsv("gate");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "Backpack_Gate_Teachers_Students_Template.csv";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className="text-[11px] font-bold text-[#0078d4] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample CSV</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Default Role (if Role column omitted)
                    </label>
                    <select
                      value={gateImportDefaultRole}
                      onChange={(e) => {
                        const nextRole = e.target.value as "student" | "teacher";
                        setGateImportDefaultRole(nextRole);
                        if (gateImportRawText && gateImportFileName) {
                          const reparsed = parseAttendanceImportFile(
                            gateImportRawText,
                            gateImportFileName,
                            nextRole
                          );
                          setGateImportParsed(reparsed.records);
                          setGateImportWarnings(reparsed.warnings);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                    >
                      <option value="student">Student (Default)</option>
                      <option value="teacher">Teacher (Default)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Import Destination
                    </label>
                    <select
                      value={gateImportTargetMode}
                      onChange={(e) =>
                        setGateImportTargetMode(
                          e.target.value as "gate_only" | "gate_and_class"
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                    >
                      <option value="gate_only">
                        Gate Attendance Only (Teachers &amp; Students)
                      </option>
                      {myCourses.length > 0 && (
                        <option value="gate_and_class">
                          Gate + Specific Class Roster (Students)
                        </option>
                      )}
                    </select>
                  </div>

                  {gateImportTargetMode === "gate_and_class" && myCourses.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#0078d4] mb-1">
                        Select Specific Class Roster *
                      </label>
                      <select
                        value={
                          myCourses.length === 1
                            ? myCourses[0].id
                            : gateImportTargetCourseId
                        }
                        onChange={(e) => setGateImportTargetCourseId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#0078d4]/40 bg-white dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] text-xs font-bold"
                      >
                        {myCourses.length > 1 && (
                          <option value="">-- Select Target Class --</option>
                        )}
                        {myCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {gateImportFileName
                        ? `Loaded: ${gateImportFileName}`
                        : "Select CSV, TSV, TXT, or JSON file"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Recommended columns: Name, Role (teacher/student), ID Code, Email, Department.
                    </p>
                  </div>
                  <label className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer whitespace-nowrap text-center">
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,.json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const parsed = parseAttendanceImportFile(
                          text,
                          file.name,
                          gateImportDefaultRole
                        );
                        setGateImportFileName(file.name);
                        setGateImportRawText(text);
                        setGateImportParsed(parsed.records);
                        setGateImportWarnings(parsed.warnings);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {gateImportWarnings.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                    {gateImportWarnings.slice(0, 3).map((w, idx) => (
                      <div key={idx}>{w}</div>
                    ))}
                  </div>
                )}

                {gateImportParsed.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Parsed {gateImportParsed.length} record(s):{" "}
                        {gateImportParsed.filter((r) => r.role === "teacher").length}{" "}
                        Teacher(s),{" "}
                        {gateImportParsed.filter((r) => r.role === "student").length}{" "}
                        Student(s)
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/60 text-[11px]">
                      {gateImportParsed.slice(0, 8).map((row, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {row.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                row.role === "teacher"
                                  ? "text-purple-600 dark:text-purple-400"
                                  : "text-[#0078d4] dark:text-[#04a4ec]"
                              }`}
                            >
                              {row.role}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono truncate">
                            {[row.code, row.email, row.department]
                              .filter(Boolean)
                              .join(" · ") || "Offline"}
                          </span>
                        </div>
                      ))}
                      {gateImportParsed.length > 8 && (
                        <div className="px-3 py-1 text-center text-slate-400">
                          +{gateImportParsed.length - 8} more record(s)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={gateImportParsed.length === 0 || isImportingGateFile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isImportingGateFile
                        ? "Importing..."
                        : `Import ${gateImportParsed.length} Teacher / Student Record(s)`}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Inline Add Offline Teacher / Student Drawer */}
            {showAddGateMember && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newGateMemberName.trim()) return;
                  try {
                    const created = await addSchoolOfflineMember({
                      orgId: primaryOrgId || myCourses[0]?.orgId || "school",
                      name: newGateMemberName.trim(),
                      role: newGateMemberRole,
                      code: newGateMemberCode.trim() || undefined,
                      email: newGateMemberEmail.trim() || undefined,
                      department: newGateMemberDept.trim() || undefined,
                      addedBy: currentUser?.id,
                    });
                    setNewGateMemberName("");
                    setNewGateMemberCode("");
                    setNewGateMemberEmail("");
                    setNewGateMemberDept("");
                    setShowAddGateMember(false);
                    setGateFeedback({
                      type: "success",
                      message: `Added offline ${created.role} "${created.name}" to the school gate directory.`,
                    });
                    setTimeout(() => setGateFeedback(null), 5000);
                  } catch {
                    setGateFeedback({
                      type: "error",
                      message: "Could not add offline member. Please try again.",
                    });
                  }
                }}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Register Offline Teacher or Student for School Gate Tracking
                  </h4>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setNewGateMemberRole("student")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        newGateMemberRole === "student"
                          ? "bg-[#0078d4] text-white"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Offline Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGateMemberRole("teacher")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        newGateMemberRole === "teacher"
                          ? "bg-[#0078d4] text-white"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Offline Teacher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    required
                    value={newGateMemberName}
                    onChange={(e) => setNewGateMemberName(e.target.value)}
                    placeholder={`Full Name (${newGateMemberRole === "teacher" ? "e.g. Mr. Adeyemi" : "e.g. Chinedu Okafor"}) *`}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="text"
                    value={newGateMemberCode}
                    onChange={(e) => setNewGateMemberCode(e.target.value)}
                    placeholder="ID / Badge Code (Optional)"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                  <input
                    type="email"
                    value={newGateMemberEmail}
                    onChange={(e) => setNewGateMemberEmail(e.target.value)}
                    placeholder="Email (Optional)"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="text"
                    value={newGateMemberDept}
                    onChange={(e) => setNewGateMemberDept(e.target.value)}
                    placeholder={
                      newGateMemberRole === "teacher"
                        ? "Department / Subject (Optional)"
                        : "Grade / Class / Wing (Optional)"
                    }
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>
                      Add Offline {newGateMemberRole === "teacher" ? "Teacher" : "Student"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Gate Terminal Feedback Toast */}
          {gateFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 border ${
                gateFeedback.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {gateFeedback.type === "error" ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{gateFeedback.message}</span>
            </div>
          )}

          {/* Terminal Card List — Offline Campus Terminal UX */}
          {filteredGateDirectoryPeople.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              {gateDirectoryPeople.length === 0
                ? "No teachers or students registered for the school yet. Add an offline teacher/student above or enroll learners into courses."
                : "No records match the current search or gate filters."}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGateDirectoryPeople.map((person) => {
                const log = relevantGateLogs.find((g) => g.personId === person.id);
                const isOnCampus = log?.status === "on_campus";
                const isToday = gateDateFilter === todayDateStr;

                return (
                  <div
                    key={person.id}
                    className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isOnCampus
                            ? "bg-emerald-600 text-white"
                            : log?.status === "left_campus"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {person.name}
                          </span>
                          <span className="text-[11px] text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span
                            className={`text-[11px] font-bold capitalize ${
                              person.role === "teacher"
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-[#0078d4] dark:text-[#04a4ec]"
                            }`}
                          >
                            {person.role}
                          </span>
                          <span className="text-[11px] text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                            {person.type}
                          </span>
                          <span className="text-[11px] text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span
                            className={`text-[11px] font-bold tabular-nums ${
                              isOnCampus
                                ? "text-emerald-600 dark:text-emerald-400"
                                : log?.status === "left_campus"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-400"
                            }`}
                          >
                            {isOnCampus
                              ? `On Campus (In ${log?.firstArrivalTime || "--"})`
                              : log?.status === "left_campus"
                              ? `Left Campus ${log.lastCheckOutTime || ""} · ${formatGateMinutes(log.totalCampusMinutes)}`
                              : "Not Clocked In"}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 truncate">
                          {person.code && (
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              ID: {person.code}
                            </span>
                          )}
                          {person.code && (person.email || person.department || person.courses.length > 0) && (
                            <span aria-hidden="true">·</span>
                          )}
                          {person.email && <span>{person.email}</span>}
                          {person.email && (person.department || person.courses.length > 0) && (
                            <span aria-hidden="true">·</span>
                          )}
                          {person.department && <span>{person.department}</span>}
                          {person.department && person.courses.length > 0 && (
                            <span aria-hidden="true">·</span>
                          )}
                          {person.courses.length > 0 && (
                            <span className="truncate max-w-md">
                              {person.courses.join(", ")}
                            </span>
                          )}
                        </div>

                        {log && log.movements.length > 0 && (
                          <div className="text-[10px] font-mono tabular-nums text-slate-400 truncate">
                            Timestamps:{" "}
                            {log.movements
                              .map(
                                (mv) =>
                                  `${mv.type === "in" ? "In" : "Out"} ${mv.timeDisplay}${
                                    mv.note ? ` (${mv.note})` : ""
                                  }`
                              )
                              .join(" -> ")}
                            {log.totalCampusMinutes > 0
                              ? ` · Total ${formatGateMinutes(log.totalCampusMinutes)}`
                              : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
                      {isToday ? (
                        isOnCampus ? (
                          <button
                            type="button"
                            disabled={gateActionBusyId === person.id}
                            onClick={async () => {
                              const { nowTime } = captureClockSnapshot();
                              setGateActionBusyId(person.id);
                              try {
                                const updated = await gateClockOut({
                                  orgId: person.orgId || primaryOrgId || "school",
                                  personId: person.id,
                                  personName: person.name,
                                  note: gateOperatorNote.trim() || undefined,
                                });
                                setGateOperatorNote("");
                                setGateFeedback({
                                  type: "success",
                                  message: `${person.name} (${person.role}) clocked OUT at Main Gate at ${nowTime} · Campus time: ${formatGateMinutes(updated.totalCampusMinutes)}.`,
                                });
                                setTimeout(() => setGateFeedback(null), 5000);
                              } finally {
                                setGateActionBusyId(null);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Clock Out</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={gateActionBusyId === person.id}
                            onClick={async () => {
                              const { nowTime } = captureClockSnapshot();
                              setGateActionBusyId(person.id);
                              try {
                                await gateClockIn({
                                  orgId: person.orgId || primaryOrgId || "school",
                                  personId: person.id,
                                  personName: person.name,
                                  personEmail: person.email,
                                  personRole: person.role,
                                  personType: person.type,
                                  note: gateOperatorNote.trim() || undefined,
                                });
                                setGateOperatorNote("");
                                setGateFeedback({
                                  type: "success",
                                  message: `${person.name} (${person.role}) clocked IN at Main Gate at ${nowTime}.`,
                                });
                                setTimeout(() => setGateFeedback(null), 5000);
                              } finally {
                                setGateActionBusyId(null);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>{log ? "Re-Enter In" : "Clock In"}</span>
                          </button>
                        )
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-mono text-[11px]">
                          Historical
                        </span>
                      )}

                      {log && (
                        <button
                          type="button"
                          onClick={() => {
                            const logId = log.id;
                            const pName = person.name;
                            setAlertConfig({
                              isOpen: true,
                              title: "Delete Gate Attendance Log",
                              message: `Remove ${pName}'s gate movement log for ${gateDateFilter}?`,
                              confirmText: "Yes, Delete Log",
                              type: "danger",
                              onConfirm: async () => {
                                await deleteGateLog(logId);
                                setGateFeedback({
                                  type: "success",
                                  message: `Deleted gate movement log for "${pName}" (${gateDateFilter}).`,
                                });
                                setTimeout(() => setGateFeedback(null), 4000);
                              },
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                          title="Delete this day's gate check-in/out log"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {person.isSchoolOfflineMember && (
                        <button
                          type="button"
                          onClick={() => {
                            const personId = person.id;
                            const personName = person.name;
                            const personRole = person.role;
                            setAlertConfig({
                              isOpen: true,
                              title: "Delete Offline School Member",
                              message: `Permanently remove offline ${personRole} "${personName}" from the school gate directory?`,
                              confirmText: "Yes, Delete Member",
                              type: "danger",
                              onConfirm: async () => {
                                await removeSchoolOfflineMember(personId);
                                setGateFeedback({
                                  type: "success",
                                  message: `Removed offline ${personRole} "${personName}" from school gate directory.`,
                                });
                                setTimeout(() => setGateFeedback(null), 4000);
                              },
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                          title="Remove offline member from gate directory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Institutional Academic Attendance & Student Registers */}
      {(managerTab === "students" || isStudent) && (
        <div className="space-y-6">
          {/* Institutional Class Registers Directory Table */}
          {(isSchoolStaff || isInstructor) && myCourses.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
                <div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#0078d4]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                      Institutional Class Registers &amp; Cohort Directory
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Inspect a class&apos;s enrolled roster, add/import offline students onto a chosen class, or open live roll call.
                  </p>
                </div>
                <span className="text-[11px] font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {myCourses.length} Institutional {myCourses.length === 1 ? "Class" : "Classes"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-heading text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">Class / Subject &amp; Lead Faculty</th>
                      <th className="py-3 px-4 font-bold">Enrolled Cohort</th>
                      <th className="py-3 px-4 font-bold text-center">Sessions Held</th>
                      <th className="py-3 px-4 font-bold text-center">Avg Attendance</th>
                      <th className="py-3 px-4 font-bold text-right">Registrar Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {myCourses
                      .filter(
                        (c) =>
                          selectedCourseFilter === "all" || c.id === selectedCourseFilter
                      )
                      .map((course) => {
                        const courseRecs = attendanceRecords.filter(
                          (r) => r.courseId === course.id
                        );
                        const liveRec = courseRecs.find(
                          (r) => r.date === todayDateStr && r.sessionStatus === "live"
                        );
                        const classOnlineIds = new Set<string>();
                        enrollmentRequests
                          .filter((r) => r.courseId === course.id && r.status === "approved")
                          .forEach((r) => classOnlineIds.add(r.userId));
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const cAny = course as any;
                        if (Array.isArray(cAny.enrolledStudentIds)) {
                          (cAny.enrolledStudentIds as string[]).forEach((sid) =>
                            classOnlineIds.add(sid)
                          );
                        }
                        orgMembers
                          .filter(
                            (m) =>
                              m.role === "student" &&
                              (!m.status || m.status === "active") &&
                              (m.courseIds?.includes(course.id) ||
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (m as any).enrolledCourseIds?.includes(course.id))
                          )
                          .forEach((m) => classOnlineIds.add(m.userId || m.id));

                        const classOfflineCount = offlineRosterStudents.filter(
                          (s) => s.courseId === course.id
                        ).length;
                        const totalCohort = classOnlineIds.size + classOfflineCount;

                        // Mean attendance across recorded sessions for this class
                        let sessionRateSum = 0;
                        let scoredSessions = 0;
                        courseRecs.forEach((r) => {
                          const ents = r.entries || [];
                          if (ents.length > 0) {
                            const ok = ents.filter(
                              (e) =>
                                e.status === "present" ||
                                e.status === "late" ||
                                e.status === "excused"
                            ).length;
                            sessionRateSum += Math.round((ok / ents.length) * 100);
                            scoredSessions += 1;
                          }
                        });
                        const meanRate =
                          scoredSessions > 0
                            ? Math.round(sessionRateSum / scoredSessions)
                            : null;

                        const isInspectingThis =
                          selectedRegisterViewCourseId === course.id;

                        return (
                          <tr
                            key={course.id}
                            className={`transition ${
                              isInspectingThis
                                ? "bg-[#0078d4]/5 dark:bg-[#0078d4]/10"
                                : "hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {course.title}
                                </span>
                                {liveRec && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase shrink-0">
                                    Live Roll Call
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                Faculty: {course.instructorName || "Unassigned"} ·{" "}
                                {course.pacing === "live-online"
                                  ? "Online Cohort"
                                  : course.pacing === "self-paced"
                                  ? "Self-Paced"
                                  : "Blended / Physical"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono tabular-nums">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {totalCohort} Total
                              </span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                                {classOnlineIds.size} online · {classOfflineCount} offline
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                              {courseRecs.length}
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                              {meanRate === null ? (
                                <span className="text-slate-400 text-[11px]">No logs</span>
                              ) : (
                                <span
                                  className={`font-extrabold ${
                                    meanRate >= 85
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : meanRate >= 75
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {meanRate}%
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedRegisterViewCourseId((prev) =>
                                      prev === course.id ? "" : course.id
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition inline-flex items-center space-x-1 whitespace-nowrap cursor-pointer border ${
                                    isInspectingThis
                                      ? "bg-[#0078d4] text-white border-[#0078d4]"
                                      : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{isInspectingThis ? "Hide Roster" : "View Roster"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetRollCallCourse(course);
                                    setTargetRollCallRecord(null);
                                    setRollCallInitialTab("roster");
                                    setShowRollCallModal(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] transition whitespace-nowrap cursor-pointer"
                                >
                                  Attendance Register
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetRollCallCourse(course);
                                    setTargetRollCallRecord(liveRec || null);
                                    setRollCallInitialTab("terminal");
                                    setShowRollCallModal(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition whitespace-nowrap cursor-pointer"
                                >
                                  {liveRec ? "Open Live Roll Call" : "Roll Call"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Inline Master Student Register Drawer for Chosen Class */}
              {selectedRegisterViewCourseId &&
                (() => {
                  const inspectCourse = myCourses.find(
                    (c) => c.id === selectedRegisterViewCourseId
                  );
                  if (!inspectCourse) return null;

                  const masterList: Array<{
                    id: string;
                    name: string;
                    contact?: string;
                    type: "online" | "offline";
                    removable: boolean;
                  }> = [];

                  enrollmentRequests
                    .filter(
                      (r) =>
                        r.courseId === inspectCourse.id && r.status === "approved"
                    )
                    .forEach((r) => {
                      if (!masterList.some((x) => x.id === r.userId)) {
                        masterList.push({
                          id: r.userId,
                          name: r.userName || "Student",
                          contact: r.userEmail,
                          type: "online",
                          removable: false,
                        });
                      }
                    });

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const cObj = inspectCourse as any;
                  if (Array.isArray(cObj.enrolledStudentIds)) {
                    (cObj.enrolledStudentIds as string[]).forEach((sid) => {
                      if (!masterList.some((x) => x.id === sid)) {
                        const mu = allUsers.find((u) => u.id === sid);
                        masterList.push({
                          id: sid,
                          name: mu?.name || "Enrolled Student",
                          contact: mu?.email,
                          type: "online",
                          removable: false,
                        });
                      }
                    });
                  }

                  orgMembers
                    .filter(
                      (m) =>
                        m.role === "student" &&
                        (!m.status || m.status === "active") &&
                        (m.courseIds?.includes(inspectCourse.id) ||
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (m as any).enrolledCourseIds?.includes(inspectCourse.id))
                    )
                    .forEach((m) => {
                      const mid = m.userId || m.id;
                      if (!masterList.some((x) => x.id === mid)) {
                        masterList.push({
                          id: mid,
                          name: m.name,
                          contact: m.email,
                          type: "online",
                          removable: false,
                        });
                      }
                    });

                  offlineRosterStudents
                    .filter((s) => s.courseId === inspectCourse.id)
                    .forEach((s) => {
                      if (!masterList.some((x) => x.id === s.id)) {
                        masterList.push({
                          id: s.id,
                          name: s.name,
                          contact: s.code ? `ID: ${s.code}` : s.email || "Campus Offline",
                          type: "offline",
                          removable: true,
                        });
                      }
                    });

                  return (
                    <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                            Master Student Register — {inspectCourse.title} ({masterList.length} Students)
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Official enrollment roll combining online students (auto-registered) and added/imported offline learners.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetRollCallCourse(inspectCourse);
                              setTargetRollCallRecord(null);
                              setRollCallInitialTab("roster");
                              setShowRollCallModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold text-[11px] transition cursor-pointer flex items-center space-x-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add / Import Offline Students</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRegisterViewCourseId("")}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="Close roster preview"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {masterList.length === 0 ? (
                        <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                          No students registered in this class yet. Enroll online students or add/import offline students above.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-heading border-b border-slate-100 dark:border-slate-700">
                              <tr>
                                <th className="py-2.5 px-3 font-bold">Student Name</th>
                                <th className="py-2.5 px-3 font-bold">ID / Email</th>
                                <th className="py-2.5 px-3 font-bold">Registration Mode</th>
                                <th className="py-2.5 px-3 font-bold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                              {masterList.map((stu) => {
                                return (
                                  <tr key={stu.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                      {stu.name}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                      {stu.contact || "—"}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          stu.type === "online"
                                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                        }`}
                                      >
                                        {stu.type === "online"
                                          ? "Online Auto-Enrolled"
                                          : "Offline Added"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      {stu.removable ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const sid = stu.id;
                                            const sname = stu.name;
                                            setAlertConfig({
                                              isOpen: true,
                                              title: "Remove Offline Student",
                                              message: `Remove "${sname}" from the attendance register of "${inspectCourse.title}"?`,
                                              confirmText: "Yes, Delete Student",
                                              type: "danger",
                                              onConfirm: async () => {
                                                await removeOfflineRosterStudent(sid);
                                              },
                                            });
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition cursor-pointer inline-flex items-center"
                                          title="Remove offline student from class register"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Enrolled
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}

          {/* Official Class Session Attendance Ledger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                {isStudent ? "My Class Attendance Ledger" : "Official Class Session Attendance Ledger"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological academic session registers with faculty check-in/out engagement, verification PINs, and auditable participant logs.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {relevantAttendanceRecords.length} session{relevantAttendanceRecords.length === 1 ? "" : "s"} on file
            </span>
          </div>

          {relevantAttendanceRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No class attendance sessions recorded yet
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Attendance registers are generated whenever an instructor initiates a classroom roll call or conducts a live online session.
              </p>
              {(isSchoolStaff || isInstructor) && myCourses.length > 0 && (
                <button
                  onClick={() => {
                    setTargetRollCallCourse(null);
                    setTargetRollCallRecord(null);
                    setRollCallInitialTab("terminal");
                    setShowRollCallModal(true);
                  }}
                  className="px-4 py-2 bg-[#0078d4] text-white font-bold rounded-xl text-xs hover:bg-[#006cbd] transition inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Open Class Roll Call</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {relevantAttendanceRecords
                .filter((r) => selectedCourseFilter === "all" || r.courseId === selectedCourseFilter)
                .filter((r) => selectedModeFilter === "all" || r.mode === selectedModeFilter)
                .filter((r) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    (r.courseTitle || "").toLowerCase().includes(q) ||
                    (r.sessionTitle || "").toLowerCase().includes(q) ||
                    (r.instructorEngagement?.instructorName || "").toLowerCase().includes(q) ||
                    (r.entries || []).some((e) => e.userName.toLowerCase().includes(q))
                  );
                })
                .map((record) => {
                  const entries = record.entries || [];
                  const presentCount = entries.filter((e) => e.status === "present").length;
                  const lateCount = entries.filter((e) => e.status === "late").length;
                  const excusedCount = entries.filter((e) => e.status === "excused").length;
                  const absentCount = entries.filter((e) => e.status === "absent").length;
                  const total = entries.length;
                  const attendedTotal = presentCount + lateCount + excusedCount;
                  const rate = total > 0 ? Math.round((attendedTotal / total) * 100) : 100;
                  const matchedCourse = myCourses.find((c) => c.id === record.courseId);
                  const sessionKey = record.id || `${record.courseId}_${record.date}_${record.startMs || ""}`;
                  const isSessionExpanded = Boolean(record.id && expandedSessionIds[record.id]);

                  return (
                    <div
                      key={sessionKey}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition shadow-xs"
                    >
                      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold font-mono tabular-nums text-slate-700 dark:text-slate-200 flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1 text-[#0078d4]" />
                              {record.date}
                              {record.startTime ? ` · ${record.startTime}` : ""}
                              {record.endTime ? `–${record.endTime}` : ""}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex items-center ${
                                record.mode === "online"
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                  : record.mode === "hybrid"
                                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {record.mode === "online" ? (
                                <Video className="w-3 h-3 mr-1" />
                              ) : record.mode === "hybrid" ? (
                                <Globe className="w-3 h-3 mr-1" />
                              ) : (
                                <Building2 className="w-3 h-3 mr-1" />
                              )}
                              <span>
                                {record.mode === "online"
                                  ? "Online Live"
                                  : record.mode === "hybrid"
                                  ? "Hybrid"
                                  : "Physical Campus"}
                              </span>
                            </span>

                            {record.sessionStatus && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  record.sessionStatus === "live"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                                }`}
                              >
                                {record.sessionStatus === "live" ? "Live Session" : "Settled"}
                              </span>
                            )}

                            {record.verificationCode && (
                              <span className="font-mono text-[10px] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] px-2 py-0.5 rounded-md font-bold">
                                PIN: {record.verificationCode}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wide text-[#0078d4] dark:text-[#04a4ec]">
                              {record.courseTitle || matchedCourse?.title || "Class"}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                              {record.sessionTitle || "Class Attendance Session"}
                            </h4>
                          </div>

                          <div className="text-slate-500 dark:text-slate-400 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                            {record.location && <span>Venue: {record.location}</span>}
                            {record.instructorEngagement?.instructorName && (
                              <span>
                                Faculty: <strong className="text-slate-700 dark:text-slate-300">{record.instructorEngagement.instructorName}</strong>
                                {record.instructorEngagement.checkInTime
                                  ? ` (In ${record.instructorEngagement.checkInTime}${
                                      record.instructorEngagement.checkOutTime
                                        ? ` – Out ${record.instructorEngagement.checkOutTime}`
                                        : ""
                                    })`
                                  : ""}
                              </span>
                            )}
                          </div>

                          {/* Breakdown Pills */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono tabular-nums">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                              {presentCount} Present
                            </span>
                            {lateCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                                {lateCount} Late
                              </span>
                            )}
                            {excusedCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                                {excusedCount} Excused
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                              {absentCount} Absent
                            </span>
                          </div>
                        </div>

                        <div className="lg:border-l lg:border-slate-100 dark:lg:border-slate-700 lg:pl-5 shrink-0 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3">
                          <div className="text-left lg:text-right">
                            <div className="flex items-baseline lg:justify-end space-x-1">
                              <span className="text-2xl font-mono tabular-nums font-extrabold text-slate-900 dark:text-white">
                                {rate}%
                              </span>
                              <span className="text-[11px] text-slate-400">rate</span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums block">
                              {attendedTotal} of {total} Recorded
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entries.length > 0 && record.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  const rid = record.id;
                                  if (!rid) return;
                                  setExpandedSessionIds((prev) => ({
                                    ...prev,
                                    [rid]: !prev[rid],
                                  }));
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                              >
                                {isSessionExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {isSessionExpanded ? "Hide Log" : `Audit Log (${entries.length})`}
                                </span>
                              </button>
                            )}

                            {(isSchoolStaff || isInstructor) && matchedCourse && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetRollCallCourse(matchedCourse);
                                  setTargetRollCallRecord(record);
                                  setRollCallInitialTab("terminal");
                                  setShowRollCallModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#0078d4]/10 hover:bg-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] font-bold text-[11px] whitespace-nowrap cursor-pointer"
                              >
                                {record.sessionStatus === "live" ? "Manage / End Class" : "Open Roll Call"}
                              </button>
                            )}

                            {(isSchoolStaff || isInstructor) && record.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  const recId = record.id;
                                  const recTitle = record.sessionTitle || record.courseTitle || "Session";
                                  setAlertConfig({
                                    isOpen: true,
                                    title: "Delete Attendance Session",
                                    message: `Permanently delete the class attendance session "${recTitle}" (${record.date})? This cannot be undone.`,
                                    confirmText: "Yes, Delete Session",
                                    type: "danger",
                                    onConfirm: async () => {
                                      await deleteAttendanceRecord(recId);
                                    },
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                                title="Delete session record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Auditable Institutional Participant Table */}
                      {isSessionExpanded && entries.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/50 p-4 sm:p-5 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-heading text-[10px] tracking-wider">
                                <th className="pb-2 font-bold">Participant</th>
                                <th className="pb-2 font-bold">Channel</th>
                                <th className="pb-2 font-bold">Status</th>
                                <th className="pb-2 font-bold">Check-In</th>
                                <th className="pb-2 font-bold">Check-Out</th>
                                <th className="pb-2 font-bold">Duration</th>
                                <th className="pb-2 font-bold">Movement Log</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {entries.map((entry, idx) => (
                                <tr key={entry.id || entry.userId || idx} className="hover:bg-white/70 dark:hover:bg-slate-800/40">
                                  <td className="py-2 pr-3 font-bold text-slate-900 dark:text-white">
                                    {entry.userName}
                                  </td>
                                  <td className="py-2 pr-3 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    {entry.participantType || "online"}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                        entry.status === "present"
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : entry.status === "late"
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                          : entry.status === "excused"
                                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                    {entry.checkInTime || "--:--"}
                                  </td>
                                  <td className="py-2 pr-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                    {entry.activeInClass && !entry.checkOutTime
                                      ? "In Class"
                                      : entry.checkOutTime || "--:--"}
                                  </td>
                                  <td className="py-2 pr-3 font-mono tabular-nums font-bold text-[#0078d4] dark:text-[#04a4ec]">
                                    {entry.durationMinutes ? `${entry.durationMinutes}m` : "0m"}
                                  </td>
                                  <td className="py-2 font-mono text-[10px] text-slate-400">
                                    {entry.movements && entry.movements.length > 0
                                      ? entry.movements
                                          .map((mv) => `${mv.time} ${mv.action === "in" ? "IN" : "OUT"}`)
                                          .join(" → ")
                                      : entry.excuseReason || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Truancy & Academic Risk Register */}
      {managerTab === "truancy" && (isSchoolStaff || isInstructor) && (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-red-900 dark:text-red-200 font-heading">
                  School Truancy Early Intervention Dashboard
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1 max-w-xl leading-relaxed">
                  Students with persistent (≥10% absence) or severe (≥50% absence) unexcused absence rates are monitored for faculty guidance, academic intervention, and school truancy tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-extrabold text-xs">
                {criticalTruancyCount} Students Flagged (≥10% Absence)
              </span>
            </div>
          </div>

          {truancyReport.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
              No enrollment rosters available to evaluate truancy.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-5">Student Learner</th>
                      <th className="py-3.5 px-5">Course / Cohort</th>
                      <th className="py-3.5 px-5 text-center">Sessions Conducted</th>
                      <th className="py-3.5 px-5 text-center">Attended</th>
                      <th className="py-3.5 px-5 text-center">Unexcused Absences</th>
                      <th className="py-3.5 px-5 text-center">Attendance Rate</th>
                      <th className="py-3.5 px-5">Truancy Standing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {truancyReport
                      .filter(
                        (item) =>
                          selectedCourseFilter === "all" || item.courseId === selectedCourseFilter
                      )
                      .filter((item) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          item.studentName.toLowerCase().includes(q) ||
                          item.courseTitle.toLowerCase().includes(q) ||
                          (item.studentEmail || "").toLowerCase().includes(q)
                        );
                      })
                      .map((item, idx) => (
                      <tr
                        key={`${item.studentId}_${item.courseId}_${idx}`}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition ${
                          item.truancyLevel === "critical"
                            ? "bg-red-50/20 dark:bg-red-950/10"
                            : ""
                        }`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white">{item.studentName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-bold uppercase text-slate-600 dark:text-slate-300">
                              {item.studentType}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">{item.studentEmail || (item.studentType === "offline" ? "Offline campus register" : "No email on record")}</span>
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                          {item.courseTitle}
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono">{item.totalSessions}</td>
                        <td className="py-3.5 px-5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.attendedSessions}
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono font-bold text-red-600 dark:text-red-400">
                          {item.unexcusedAbsences}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {item.attendanceRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          {item.truancyLevel === "critical" ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold text-[10px] inline-flex items-center border border-red-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Severe Absence (≥50% Absence)
                            </span>
                          ) : item.truancyLevel === "warning" ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] inline-flex items-center border border-amber-500/20">
                              Persistent Absence (≥10% Absence)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] inline-flex items-center border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Good Standing (&lt;10% Absence)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Faculty Timesheet & Work Hours */}
      {managerTab === "faculty" && isSchoolStaff && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Faculty Work Hours & Duty Shift Logs
            </h3>
            <button
              onClick={() => setShowDutyModal(true)}
              className="px-4 py-2 bg-[#0078d4] text-white font-bold rounded-xl text-xs hover:bg-[#006cbd] transition inline-flex items-center space-x-1.5 shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>Record Shift in Faculty Terminal</span>
            </button>
          </div>

          {relevantTeacherDutyRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
              <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No faculty duty shifts recorded yet
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Teachers can check in and check out using Duty Timesheet to log work hours, office consultations, and physical/online lecture shifts.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5">Teacher / Faculty Member</th>
                      <th className="py-3.5 px-5">Mode & Station</th>
                      <th className="py-3.5 px-5">Duty Type</th>
                      <th className="py-3.5 px-5">Check In</th>
                      <th className="py-3.5 px-5">Check Out</th>
                      <th className="py-3.5 px-5 text-center">Duration</th>
                      <th className="py-3.5 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {relevantTeacherDutyRecords.map((r) => {
                      const hours = r.totalMinutes ? (r.totalMinutes / 60).toFixed(1) : "—";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-5 font-medium">{r.date}</td>
                          <td className="py-3.5 px-5">
                            <span className="font-bold text-slate-900 dark:text-white block">{r.teacherName}</span>
                            <span className="text-[11px] text-slate-400">{r.teacherEmail}</span>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center space-x-1.5">
                              {r.mode === "physical" ? (
                                <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : r.mode === "hybrid" ? (
                                <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              ) : (
                                <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {r.mode === "physical"
                                  ? "Physical Campus"
                                  : r.mode === "hybrid"
                                  ? "Hybrid"
                                  : "Online Virtual"}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{r.location}</span>
                          </td>
                          <td className="py-3.5 px-5 capitalize font-medium">{r.dutyType.replace("_", " ")}</td>
                          <td className="py-3.5 px-5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {r.checkInTime}
                          </td>
                          <td className="py-3.5 px-5 font-mono font-bold text-slate-600 dark:text-slate-300">
                            {r.checkOutTime || "Ongoing"}
                          </td>
                          <td className="py-3.5 px-5 text-center font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {hours} hrs
                          </td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                r.status === "on_duty"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {r.status === "on_duty" ? "On Duty" : "Completed"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showDutyModal && (
        <TeacherDutyModal
          isOpen={showDutyModal}
          onClose={() => setShowDutyModal(false)}
          preselectedTeacherId={isInstructor ? currentUser?.id : undefined}
        />
      )}

      {showRollCallModal && (
        <ClassRollCallModal
          key={`${targetRollCallCourse?.id || "unselected"}_${targetRollCallRecord?.id || "live"}`}
          isOpen={showRollCallModal}
          onClose={() => {
            setShowRollCallModal(false);
            setTargetRollCallRecord(null);
          }}
          targetCourse={targetRollCallCourse}
          targetSessionRecord={targetRollCallRecord}
          initialTab={rollCallInitialTab}
          availableCourses={myCourses}
          onSelectCourse={(c) => {
            setTargetRollCallCourse(c);
            setTargetRollCallRecord(null);
          }}
        />
      )}

      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AttendancePage;
