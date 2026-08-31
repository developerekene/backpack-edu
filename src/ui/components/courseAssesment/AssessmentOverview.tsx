import React from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { Assessment, Course, Submission } from "../../../types";

export const AssessmentsOverview: React.FC<{
  myCourses: Course[];
  assessments: Assessment[];
  submissions: Submission[];
}> = ({ myCourses, assessments, submissions }) => {
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const courseTitle = (courseId: string) =>
    myCourses.find((c) => c.id === courseId)?.title || "Unknown Course";

  const relevantAssessments = assessments.filter((a) =>
    myCourseIds.has(a.courseId),
  );

  const withCounts = relevantAssessments.map((a) => {
    const subs = submissions.filter((s) => s.assessmentId === a.id);
    const pendingGrading = subs.filter((s) => s.status !== "graded").length;
    return { assessment: a, totalSubmissions: subs.length, pendingGrading };
  });

  const totalPendingGrading = withCounts.reduce(
    (acc, w) => acc + w.pendingGrading,
    0,
  );

  const needsGrading = withCounts
    .filter((w) => w.pendingGrading > 0)
    .sort((a, b) => b.pendingGrading - a.pendingGrading)
    .slice(0, 5);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = relevantAssessments
    .filter((a) => a.dueDate && new Date(a.dueDate) >= today)
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, 5);

  if (relevantAssessments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          No Assessments Yet
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Create your first assignment, quiz, or exam from inside a course.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-indigo-500" />
            Assessments Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Submissions awaiting grading and upcoming due dates across your
            courses.
          </p>
        </div>
        <span className="px-3.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full shrink-0 self-start sm:self-auto border border-amber-500/20">
          {totalPendingGrading} Pending Grading
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-700/60">
        {/* Needs Grading */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center mb-4">
            <AlertCircle className="w-4 h-4 mr-1.5 text-amber-500" />
            Needs Grading
          </h3>
          {needsGrading.length === 0 ? (
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
              All caught up — nothing pending review.
            </div>
          ) : (
            <div className="space-y-2.5">
              {needsGrading.map(({ assessment, pendingGrading }) => (
                <Link
                  key={assessment.id}
                  to={`/course/${assessment.courseId}`}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {assessment.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {courseTitle(assessment.courseId)}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold rounded-full border border-amber-500/20">
                    {pendingGrading} pending
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Due Dates */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center mb-4">
            <CalendarClock className="w-4 h-4 mr-1.5 text-indigo-500" />
            Upcoming Due Dates
          </h3>
          {upcoming.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              No upcoming due dates scheduled.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((a) => (
                <Link
                  key={a.id}
                  to={`/course/${a.courseId}`}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">
                      {courseTitle(a.courseId)} • {a.type}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {new Date(a.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
