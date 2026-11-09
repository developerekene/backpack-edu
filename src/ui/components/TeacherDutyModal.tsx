import React, { useState } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { TeacherDutyType } from "../../types";
import {
  Clock,
  CheckCircle2,
  X,
  Building2,
  Video,
  Briefcase,
  UserCheck,
  MapPin,
  AlertCircle,
  Timer,
} from "lucide-react";

interface TeacherDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTeacherId?: string;
  preselectedCourseId?: string;
  preselectedCourseTitle?: string;
}

export const TeacherDutyModal: React.FC<TeacherDutyModalProps> = ({
  isOpen,
  onClose,
  preselectedTeacherId,
  preselectedCourseId,
  preselectedCourseTitle,
}) => {
  const { currentUser } = useAuth();
  const {
    teacherDutyRecords,
    checkInTeacherDuty,
    checkOutTeacherDuty,
    orgMembers,
    courses,
    organizations,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"checkin" | "checkout" | "history">("checkin");

  // Check-In Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    preselectedTeacherId || currentUser?.id || ""
  );
  const [dutyMode, setDutyMode] = useState<"physical" | "online">("physical");
  const [dutyType, setDutyType] = useState<TeacherDutyType>("teaching");
  const [location, setLocation] = useState<string>("Campus Block A - Faculty Room");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(preselectedCourseId || "");
  const [workNotes, setWorkNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Check-Out Form State
  const [checkOutDutyId, setCheckOutDutyId] = useState<string>("");
  const [checkOutNotes, setCheckOutNotes] = useState<string>("");

  if (!isOpen) return null;

  // Resolve organization ID
  const userOrg = organizations.find(
    (o) =>
      o.ownerId === currentUser?.id ||
      o.id === currentUser?.id ||
      (o.adminUserIds && currentUser?.id && o.adminUserIds.includes(currentUser.id))
  );
  const resolvedOrgId = userOrg?.id || currentUser?.id || "org_default";

  // List of teachers available
  const availableTeachers = (() => {
    const list: Array<{ id: string; name: string; email?: string }> = [];
    if (currentUser?.role === "instructor") {
      list.push({ id: currentUser.id, name: currentUser.name, email: currentUser.email });
    }
    orgMembers
      .filter((m) => m.role === "instructor" && (m.orgId === resolvedOrgId || !m.orgId))
      .forEach((inst) => {
        if (!list.some((t) => t.id === inst.userId || t.id === inst.id)) {
          list.push({
            id: inst.userId || inst.id,
            name: inst.name,
            email: inst.email,
          });
        }
      });
    courses.forEach((c) => {
      if (c.instructorId && c.instructorName && !list.some((t) => t.id === c.instructorId)) {
        list.push({ id: c.instructorId, name: c.instructorName });
      }
    });
    if (list.length === 0 && currentUser) {
      list.push({ id: currentUser.id, name: currentUser.name, email: currentUser.email });
    }
    return list;
  })();

  // Filter on-duty records for checkout
  const activeDutyRecords = teacherDutyRecords.filter((r) => r.status === "on_duty");

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setNotification({ type: "error", message: "Please select an instructor to check in." });
      return;
    }

    const teacherObj = availableTeachers.find((t) => t.id === selectedTeacherId);
    const teacherName = teacherObj?.name || currentUser?.name || "Faculty Instructor";
    const courseObj = courses.find((c) => c.id === selectedCourseId);

    setIsSubmitting(true);
    setNotification(null);

    try {
      await checkInTeacherDuty({
        teacherId: selectedTeacherId,
        teacherName,
        teacherEmail: teacherObj?.email,
        orgId: resolvedOrgId,
        mode: dutyMode,
        location: location.trim() || (dutyMode === "online" ? "Virtual Academic Station" : "Main Campus Station"),
        dutyType,
        workNotes: workNotes.trim(),
        courseId: selectedCourseId || undefined,
        courseTitle: courseObj?.title || preselectedCourseTitle || undefined,
      });

      setNotification({
        type: "success",
        message: `${teacherName} successfully checked IN for duty (${dutyMode === "physical" ? "Physical Campus" : "Online Virtual"}). Work shift active.`,
      });
      setWorkNotes("");
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: "error", message: "Failed to record duty check-in. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkOutDutyId) {
      setNotification({ type: "error", message: "Please select an active duty shift to check out." });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      await checkOutTeacherDuty(checkOutDutyId, checkOutNotes.trim());
      setNotification({
        type: "success",
        message: "Duty shift completed. Total work hours and shift logs recorded to school records.",
      });
      setCheckOutDutyId("");
      setCheckOutNotes("");
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: "error", message: "Failed to check out duty shift. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0078d4]/10 dark:bg-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center border border-[#0078d4]/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Duty Timesheet Register
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official staff timekeeping for physical campus shifts and online academic hours
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab("checkin")}
            className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center space-x-1.5 ${
              activeTab === "checkin"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Check In for Duty</span>
          </button>
          <button
            onClick={() => setActiveTab("checkout")}
            className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center space-x-1.5 ${
              activeTab === "checkout"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Check Out ({activeDutyRecords.length} On Duty)</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center space-x-1.5 ${
              activeTab === "history"
                ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Recent Duty Logs</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {notification && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center space-x-3 border ${
                notification.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-500/20"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          )}

          {activeTab === "checkin" && (
            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Teacher / Faculty Staff Member
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                >
                  <option value="">Select Instructor...</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.email ? `(${t.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duty Environment / Mode */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDutyMode("physical");
                    setLocation("Campus Block A - Faculty Room");
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition ${
                    dutyMode === "physical"
                      ? "border-[#0078d4] bg-[#0078d4]/5 dark:bg-[#0078d4]/10 text-slate-900 dark:text-white"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className={`p-2 rounded-xl ${dutyMode === "physical" ? "bg-[#0078d4] text-white" : "bg-slate-100 dark:bg-slate-700"}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Physical Campus</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      On-site classrooms, faculty office, laboratory
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDutyMode("online");
                    setLocation("Virtual Academic Station");
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition ${
                    dutyMode === "online"
                      ? "border-[#0078d4] bg-[#0078d4]/5 dark:bg-[#0078d4]/10 text-slate-900 dark:text-white"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className={`p-2 rounded-xl ${dutyMode === "online" ? "bg-[#0078d4] text-white" : "bg-slate-100 dark:bg-slate-700"}`}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Online Remote</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Live video lectures, virtual office hours
                    </p>
                  </div>
                </button>
              </div>

              {/* Duty Task Type & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Duty Type
                  </label>
                  <select
                    value={dutyType}
                    onChange={(e) => setDutyType(e.target.value as TeacherDutyType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                  >
                    <option value="teaching">Lecture & Teaching Hours</option>
                    <option value="lab_supervision">Laboratory Supervision</option>
                    <option value="office_hours">Student Consultation / Office Hours</option>
                    <option value="grading">Grading, Assessments & Planning</option>
                    <option value="department_duty">Department / Faculty Administration</option>
                    <option value="general_duty">General School Duty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Location / Workstation
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={dutyMode === "physical" ? "e.g. Science Block Room 102" : "e.g. Virtual Room"}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Course / Cohort Association */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Associated Course / Cohort (Optional)
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                >
                  <option value="">General Institutional Duty (No Specific Course)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Work / Duty Objectives (Optional)
                </label>
                <textarea
                  rows={2}
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="e.g. Delivering Module 3 Live Seminar & hosting student tutoring session"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs shadow-md shadow-[#0078d4]/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                <span>{isSubmitting ? "Recording Check-In..." : "Clock In for Duty Now"}</span>
              </button>
            </form>
          )}

          {activeTab === "checkout" && (
            <form onSubmit={handleCheckOutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Active On-Duty Shift
                </label>
                {activeDutyRecords.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 text-xs">
                    No faculty members are currently on active duty shift. Use the Check In tab to clock in.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeDutyRecords.map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-start space-x-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                          checkOutDutyId === r.id
                            ? "border-[#0078d4] bg-[#0078d4]/5 dark:bg-[#0078d4]/10 text-slate-900 dark:text-white"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkoutShift"
                          checked={checkOutDutyId === r.id}
                          onChange={() => setCheckOutDutyId(r.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{r.teacherName}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase">
                              Active since {r.checkInTime}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-2 text-[11px]">
                            <span>{r.mode === "physical" ? "Campus" : "Online"}</span>
                            <span>•</span>
                            <span className="capitalize">{r.dutyType.replace("_", " ")}</span>
                            {r.location && (
                              <>
                                <span>•</span>
                                <span>{r.location}</span>
                              </>
                            )}
                            {r.courseTitle && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-[#0078d4]">{r.courseTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {activeDutyRecords.length > 0 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Shift Wrap-Up & Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={checkOutNotes}
                      onChange={(e) => setCheckOutNotes(e.target.value)}
                      placeholder="Summary of work completed during this duty shift..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0078d4]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !checkOutDutyId}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isSubmitting ? "Concluding Shift..." : "Conclude Shift & Clock Out"}</span>
                  </button>
                </>
              )}
            </form>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {teacherDutyRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  No duty shift records logged yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {teacherDutyRecords.slice(0, 15).map((r) => {
                    const hours = r.totalMinutes ? (r.totalMinutes / 60).toFixed(1) : "—";
                    return (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white">{r.teacherName}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                r.status === "on_duty"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {r.status === "on_duty" ? "On Duty" : "Completed"}
                            </span>
                            <span className="text-[11px] text-slate-400">{r.date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
                            <span>{r.mode === "physical" ? "Campus" : "Online"}</span>
                            <span>•</span>
                            <span className="capitalize">{r.dutyType.replace("_", " ")}</span>
                            <span>•</span>
                            <span>
                              {r.checkInTime} — {r.checkOutTime || "Ongoing"}
                            </span>
                            {r.location && (
                              <>
                                <span>•</span>
                                <span>{r.location}</span>
                              </>
                            )}
                          </div>
                          {r.workNotes && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                              "{r.workNotes}"
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                            {hours} hrs
                          </span>
                          <span className="block text-[10px] text-slate-400">Total Work Logged</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
