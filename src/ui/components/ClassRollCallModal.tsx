import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import {
  Course,
  AttendanceRecord,
  AttendanceEntry,
  AttendanceStatus,
  AttendanceMode,
  AttendanceMovement,
} from "../../types";
import { generateId } from "../../lib/id";
import {
  parseAttendanceImportFile,
  buildSampleAttendanceCsv,
  ParsedAttendancePerson,
} from "../../lib/attendanceImport";
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building2,
  Video,
  X,
  Users,
  Search,
  Check,
  AlertTriangle,
  UserPlus,
  Trash2,
  Timer,
  KeyRound,
  LogIn,
  LogOut,
  Globe,
  Upload,
  Download,
} from "lucide-react";

interface ClassRollCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCourse?: Course | null;
  targetSessionRecord?: AttendanceRecord | null;
  initialMode?: AttendanceMode;
  initialTab?: "roster" | "terminal";
  availableCourses?: Course[];
  onSelectCourse?: (course: Course | null) => void;
}

interface StudentAttendanceState {
  status: AttendanceStatus;
  participantType: "online" | "offline";
  activeInClass: boolean;
  arrivalTime?: string;
  checkInMs?: number;
  checkOutTime?: string;
  checkOutMs?: number;
  accumulatedMinutes: number;
  movements: AttendanceMovement[];
  excuseReason?:
    | "medical"
    | "authorized_leave"
    | "family_emergency"
    | "school_event"
    | "technical_disruption";
  excuseNotes?: string;
}

