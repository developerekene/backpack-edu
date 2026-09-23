import React, { useState } from 'react';
import { Course, AdmissionSession, EnrollmentRequest } from '../../types';
import { useAppContext } from '../../store/AppContext';
import {
  X,
  Plus,
  Calendar,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Users,
  ShieldCheck
} from 'lucide-react';

interface AdmissionSessionManagerModalProps {
  course: Course;
  enrollmentRequests?: EnrollmentRequest[];
  onClose: () => void;
}

export const AdmissionSessionManagerModal: React.FC<AdmissionSessionManagerModalProps> = ({
  course,
  enrollmentRequests = [],
  onClose,
}) => {
  const {
    openCourseAdmission,
    closeCourseAdmission,
    createCourseAdmissionSession,
    updateCourseAdmissionSession,
  } = useAppContext();

  const [isCreating, setIsCreating] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [academicYear, setAcademicYear] = useState(() => {
    const year = new Date().getFullYear();
    return `${year}/${year + 1}`;
  });
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [autoOpen, setAutoOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const sessions = course.admissionSessions || [];
  const isOpen = course.admissionStatus === 'open';
  const activeSessionId = course.activeSessionId || sessions[0]?.id;
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleToggleCurrentAdmission = async () => {
    setLoading(true);
    try {
      if (isOpen) {
        await closeCourseAdmission(course.id);
        setActionSuccessMsg('Course admission has been closed.');
      } else {
        await openCourseAdmission(course.id, activeSession?.id);
        setActionSuccessMsg('Course admission has been opened for the session.');
      }
      setTimeout(() => setActionSuccessMsg(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;

    setLoading(true);
    try {
      await createCourseAdmissionSession(course.id, {
        name: sessionName.trim(),
        academicYear: academicYear.trim(),
        startDate: startDate || undefined,
        applicationDeadline: applicationDeadline || undefined,
        notes: sessionNotes.trim() || undefined,
        autoOpen,
      });

      setIsCreating(false);
      setSessionName('');
      setApplicationDeadline('');
      setSessionNotes('');
      setActionSuccessMsg(
        autoOpen
          ? `Created & opened admission for "${sessionName.trim()}"!`
          : `Created session "${sessionName.trim()}".`
      );
      setTimeout(() => setActionSuccessMsg(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSessionStatus = async (session: AdmissionSession) => {
    setLoading(true);
    try {
      if (session.status === 'open') {
        await updateCourseAdmissionSession(course.id, session.id, {
          status: 'closed',
          closedAt: new Date().toISOString(),
        });
        if (course.activeSessionId === session.id) {
          await closeCourseAdmission(course.id);
        }
        setActionSuccessMsg(`Closed admission for "${session.name}".`);
      } else {
        await openCourseAdmission(course.id, session.id);
        setActionSuccessMsg(`Opened and activated admission for "${session.name}".`);
      }
      setTimeout(() => setActionSuccessMsg(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const getSessionApplicantCount = (sessionId?: string, sessionName?: string) => {
    return enrollmentRequests.filter(
      (r) =>
        r.courseId === course.id &&
        ((sessionId && r.sessionId === sessionId) ||
          (sessionName && r.sessionName === sessionName) ||
          (!r.sessionId && sessionId === activeSessionId))
    ).length;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 my-6">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Admission Sessions & Intakes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage enrollment periods, open or close intake sessions for{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {course.title}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {actionSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-semibold flex items-center animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Quick Admission State Master Card */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isOpen
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Admission Status
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isOpen
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}
                  >
                    {isOpen ? 'ADMISSIONS OPEN' : 'ADMISSIONS CLOSED'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isOpen
                    ? `Currently Accepting Applications for ${
                        activeSession?.name || course.activeSessionName || 'Current Session'
                      }`
                    : `Course Enrollments are Currently Closed`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isOpen
                    ? 'Students can browse, submit documents, and apply for this session.'
                    : 'Students cannot submit new applications until you open or launch a new session.'}
                </p>
              </div>

              <button
                onClick={handleToggleCurrentAdmission}
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 shadow-sm ${
                  isOpen
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                {isOpen ? (
                  <>
                    <ToggleRight className="w-4 h-4 mr-1.5" /> Close Admission Now
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 mr-1.5" /> Open Admission
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Create New Session Form or Button */}
          {!isCreating ? (
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Admission Sessions & Intake Batches
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Create distinct intake sessions so rejected applicants can reapply in subsequent
                  batches.
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> New Session
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleCreateSession}
              className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-900/40">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500" />
                  Launch Next Admission Session
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Session / Intake Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g. 2026/2027 Session, Fall 2026 Intake"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Year / Period
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026/2027"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Application Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Session Notes / Special Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="e.g. Priority review for early applicants; all documents required"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="autoOpenSession"
                  checked={autoOpen}
                  onChange={(e) => setAutoOpen(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label
                  htmlFor="autoOpenSession"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer"
                >
                  Immediately open admissions for this new session (closes any previous active intake)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !sessionName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {loading ? 'Creating...' : 'Create & Save Session'}
                </button>
              </div>
            </form>
          )}

          {/* Session List */}
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No individual admission sessions logged yet. When you open admissions, Backpack
                  will automatically record the active academic session.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                >
                  + Add First Session
                </button>
              </div>
            ) : (
              sessions.map((session) => {
                const isSessionOpen = session.status === 'open';
                const isActive = course.activeSessionId === session.id;
                const count = getSessionApplicantCount(session.id, session.name);

                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive && isSessionOpen
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : isSessionOpen
                        ? 'bg-slate-50 dark:bg-slate-800/80 border-indigo-200 dark:border-indigo-900'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 opacity-90'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {session.name}
                        </h4>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold">
                            Current Active Intake
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSessionOpen
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isSessionOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-3 flex-wrap">
                        {session.startDate && (
                          <span>Started: {new Date(session.startDate).toLocaleDateString()}</span>
                        )}
                        {session.applicationDeadline && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Deadline: {new Date(session.applicationDeadline).toLocaleDateString()}
                          </span>
                        )}
                        {session.closedAt && (
                          <span>
                            Closed on: {new Date(session.closedAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
                          <Users className="w-3 h-3 mr-1" /> {count} Applicants
                        </span>
                      </div>

                      {session.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                          "{session.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleToggleSessionStatus(session)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center ${
                          isSessionOpen
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isSessionOpen ? 'Close Session' : 'Re-open & Activate'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Information box on Reapplication Policy */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-indigo-500" />
              Student Reapplication Rules
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When students are declined in one admission session, Backpack allows them to reapply in
              the next open session. Closing an old session and launching a new one gives past
              applicants a fresh opportunity to submit updated qualifications and statements.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
