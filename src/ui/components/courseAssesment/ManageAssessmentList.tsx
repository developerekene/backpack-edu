import React, { useState } from "react";
import { Assessment, Submission } from "../../../types";
import { Paperclip } from "lucide-react";

type OrgMember = { id?: string; email?: string; name: string };

export function ManageAssessmentsList({
  courseAssessments,
  courseSubmissions,
  orgMembers,
  updateSubmissionScore,
}: {
  courseAssessments: Assessment[];
  courseSubmissions: Submission[];
  orgMembers: OrgMember[];
  updateSubmissionScore: (
    submissionId: string,
    score: number,
    note: string,
  ) => Promise<void> | void;
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>(
    {},
  );

  const handleGradeSubmission = async (submissionId: string) => {
    const score = gradingScores[submissionId] || 0;
    await updateSubmissionScore(submissionId, score, "Graded by instructor");
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
        Manage Assessments
      </h3>
      {courseAssessments.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 dark:text-slate-400">
          No assessments created yet.
        </div>
      ) : (
        courseAssessments.map((ass) => {
          const subs = courseSubmissions.filter(
            (s) => s.assessmentId === ass.id,
          );
          const isGrading = selectedAssessmentId === ass.id;

          return (
            <div
              key={ass.id}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                    {ass.title}
                    {ass.isGroup && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                        Group
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                    {ass.type}
                    {ass.subject ? ` • ${ass.subject}` : ""}
                    {ass.gradeLevel ? ` • ${ass.gradeLevel}` : ""} • Max:{" "}
                    {ass.maxScore} pts • Due:{" "}
                    {new Date(ass.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedAssessmentId(isGrading ? null : ass.id)
                  }
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition"
                >
                  {isGrading
                    ? "Close Submissions"
                    : `View ${subs.length} Submissions`}
                </button>
              </div>

              {isGrading && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  {subs.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">
                      No submissions yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {subs.map((sub) => {
                        const student = orgMembers.find(
                          (m) => m.email === sub.userId || m.id === sub.userId,
                        ) || { name: "Unknown Student" };
                        return (
                          <div
                            key={sub.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-lg"
                          >
                            <div className="mb-3 sm:mb-0">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {student.name}
                              </div>
                              <div className="text-sm text-indigo-400 truncate max-w-xs">
                                <a
                                  href={sub.content}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {sub.content}
                                </a>
                              </div>
                              {sub.fileUrl && (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center text-sm text-indigo-400 hover:underline mt-1"
                                >
                                  <Paperclip className="w-4 h-4 mr-1" /> View
                                  Attachment
                                </a>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              {sub.status === "graded" ? (
                                <div className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                  {sub.score} / {ass.maxScore}
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    max={ass.maxScore}
                                    value={gradingScores[sub.id] || ""}
                                    onChange={(e) =>
                                      setGradingScores({
                                        ...gradingScores,
                                        [sub.id]: Number(e.target.value),
                                      })
                                    }
                                    placeholder="Score"
                                    className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center"
                                  />
                                  <button
                                    onClick={() =>
                                      handleGradeSubmission(sub.id)
                                    }
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded text-sm font-bold transition"
                                  >
                                    Grade
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
