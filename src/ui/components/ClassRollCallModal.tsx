import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { Course, AttendanceRecord, AttendanceEntry, AttendanceStatus, AttendanceMode } from "../../types";
import { generateId } from "../../lib/id";
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
} from "lucide-react";

interface ClassRollCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCourse: Course;
  initialMode?: AttendanceMode;
  initialTab?: "roster" | "terminal";
}

export const ClassRollCallModal: React.FC<ClassRollCallModalProps> = ({
  isOpen,
  onClose,
  targetCourse,
  initialMode = "physical",
  initialTab = "roster",
}) => {
  const { currentUser } = useAuth();
  const {
    addAttendanceRecord,
    attendanceRecords,
    enrollmentRequests,
    orgMembers,
  } = useAppContext();

  // Active view tab inside Roll Call Register
  const [activeTab, setActiveTab] = useState<"roster" | "terminal">(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Basic Session Info
  const [sessionTitle, setSessionTitle] = useState(`Lecture Session - ${new Date().toLocaleDateString()}`);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionMode, setSessionMode] = useState<AttendanceMode>(initialMode);
  const [location, setLocation] = useState(
    initialMode === "physical" ? "Main Campus Lecture Hall 1" : "Virtual Classroom Stream"
  );
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState(60);
  const [verificationCode, setVerificationCode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [searchStudent, setSearchStudent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Terminal mode PIN entry & feedback state
  const [terminalPinInput, setTerminalPinInput] = useState("");
  const [terminalFeedback, setTerminalFeedback] = useState<{
    userName: string;
    action: "in" | "out" | "pin_verified";
    duration?: string;
    type?: "success" | "error";
    message?: string;
  } | null>(null);

  // Live clock ticker for offline terminal mode
  const [liveClockTime, setLiveClockTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Custom Non-Backpack Students state (stored in localStorage per course)
  const [customStudents, setCustomStudents] = useState<
    Array<{ id: string; name: string; email?: string; isExternal?: boolean }>
  >(() => {
    try {
      const stored = localStorage.getItem(`backpack_custom_students_${targetCourse.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State for Add Non-Backpack Student Modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  // Get enrolled & registered students for this course roster
  const courseStudents = useMemo(() => {
    const list: Array<{ id: string; name: string; email?: string; isExternal?: boolean }> = [];

    // 1. From all non-rejected enrollment requests for this course (approved, pending, or active)
    enrollmentRequests
      .filter((r) => r.courseId === targetCourse.id && r.status !== "rejected")
      .forEach((r) => {
        if (!list.some((s) => s.id === r.userId)) {
          list.push({ id: r.userId, name: r.userName || "Student", email: r.userEmail });
        }
      });

    // 2. From course object directly if students array exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseObj = targetCourse as any;
    if (Array.isArray(courseObj.students)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      courseObj.students.forEach((s: any) => {
        const id = typeof s === "string" ? s : s.id || s.userId;
        const name = typeof s === "string" ? "Enrolled Student" : s.name || s.userName || "Student";
        const email = typeof s === "object" ? s.email : undefined;
        if (id && !list.some((item) => item.id === id)) {
          list.push({ id, name, email });
        }
      });
    }

    // 3. From orgMembers with student role
    orgMembers
      .filter(
        (m) =>
          m.role === "student" &&
          (m.courseIds?.includes(targetCourse.id) ||
            m.enrolledCourseIds?.includes(targetCourse.id) ||
            m.orgId === targetCourse.orgId)
      )
      .forEach((m) => {
        const id = m.userId || m.id;
        if (!list.some((s) => s.id === id)) {
          list.push({ id, name: m.name, email: m.email });
        }
      });

    // 4. From current user if student and enrolled in this course
    if (
      currentUser?.role === "student" &&
      (currentUser.enrolledCourseIds?.includes(targetCourse.id) || currentUser.courseIds?.includes(targetCourse.id))
    ) {
      if (!list.some((s) => s.id === currentUser.id)) {
        list.push({ id: currentUser.id, name: currentUser.name, email: currentUser.email });
      }
    }

    // 5. From past attendance records logged for this course
    attendanceRecords
      .filter((r) => r.courseId === targetCourse.id)
      .forEach((rec) => {
        rec.entries?.forEach((e) => {
          if (e.userId && !list.some((s) => s.id === e.userId)) {
            list.push({ id: e.userId, name: e.userName || "Student", email: e.userEmail });
          }
        });
      });

    // 6. From custom non-Backpack students added directly
    customStudents.forEach((cs) => {
      if (!list.some((s) => s.id === cs.id)) {
        list.push({ ...cs, isExternal: true });
      }
    });

    return list;
  }, [enrollmentRequests, orgMembers, currentUser, attendanceRecords, customStudents, targetCourse]);

  // Truancy historical records for this course to calculate percentage thresholds (10% Persistent / 50% Severe)
  const studentTruancyHistory = useMemo(() => {
    const courseRecords = attendanceRecords.filter((r) => r.courseId === targetCourse.id);
    const historyMap: Record<string, { totalSessions: number; unexcusedAbsences: number; absenceRate: number }> = {};

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
      historyMap[student.id] = { totalSessions: total, unexcusedAbsences: absences, absenceRate: rate };
    });

    return historyMap;
  }, [attendanceRecords, targetCourse.id, courseStudents]);

  // Attendance state map: studentId -> status & details
  // Students default to "absent" on enrolment register until checked-in via portal or roll call terminal
  const [attendanceMap, setAttendanceMap] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        excuseReason?: "medical" | "authorized_leave" | "family_emergency" | "school_event" | "technical_disruption";
        excuseNotes?: string;
        arrivalTime?: string;
        checkOutTime?: string;
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        status: AttendanceStatus;
        arrivalTime?: string;
        checkOutTime?: string;
        excuseReason?: "medical" | "authorized_leave" | "family_emergency" | "school_event" | "technical_disruption";
      }
    > = {};

    const existingRec = attendanceRecords.find(
      (r) => r.courseId === targetCourse.id && (r.date === sessionDate || r.verificationCode === verificationCode)
    );

    courseStudents.forEach((s) => {
      const existingEntry = existingRec?.entries?.find((e) => e.userId === s.id);
      if (existingEntry) {
        initial[s.id] = {
          status: existingEntry.status,
          arrivalTime: existingEntry.checkInTime,
          checkOutTime: existingEntry.checkOutTime,
          excuseReason: existingEntry.excuseReason,
        };
      } else {
        // Enrolment roster default: NOT checked-in (absent)
        initial[s.id] = { status: "absent" };
      }
    });

    return initial;
  });

  // Real-time synchronization: Update attendanceMap dynamically whenever students check in on portal or kiosk
  useEffect(() => {
    if (!isOpen) return;

    const matchingRecords = attendanceRecords.filter(
      (r) => r.courseId === targetCourse.id && (r.date === sessionDate || r.verificationCode === verificationCode)
    );

    if (matchingRecords.length === 0) return;

    const timerId = setTimeout(() => {
      setAttendanceMap((prev) => {
        const nextMap = { ...prev };
        let updated = false;

        matchingRecords.forEach((rec) => {
          if (rec.entries) {
            rec.entries.forEach((entry) => {
              if (entry.userId) {
                const current = nextMap[entry.userId];
                if (!current || current.status !== entry.status || current.arrivalTime !== entry.checkInTime) {
                  nextMap[entry.userId] = {
                    ...current,
                    status: entry.status,
                    arrivalTime: entry.checkInTime || current?.arrivalTime,
                    checkOutTime: entry.checkOutTime || current?.checkOutTime,
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
  }, [isOpen, attendanceRecords, targetCourse.id, sessionDate, verificationCode]);

  if (!isOpen) return null;

  // Add Custom Non-Backpack Student Handler
  const handleAddCustomStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const id = `ext_stu_${Date.now()}`;
    const codeOrEmail = newStudentCode.trim() || newStudentEmail.trim();
    const formattedEmail = codeOrEmail ? `ID: ${codeOrEmail}` : "Non-Backpack Register";
    
    const newStudent = {
      id,
      name: newStudentName.trim(),
      email: formattedEmail,
      isExternal: true,
    };

    const updated = [...customStudents, newStudent];
    setCustomStudents(updated);
    try {
      localStorage.setItem(`backpack_custom_students_${targetCourse.id}`, JSON.stringify(updated));
    } catch {
      // Storage fallback
    }

    // Default new student to Absent (enrolled on register, awaiting check-in)
    setAttendanceMap((prev) => ({
      ...prev,
      [id]: { status: "absent" },
    }));

    setNewStudentName("");
    setNewStudentCode("");
    setNewStudentEmail("");
    setShowAddStudentModal(false);
  };

  // Remove Custom Non-Backpack Student Handler
  const handleRemoveCustomStudent = (id: string) => {
    const updated = customStudents.filter((s) => s.id !== id);
    setCustomStudents(updated);
    try {
      localStorage.setItem(`backpack_custom_students_${targetCourse.id}`, JSON.stringify(updated));
    } catch {
      // Storage fallback
    }
  };


  const handleStudentStatusChange = (
    studentId: string,
    status: AttendanceStatus,
    excuseReason?: "medical" | "authorized_leave" | "family_emergency" | "school_event" | "technical_disruption"
  ) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        arrivalTime: status === "present" || status === "late" ? prev[studentId]?.arrivalTime || nowTime : undefined,
        excuseReason: status === "excused" ? excuseReason || prev[studentId]?.excuseReason || "medical" : undefined,
      },
    }));
  };

  // Terminal Mode Clock-In / Clock-Out Handler
  const handleTerminalClock = (student: { id: string; name: string }, action: "in" | "out") => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAttendanceMap((prev) => ({
      ...prev,
      [student.id]: {
        ...prev[student.id],
        status: action === "in" ? "present" : prev[student.id]?.status || "present",
        arrivalTime: action === "in" ? nowTime : prev[student.id]?.arrivalTime || nowTime,
        checkOutTime: action === "out" ? nowTime : prev[student.id]?.checkOutTime,
      },
    }));

    setTerminalFeedback({
      userName: student.name,
      action,
      duration: `${expectedDurationMinutes} Mins Scheduled`,
      type: "success",
      message: `Clocked ${action === "in" ? "IN (Arrival Recorded)" : "OUT (Engagement Recorded)"}`,
    });

    setTimeout(() => setTerminalFeedback(null), 3000);
  };

  // Terminal Mode PIN Entry Verify Handler
  const handleTerminalPinVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalPinInput.trim() === verificationCode) {
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const currentUserName = currentUser?.name || "Student Learner";
      if (currentUser?.id) {
        setAttendanceMap((prev) => ({
          ...prev,
          [currentUser.id]: { status: "present", arrivalTime: nowTime },
        }));
      }
      setTerminalFeedback({
        userName: currentUserName,
        action: "pin_verified",
        type: "success",
        message: `PIN Verified! Session attendance recorded for ${currentUserName}.`,
      });
      setTerminalPinInput("");
    } else {
      setTerminalFeedback({
        userName: "Verification",
        action: "pin_verified",
        type: "error",
        message: "Invalid session PIN. Please check the active roll call PIN displayed above.",
      });
    }
    setTimeout(() => setTerminalFeedback(null), 3500);
  };

  const filteredStudents = courseStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  // Live session statistics
  const totalStudents = courseStudents.length;
  const presentCount = Object.values(attendanceMap).filter((a) => a.status === "present").length;
  const lateCount = Object.values(attendanceMap).filter((a) => a.status === "late").length;
  const absentCount = Object.values(attendanceMap).filter((a) => a.status === "absent").length;
  const excusedCount = Object.values(attendanceMap).filter((a) => a.status === "excused").length;
  const sessionRate = totalStudents > 0 ? Math.round(((presentCount + lateCount + excusedCount) / totalStudents) * 100) : 100;

  const handleSaveRollCall = async () => {
    setIsSubmitting(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const entries: AttendanceEntry[] = courseStudents.map((s) => {
      const studentState = attendanceMap[s.id] || { status: "absent" as AttendanceStatus };
      const hist = studentTruancyHistory[s.id] || { totalSessions: 0, unexcusedAbsences: 0 };
      
      // Calculate updated absence percentage including this session
      const isUnexcusedAbsent = studentState.status === "absent" && !studentState.excuseReason;
      const totalAbsences = hist.unexcusedAbsences + (isUnexcusedAbsent ? 1 : 0);
      const totalSess = hist.totalSessions + 1;
      const absencePct = Math.round((totalAbsences / totalSess) * 100);
      
      // Truancy Warning if absence >= 10% (Persistent absence threshold)
      const truancyWarning = absencePct >= 10;

      return {
        id: generateId("att_entry"),
        userId: s.id,
        userName: s.name,
        userEmail: s.email,
        role: "student",
        status: studentState.status,
        checkInTime: studentState.arrivalTime || (studentState.status === "present" ? nowTime : undefined),
        checkOutTime: studentState.checkOutTime,
        durationMinutes: studentState.status === "absent" ? 0 : expectedDurationMinutes,
        location: location.trim(),
        method: activeTab === "terminal" ? "campus_terminal" : "manual",
        verifiedBy: currentUser?.name || "Faculty Instructor",
        truancyWarning,
        excuseReason: studentState.excuseReason,
        excuseNotes: studentState.excuseNotes,
      };
    });

    const newRecord: AttendanceRecord = {
      id: generateId(`att_${targetCourse.id}`),
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
      orgId: targetCourse.orgId,
      date: sessionDate,
      mode: sessionMode,
      sessionTitle: sessionTitle.trim(),
      location: location.trim(),
      startTime: nowTime,
      expectedDurationMinutes,
      verificationCode,
      schoolType: sessionMode === "physical" ? "physical" : "online",
      truancyThresholdPercent: 10,
      entries,
      totalAttendees: presentCount + lateCount,
      avgEngagementMinutes: expectedDurationMinutes,
      records: entries.reduce((acc, curr) => {
        acc[curr.userId] = curr.status === "present" || curr.status === "late";
        return acc;
      }, {} as Record<string, boolean>),
      instructorEngagement: {
        instructorId: currentUser?.id || targetCourse.instructorId || "inst",
        instructorName: currentUser?.name || targetCourse.instructorName || "Faculty Instructor",
        checkInTime: nowTime,
        durationMinutes: expectedDurationMinutes,
        status: "present",
        dutyType: "teaching",
        workNotes: `Delivered class: ${sessionTitle.trim()}`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await addAttendanceRecord(newRecord);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    } catch {
      alert("Failed to save attendance record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0078d4]/10 dark:bg-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center border border-[#0078d4]/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Attendance Register
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-[11px] font-extrabold uppercase">
                  {targetCourse.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official class attendance register with integrated offline terminal & truancy threshold monitoring (10% Persistent / 50% Severe)
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs (Seamlessly Merges Offline Check-In Terminal into Roll Call Register) */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer ${
                  activeTab === "terminal"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Roll call</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Session Details Bar (only in Roll call view) */}
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
                Date & Mode
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = sessionMode === "physical" ? "online" : "physical";
                    setSessionMode(nextMode);
                    setLocation(nextMode === "physical" ? "Main Campus Lecture Hall 1" : "Virtual Classroom Stream");
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center space-x-1 shrink-0 transition ${
                    sessionMode === "physical"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                      : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
                  }`}
                  title="Toggle Physical Campus / Online Virtual"
                >
                  {sessionMode === "physical" ? <Building2 className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  <span className="capitalize">{sessionMode}</span>
                </button>
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
                Duration (Mins)
              </label>
              <input
                type="number"
                min={15}
                max={360}
                step={15}
                value={expectedDurationMinutes}
                onChange={(e) => setExpectedDurationMinutes(Math.max(15, Number(e.target.value) || 60))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Unique Session PIN
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-[#0078d4] dark:text-[#04a4ec] flex-1 text-center tracking-widest">
                  {verificationCode}
                </span>
                <button
                  type="button"
                  onClick={() => setVerificationCode(Math.floor(100000 + Math.random() * 900000).toString())}
                  className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-300 transition shrink-0"
                  title="Generate New Pin Code"
                >
                  Regen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CLASS ROSTER VIEW */}
        {activeTab === "roster" && (
          <>
            {/* Live Attendance Stats Header */}
            <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Session Attendance:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-extrabold text-sm font-mono text-slate-900 dark:text-white">{sessionRate}%</span>
                  <span className="text-slate-400 text-[11px]">({presentCount + lateCount}/{totalStudents})</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    {presentCount} Present
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    {lateCount} Late
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                    {absentCount} Truant / Absent
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    {excusedCount} Excused
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Bar & Add Non-Backpack Student Action */}
            <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Search roster by student name, roll number, or email..."
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddStudentModal(true)}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-[#0078d4]/10 hover:bg-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] border border-[#0078d4]/20 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Student to Register</span>
              </button>
            </div>

            {/* Add Custom Non-Backpack Student Inline Modal */}
            {showAddStudentModal && (
              <div className="px-6 py-4 bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 animate-in fade-in duration-150">
                <form onSubmit={handleAddCustomStudent} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5 font-heading">
                      <UserPlus className="w-4 h-4 text-[#0078d4]" />
                      <span>Add External / Non-Backpack Student to Class Register</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddStudentModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Student Full Name *"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Student Roll No / Matric Number"
                        value={newStudentCode}
                        onChange={(e) => setNewStudentCode(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Student Email (Optional)"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl text-xs transition shadow-xs"
                    >
                      Save to Roster & Check-In
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Students Roll Call List */}
            <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="font-semibold">No students in this course register yet.</p>
                  <p className="text-slate-400 text-[11px]">
                    Click <strong className="text-[#0078d4]">"Add Student to Register"</strong> above to add students without a Backpack account directly to your class roster.
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const state = attendanceMap[student.id] || { status: "absent" };
                  const hist = studentTruancyHistory[student.id] || { totalSessions: 0, unexcusedAbsences: 0, absenceRate: 0 };
                  
                  // Calculate projected absence rate for truancy monitoring
                  const isAbsentNow = state.status === "absent" && !state.excuseReason;
                  const projAbsences = hist.unexcusedAbsences + (isAbsentNow ? 1 : 0);
                  const projSessions = hist.totalSessions + 1;
                  const projAbsenceRate = Math.round((projAbsences / projSessions) * 100);

                  const isSevereAbsence = projAbsenceRate >= 50;
                  const isPersistentAbsence = projAbsenceRate >= 10 && projAbsenceRate < 50;

                  return (
                    <div
                      key={student.id}
                      className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        state.status === "present"
                          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/15"
                          : state.status === "late"
                          ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10"
                          : state.status === "excused"
                          ? "border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {student.name}
                          </span>

                          {student.isExternal && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-600">
                              Non-Backpack Register
                            </span>
                          )}

                          {/* Truancy Monitoring Threshold Badges (10% Persistent / 50% Severe) */}
                          {isSevereAbsence ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold text-[10px] flex items-center border border-red-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Severe Absence Alert ({projAbsenceRate}% Absence)
                            </span>
                          ) : isPersistentAbsence ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] flex items-center border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Persistent Absence Alert ({projAbsenceRate}% Absence)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                              Good Standing (&lt;10% Absence)
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 dark:text-slate-400 text-[11px] flex flex-wrap items-center gap-2">
                          {student.email && <span>{student.email}</span>}
                          <span>•</span>
                          <span>Total Sessions Logged: {hist.totalSessions}</span>
                          {state.arrivalTime && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Arrival: {state.arrivalTime}
                              </span>
                            </>
                          )}
                        </div>

                        {state.status === "excused" && (
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              Authorized Reason:
                            </span>
                            <select
                              value={state.excuseReason || "medical"}
                              onChange={(e) =>
                                handleStudentStatusChange(student.id, "excused", e.target.value as AttendanceEntry["excuseReason"])
                              }
                              className="px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-[10px] font-semibold text-blue-700 dark:text-blue-300"
                            >
                              <option value="medical">Medical / Health Certificate</option>
                              <option value="authorized_leave">Official School Duty / Leave</option>
                              <option value="family_emergency">Family Emergency</option>
                              <option value="school_event">School Representation / Athletics</option>
                              <option value="technical_disruption">Network / Technical Disruption</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Roster Card Actions */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {student.isExternal && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomStudent(student.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition"
                              title="Remove from custom roster"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* TAB 2: SEAMLESS INTEGRATED OFFLINE CHECK-IN TERMINAL MODE */}
        {activeTab === "terminal" && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-900/60">
            {/* Live Campus Clock & Session Info Banner */}
            <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 rounded-2xl border border-amber-500/20 text-center space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>Online & Physical Class Roll Call Check-In Terminal</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Terminal Live & Active
                </span>
              </div>

              <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-wider">
                {liveClockTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {liveClockTime.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })} • Location: {location}
              </p>
            </div>

            {/* Quick Session PIN Verification Tool for Terminal */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 font-heading">
                  <KeyRound className="w-4 h-4 text-[#0078d4]" />
                  <span>Terminal Student PIN Self-Verification</span>
                </h4>
                <span className="text-[11px] text-slate-400">Session PIN: <strong className="font-mono text-[#0078d4]">{verificationCode}</strong></span>
              </div>

              <form onSubmit={handleTerminalPinVerify} className="flex items-center space-x-2">
                <input
                  type="text"
                  maxLength={6}
                  value={terminalPinInput}
                  onChange={(e) => setTerminalPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit PIN"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs tracking-widest w-36 text-center focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify PIN Check-In</span>
                </button>
              </form>
            </div>

            {/* Terminal Feedback Toast */}
            {terminalFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 border animate-in zoom-in-95 ${
                  terminalFeedback.type === "error"
                    ? "bg-red-500/20 border-red-500/40 text-red-800 dark:text-red-300"
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {terminalFeedback.type === "error" ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span>{terminalFeedback.message}</span>
              </div>
            )}

            {/* Roster Stationary Clock In / Clock Out List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Roster Station Check-In (Clock In / Clock Out)
              </h4>

              {courseStudents.map((s) => {
                const state = attendanceMap[s.id] || { status: "absent" };
                return (
                  <div
                    key={s.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-amber-400 transition text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{s.name}</span>
                        <span className="text-[10px] text-slate-400">{s.email || "Roster Learner"}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {state.arrivalTime && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline">
                          Arrived: {state.arrivalTime}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTerminalClock(s, "in")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center shadow-xs cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Clock In
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTerminalClock(s, "out")}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition flex items-center shadow-xs cursor-pointer"
                      >
                        <Timer className="w-3.5 h-3.5 mr-1" />
                        Clock Out
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStudentStatusChange(s.id, "excused", "medical")}
                        className={`px-3 py-1.5 font-bold rounded-lg text-xs transition flex items-center shadow-xs cursor-pointer ${
                          state.status === "excused"
                            ? "bg-blue-600 text-white"
                            : "bg-blue-500/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                        Excused
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Students can verify attendance using unique 6-digit session PIN <strong className="font-mono text-[#0078d4]">{verificationCode}</strong> or automatic class schedule tracking.
          </p>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRollCall}
              disabled={isSubmitting || courseStudents.length === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? "Saved to School Register!" : isSubmitting ? "Recording..." : "Save Class Register"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassRollCallModal;