const captureClockSnapshot = () => {
  const now = new Date();
  return {
    nowMs: now.getTime(),
    nowTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

export const ClassRollCallModal: React.FC<ClassRollCallModalProps> = ({
  isOpen,
  onClose,
  targetCourse,
  targetSessionRecord,
  initialMode = "physical",
  initialTab = "roster",
  availableCourses,
  onSelectCourse,
}) => {
  const { currentUser } = useAuth();
  const {
    addAttendanceRecord,
    attendanceRecords,
    enrollmentRequests,
    orgMembers,
    allUsers,
    offlineRosterStudents,
    addOfflineRosterStudent,
    addOfflineRosterStudentsBatch,
    removeOfflineRosterStudent,
  } = useAppContext();

  const todayDateStr = new Date().toISOString().split("T")[0];
  const matchedSessionRecord = useMemo(() => {
    if (!targetCourse) return null;
    if (targetSessionRecord && targetSessionRecord.courseId === targetCourse.id) {
      return targetSessionRecord;
    }
    return (
      attendanceRecords.find(
        (r) =>
          r.courseId === targetCourse.id &&
          r.date === todayDateStr &&
          r.sessionStatus === "live"
      ) || null
    );
  }, [targetCourse, targetSessionRecord, attendanceRecords, todayDateStr]);

  // Active view tab inside Attendance Register
  const [activeTab, setActiveTab] = useState<"roster" | "terminal">(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Track unified session ID so Check-In and Check-Out update the exact same session
  const [activeRecordId, setActiveRecordId] = useState<string | null>(
    () => matchedSessionRecord?.id || null
  );

  // Basic Session Info (hydrated from active session if reopening for check-out)
  const [sessionTitle, setSessionTitle] = useState(
    () =>
      matchedSessionRecord?.sessionTitle ||
      `Lecture Session · ${new Date().toLocaleDateString()}`
  );
  const [sessionDate, setSessionDate] = useState(
    () => matchedSessionRecord?.date || todayDateStr
  );
  const [sessionMode, setSessionMode] = useState<AttendanceMode>(
    () => matchedSessionRecord?.mode || initialMode
  );
  const [location, setLocation] = useState(
    () =>
      matchedSessionRecord?.location ||
      (initialMode === "physical"
        ? "Main Campus Hall 1"
        : initialMode === "hybrid"
        ? "Hall 1 + Live Stream"
        : "Online Live Classroom")
  );
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState(
    () => matchedSessionRecord?.expectedDurationMinutes || 60
  );
  const [verificationCode, setVerificationCode] = useState(
    () =>
      matchedSessionRecord?.verificationCode ||
      Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [searchStudent, setSearchStudent] = useState("");
  const [rosterTypeFilter, setRosterTypeFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Teacher class check-in / check-out state for this class session
  const [teacherCheckedIn, setTeacherCheckedIn] = useState(
    () => Boolean(matchedSessionRecord?.instructorEngagement?.activeInClass)
  );
  const [teacherCheckInTime, setTeacherCheckInTime] = useState<string | undefined>(
    () => matchedSessionRecord?.instructorEngagement?.checkInTime
  );
  const [teacherCheckInMs, setTeacherCheckInMs] = useState<number | undefined>(
    () => matchedSessionRecord?.instructorEngagement?.checkInMs
  );
  const [teacherCheckOutTime, setTeacherCheckOutTime] = useState<
    string | undefined
  >(() => matchedSessionRecord?.instructorEngagement?.checkOutTime);
  const [teacherChannel, setTeacherChannel] = useState<"offline" | "online">(
    () =>
      matchedSessionRecord?.instructorEngagement?.participantType ||
      (initialMode === "online" ? "online" : "offline")
  );

  // Terminal mode PIN entry & feedback state
  const [terminalPinInput, setTerminalPinInput] = useState("");
  const [terminalFeedback, setTerminalFeedback] = useState<{
    userName: string;
    action: "in" | "out" | "pin_verified" | "ended";
    duration?: string;
    type?: "success" | "error";
    message?: string;
  } | null>(null);

  // Live clock ticker
  const [liveClockTime, setLiveClockTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const targetCourseId = targetCourse?.id || "";

  // Legacy localStorage custom offline students fallback merged cleanly
  const [legacyLocalOffline, setLegacyLocalOffline] = useState<
    Array<{ id: string; name: string; email?: string }>
  >(() => {
    if (!targetCourseId) return [];
    try {
      const stored = localStorage.getItem(
        `backpack_custom_students_${targetCourseId}`
      );
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State for Add Offline Student & Import File Inline Drawers (strictly scoped to selected class)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showImportStudentsModal, setShowImportStudentsModal] = useState(false);
  const [registerCourseId, setRegisterCourseId] = useState<string>(targetCourseId);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importParsedRows, setImportParsedRows] = useState<ParsedAttendancePerson[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [rosterFeedback, setRosterFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Pooled Master Roster: Online (Auto-registered) + Offline (Added)
  const courseStudents = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      email?: string;
      studentType: "online" | "offline";
      isExternal?: boolean;
    }> = [];

    if (!targetCourse) return list;

    // 1. Online Students — automatically registered from approved course enrollments
    enrollmentRequests
      .filter((r) => r.courseId === targetCourse.id && r.status === "approved")
      .forEach((r) => {
        if (!list.some((s) => s.id === r.userId)) {
          list.push({
            id: r.userId,
            name: r.userName || "Student",
            email: r.userEmail,
            studentType: "online",
          });
        }
      });

    // 2. Online Students — from course object directly (students array or enrolledStudentIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseObj = targetCourse as any;
    if (Array.isArray(courseObj.students)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      courseObj.students.forEach((s: any) => {
        const id = typeof s === "string" ? s : s.id || s.userId;
        const name =
          typeof s === "string"
            ? "Enrolled Student"
            : s.name || s.userName || "Student";
        const email = typeof s === "object" ? s.email : undefined;
        if (id && !list.some((item) => item.id === id)) {
          list.push({ id, name, email, studentType: "online" });
        }
      });
    }
    if (Array.isArray(courseObj.enrolledStudentIds)) {
      (courseObj.enrolledStudentIds as string[]).forEach((sid) => {
        if (sid && !list.some((item) => item.id === sid)) {
          const matchedUser = allUsers.find((u) => u.id === sid);
          list.push({
            id: sid,
            name: matchedUser?.name || "Enrolled Student",
            email: matchedUser?.email,
            studentType: "online",
          });
        }
      });
    }

    // 3. Online Students — strictly associated with this specific class via orgMembers
    orgMembers
      .filter(
        (m) =>
          m.role === "student" &&
          (m.courseIds?.includes(targetCourse.id) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (m as any).enrolledCourseIds?.includes(targetCourse.id))
      )
      .forEach((m) => {
        const id = m.userId || m.id;
        if (!list.some((s) => s.id === id)) {
          list.push({
            id,
            name: m.name,
            email: m.email,
            studentType: "online",
          });
        }
      });

    // 4. Online Student — current user if enrolled student
    if (
      currentUser?.role === "student" &&
      (currentUser.enrolledCourseIds?.includes(targetCourse.id) ||
        currentUser.courseIds?.includes(targetCourse.id))
    ) {
      if (!list.some((s) => s.id === currentUser.id)) {
        list.push({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          studentType: "online",
        });
      }
    }

    // 5. Offline Students — persisted in AppContext/Firestore for this course
    offlineRosterStudents
      .filter((os) => os.courseId === targetCourse.id)
      .forEach((os) => {
        if (!list.some((s) => s.id === os.id)) {
          const contactLabel = os.code
            ? `ID: ${os.code}`
            : os.email || "Campus Offline Student";
          list.push({
            id: os.id,
            name: os.name,
            email: contactLabel,
            studentType: "offline",
            isExternal: true,
          });
        }
      });

    // 6. Legacy localStorage offline students (backward compatibility)
    legacyLocalOffline.forEach((cs) => {
      if (!list.some((s) => s.id === cs.id)) {
        list.push({
          ...cs,
          studentType: "offline",
          isExternal: true,
        });
      }
    });

    // 7. Online students from past attendance records (do NOT resurrect deleted offline students)
    attendanceRecords
      .filter((r) => r.courseId === targetCourse.id)
      .forEach((rec) => {
        rec.entries?.forEach((e) => {
          const isLegacyOffline =
            e.userId?.startsWith("ext_stu_") || e.participantType === "offline";
          if (
            e.userId &&
            e.role !== "instructor" &&
            !isLegacyOffline &&
            !list.some((s) => s.id === e.userId)
          ) {
            list.push({
              id: e.userId,
              name: e.userName || "Student",
              email: e.userEmail,
              studentType: "online",
              isExternal: false,
            });
          }
        });
      });

    return list;
  }, [
    enrollmentRequests,
    orgMembers,
    allUsers,
    currentUser,
    offlineRosterStudents,
    legacyLocalOffline,
    attendanceRecords,
    targetCourse,
  ]);

  const onlineRosterCount = courseStudents.filter(
    (s) => s.studentType === "online"
  ).length;
  const offlineRosterCount = courseStudents.filter(
    (s) => s.studentType === "offline"
  ).length;

  // Truancy historical records (10% Persistent / 50% Severe)
  const studentTruancyHistory = useMemo(() => {
    const courseRecords = targetCourse
      ? attendanceRecords.filter((r) => r.courseId === targetCourse.id)
      : [];
    const historyMap: Record<
      string,
      { totalSessions: number; unexcusedAbsences: number; absenceRate: number }
    > = {};

    courseStudents.forEach((student) => {
      let absences = 0;
      let total = 0;
      courseRecords.forEach((rec) => {
        const entry = rec.entries?.find((e) => e.userId === student.id);
        if (entry) {
          total += 1;
          if (entry.status === "absent" && !entry.excuseReason) {
            absences += 1;
          }
        }
      });
      const rate = total > 0 ? Math.round((absences / total) * 100) : 0;
      historyMap[student.id] = {
        totalSessions: total,
        unexcusedAbsences: absences,
        absenceRate: rate,
      };
    });

    return historyMap;
  }, [attendanceRecords, targetCourse, courseStudents]);

  // Active Class Attendance state map (defaults to awaiting check-in / absent)
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, StudentAttendanceState>
  >(() => {
    const initial: Record<string, StudentAttendanceState> = {};
    if (!targetCourse) return initial;
    const existingRec =
      matchedSessionRecord ||
      attendanceRecords.find(
        (r) =>
          r.courseId === targetCourse.id &&
          (r.date === sessionDate || r.verificationCode === verificationCode) &&
          r.sessionStatus !== "ended"
      );

    courseStudents.forEach((s) => {
      const existingEntry = existingRec?.entries?.find(
        (e) => e.userId === s.id
      );
      if (existingEntry) {
        initial[s.id] = {
          status: existingEntry.status,
          participantType: existingEntry.participantType || s.studentType,
          activeInClass:
            existingEntry.activeInClass ??
            ((existingEntry.status === "present" ||
              existingEntry.status === "late") &&
              !existingEntry.checkOutTime),
          arrivalTime: existingEntry.checkInTime,
          checkInMs: existingEntry.checkInMs,
          checkOutTime: existingEntry.checkOutTime,
          checkOutMs: existingEntry.checkOutMs,
          accumulatedMinutes: existingEntry.durationMinutes || 0,
          movements: existingEntry.movements || [],
          excuseReason: existingEntry.excuseReason,
        };
      } else {
        initial[s.id] = {
          status: "absent",
          participantType: s.studentType,
          activeInClass: false,
          accumulatedMinutes: 0,
          movements: [],
        };
      }
    });

    return initial;
  });

  // Real-time synchronization from portal self check-ins & live online joins
  useEffect(() => {
    if (!isOpen || !targetCourseId) return;

    const matchingRecords = attendanceRecords.filter(
      (r) =>
        (activeRecordId && r.id === activeRecordId) ||
        (r.courseId === targetCourseId &&
          r.date === sessionDate &&
          (r.verificationCode === verificationCode || r.sessionStatus === "live"))
    );

    if (matchingRecords.length === 0) return;

    const timerId = setTimeout(() => {
      setAttendanceMap((prev) => {
        const nextMap = { ...prev };
        let updated = false;

        matchingRecords.forEach((rec) => {
          if (rec.entries) {
            rec.entries.forEach((entry) => {
              if (entry.userId && entry.role !== "instructor") {
                const current = nextMap[entry.userId];
                const remoteIsActive =
                  entry.activeInClass ??
                  ((entry.status === "present" || entry.status === "late") &&
                    !entry.checkOutTime);
                if (
                  !current ||
                  current.status !== entry.status ||
                  current.arrivalTime !== entry.checkInTime ||
                  current.checkOutTime !== entry.checkOutTime ||
                  current.accumulatedMinutes !== entry.durationMinutes
                ) {
                  nextMap[entry.userId] = {
                    status: entry.status,
                    participantType:
                      entry.participantType || current?.participantType || "online",
                    activeInClass: remoteIsActive,
                    arrivalTime: entry.checkInTime || current?.arrivalTime,
                    checkInMs: entry.checkInMs || current?.checkInMs,
                    checkOutTime: entry.checkOutTime || current?.checkOutTime,
                    checkOutMs: entry.checkOutMs || current?.checkOutMs,
                    accumulatedMinutes: Math.max(
                      entry.durationMinutes || 0,
                      current?.accumulatedMinutes || 0
                    ),
                    movements: entry.movements || current?.movements || [],
                    excuseReason: entry.excuseReason || current?.excuseReason,
                  };
                  updated = true;
                }
              }
            });
          }
        });

        return updated ? nextMap : prev;
      });
    }, 0);

    return () => clearTimeout(timerId);
  }, [isOpen, attendanceRecords, targetCourseId, sessionDate, verificationCode, activeRecordId]);

  if (!isOpen) return null;

  const formatTimeShort = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Resolve selected class when registering or importing students
  const selectedRegistrationCourse =
    availableCourses?.find((c) => c.id === registerCourseId) || targetCourse || null;

  // Add Offline Student Handler
  const handleAddCustomStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    if (!selectedRegistrationCourse) {
      setRosterFeedback({
        type: "error",
        message: "Please select a target class before registering an offline student.",
      });
      return;
    }

    const chosenCourse = selectedRegistrationCourse;
    const created = await addOfflineRosterStudent({
      courseId: chosenCourse.id,
      orgId: chosenCourse.orgId,
      name: newStudentName.trim(),
      code: newStudentCode.trim() || undefined,
      email: newStudentEmail.trim() || undefined,
      addedBy: currentUser?.name || "Faculty",
    });

    if (chosenCourse.id === targetCourseId) {
      // Enrolled students start un-checked-in until roll call or gate/class check-in
      setAttendanceMap((prev) => ({
        ...prev,
        [created.id]: {
          status: "absent",
          participantType: "offline",
          activeInClass: false,
          accumulatedMinutes: 0,
          movements: [],
        },
      }));
    }

    setRosterFeedback({
      type: "success",
      message: `Registered "${created.name}" onto "${chosenCourse.title}" class roster.`,
    });
    setTimeout(() => setRosterFeedback(null), 5000);

    setNewStudentName("");
    setNewStudentCode("");
    setNewStudentEmail("");
    setShowAddStudentModal(false);
  };

  // File Selection Handler for Class Roster Import
  const handleRosterFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = parseAttendanceImportFile(text, file.name, "student");
    const studentRows = res.records.filter((r) => r.role === "student");
    const skippedTeachers = res.records.length - studentRows.length;
    const warnings = [...res.warnings];
    if (skippedTeachers > 0) {
      warnings.push(
        `${skippedTeachers} teacher row(s) excluded from class student roster (import teachers from Gate Attendance to add school staff).`
      );
    }
    setImportFileName(file.name);
    setImportParsedRows(studentRows);
    setImportWarnings(warnings);
  };

  // Confirm File Import into Selected Class Roster
  const handleConfirmRosterImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importParsedRows.length === 0) return;
    if (!selectedRegistrationCourse) {
      setRosterFeedback({
        type: "error",
        message: "Please select the target class to import students onto.",
      });
      return;
    }

    const chosenCourse = selectedRegistrationCourse;
    setIsImportingFile(true);
    try {
      const inserted = await addOfflineRosterStudentsBatch(
        importParsedRows.map((row) => ({
          courseId: chosenCourse.id,
          orgId: chosenCourse.orgId,
          name: row.name,
          code: row.code,
          email: row.email,
          addedBy: currentUser?.name || "Faculty",
        }))
      );

      if (chosenCourse.id === targetCourseId) {
        setAttendanceMap((prev) => {
          const next = { ...prev };
          inserted.forEach((created) => {
            if (!next[created.id]) {
              next[created.id] = {
                status: "absent",
                participantType: "offline",
                activeInClass: false,
                accumulatedMinutes: 0,
                movements: [],
              };
            }
          });
          return next;
        });
      }

      setRosterFeedback({
        type: "success",
        message: `Imported ${inserted.length} student(s) into "${chosenCourse.title}" class register.`,
      });
      setTimeout(() => setRosterFeedback(null), 5000);
      setImportFileName("");
      setImportParsedRows([]);
      setImportWarnings([]);
      setShowImportStudentsModal(false);
    } catch {
      setRosterFeedback({
        type: "error",
        message: "Failed to import students from file. Please verify file format and try again.",
      });
    } finally {
      setIsImportingFile(false);
    }
  };

  const handleDownloadClassSampleCsv = () => {
    const csv = buildSampleAttendanceCsv("class_students");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(targetCourse?.title || "Class").replace(/[^a-z0-9]+/gi, "_")}_Roster_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Remove Offline Student Handler
  const handleRemoveCustomStudent = async (id: string, name?: string) => {
    await removeOfflineRosterStudent(id);
    if (legacyLocalOffline.some((s) => s.id === id)) {
      const updated = legacyLocalOffline.filter((s) => s.id !== id);
      setLegacyLocalOffline(updated);
      if (targetCourseId) {
        try {
          localStorage.setItem(
            `backpack_custom_students_${targetCourseId}`,
            JSON.stringify(updated)
          );
        } catch {
          /* ignore */
        }
      }
    }
    setAttendanceMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRosterFeedback({
      type: "success",
      message: `Removed "${name || "offline student"}" from this class attendance register.`,
    });
    setTimeout(() => setRosterFeedback(null), 4000);
  };

  // Teacher Check-In / Check-Out to this Class Session
  const handleTeacherClassClock = (action: "in" | "out") => {
    const { nowMs, nowTime } = captureClockSnapshot();
    if (action === "in") {
      setTeacherCheckedIn(true);
      setTeacherCheckInTime(nowTime);
      setTeacherCheckInMs(nowMs);
      setTeacherCheckOutTime(undefined);
      setTerminalFeedback({
        userName: currentUser?.name || "Instructor",
        action: "in",
        type: "success",
        message: `Instructor checked into class at ${nowTime} (${teacherChannel === "online" ? "Online" : "Offline Physical"}).`,
      });
    } else {
      setTeacherCheckedIn(false);
      setTeacherCheckOutTime(nowTime);
      const mins = teacherCheckInMs
        ? Math.max(1, Math.round((nowMs - teacherCheckInMs) / 60000))
        : expectedDurationMinutes;
      setTerminalFeedback({
        userName: currentUser?.name || "Instructor",
        action: "out",
        type: "success",
        message: `Instructor checked out at ${nowTime} · ${mins}m class teaching logged.`,
      });
    }
    setTimeout(() => setTerminalFeedback(null), 3500);
  };

  const handleStudentStatusChange = (
    studentId: string,
    status: AttendanceStatus,
    excuseReason?: StudentAttendanceState["excuseReason"]
  ) => {
    const { nowMs, nowTime } = captureClockSnapshot();
    setAttendanceMap((prev) => {
      const cur = prev[studentId] || {
        status: "absent",
        participantType: "offline",
        activeInClass: false,
        accumulatedMinutes: 0,
        movements: [],
      };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          status,
          activeInClass: status === "present" || status === "late",
          arrivalTime:
            status === "present" || status === "late"
              ? cur.arrivalTime || nowTime
              : cur.arrivalTime,
          checkInMs:
            status === "present" || status === "late"
              ? cur.checkInMs || nowMs
              : cur.checkInMs,
          excuseReason:
            status === "excused"
              ? excuseReason || cur.excuseReason || "medical"
              : undefined,
        },
      };
    });
  };

  // Roll Call Terminal: Student Check-In / Mid-Class Check-Out with timestamps & engagement
  const handleTerminalClock = (
    student: { id: string; name: string; studentType: "online" | "offline" },
    action: "in" | "out"
  ) => {
    const { nowMs, nowTime } = captureClockSnapshot();

    setAttendanceMap((prev) => {
      const cur = prev[student.id] || {
        status: "absent" as AttendanceStatus,
        participantType: student.studentType,
        activeInClass: false,
        accumulatedMinutes: 0,
        movements: [],
      };

      if (action === "in") {
        const movements: AttendanceMovement[] = [
          ...(cur.movements || []),
          {
            action: "in",
            time: nowTime,
            timestampMs: nowMs,
            channel: cur.participantType || student.studentType,
          },
        ];
        return {
          ...prev,
          [student.id]: {
            ...cur,
            status: "present",
            participantType: cur.participantType || student.studentType,
            activeInClass: true,
            arrivalTime: cur.arrivalTime || nowTime,
            checkInMs: nowMs,
            checkOutTime: undefined,
            movements,
          },
        };
      }

      // Check-Out mid-class: calculate elapsed minutes since last check-in
      const elapsedSinceIn = cur.checkInMs
        ? Math.max(1, Math.round((nowMs - cur.checkInMs) / 60000))
        : 15;
      const totalMins = (cur.accumulatedMinutes || 0) + elapsedSinceIn;
      const movements: AttendanceMovement[] = [
        ...(cur.movements || []),
        {
          action: "out",
          time: nowTime,
          timestampMs: nowMs,
          channel: cur.participantType || student.studentType,
        },
      ];

      return {
        ...prev,
        [student.id]: {
          ...cur,
          status: cur.status === "absent" ? "present" : cur.status,
          activeInClass: false,
          checkOutTime: nowTime,
          checkOutMs: nowMs,
          accumulatedMinutes: totalMins,
          movements,
        },
      };
    });

    setTerminalFeedback({
      userName: student.name,
      action,
      type: "success",
      message:
        action === "in"
          ? `${student.name} checked IN to class at ${nowTime}`
          : `${student.name} checked OUT of class at ${nowTime} · Engagement timestamp recorded`,
    });

    setTimeout(() => setTerminalFeedback(null), 3500);
  };

  // Terminal Mode PIN Entry Verify Handler
  const handleTerminalPinVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalPinInput.trim() === verificationCode) {
      const { nowMs, nowTime } = captureClockSnapshot();
      const currentUserName = currentUser?.name || "Student Learner";
      if (currentUser?.id) {
        setAttendanceMap((prev) => {
          const cur = prev[currentUser.id];
          return {
            ...prev,
            [currentUser.id]: {
              status: "present",
              participantType: "online",
              activeInClass: true,
              arrivalTime: cur?.arrivalTime || nowTime,
              checkInMs: nowMs,
              accumulatedMinutes: cur?.accumulatedMinutes || 0,
              movements: [
                ...(cur?.movements || []),
                {
                  action: "in",
                  time: nowTime,
                  timestampMs: nowMs,
                  channel: "online",
                },
              ],
            },
          };
        });
      }
      setTerminalFeedback({
        userName: currentUserName,
        action: "pin_verified",
        type: "success",
        message: `PIN verified · ${currentUserName} checked into class at ${nowTime}.`,
      });
      setTerminalPinInput("");
    } else {
      setTerminalFeedback({
        userName: "Verification",
        action: "pin_verified",
        type: "error",
        message: "Invalid session PIN. Verify the active 6-digit PIN above.",
      });
    }
    setTimeout(() => setTerminalFeedback(null), 3500);
  };

  const filteredStudents = courseStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchStudent.toLowerCase()));
    const matchesType =
      rosterTypeFilter === "all" || s.studentType === rosterTypeFilter;
    return matchesSearch && matchesType;
  });

  // Live session statistics
  const totalStudents = courseStudents.length;
  const checkedInNowCount = courseStudents.filter(
    (s) => attendanceMap[s.id]?.activeInClass
  ).length;
  const presentCount = courseStudents.filter(
    (s) => attendanceMap[s.id]?.status === "present"
  ).length;
  const lateCount = courseStudents.filter(
    (s) => attendanceMap[s.id]?.status === "late"
  ).length;
  const absentCount = courseStudents.filter(
    (s) =>
      !attendanceMap[s.id] || attendanceMap[s.id].status === "absent"
  ).length;
  const excusedCount = courseStudents.filter(
    (s) => attendanceMap[s.id]?.status === "excused"
  ).length;
  const sessionRate =
    totalStudents > 0
      ? Math.round(((presentCount + lateCount + excusedCount) / totalStudents) * 100)
      : 100;

  // Save Class Record (or End Class & Check Out Everyone Remaining!)
  const handleSaveRollCall = async (endSessionNow = false) => {
    if (!targetCourse) return;
    setIsSubmitting(true);
    const nowMs = Date.now();
    const nowTime = formatTimeShort(nowMs);

    const updatedMap = { ...attendanceMap };

    // If ending class, check out everyone currently left in class!
    if (endSessionNow) {
      courseStudents.forEach((s) => {
        const cur = updatedMap[s.id];
        if (cur && (cur.activeInClass || (cur.status === "present" && !cur.checkOutTime))) {
          const elapsed = cur.checkInMs
            ? Math.max(1, Math.round((nowMs - cur.checkInMs) / 60000))
            : cur.accumulatedMinutes || expectedDurationMinutes;
          updatedMap[s.id] = {
            ...cur,
            activeInClass: false,
            checkOutTime: nowTime,
            checkOutMs: nowMs,
            accumulatedMinutes: (cur.accumulatedMinutes || 0) + (cur.checkInMs ? elapsed : 0),
            movements: [
              ...(cur.movements || []),
              {
                action: "out",
                time: nowTime,
                timestampMs: nowMs,
                channel: cur.participantType || s.studentType,
              },
            ],
          };
        }
      });
      setAttendanceMap(updatedMap);
      if (teacherCheckedIn || !teacherCheckOutTime) {
        setTeacherCheckedIn(false);
        setTeacherCheckOutTime(nowTime);
      }
    }

    const entries: AttendanceEntry[] = courseStudents.map((s) => {
      const studentState = updatedMap[s.id] || {
        status: "absent" as AttendanceStatus,
        participantType: s.studentType,
        activeInClass: false,
        accumulatedMinutes: 0,
        movements: [],
      };
      const hist = studentTruancyHistory[s.id] || {
        totalSessions: 0,
        unexcusedAbsences: 0,
      };

      const isUnexcusedAbsent =
        studentState.status === "absent" && !studentState.excuseReason;
      const totalAbsences = hist.unexcusedAbsences + (isUnexcusedAbsent ? 1 : 0);
      const totalSess = hist.totalSessions + 1;
      const absencePct = Math.round((totalAbsences / totalSess) * 100);
      const truancyWarning = absencePct >= 10;

      // Calculate final duration
      let finalDuration = studentState.accumulatedMinutes || 0;
      if (
        finalDuration === 0 &&
        (studentState.status === "present" || studentState.status === "late")
      ) {
        if (studentState.checkInMs) {
          finalDuration = Math.max(
            1,
            Math.round((nowMs - studentState.checkInMs) / 60000)
          );
        } else {
          finalDuration = expectedDurationMinutes;
        }
      }
      if (studentState.status === "absent") finalDuration = 0;

      return {
        id: generateId("att_entry"),
        userId: s.id,
        userName: s.name,
        userEmail: s.email,
        role: "student",
        participantType: studentState.participantType || s.studentType,
        status: studentState.status,
        activeInClass: endSessionNow ? false : studentState.activeInClass,
        checkInTime: studentState.arrivalTime,
        checkInMs: studentState.checkInMs,
        checkOutTime:
          studentState.checkOutTime ||
          (endSessionNow && studentState.status === "present" ? nowTime : undefined),
        checkOutMs: studentState.checkOutMs,
        movements: studentState.movements,
        durationMinutes: finalDuration,
        location: location.trim(),
        method: activeTab === "terminal" ? "campus_terminal" : "manual",
        verifiedBy: currentUser?.name || "Faculty Instructor",
        truancyWarning,
        excuseReason: studentState.excuseReason,
        excuseNotes: studentState.excuseNotes,
      };
    });

    const teacherMins = teacherCheckInMs
      ? Math.max(1, Math.round((nowMs - teacherCheckInMs) / 60000))
      : expectedDurationMinutes;

    const existingLive =
      (activeRecordId
        ? attendanceRecords.find((r) => r.id === activeRecordId)
        : undefined) ||
      (matchedSessionRecord && matchedSessionRecord.courseId === targetCourse.id
        ? matchedSessionRecord
        : undefined) ||
      attendanceRecords.find(
        (r) =>
          r.courseId === targetCourse.id &&
          r.date === sessionDate &&
          (r.verificationCode === verificationCode || r.sessionStatus === "live")
      );

    const unifiedRecordId =
      existingLive?.id || activeRecordId || generateId(`att_${targetCourse.id}`);

    const newRecord: AttendanceRecord = {
      id: unifiedRecordId,
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
      orgId: targetCourse.orgId,
      date: sessionDate,
      mode: sessionMode,
      sessionStatus: endSessionNow ? "ended" : "live",
      sessionTitle: sessionTitle.trim(),
      location: location.trim(),
      startTime: teacherCheckInTime || existingLive?.startTime || nowTime,
      startMs: teacherCheckInMs || existingLive?.startMs || nowMs,
      ...(endSessionNow ? { endTime: nowTime, endMs: nowMs } : {}),
      expectedDurationMinutes,
      verificationCode,
      schoolType: sessionMode === "online" ? "online" : sessionMode === "hybrid" ? "hybrid" : "physical",
      truancyThresholdPercent: 10,
      entries,
      totalAttendees: presentCount + lateCount,
      avgEngagementMinutes:
        entries.length > 0
          ? Math.round(
              entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0) /
                Math.max(1, presentCount + lateCount)
            )
          : expectedDurationMinutes,
      records: entries.reduce((acc, curr) => {
        acc[curr.userId] =
          curr.status === "present" || curr.status === "late";
        return acc;
      }, {} as Record<string, boolean>),
      instructorEngagement: {
        instructorId: currentUser?.id || targetCourse.instructorId || "inst",
        instructorName:
          currentUser?.name ||
          targetCourse.instructorName ||
          "Faculty Instructor",
        participantType: teacherChannel,
        activeInClass: endSessionNow ? false : teacherCheckedIn,
        checkInTime:
          teacherCheckInTime ||
          existingLive?.instructorEngagement?.checkInTime ||
          nowTime,
        checkInMs:
          teacherCheckInMs ||
          existingLive?.instructorEngagement?.checkInMs ||
          nowMs,
        checkOutTime: endSessionNow ? nowTime : teacherCheckOutTime,
        checkOutMs: endSessionNow ? nowMs : undefined,
        durationMinutes: teacherMins,
        status: "present",
        dutyType: "teaching",
        workNotes: `Class session (${sessionMode}): ${sessionTitle.trim()}`,
      },
      createdAt: existingLive?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await addAttendanceRecord(newRecord);
      setActiveRecordId(unifiedRecordId);
      setSavedSuccess(true);
      setTerminalFeedback({
        userName: sessionTitle.trim(),
        action: endSessionNow ? "ended" : "in",
        type: "success",
        message: endSessionNow
          ? `Class ended at ${nowTime}. Checked out teacher and ${checkedInNowCount} remaining student(s).`
          : `Live roll call saved! Students can also self-check-in using PIN ${verificationCode}.`,
      });
      if (endSessionNow) {
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1200);
      } else {
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center border border-[#0078d4]/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Attendance Register &amp; Class Roll Call
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                {availableCourses && availableCourses.length > 0 && onSelectCourse ? (
                  <select
                    value={targetCourse?.id || ""}
                    onChange={(e) => {
                      const next = availableCourses.find((c) => c.id === e.target.value) || null;
                      onSelectCourse(next);
                    }}
                    className="px-2.5 py-0.5 rounded-lg border border-[#0078d4]/30 bg-white dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] font-bold text-xs focus:outline-hidden"
                  >
                    <option value="">-- Select Class / Course --</option>
                    {availableCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class: {c.title}
                      </option>
                    ))}
                  </select>
                ) : targetCourse ? (
                  <span className="font-semibold text-[#0078d4] dark:text-[#04a4ec]">
                    Class: {targetCourse.title}
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    No Class Selected
                  </span>
                )}
                {targetCourse && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{onlineRosterCount} Online Auto-Registered</span>
                    <span aria-hidden="true">·</span>
                    <span>{offlineRosterCount} Offline Added</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === "roster"
                    ? "bg-white dark:bg-slate-700 text-[#0078d4] dark:text-[#04a4ec] shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Class Roster View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("terminal")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === "terminal"
                    ? "bg-[#0078d4] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Roll call</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!targetCourse ? (
          <div className="p-10 flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center border border-[#0078d4]/20">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Select an Associated Class
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the specific course or class you want to view or take roll call for so students are never registered to the wrong class.
              </p>
            </div>
            {availableCourses && availableCourses.length > 0 && onSelectCourse ? (
              <div className="w-full max-w-sm space-y-2 text-left">
                <select
                  value=""
                  onChange={(e) => {
                    const next = availableCourses.find((c) => c.id === e.target.value) || null;
                    if (next) onSelectCourse(next);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                >
                  <option value="">-- Choose Class / Course --</option>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                No courses or classes are associated with your account yet.
              </p>
            )}
          </div>
        ) : (
          <>

        {/* Session Details Bar (only shown in Roll call view) */}
        {activeTab === "terminal" && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Class Session Title
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Date &amp; Mode
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                />
                <select
                  value={sessionMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as AttendanceMode;
                    setSessionMode(nextMode);
                    setLocation(
                      nextMode === "physical"
                        ? "Main Campus Hall 1"
                        : nextMode === "hybrid"
                        ? "Hall 1 + Live Stream"
                        : "Online Live Classroom"
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden"
                >
                  <option value="physical">Physical</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Location / Room
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Scheduled Mins
              </label>
              <input
                type="number"
                min={15}
                max={360}
                step={15}
                value={expectedDurationMinutes}
                onChange={(e) =>
                  setExpectedDurationMinutes(
                    Math.max(15, Number(e.target.value) || 60)
                  )
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold tabular-nums focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Unique Session PIN
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono tabular-nums font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-[#0078d4] dark:text-[#04a4ec] flex-1 text-center tracking-widest">
                  {verificationCode}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVerificationCode(
                      Math.floor(100000 + Math.random() * 900000).toString()
                    )
                  }
                  className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-300 transition shrink-0"
                  title="Generate New Pin Code"
                >
                  Regen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CLASS ROSTER VIEW (Enrollment Pool of Online + Offline Students) */}
        {activeTab === "roster" && (
          <>
            {/* Pool Summary Header */}
            <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {totalStudents} Registered Students
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-[#0078d4] dark:text-[#04a4ec] font-semibold">
                  {onlineRosterCount} Online Auto-Registered
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                  {offlineRosterCount} Offline Campus Added
                </span>
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(["all", "online", "offline"] as const).map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setRosterTypeFilter(filterVal)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] capitalize transition cursor-pointer ${
                      rosterTypeFilter === filterVal
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {filterVal === "all" ? "All Roster" : filterVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Search, Add Offline Student & Import from File Actions */}
            <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Search class register by name, ID, or email..."
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterCourseId(targetCourse?.id || "");
                    setShowAddStudentModal(false);
                    setShowImportStudentsModal((prev) => !prev);
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-4 h-4 text-[#0078d4]" />
                  <span>Import from File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegisterCourseId(targetCourse?.id || "");
                    setShowImportStudentsModal(false);
                    setShowAddStudentModal((prev) => !prev);
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Offline Student</span>
                </button>
              </div>
            </div>

            {rosterFeedback && (
              <div
                className={`mx-6 mt-3 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 border ${
                  rosterFeedback.type === "error"
                    ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {rosterFeedback.type === "error" ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{rosterFeedback.message}</span>
              </div>
            )}

            {/* Add Offline Student Inline Drawer */}
            {showAddStudentModal && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                <form onSubmit={handleAddCustomStudent} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 font-heading">
                      <UserPlus className="w-4 h-4 text-[#0078d4]" />
                      <span>
                        Add Offline Student to Selected Class Register
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddStudentModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Explicit Target Class Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#0078d4]/30 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Target Class Roster:
                    </span>
                    {availableCourses && availableCourses.length > 0 ? (
                      <select
                        value={registerCourseId}
                        onChange={(e) => {
                          setRegisterCourseId(e.target.value);
                          const next = availableCourses.find((c) => c.id === e.target.value) || null;
                          if (next && onSelectCourse) {
                            onSelectCourse(next);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] font-bold text-xs flex-1 sm:max-w-sm"
                      >
                        <option value="">-- Select Target Class --</option>
                        {availableCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-[#0078d4] dark:text-[#04a4ec]">
                        {selectedRegistrationCourse?.title || targetCourse.title}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="Student Full Name *"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                    />
                    <input
                      type="text"
                      placeholder="Student ID / Roll Number"
                      value={newStudentCode}
                      onChange={(e) => setNewStudentCode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                    />
                    <input
                      type="email"
                      placeholder="Parent / Student Email (Optional)"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!selectedRegistrationCourse}
                      className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      Save Offline Student to &ldquo;{selectedRegistrationCourse?.title || "Class"}&rdquo;
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Import Students from File Inline Drawer */}
            {showImportStudentsModal && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                <form onSubmit={handleConfirmRosterImport} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 font-heading">
                      <Upload className="w-4 h-4 text-[#0078d4]" />
                      <span>Import Class Students from File (CSV, TSV, TXT, JSON)</span>
                    </h4>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handleDownloadClassSampleCsv}
                        className="text-[11px] font-bold text-[#0078d4] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download CSV Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowImportStudentsModal(false);
                          setImportFileName("");
                          setImportParsedRows([]);
                          setImportWarnings([]);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Explicit Target Class Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#0078d4]/30 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Select Class to Register Students On:
                    </span>
                    {availableCourses && availableCourses.length > 0 ? (
                      <select
                        value={registerCourseId}
                        onChange={(e) => {
                          setRegisterCourseId(e.target.value);
                          const next = availableCourses.find((c) => c.id === e.target.value) || null;
                          if (next && onSelectCourse) {
                            onSelectCourse(next);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] font-bold text-xs flex-1 sm:max-w-sm"
                      >
                        <option value="">-- Select Target Class --</option>
                        {availableCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-[#0078d4] dark:text-[#04a4ec]">
                        {selectedRegistrationCourse?.title || targetCourse.title}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700">
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {importFileName ? `Selected: ${importFileName}` : "Upload student list (.csv, .tsv, .txt, .json)"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports columns: Name, ID Code, Email (or one student name per line).
                      </p>
                    </div>
                    <label className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer whitespace-nowrap text-center">
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt,.json"
                        onChange={handleRosterFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {importWarnings.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                      {importWarnings.slice(0, 3).map((w, idx) => (
                        <div key={idx}>{w}</div>
                      ))}
                    </div>
                  )}

                  {importParsedRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Ready to register {importParsedRows.length} student(s) onto &ldquo;{selectedRegistrationCourse?.title || "Selected Class"}&rdquo;
                        </span>
                      </div>
                      <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {importParsedRows.slice(0, 8).map((row, idx) => (
                          <div key={idx} className="px-3 py-1.5 flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {row.name}
                            </span>
                            <span className="text-slate-400 font-mono truncate">
                              {[row.code, row.email].filter(Boolean).join(" · ") || "Offline"}
                            </span>
                          </div>
                        ))}
                        {importParsedRows.length > 8 && (
                          <div className="px-3 py-1 text-center text-slate-400">
                            +{importParsedRows.length - 8} more student(s)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={importParsedRows.length === 0 || isImportingFile || !selectedRegistrationCourse}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isImportingFile
                        ? "Importing..."
                        : `Import ${importParsedRows.length} Student(s) to "${selectedRegistrationCourse?.title || "Class"}"`}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Pure Pooled Roster List (Enrollment Register ONLY — no attendance status recorded here) */}
            <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="font-semibold">
                    No students in this course register yet.
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Online learners enroll automatically, or click{" "}
                    <strong className="text-[#0078d4]">
                      Add Offline Student
                    </strong>{" "}
                    to add physical campus students without a Backpack account.
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  return (
                    <div
                      key={student.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {student.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              student.studentType === "offline"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                            }`}
                          >
                            {student.studentType === "offline"
                              ? "Offline Campus"
                              : "Online Auto-Registered"}
                          </span>
                        </div>

                        {student.email && (
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                            {student.email}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {(student.isExternal || student.studentType === "offline") && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomStudent(student.id, student.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                            title="Remove offline student from register"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: ROLL CALL TERMINAL (Teacher Check-In + Student Check-In / Mid-Class Check-Out + End Class) */}
        {activeTab === "terminal" && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/40 dark:bg-slate-900/60">
            {/* Top Clock + Live Class Stats */}
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-[#0078d4] dark:text-[#04a4ec]">
                  {sessionMode === "online" ? (
                    <Video className="w-4 h-4" />
                  ) : sessionMode === "hybrid" ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>
                    {sessionMode === "online"
                      ? "Online Class Roll Call"
                      : sessionMode === "hybrid"
                      ? "Hybrid (Physical + Online) Roll Call"
                      : "Physical Classroom Roll Call"}
                  </span>
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
                  · {location} · PIN {verificationCode}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
                <div>
                  <span className="block text-[11px] text-slate-400">
                    In Class Now
                  </span>
                  <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {checkedInNowCount}/{totalStudents}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">
                    Attendance
                  </span>
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                    {sessionRate}%
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">
                    Absent
                  </span>
                  <span className="text-lg font-extrabold font-mono text-red-600 dark:text-red-400">
                    {absentCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Teacher Check-In / Check-Out to This Class */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Teacher Class Attendance:{" "}
                    {currentUser?.name ||
                      targetCourse.instructorName ||
                      "Course Instructor"}
                  </span>
                  <span className="text-[11px] text-slate-400">·</span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      teacherCheckedIn
                        ? "text-emerald-600 dark:text-emerald-400"
                        : teacherCheckOutTime
                        ? "text-slate-500"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {teacherCheckedIn
                      ? `Teaching since ${teacherCheckInTime}`
                      : teacherCheckOutTime
                      ? `Ended at ${teacherCheckOutTime}`
                      : "Not Checked In Yet"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Teachers check in when entering the classroom or starting the online stream, and check out when class finishes.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <select
                  value={teacherChannel}
                  onChange={(e) =>
                    setTeacherChannel(e.target.value as "offline" | "online")
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  <option value="offline">In Classroom</option>
                  <option value="online">Teaching Online</option>
                </select>

                {!teacherCheckedIn ? (
                  <button
                    type="button"
                    onClick={() => handleTeacherClassClock("in")}
                    className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Teacher Check-In</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTeacherClassClock("out")}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Teacher Check-Out</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Session PIN Verification */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 font-heading">
                  <KeyRound className="w-4 h-4 text-[#0078d4]" />
                  <span>Quick Session PIN Check-In</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Online students checking in via their portal with PIN{" "}
                  <strong className="font-mono text-[#0078d4]">
                    {verificationCode}
                  </strong>{" "}
                  appear below automatically in real time.
                </p>
              </div>

              <form
                onSubmit={handleTerminalPinVerify}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  maxLength={6}
                  value={terminalPinInput}
                  onChange={(e) =>
                    setTerminalPinInput(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="6-digit PIN"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums font-bold text-xs tracking-widest w-32 text-center focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify PIN</span>
                </button>
              </form>
            </div>

            {/* Terminal Feedback Toast */}
            {terminalFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 border ${
                  terminalFeedback.type === "error"
                    ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {terminalFeedback.type === "error" ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{terminalFeedback.message}</span>
              </div>
            )}

            {/* Pooled Online + Offline Student Roll Call Check-In & Check-Out List */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Student Class Roll Call (Check In on Arrival · Check Out When Leaving)
                </h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Filter students..."
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  No enrolled students yet. Switch to Class Roster View to add offline students or enroll learners.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const state = attendanceMap[s.id] || {
                    status: "absent",
                    participantType: s.studentType,
                    activeInClass: false,
                    accumulatedMinutes: 0,
                    movements: [],
                  };

                  return (
                    <div
                      key={s.id}
                      className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            state.activeInClass
                              ? "bg-emerald-600 text-white"
                              : state.status === "excused"
                              ? "bg-blue-600 text-white"
                              : state.checkOutTime
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {s.name}
                            </span>
                            <span className="text-[11px] text-slate-400">·</span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {s.studentType === "offline"
                                ? "Offline"
                                : "Online"}
                            </span>
                            <span className="text-[11px] text-slate-400">·</span>
                            <span
                              className={`text-[11px] font-bold tabular-nums ${
                                state.activeInClass
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : state.checkOutTime
                                  ? "text-amber-600 dark:text-amber-400"
                                  : state.status === "excused"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {state.activeInClass
                                ? `Checked In (${state.arrivalTime})`
                                : state.checkOutTime
                                ? `Checked Out ${state.checkOutTime} · ${state.accumulatedMinutes}m engaged`
                                : state.status === "excused"
                                ? "Excused"
                                : "Awaiting Check-In"}
                            </span>
                          </div>

                          {state.movements && state.movements.length > 0 && (
                            <div className="text-[10px] font-mono tabular-nums text-slate-400 truncate">
                              Timestamps:{" "}
                              {state.movements
                                .map(
                                  (mv) =>
                                    `${mv.action === "in" ? "In" : "Out"} ${mv.time}`
                                )
                                .join(" -> ")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
                        {!state.activeInClass ? (
                          <button
                            type="button"
                            onClick={() => handleTerminalClock(s, "in")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center cursor-pointer whitespace-nowrap"
                          >
                            <LogIn className="w-3.5 h-3.5 mr-1" />
                            <span>
                              {state.checkOutTime ? "Re-Enter Class" : "Clock In"}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTerminalClock(s, "out")}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition flex items-center cursor-pointer whitespace-nowrap"
                          >
                            <Timer className="w-3.5 h-3.5 mr-1" />
                            <span>Clock Out</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleStudentStatusChange(s.id, "excused", "medical")
                          }
                          className={`px-3 py-1.5 font-bold rounded-lg text-xs transition flex items-center cursor-pointer whitespace-nowrap ${
                            state.status === "excused"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 text-slate-700 dark:text-slate-200 hover:text-white"
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                          <span>Excused</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {activeTab === "roster" ? (
            <>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left tabular-nums">
                {totalStudents} enrolled student{totalStudents === 1 ? "" : "s"} in &ldquo;{targetCourse.title}&rdquo; class register
              </p>

              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left tabular-nums">
                Session PIN:{" "}
                <strong className="font-mono text-[#0078d4]">
                  {verificationCode}
                </strong>{" "}
                ·{" "}
                {checkedInNowCount > 0
                  ? `${checkedInNowCount} student(s) currently active in class`
                  : "All remaining check-outs settled"}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveRollCall(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {savedSuccess
                      ? "Saved!"
                      : isSubmitting
                      ? "Saving..."
                      : "Save Live Roll Call"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveRollCall(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  <span>End Class &amp; Check Out All Remaining</span>
                </button>
              </div>
            </>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClassRollCallModal;
