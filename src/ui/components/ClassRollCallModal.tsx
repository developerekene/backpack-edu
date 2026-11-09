import React, { useState, useMemo } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { Course, AttendanceRecord, AttendanceEntry, AttendanceStatus, AttendanceMode } from "../../types";
import { generateId } from "../../lib/id";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Building2,
  Video,
  X,
  Users,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";

interface ClassRollCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCourse: Course;
  initialMode?: AttendanceMode;
}

export const ClassRollCallModal: React.FC<ClassRollCallModalProps> = ({
  isOpen,
  onClose,
  targetCourse,
  initialMode = "physical",
}) => {
  const { currentUser } = useAuth();
  const {
    addAttendanceRecord,
    attendanceRecords,
    enrollmentRequests,
    orgMembers,
  } = useAppContext();

  // Basic Session Info
  const [sessionTitle, setSessionTitle] = useState(`Lecture Session - ${new Date().toLocaleDateString()}`);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionMode, setSessionMode] = useState<AttendanceMode>(initialMode);
  const [location, setLocation] = useState(initialMode === "physical" ? "Main Campus Lecture Hall 1" : "Virtual Classroom Stream");
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState(60);
  const [verificationCode, setVerificationCode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [searchStudent, setSearchStudent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Get enrolled students for this course
  const courseStudents = useMemo(() => {
    const list: Array<{ id: string; name: string; email?: string }> = [];

    // From approved enrollment requests
    enrollmentRequests
      .filter((r) => r.courseId === targetCourse.id && r.status === "approved")
      .forEach((r) => {
        if (!list.some((s) => s.id === r.userId)) {
          list.push({ id: r.userId, name: r.userName || "Student", email: r.userEmail });
        }
      });

    // From orgMembers with student role
    orgMembers
      .filter(
        (m) =>
          m.role === "student" &&
          (m.courseIds?.includes(targetCourse.id) || m.orgId === targetCourse.orgId)
      )
      .forEach((m) => {
        const id = m.userId || m.id;
        if (!list.some((s) => s.id === id)) {
          list.push({ id, name: m.name, email: m.email });
        }
      });

    return list;
  }, [enrollmentRequests, orgMembers, targetCourse.id, targetCourse.orgId]);

  // Truancy historical records for this course to calculate warning badges
  const studentTruancyHistory = useMemo(() => {
    const courseRecords = attendanceRecords.filter((r) => r.courseId === targetCourse.id);
    const historyMap: Record<string, { totalSessions: number; unexcusedAbsences: number }> = {};

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
      historyMap[student.id] = { totalSessions: total, unexcusedAbsences: absences };
    });

    return historyMap;
  }, [attendanceRecords, targetCourse.id, courseStudents]);

  // Attendance state map: studentId -> status & details
  const [attendanceMap, setAttendanceMap] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        excuseReason?: "medical" | "authorized_leave" | "family_emergency" | "school_event" | "technical_disruption";
        excuseNotes?: string;
        arrivalTime?: string;
      }
    >
  >(() => {
    const initial: Record<string, { status: AttendanceStatus; arrivalTime?: string }> = {};
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    courseStudents.forEach((s) => {
      initial[s.id] = { status: "present", arrivalTime: nowTime };
    });
    return initial;
  });

  if (!isOpen) return null;

  const setAllStatus = (status: AttendanceStatus) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const next: typeof attendanceMap = {};
    courseStudents.forEach((s) => {
      next[s.id] = {
        status,
        arrivalTime: status === "present" || status === "late" ? nowTime : undefined,
      };
    });
    setAttendanceMap(next);
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

  const filteredStudents = courseStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  // Calculate live stats for this session
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
      const hist = studentTruancyHistory[s.id] || { unexcusedAbsences: 0 };
      const willBeTruancyCritical =
        studentState.status === "absent" && !studentState.excuseReason && hist.unexcusedAbsences >= 2;

      return {
        id: generateId("att_entry"),
        userId: s.id,
        userName: s.name,
        userEmail: s.email,
        role: "student",
        status: studentState.status,
        checkInTime: studentState.arrivalTime || (studentState.status === "present" ? nowTime : undefined),
        durationMinutes: studentState.status === "absent" ? 0 : expectedDurationMinutes,
        location: location.trim(),
        method: "manual",
        verifiedBy: currentUser?.name || "Faculty Instructor",
        truancyWarning: willBeTruancyCritical,
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
      truancyThresholdPercent: 75,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0078d4]/10 dark:bg-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center border border-[#0078d4]/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Roll Call Register
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-[11px] font-extrabold uppercase">
                  {targetCourse.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official class attendance record with truancy detection, absence verification, and student pin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Details Bar */}
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
              Student Pin / Code
            </label>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-[#0078d4] dark:text-[#04a4ec] flex-1 text-center tracking-widest">
                {verificationCode}
              </span>
              <button
                type="button"
                onClick={() => setVerificationCode(Math.floor(100000 + Math.random() * 900000).toString())}
                className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-300 transition"
                title="Generate New Code"
              >
                Regen
              </button>
            </div>
          </div>
        </div>

        {/* Live Attendance Stats Header */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Session Attendance:</span>
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-sm font-mono text-slate-900 dark:text-white">{sessionRate}%</span>
              <span className="text-slate-400 text-[11px]">({presentCount + lateCount}/{totalStudents})</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
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

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-[11px]">Set All:</span>
            <button
              onClick={() => setAllStatus("present")}
              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-500/20 text-[10px] hover:bg-emerald-100 transition"
            >
              All Present
            </button>
            <button
              onClick={() => setAllStatus("absent")}
              className="px-2 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold rounded-lg border border-red-500/20 text-[10px] hover:bg-red-100 transition"
            >
              All Absent
            </button>
          </div>
        </div>

        {/* Search Student Filter */}
        <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Filter roster by student name or email..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0078d4]"
            />
          </div>
        </div>

        {/* Students Roll Call List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              No students enrolled in this course roster. Students must enroll and be approved to appear in the official register.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const state = attendanceMap[student.id] || { status: "absent" };
              const hist = studentTruancyHistory[student.id] || { totalSessions: 0, unexcusedAbsences: 0 };
              const isHighTruancyRisk = hist.unexcusedAbsences >= 2;

              return (
                <div
                  key={student.id}
                  className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    state.status === "absent"
                      ? "border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10"
                      : state.status === "late"
                      ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10"
                      : state.status === "excused"
                      ? "border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</span>
                      {isHighTruancyRisk && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold text-[10px] flex items-center border border-red-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Truancy Alert: {hist.unexcusedAbsences} Prior Absences
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] flex flex-wrap gap-2">
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

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStudentStatusChange(student.id, "present")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition ${
                        state.status === "present"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStudentStatusChange(student.id, "late")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition ${
                        state.status === "late"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Late</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStudentStatusChange(student.id, "absent")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition ${
                        state.status === "absent"
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStudentStatusChange(student.id, "excused", "medical")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition ${
                        state.status === "excused"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Excused</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Students can verify attendance using 6-digit code <strong className="font-mono text-[#0078d4]">{verificationCode}</strong> or automatic online class tracking.
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
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
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
