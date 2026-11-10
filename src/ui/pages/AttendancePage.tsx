import React, { useState, useMemo } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { useEventContext } from "../../store/EventContext";
import { Course, AttendanceEntry, AttendanceMode, AttendanceRecord } from "../../types";
import { TeacherDutyModal } from "../components/TeacherDutyModal";
import { ClassRollCallModal } from "../components/ClassRollCallModal";
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
} from "lucide-react";

export const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    courses,
    attendanceRecords,
    teacherDutyRecords,
    enrollmentRequests,
    organizations,
    addAttendanceRecord,
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

  // Navigation tab for school managers
  const [managerTab, setManagerTab] = useState<"students" | "faculty" | "truancy">("students");

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [selectedModeFilter, setSelectedModeFilter] = useState<"all" | AttendanceMode>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [showDutyModal, setShowDutyModal] = useState<boolean>(false);
  const [showRollCallModal, setShowRollCallModal] = useState<boolean>(false);
  const [targetRollCallCourse, setTargetRollCallCourse] = useState<Course | null>(null);

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

  // Truancy calculation across courses
  const truancyReport = useMemo(() => {
    const list: Array<{
      studentId: string;
      studentName: string;
      studentEmail?: string;
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

    // For every relevant course, check enrolled students
    const targetCourses = isStudent
      ? myCourses
      : myCourses.length > 0
      ? myCourses
      : courses;

    targetCourses.forEach((c) => {
      // Find students in this course
      const studentMap = new Map<string, { id: string; name: string; email?: string }>();
      enrollmentRequests
        .filter((r) => r.courseId === c.id && r.status === "approved")
        .forEach((r) => {
          studentMap.set(r.userId, { id: r.userId, name: r.userName || "Student", email: r.userEmail });
        });

      // Filter only current student if in student mode
      if (isStudent && currentUser) {
        studentMap.clear();
        studentMap.set(currentUser.id, { id: currentUser.id, name: currentUser.name, email: currentUser.email });
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
          truancyLevel = "critical"; // Severe Absence (>= 50%)
        } else if (absencePercentage >= 10) {
          truancyLevel = "warning"; // Persistent Absence (>= 10%)
        }

        list.push({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
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
  }, [myCourses, courses, enrollmentRequests, isStudent, currentUser, attendanceRecords]);

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

  // Active today's scheduled class events and roll calls for student 1-tap check-in
  const activeStudentSessions = useMemo(() => {
    if (!isStudent || !currentUser) return [];
    const today = new Date().toISOString().split("T")[0];
    const studentCourseIds = new Set(myCourses.map((c) => c.id));
    const items: Array<{
      id: string;
      title: string;
      courseTitle: string;
      courseId: string;
      pin: string;
      mode: "physical" | "online";
      location?: string;
      time?: string;
      isCheckedIn: boolean;
    }> = [];

    // 1. Active roll calls created by instructors today
    attendanceRecords.forEach((rec) => {
      if (rec.date === today && (studentCourseIds.has(rec.courseId) || studentCourseIds.size === 0)) {
        const isCheckedIn = (rec.entries || []).some(
          (e) => e.userId === currentUser.id && (e.status === "present" || e.status === "late")
        );
        const pin = rec.verificationCode || String(100000 + (Math.abs(rec.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)) % 900000));
        items.push({
          id: rec.id,
          title: rec.sessionTitle || "Live Roll Call Session",
          courseTitle: rec.courseTitle || "Course",
          courseId: rec.courseId,
          pin,
          mode: rec.mode || "physical",
          location: rec.location || "Classroom",
          time: rec.startTime || "Today",
          isCheckedIn,
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
        const isCheckedIn = matchingRecord
          ? (matchingRecord.entries || []).some(
              (e) => e.userId === currentUser.id && (e.status === "present" || e.status === "late")
            )
          : false;

        if (!items.some((i) => i.pin === evtPin)) {
          items.push({
            id: `evt_${evt.id}`,
            title: evt.title,
            courseTitle: evt.courseTitle || "Scheduled Class Event",
            courseId: evt.courseId || "event_course",
            pin: evtPin,
            mode: evt.mode === "onsite" ? "physical" : "online",
            location: evt.location || "Scheduled Venue",
            time: evt.startTime || evt.time || "Scheduled Class",
            isCheckedIn,
          });
        }
      }
    });

    return items;
  }, [isStudent, currentUser, myCourses, attendanceRecords, events]);

  // Student pin self-verification handler
  const performPinVerification = async (pinToVerify: string) => {
    const pin = pinToVerify.trim();
    if (!pin || pin.length < 4) {
      setStudentPinFeedback({ type: "error", message: "Please enter a valid session attendance code." });
      return;
    }

    // Look for matching attendance record today with this verificationCode
    const today = new Date().toISOString().split("T")[0];
    const match = attendanceRecords.find(
      (r) => r.verificationCode === pin && r.date === today
    );

    // If no direct attendance record exists yet, check if a scheduled class event for today matches this PIN
    if (!match) {
      const matchingEvent = events.find((evt) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evtPin = (evt as any).verificationCode || String(100000 + (Math.abs(evt.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)) % 900000));
        const evtDate = evt.date ? evt.date.split("T")[0] : today;
        return evtPin === pin && evtDate === today;
      });

      if (matchingEvent) {
        const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newRecord: AttendanceRecord = {
          id: `att_event_${matchingEvent.id}_${Date.now()}`,
          courseId: matchingEvent.courseId || "event_course",
          courseTitle: matchingEvent.courseTitle || matchingEvent.title,
          date: today,
          mode: matchingEvent.mode === "onsite" ? "physical" : "online",
          sessionTitle: matchingEvent.title,
          location: matchingEvent.location || "Scheduled Class Event",
          startTime: nowTime,
          verificationCode: pin,
          entries: [
            {
              id: `entry_${currentUser?.id}_${Date.now()}`,
              userId: currentUser?.id || "guest",
              userName: currentUser?.name || "Student",
              userEmail: currentUser?.email,
              role: "student",
              status: "present",
              checkInTime: nowTime,
              durationMinutes: 60,
              location: matchingEvent.location || "Scheduled Class Event",
              method: "verification_code",
              verifiedBy: "1-Tap Session Verification",
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await addAttendanceRecord(newRecord);
          setStudentPinFeedback({
            type: "success",
            message: `✓ 1-Tap Check-In Recorded! Attendance verified for scheduled event "${matchingEvent.title}".`,
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

    // Check if student is already recorded
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const existingEntries = match.entries || [];
    const studentEntryIdx = existingEntries.findIndex((e) => e.userId === currentUser?.id);

    let updatedEntries: AttendanceEntry[];
    if (studentEntryIdx >= 0) {
      updatedEntries = [...existingEntries];
      updatedEntries[studentEntryIdx] = {
        ...updatedEntries[studentEntryIdx],
        status: "present",
        checkInTime: nowTime,
        method: "verification_code",
      };
    } else {
      const newEntry: AttendanceEntry = {
        id: `entry_${currentUser?.id}_${Date.now()}`,
        userId: currentUser?.id || "guest",
        userName: currentUser?.name || "Student",
        userEmail: currentUser?.email,
        role: "student",
        status: "present",
        checkInTime: nowTime,
        durationMinutes: match.expectedDurationMinutes || 60,
        location: match.location || "Classroom",
        method: "verification_code",
        verifiedBy: "1-Tap Session Verification",
      };
      updatedEntries = [...existingEntries, newEntry];
    }

    try {
      await addAttendanceRecord({
        ...match,
        entries: updatedEntries,
        records: {
          ...(match.records || {}),
          [currentUser?.id || "guest"]: true,
        },
        totalAttendees: updatedEntries.filter((e) => e.status === "present" || e.status === "late").length,
        updatedAt: new Date().toISOString(),
      });

      setStudentPinFeedback({
        type: "success",
        message: `✓ Verified attendance for ${match.courseTitle || "class"} (${match.sessionTitle || "Lecture"}). Recorded onto student transcript!`,
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
                className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center space-x-2"
              >
                <Briefcase className="w-4 h-4" />
                <span>Duty Timesheet</span>
              </button>

              <button
                onClick={() => {
                  const target = myCourses[0];
                  if (target) {
                    setTargetRollCallCourse(target);
                    setShowRollCallModal(true);
                  }
                }}
                disabled={myCourses.length === 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-2 disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                <span>Take Class Attendance</span>
              </button>
            </>
          )}

          {isSchoolStaff && (
            <button
              onClick={handleExportBroadsheet}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition text-xs border border-slate-200 dark:border-slate-600 flex items-center space-x-1.5"
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

        {/* Metric 3: Active Faculty On Duty */}
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Faculty On Duty</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live Shift Roster
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {activeTeachersOnDutyCount}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Instructors Active Now
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Currently checked-in teachers delivering lectures or holding campus office hours.
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
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
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

      {/* STUDENT ROLE SPECIAL PANEL: Verification Code & 1-Tap Check-In */}
      {isStudent && (
        <div className="bg-gradient-to-r from-[#0078d4]/10 via-blue-500/10 to-indigo-500/10 rounded-3xl p-6 sm:p-8 border border-[#0078d4]/20 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-[#0078d4] dark:text-[#04a4ec]" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Student 1-Tap & Code Verified Class Check-In
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Check in for active scheduled class events or instructor roll call sessions in <strong>1 tap</strong> below. Scheduled sessions automatically connect to unique 6-digit PIN codes.
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
                className="px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center space-x-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Code</span>
              </button>
            </form>
          </div>

          {/* Active Today's Class Sessions & Events for 1-Tap Check-In */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Today's Class Sessions &amp; Events</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-connected PIN Session Verification
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center ${
                            session.mode === "online"
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {session.mode === "online" ? (
                            <Video className="w-3 h-3 mr-1" />
                          ) : (
                            <Building2 className="w-3 h-3 mr-1" />
                          )}
                          <span>{session.mode === "online" ? "Online Live" : "Physical Campus"}</span>
                        </span>
                        <span className="text-[11px] font-mono text-[#0078d4] dark:text-[#04a4ec] font-bold bg-[#0078d4]/10 px-2 py-0.5 rounded-md">
                          PIN: {session.pin}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {session.title}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {session.courseTitle} • {session.time} {session.location ? `(${session.location})` : ""}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {session.isCheckedIn ? (
                        <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs flex items-center space-x-1 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          <span>Checked In</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => performPinVerification(session.pin)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>⚡ 1-Tap Check-In</span>
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
                  ? `Clocked in at ${activeInstructorDuty.checkInTime} (${activeInstructorDuty.mode === "physical" ? "Physical Campus" : "Online Virtual"}) • ${activeInstructorDuty.location}`
                  : "Clock in to record your teaching, laboratory supervision, or office hours to the school register."}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDutyModal(true)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm ${
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

      {/* Main Tabs (School Leadership & Admins) */}
      {isSchoolStaff && (
        <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-6">
          <button
            onClick={() => setManagerTab("students")}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              managerTab === "students"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Sessions & Student Registers ({relevantAttendanceRecords.length})</span>
          </button>

          <button
            onClick={() => setManagerTab("truancy")}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              managerTab === "truancy"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Truancy & Academic Risk Register ({criticalTruancyCount})</span>
          </button>

          <button
            onClick={() => setManagerTab("faculty")}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              managerTab === "faculty"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Teacher Timesheets & Work Hours ({relevantTeacherDutyRecords.length})</span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
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

          {/* Course Filter */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden"
          >
            <option value="all">All Courses / Cohorts</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Environment Filter: Physical vs Online */}
          <select
            value={selectedModeFilter}
            onChange={(e) => setSelectedModeFilter(e.target.value as "all" | AttendanceMode)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden"
          >
            <option value="all">All Environments (Physical & Online)</option>
            <option value="physical">Physical Campus Only</option>
            <option value="online">Online Live Classes Only</option>
          </select>
        </div>

        {managerTab === "faculty" && isSchoolStaff && (
          <button
            onClick={handleExportFacultyTimesheet}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-1.5 transition text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Timesheets (CSV)</span>
          </button>
        )}
      </div>

      {/* TAB 1: Student Class Attendance Register */}
      {(managerTab === "students" || isStudent) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              {isStudent ? "My Class Attendance Sessions" : "Recorded Class Sessions"}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {relevantAttendanceRecords.length} recorded session registers
            </span>
          </div>

          {relevantAttendanceRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No class attendance records found
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Attendance registers are created whenever an instructor conducts an in-person roll call or holds a live online class.
              </p>
              {(isSchoolStaff || isInstructor) && (
                <button
                  onClick={() => {
                    const target = myCourses[0];
                    if (target) {
                      setTargetRollCallCourse(target);
                      setShowRollCallModal(true);
                    }
                  }}
                  disabled={myCourses.length === 0}
                  className="px-4 py-2 bg-[#0078d4] text-white font-bold rounded-xl text-xs hover:bg-[#006cbd] transition inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Take First Class Attendance</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {relevantAttendanceRecords
                .filter((r) => selectedCourseFilter === "all" || r.courseId === selectedCourseFilter)
                .filter((r) => selectedModeFilter === "all" || r.mode === selectedModeFilter)
                .map((record) => {
                  const presentCount = (record.entries || []).filter(
                    (e) => e.status === "present" || e.status === "late"
                  ).length;
                  const total = record.entries?.length || 0;
                  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 100;

                  return (
                    <div
                      key={record.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 ${
                                record.mode === "online"
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {record.mode === "online" ? (
                                <Video className="w-3 h-3 mr-1" />
                              ) : (
                                <Building2 className="w-3 h-3 mr-1" />
                              )}
                              <span>{record.mode === "online" ? "Online Virtual Lecture" : "Physical Campus Classroom"}</span>
                            </span>

                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {record.courseTitle}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{record.date}</span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {record.sessionTitle || "Class Attendance Session"}
                          </h4>

                          <div className="text-slate-500 dark:text-slate-400 text-xs flex flex-wrap gap-2">
                            {record.location && <span>Location: {record.location}</span>}
                            {record.instructorEngagement?.instructorName && (
                              <>
                                <span>•</span>
                                <span>Instructor: {record.instructorEngagement.instructorName}</span>
                              </>
                            )}
                            {record.verificationCode && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[#0078d4] font-semibold">
                                  Verification Pin: {record.verificationCode}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right sm:border-l sm:border-slate-100 dark:sm:border-slate-700 sm:pl-5 shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
                          <div className="flex items-baseline space-x-1">
                            <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">
                              {rate}%
                            </span>
                            <span className="text-xs text-slate-400">attendance</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {presentCount} of {total} Present
                          </span>
                        </div>
                      </div>

                      {/* Attendee Roster Preview */}
                      {record.entries && record.entries.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Session Attendee Roster ({record.entries.length} learners):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {record.entries.map((entry) => (
                              <div
                                key={entry.id || entry.userId}
                                className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
                                  entry.status === "present"
                                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/20"
                                    : entry.status === "late"
                                    ? "bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-500/20"
                                    : entry.status === "excused"
                                    ? "bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 border-blue-500/20"
                                    : "bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-200 border-red-500/20"
                                }`}
                              >
                                <span className="font-semibold truncate max-w-[130px]">{entry.userName}</span>
                                <span className="font-extrabold capitalize text-[10px]">
                                  {entry.status} {entry.checkInTime ? `(${entry.checkInTime})` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
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
      {managerTab === "truancy" && isSchoolStaff && (
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
                    {truancyReport.map((item, idx) => (
                      <tr
                        key={`${item.studentId}_${item.courseId}_${idx}`}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition ${
                          item.truancyLevel === "critical"
                            ? "bg-red-50/20 dark:bg-red-950/10"
                            : ""
                        }`}
                      >
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-slate-900 dark:text-white block">{item.studentName}</span>
                          <span className="text-[11px] text-slate-400">{item.studentEmail || "No email on record"}</span>
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
                              ) : (
                                <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {r.mode === "physical" ? "Physical Campus" : "Online Virtual"}
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

      {showRollCallModal && targetRollCallCourse && (
        <ClassRollCallModal
          isOpen={showRollCallModal}
          onClose={() => setShowRollCallModal(false)}
          targetCourse={targetRollCallCourse}
        />
      )}
    </div>
  );
};

export default AttendancePage;
