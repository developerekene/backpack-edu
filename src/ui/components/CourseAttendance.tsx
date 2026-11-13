import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { Course, AttendanceRecord, AttendanceEntry, AttendanceStatus, AttendanceMode } from "../../types";
import { generateId } from "../../lib/id";
import { TeacherDutyModal } from "./TeacherDutyModal";
import { ClassRollCallModal } from "./ClassRollCallModal";
import { CustomAlert } from "./CustomAlert";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Building2,
  Briefcase,
  Download,
  Plus,
  Search,
  Trash2,
  Video,
  MapPin,
  Timer,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  ShieldCheck,
  ArrowRight,
  Globe,
} from "lucide-react";

interface CourseAttendanceProps {
  course: Course;
  isStudent?: boolean;
}

export const CourseAttendance: React.FC<CourseAttendanceProps> = ({
  course,
  isStudent = false,
}) => {
  const { currentUser } = useAuth();
  const {
    attendanceRecords,
    addAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    orgMembers,
    enrollmentRequests,
    organizations,
    offlineRosterStudents,
  } = useAppContext();

  // Enrolled student requests
  const enrolledStudentRequests = useMemo(() => {
    return enrollmentRequests.filter(
      (r) => r.courseId === course.id && r.status === "approved"
    );
  }, [enrollmentRequests, course.id]);

  // Associated course check
  const isUserAssociatedWithCourse = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "super_admin" || currentUser.role === "organization") return true;
    const userOrg = organizations.find(
      (o) =>
        o.ownerId === currentUser.id ||
        o.id === currentUser.id ||
        (o.adminUserIds && o.adminUserIds.includes(currentUser.id))
    );
    if (userOrg && course.orgId === userOrg.id) return true;
    if (
      course.instructorId === currentUser.id ||
      course.createdBy === currentUser.id ||
      course.instructors?.includes(currentUser.id)
    ) return true;
    if (enrolledStudentRequests.some((r) => r.userId === currentUser.id)) return true;
    if (course.enrolledStudentIds?.includes(currentUser.id)) return true;
    return false;
  }, [currentUser, course, enrolledStudentRequests, organizations]);

  // Active sub-tab: "physical", "online", "hybrid", or "all"
  const [activeMode, setActiveMode] = useState<AttendanceMode | "all">("all");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "instructor">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>("all");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Modal states
  const [showTakeAttendanceModal, setShowTakeAttendanceModal] = useState(false);
  const [rollCallTab, setRollCallTab] = useState<"roster" | "terminal">("roster");
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [showRollCallModal, setShowRollCallModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
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

  const courseOrgMembers = useMemo(() => {
    return orgMembers.filter(
      (m) =>
        m.courseIds?.includes(course.id) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m as any).enrolledCourseIds?.includes(course.id) ||
        (m.role === "instructor" &&
          Boolean(m.userId && course.instructors?.includes(m.userId)))
    );
  }, [orgMembers, course.id, course.instructors]);

  // Unified roster of students (auto-registered online + manually added offline) and instructors
  const courseRoster = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      email?: string;
      role: "student" | "instructor";
      participantType: "online" | "offline";
    }> = [];

    // Add instructor from course definition
    if (course.instructorId || course.instructorName) {
      list.push({
        id: course.instructorId || `inst_${course.id}`,
        name: course.instructorName || "Primary Instructor",
        role: "instructor",
        participantType: activeMode === "online" ? "online" : "offline",
      });
    }

    // Add instructors from orgMembers
    courseOrgMembers
      .filter((m) => m.role === "instructor")
      .forEach((inst) => {
        if (!list.some((u) => u.name.toLowerCase() === inst.name.toLowerCase())) {
          list.push({
            id: inst.userId || inst.id,
            name: inst.name,
            email: inst.email,
            role: "instructor",
            participantType: activeMode === "online" ? "online" : "offline",
          });
        }
      });

    // Add online students from approved enrollments (auto-registered)
    enrolledStudentRequests.forEach((req) => {
      if (req.userName && !list.some((u) => u.id === req.userId)) {
        list.push({
          id: req.userId,
          name: req.userName,
          email: req.userEmail,
          role: "student",
          participantType: "online",
        });
      }
    });

    // Add students from orgMembers
    courseOrgMembers
      .filter((m) => m.role === "student" && m.status === "active")
      .forEach((st) => {
        if (!list.some((u) => u.id === st.userId || u.name.toLowerCase() === st.name.toLowerCase())) {
          list.push({
            id: st.userId || st.id,
            name: st.name,
            email: st.email,
            role: "student",
            participantType: "online",
          });
        }
      });

    // Add Firestore-persisted offline students
    offlineRosterStudents
      .filter((s) => s.courseId === course.id)
      .forEach((off) => {
        if (!list.some((u) => u.id === off.id || u.name.toLowerCase() === off.name.toLowerCase())) {
          list.push({
            id: off.id,
            name: off.name,
            email: off.email,
            role: "student",
            participantType: "offline",
          });
        }
      });

    // Legacy localStorage custom offline students fallback
    try {
      const stored = localStorage.getItem(`backpack_custom_students_${course.id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ id: string; name: string; email?: string }>;
        parsed.forEach((off) => {
          if (off.name && !list.some((u) => u.id === off.id || u.name.toLowerCase() === off.name.toLowerCase())) {
            list.push({
              id: off.id,
              name: off.name,
              email: off.email,
              role: "student",
              participantType: "offline",
            });
          }
        });
      }
    } catch {
      /* ignore */
    }

    return list;
  }, [course, courseOrgMembers, enrolledStudentRequests, offlineRosterStudents, activeMode]);

  // All attendance records specifically for this associated class
  const courseRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.courseId === course.id)
      .sort((a, b) => new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime());
  }, [attendanceRecords, course.id]);

  // Filtered by current mode
  const modeRecords = useMemo(() => {
    return courseRecords.filter((r) => {
      if (activeMode === "all") return true;
      if (activeMode === "physical") {
        return r.mode === "physical" || !r.mode;
      }
      return r.mode === activeMode;
    });
  }, [courseRecords, activeMode]);

  // High-level analytics
  const analytics = useMemo(() => {
    const totalSessions = modeRecords.length;
    let totalStudentMinutes = 0;
    let totalInstructorMinutes = 0;
    let totalPresents = 0;
    let totalEntriesCount = 0;

    modeRecords.forEach((rec) => {
      let instructorInEntries = false;
      
      if (rec.entries && rec.entries.length > 0) {
        rec.entries.forEach((entry) => {
          totalEntriesCount++;
          if (entry.status === "present" || entry.status === "late") {
            totalPresents++;
          }
          if (entry.role === "instructor") {
            totalInstructorMinutes += entry.durationMinutes || 0;
            instructorInEntries = true;
          } else {
            totalStudentMinutes += entry.durationMinutes || 0;
          }
        });
      } else if (rec.records) {
        // Legacy fallback
        Object.values(rec.records).forEach((val) => {
          totalEntriesCount++;
          if (val) totalPresents++;
        });
      }

      // Only add instructorEngagement if not already counted in entries
      if (!instructorInEntries && rec.instructorEngagement?.durationMinutes) {
        totalInstructorMinutes += rec.instructorEngagement.durationMinutes;
      }
    });

    const studentHours = (totalStudentMinutes / 60).toFixed(1);
    const instructorHours = (totalInstructorMinutes / 60).toFixed(1);
    const attendanceRate = totalEntriesCount > 0 ? Math.round((totalPresents / totalEntriesCount) * 100) : 0;
    const avgDuration = totalSessions > 0 ? Math.round((totalStudentMinutes + totalInstructorMinutes) / Math.max(1, totalSessions)) : 0;

    return {
      totalSessions,
      studentHours,
      instructorHours,
      attendanceRate,
      avgDuration,
    };
  }, [modeRecords]);

  // Helper to format minutes to "Xh Ym"
  const formatMins = (mins: number) => {
    if (!mins || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Helper to calculate minutes between "HH:MM" and "HH:MM"
  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    try {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      if (endTotal >= startTotal) {
        return endTotal - startTotal;
      }
      // Over midnight
      return 24 * 60 - startTotal + endTotal;
    } catch {
      return 0;
    }
  };

  // Export current attendance records to CSV
  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Mode",
      "Session Title",
      "Location/Room",
      "Person Name",
      "Email",
      "Role",
      "Status",
      "Check-In Time",
      "Check-Out Time",
      "Duration (Minutes)",
      "Duration (Formatted)",
      "Notes",
    ];

    const rows: string[][] = [];

    modeRecords.forEach((rec) => {
      const currentMode = rec.mode || (activeMode === "all" ? "physical" : activeMode);
      if (rec.entries && rec.entries.length > 0) {
        rec.entries.forEach((e) => {
          rows.push([
            rec.date,
            currentMode,
            rec.sessionTitle || "Class Session",
            rec.location || "Campus/Online",
            `"${e.userName.replace(/"/g, '""')}"`,
            e.userEmail || "",
            e.role,
            e.status,
            e.checkInTime || "",
            e.checkOutTime || "",
            String(e.durationMinutes || 0),
            formatMins(e.durationMinutes || 0),
            `"${(e.notes || "").replace(/"/g, '""')}"`,
          ]);
        });
      } else if (rec.records) {
        Object.entries(rec.records).forEach(([uid, isPresent]) => {
          rows.push([
            rec.date,
            currentMode,
            rec.sessionTitle || "Class Session",
            rec.location || "Campus/Online",
            uid,
            "",
            "student",
            isPresent ? "present" : "absent",
            "",
            "",
            "60",
            "1h",
            "",
          ]);
        });
      }
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Backpack_${course.title.replace(/\s+/g, "_")}_${activeMode}_attendance.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form State for Taking / Editing Attendance
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formSessionTitle, setFormSessionTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDefaultIn, setFormDefaultIn] = useState("08:30");
  const [formDefaultOut, setFormDefaultOut] = useState("11:30");
  const [formEntries, setFormEntries] = useState<AttendanceEntry[]>([]);

  // Initialize form roster when opening modal
  const handleOpenTakeAttendanceModal = (recordToEdit?: AttendanceRecord) => {
    if (recordToEdit) {
      setEditingRecord(recordToEdit);
      setFormDate(recordToEdit.date);
      setFormSessionTitle(recordToEdit.sessionTitle || "");
      setFormLocation(recordToEdit.location || "");
      setFormEntries(recordToEdit.entries || []);
    } else {
      setEditingRecord(null);
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormSessionTitle(
        activeMode === "online"
          ? `Online Class Session - ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : activeMode === "hybrid"
          ? `Hybrid Class Session - ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : `Physical Campus Session - ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      );
      setFormLocation(
        activeMode === "online"
          ? "Online Live Classroom"
          : activeMode === "hybrid"
          ? "Campus Hall + Live Stream"
          : "Main Classroom / Hall 101"
      );

      const defaultDuration = calculateDuration(formDefaultIn, formDefaultOut);

      // Build roster entries (instructors present, students absent until checked in)
      const initialEntries: AttendanceEntry[] = courseRoster.map((u) => ({
        id: generateId(`entry_${u.id}`),
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        role: u.role,
        participantType: u.participantType,
        status: u.role === "instructor" ? "present" : "absent",
        checkInTime: u.role === "instructor" ? formDefaultIn : undefined,
        checkOutTime: u.role === "instructor" ? formDefaultOut : undefined,
        durationMinutes: u.role === "instructor" ? (defaultDuration > 0 ? defaultDuration : 180) : 0,
        location: activeMode === "online" ? "Online Classroom" : "Campus Lecture Hall",
        method: activeMode === "online" ? "live_online" : "manual",
        notes: "",
      }));

      setFormEntries(initialEntries);
    }
    setShowTakeAttendanceModal(true);
  };

  const handleApplyDefaultsToAll = () => {
    const duration = calculateDuration(formDefaultIn, formDefaultOut);
    setFormEntries((prev) =>
      prev.map((e) => ({
        ...e,
        checkInTime: formDefaultIn,
        checkOutTime: formDefaultOut,
        durationMinutes: duration > 0 ? duration : e.durationMinutes,
      }))
    );
  };

  const handleSetAllStatus = (newStatus: AttendanceStatus) => {
    setFormEntries((prev) =>
      prev.map((e) => ({
        ...e,
        status: newStatus,
        durationMinutes: newStatus === "absent" ? 0 : e.durationMinutes,
      }))
    );
  };

  const handleUpdateEntry = (userId: string, updates: Partial<AttendanceEntry>) => {
    setFormEntries((prev) =>
      prev.map((e) => {
        if (e.userId !== userId) return e;
        const updated = { ...e, ...updates };
        // If times changed, auto-compute duration
        if (updates.checkInTime || updates.checkOutTime) {
          const inTime = updates.checkInTime || e.checkInTime || "08:00";
          const outTime = updates.checkOutTime || e.checkOutTime || "11:00";
          const computed = calculateDuration(inTime, outTime);
          if (computed > 0) {
            updated.durationMinutes = computed;
          }
        }
        return updated;
      })
    );
  };

  const handleSaveAttendance = async () => {
    const totalMins = formEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const avgMins = formEntries.length > 0 ? Math.round(totalMins / formEntries.length) : 0;

    const legacyRecords: Record<string, boolean> = {};
    formEntries.forEach((e) => {
      legacyRecords[e.userId] = e.status === "present" || e.status === "late";
    });

    const instructorEntry = formEntries.find((e) => e.role === "instructor");
    const currentEffectiveMode = activeMode === "all" ? "physical" : activeMode;

    if (editingRecord && editingRecord.id) {
      await updateAttendanceRecord(editingRecord.id, {
        date: formDate,
        sessionTitle: formSessionTitle,
        location: formLocation,
        mode: editingRecord.mode || currentEffectiveMode,
        entries: formEntries,
        records: legacyRecords,
        totalAttendees: formEntries.filter((e) => e.status === "present" || e.status === "late").length,
        avgEngagementMinutes: avgMins,
        updatedAt: new Date().toISOString(),
        ...(instructorEntry
          ? {
              instructorEngagement: {
                instructorId: instructorEntry.userId,
                instructorName: instructorEntry.userName,
                checkInTime: instructorEntry.checkInTime,
                checkOutTime: instructorEntry.checkOutTime,
                durationMinutes: instructorEntry.durationMinutes,
                status: instructorEntry.status,
              },
            }
          : {}),
      });
    } else {
      const newRecId = generateId(`att_${course.id}`);
      const newRecord: AttendanceRecord = {
        id: newRecId,
        courseId: course.id,
        courseTitle: course.title,
        orgId: course.orgId,
        date: formDate,
        mode: currentEffectiveMode,
        sessionTitle: formSessionTitle,
        location: formLocation,
        entries: formEntries,
        records: legacyRecords,
        totalAttendees: formEntries.filter((e) => e.status === "present" || e.status === "late").length,
        avgEngagementMinutes: avgMins,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(instructorEntry
          ? {
              instructorEngagement: {
                instructorId: instructorEntry.userId,
                instructorName: instructorEntry.userName,
                checkInTime: instructorEntry.checkInTime,
                checkOutTime: instructorEntry.checkOutTime,
                durationMinutes: instructorEntry.durationMinutes,
                status: instructorEntry.status,
              },
            }
          : {}),
      };
      await addAttendanceRecord(newRecord);
    }

    setShowTakeAttendanceModal(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header bar with Mode Selector & Top Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Timer className="w-6 h-6 text-[#0078d4] dark:text-[#04a4ec]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-heading">
              Attendance & Engagement Tracker
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track student and instructor check-in times, attendance status, and engagement duration for physical campus sessions and online classes.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 self-start lg:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setActiveMode("all")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeMode === "all"
                ? "bg-white dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] shadow-sm font-heading"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Combined</span>
          </button>
          <button
            onClick={() => setActiveMode("physical")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeMode === "physical"
                ? "bg-white dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] shadow-sm font-heading"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>In-Person</span>
          </button>
          <button
            onClick={() => setActiveMode("online")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeMode === "online"
                ? "bg-white dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] shadow-sm font-heading"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Video className="w-4 h-4 text-indigo-500" />
            <span>Online Live</span>
          </button>
          <button
            onClick={() => setActiveMode("hybrid")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeMode === "hybrid"
                ? "bg-white dark:bg-slate-800 text-[#0078d4] dark:text-[#04a4ec] shadow-sm font-heading"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4 text-purple-500" />
            <span>Hybrid</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {activeMode === "physical"
              ? "In-Person Sessions"
              : activeMode === "online"
              ? "Online Sessions"
              : activeMode === "hybrid"
              ? "Hybrid Sessions"
              : "Total Sessions"}
          </span>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {analytics.totalSessions}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {modeRecords.length} recorded dates
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Students Engagement
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {analytics.studentHours} hrs
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Total active learning time
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Instructors Teaching
          </span>
          <div className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 mt-1">
            {analytics.instructorHours} hrs
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Faculty instruction logged
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Attendance Rate
          </span>
          <div className="text-2xl font-extrabold text-[#0078d4] dark:text-[#04a4ec] mt-1">
            {analytics.attendanceRate}%
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Present & on time
          </span>
        </div>
      </div>

      {/* Institutional Attendance Hub Banner */}
      <div className="p-3.5 bg-gradient-to-r from-[#0078d4]/10 via-blue-500/10 to-indigo-500/10 rounded-2xl border border-[#0078d4]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            Need institutional truancy tracking, student attendance pins, or staff work timesheets?
          </span>
        </div>
        <Link
          to="/attendance"
          className="text-[#0078d4] dark:text-[#04a4ec] font-bold hover:underline flex items-center space-x-1 shrink-0"
        >
          <span>Open School Attendance Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Action Toolbar */}
      {!isUserAssociatedWithCourse && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
          <span>You are not enrolled in or associated with this course. Taking roll call and self check-in are reserved for enrolled students, course instructors, and administrators of this course.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Quick Roll Call Modal Trigger for Instructors/Staff */}
          {!isStudent && isUserAssociatedWithCourse && (
            <button
              onClick={() => {
                setRollCallTab("roster");
                setShowRollCallModal(true);
              }}
              className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center shadow-sm cursor-pointer font-heading"
            >
              <Users className="w-4 h-4 mr-1.5" />
              <span>Attendance Register</span>
            </button>
          )}

          {/* Student Self Class Check-In */}
          {isStudent && isUserAssociatedWithCourse && (
            <button
              onClick={() => {
                setRollCallTab("roster");
                setShowRollCallModal(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center shadow-sm cursor-pointer font-heading"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Self Class Check-In</span>
            </button>
          )}

          {/* Duty Timesheet Button */}
          {!isStudent && isUserAssociatedWithCourse && (
            <button
              onClick={() => setShowDutyModal(true)}
              className="px-3.5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-xl text-xs sm:text-sm font-bold transition flex items-center cursor-pointer font-heading"
            >
              <Briefcase className="w-4 h-4 mr-1.5" />
              <span>Duty Timesheet</span>
            </button>
          )}

          {/* Roll call Button (Available across Physical, Online, Hybrid, and Combined classes) */}
          {!isStudent && isUserAssociatedWithCourse && (
            <button
              onClick={() => {
                setRollCallTab("terminal");
                setShowRollCallModal(true);
              }}
              className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-bold transition flex items-center cursor-pointer font-heading whitespace-nowrap"
            >
              <Clock className="w-4 h-4 mr-1.5" />
              <span>Roll call</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={modeRecords.length === 0}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span>Export Attendance CSV</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0078d4] w-48 sm:w-56"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "student" | "instructor")}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="instructor">Instructors</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | AttendanceStatus)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
          </select>
        </div>
      </div>

      {/* Session Logs List */}
      <div className="space-y-4">
        {modeRecords.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <Timer className="w-12 h-12 text-slate-400 mx-auto stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 font-heading">
              No {activeMode === "physical" ? "Physical Campus" : activeMode === "online" ? "Online Class" : activeMode === "hybrid" ? "Hybrid Class" : ""} Attendance Records Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {activeMode === "online"
                ? "Online and hybrid class attendance logs automatically when students and instructors join live streams or check in via Roll Call."
                : "Open Roll call or Attendance Register to check teachers and online/offline students in and out of class with full engagement timestamps."}
            </p>
            {!isStudent && isUserAssociatedWithCourse && (
              <button
                onClick={() => {
                  setRollCallTab("terminal");
                  setShowRollCallModal(true);
                }}
                className="mt-2 px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold transition inline-flex items-center shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Start First Class Roll Call</span>
              </button>
            )}
          </div>
        ) : (
          modeRecords.map((rec) => {
            const isExpanded = expandedSessionId === rec.id;
            const entries = rec.entries || [];

            // Filter entries by search and role
            const filteredEntries = entries.filter((e) => {
              if (roleFilter !== "all" && e.role !== roleFilter) return false;
              if (statusFilter !== "all" && e.status !== statusFilter) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = e.userName.toLowerCase().includes(q);
                const emailMatch = e.userEmail?.toLowerCase().includes(q);
                return nameMatch || emailMatch;
              }
              return true;
            });

            const presentCount = entries.filter((e) => e.status === "present").length;
            const lateCount = entries.filter((e) => e.status === "late").length;
            const absentCount = entries.filter((e) => e.status === "absent").length;
            const totalDurationMins = entries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Session Header Card */}
                <div
                  onClick={() => setExpandedSessionId(isExpanded ? null : (rec.id || null))}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span className="text-xs font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-[#0078d4]" />
                        {rec.date}
                      </span>

                      <span className="text-slate-300 dark:text-slate-600">·</span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center ${
                          rec.mode === "online"
                            ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                            : rec.mode === "hybrid"
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {rec.mode === "online" ? (
                          <Video className="w-3 h-3 mr-1" />
                        ) : rec.mode === "hybrid" ? (
                          <Globe className="w-3 h-3 mr-1" />
                        ) : (
                          <Building2 className="w-3 h-3 mr-1" />
                        )}
                        {rec.mode === "online"
                          ? "Online Live"
                          : rec.mode === "hybrid"
                          ? "Hybrid (Campus + Online)"
                          : "Physical In-Person"}
                      </span>

                      {rec.sessionStatus && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            rec.sessionStatus === "live"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {rec.sessionStatus === "live" ? "Live Session" : "Ended"}
                        </span>
                      )}

                      {rec.location && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                            {rec.location}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white font-heading">
                      {rec.sessionTitle || "Attendance Session"}
                    </h3>

                    {/* Quick breakdown tags */}
                    <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-y-1 pt-0.5 font-mono tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {presentCount} Present
                      </span>
                      {lateCount > 0 && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {lateCount} Late
                          </span>
                        </>
                      )}
                      {absentCount > 0 && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-red-500 dark:text-red-400 font-semibold flex items-center">
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            {absentCount} Absent
                          </span>
                        </>
                      )}
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center">
                        <Timer className="w-3.5 h-3.5 mr-1 text-[#0078d4]" />
                        Total Engagement: {formatMins(totalDurationMins)}
                      </span>
                    </div>
                  </div>

                  {/* Right Header Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {!isStudent && isUserAssociatedWithCourse && (
                      <>
                        {rec.sessionStatus === "live" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRollCallTab("terminal");
                              setShowRollCallModal(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
                          >
                            Roll Call / End Class
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTakeAttendanceModal(rec);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center cursor-pointer whitespace-nowrap"
                        >
                          Edit Roster
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!rec.id) return;
                            const targetId = rec.id;
                            setAlertConfig({
                              isOpen: true,
                              title: "Delete Attendance Session",
                              message: `Delete the attendance record for "${rec.sessionTitle || "Attendance Session"}" (${rec.date})? This action cannot be undone.`,
                              confirmText: "Yes, Delete Record",
                              type: "danger",
                              onConfirm: async () => {
                                await deleteAttendanceRecord(targetId);
                              },
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <span className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </div>
                </div>

                {/* Expanded Detailed Roster Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 p-4 sm:p-5">
                    {/* Instructor Engagement Banner if present */}
                    {rec.instructorEngagement && (
                      <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-amber-500" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            Instructor: {rec.instructorEngagement.instructorName}
                          </span>
                          {rec.instructorEngagement.participantType && (
                            <span className="px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                              {rec.instructorEngagement.participantType}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                          <span>
                            In: <strong>{rec.instructorEngagement.checkInTime || "N/A"}</strong>
                          </span>
                          <span>
                            Out:{" "}
                            <strong>
                              {rec.instructorEngagement.activeInClass && !rec.instructorEngagement.checkOutTime
                                ? "Teaching Now"
                                : rec.instructorEngagement.checkOutTime || "N/A"}
                            </strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold">
                            {formatMins(rec.instructorEngagement.durationMinutes)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-heading text-[10px] tracking-wider">
                            <th className="pb-2.5 font-bold">Participant</th>
                            <th className="pb-2.5 font-bold">Role &amp; Channel</th>
                            <th className="pb-2.5 font-bold">Status</th>
                            <th className="pb-2.5 font-bold">Check-In</th>
                            <th className="pb-2.5 font-bold">Check-Out</th>
                            <th className="pb-2.5 font-bold">Engagement Duration</th>
                            <th className="pb-2.5 font-bold">Notes / Timeline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-body">
                          {filteredEntries.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-4 text-center text-slate-400">
                                No participant records match filters.
                              </td>
                            </tr>
                          ) : (
                            filteredEntries.map((e, idx) => {
                              const isInstructor = e.role === "instructor";
                              const channel =
                                e.participantType ||
                                (e.method === "live_online" ? "online" : "offline");
                              return (
                                <tr key={e.id || idx} className="hover:bg-white dark:hover:bg-slate-800/40">
                                  <td className="py-2.5 pr-2 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                        isInstructor
                                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                          : "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                      }`}
                                    >
                                      {e.userName.slice(0, 1).toUpperCase()}
                                    </div>
                                    <span>{e.userName}</span>
                                  </td>
                                  <td className="py-2.5 pr-2">
                                    <div className="flex items-center space-x-1.5">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                          isInstructor
                                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                        }`}
                                      >
                                        {e.role}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          channel === "online"
                                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                            : "bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        {channel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-2">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                        e.status === "present"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                          : e.status === "late"
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                          : e.status === "excused"
                                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                      }`}
                                    >
                                      {e.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 pr-2 text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                                    {e.checkInTime || "--:--"}
                                  </td>
                                  <td className="py-2.5 pr-2 text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                                    {e.activeInClass && !e.checkOutTime
                                      ? "In Class"
                                      : e.checkOutTime || "--:--"}
                                  </td>
                                  <td className="py-2.5 pr-2 font-mono tabular-nums">
                                    <span className="font-extrabold text-[#0078d4] dark:text-[#04a4ec]">
                                      {formatMins(e.durationMinutes)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-1">
                                      ({e.durationMinutes || 0}m)
                                    </span>
                                  </td>
                                  <td className="py-2.5 pr-2 text-slate-500 dark:text-slate-400 text-[11px]">
                                    {e.movements && e.movements.length > 0 ? (
                                      <span className="font-mono text-[10px]">
                                        {e.movements
                                          .map((mv) => `${mv.time} ${mv.action === "in" ? "In" : "Out"}`)
                                          .join(" · ")}
                                      </span>
                                    ) : (
                                      <span className="italic">{e.notes || "--"}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Take / Edit Attendance Roster with Engagement Duration */}
      {showTakeAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Timer className="w-5 h-5 text-[#0078d4]" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white font-heading">
                  {editingRecord
                    ? `Edit Attendance & Engagement (${editingRecord.date})`
                    : activeMode === "online"
                    ? "Record Online Class Attendance"
                    : activeMode === "hybrid"
                    ? "Record Hybrid Class Attendance"
                    : "Take Physical Campus Attendance"}
                </h3>
              </div>
              <button
                onClick={() => setShowTakeAttendanceModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Settings Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shrink-0 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  value={formSessionTitle}
                  onChange={(e) => setFormSessionTitle(e.target.value)}
                  placeholder="e.g. Physical Lab Session"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0078d4]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0078d4]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {activeMode === "physical" ? "Campus Location / Hall" : "Online Room Identifier"}
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder={activeMode === "physical" ? "e.g. Science Block, Room 204" : "Live Room"}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0078d4]"
                />
              </div>
            </div>

            {/* Quick Bulk Setting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">Default Times:</span>
                <span className="text-slate-400">In:</span>
                <input
                  type="time"
                  value={formDefaultIn}
                  onChange={(e) => setFormDefaultIn(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <span className="text-slate-400">Out:</span>
                <input
                  type="time"
                  value={formDefaultOut}
                  onChange={(e) => setFormDefaultOut(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleApplyDefaultsToAll}
                  className="px-2.5 py-1 bg-[#0078d4]/10 hover:bg-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] font-bold rounded-lg transition"
                >
                  Apply to All
                </button>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Set All:</span>
                <button
                  type="button"
                  onClick={() => handleSetAllStatus("present")}
                  className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllStatus("late")}
                  className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded"
                >
                  All Late
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllStatus("absent")}
                  className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded"
                >
                  All Absent
                </button>
              </div>
            </div>

            {/* Roster Table with Individual Inputs */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-heading tracking-wider">
                  <tr>
                    <th className="p-3 font-bold">Participant</th>
                    <th className="p-3 font-bold">Role</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Check-In</th>
                    <th className="p-3 font-bold">Check-Out</th>
                    <th className="p-3 font-bold">Duration</th>
                    <th className="p-3 font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formEntries.map((e) => {
                    const isInstructor = e.role === "instructor";
                    return (
                      <tr key={e.userId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                                isInstructor
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                              }`}
                            >
                              {e.userName.slice(0, 1).toUpperCase()}
                            </span>
                            <span>{e.userName}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                              isInstructor
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                            }`}
                          >
                            {e.role}
                          </span>
                        </td>

                        <td className="p-3">
                          <select
                            value={e.status}
                            onChange={(ev) =>
                              handleUpdateEntry(e.userId, {
                                status: ev.target.value as AttendanceStatus,
                                durationMinutes: ev.target.value === "absent" ? 0 : e.durationMinutes,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none ${
                              e.status === "present"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                : e.status === "late"
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                : e.status === "excused"
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                            }`}
                          >
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                            <option value="excused">Excused</option>
                          </select>
                        </td>

                        <td className="p-3">
                          <input
                            type="time"
                            value={e.checkInTime || ""}
                            onChange={(ev) => handleUpdateEntry(e.userId, { checkInTime: ev.target.value })}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                          />
                        </td>

                        <td className="p-3">
                          <input
                            type="time"
                            value={e.checkOutTime || ""}
                            onChange={(ev) => handleUpdateEntry(e.userId, { checkOutTime: ev.target.value })}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                          />
                        </td>

                        <td className="p-3">
                          <div className="flex items-center space-x-1 font-mono">
                            <span className="font-extrabold text-[#0078d4] dark:text-[#04a4ec]">
                              {formatMins(e.durationMinutes)}
                            </span>
                            <span className="text-[10px] text-slate-400">({e.durationMinutes || 0}m)</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={e.notes || ""}
                            onChange={(ev) => handleUpdateEntry(e.userId, { notes: ev.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formEntries.length} Participants ({formEntries.filter((e) => e.role === "instructor").length} Instructors,{" "}
                {formEntries.filter((e) => e.role === "student").length} Students)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTakeAttendanceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="px-5 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold transition shadow-sm font-heading cursor-pointer"
                >
                  Save Attendance & Duration Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Roll Call Modal (Integrates Attendance Register & Roll Call Terminal) */}
      {showRollCallModal && (
        <ClassRollCallModal
          isOpen={showRollCallModal}
          onClose={() => setShowRollCallModal(false)}
          targetCourse={course}
          initialMode={activeMode === "all" ? "hybrid" : activeMode}
          initialTab={rollCallTab}
        />
      )}

      {/* Teacher Duty Terminal Modal */}
      {showDutyModal && (
        <TeacherDutyModal
          isOpen={showDutyModal}
          onClose={() => setShowDutyModal(false)}
          preselectedCourseId={course.id}
          preselectedCourseTitle={course.title}
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
