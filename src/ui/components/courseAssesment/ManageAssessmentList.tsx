import React, { useState } from "react";
import { Assessment, Submission } from "../../../types";
import {
  Paperclip,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
} from "lucide-react";
import { CreateAssessmentForm } from "./Createassessmentform";
import { AssessmentPreviewModal } from "./Assessmentpreviewmodal";

type OrgMember = { id?: string; email?: string; name: string };

export function ManageAssessmentsList({
  courseAssessments,
  courseSubmissions,
  orgMembers,
  updateSubmissionScore,
  addAssessment,
  instructorDefaultName,
}: {
  courseAssessments: Assessment[];
  courseSubmissions: Submission[];
  orgMembers: OrgMember[];
  updateSubmissionScore: (
    submissionId: string,
    score: number,
    note: string,
  ) => Promise<void> | void;
  addAssessment: (assessment: Assessment) => Promise<void> | void;
  instructorDefaultName?: string;
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>(
    {},
  );
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(
    null,
  );
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(
    null,
  );

  const scoreFor = (sub: Submission) =>
    gradingScores[sub.id] !== undefined
      ? gradingScores[sub.id]
      : sub.autoGradedPoints !== undefined
        ? sub.autoGradedPoints
        : ("" as unknown as number);

  const handleGradeSubmission = async (sub: Submission) => {
    const score =
      gradingScores[sub.id] !== undefined
        ? gradingScores[sub.id]
        : sub.autoGradedPoints || 0;
    await updateSubmissionScore(sub.id, score, "Graded by instructor");
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
          const questionsById = new Map(
            (ass.questions || []).map((q) => [q.id, q]),
          );

          return (
            <div
              key={ass.id}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewAssessment(ass)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center border border-slate-200 dark:border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
                  </button>
                  <button
                    onClick={() => setEditingAssessment(ass)}
                    className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold transition flex items-center border border-indigo-200 dark:border-indigo-800"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </button>
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
                        const hasAnswers =
                          sub.answers && Object.keys(sub.answers).length > 0;
                        const isExpanded = expandedSubId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            className="p-4 bg-white dark:bg-slate-800/50 rounded-lg"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="mb-1 sm:mb-0">
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                  {student.name}
                                  {sub.pendingEssayGrading &&
                                    sub.status !== "graded" && (
                                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                                        Essay Pending
                                      </span>
                                    )}
                                  {sub.feedback ===
                                    "Auto-graded — objective questions only." && (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                                      Auto-graded
                                    </span>
                                  )}
                                </div>
                                {sub.content && (
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
                                )}
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
                                {sub.autoGradedMax !== undefined &&
                                  sub.autoGradedMax > 0 && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                      Objective: {sub.autoGradedPoints}/
                                      {sub.autoGradedMax} pts auto-graded
                                    </p>
                                  )}
                                {hasAnswers && (
                                  <button
                                    onClick={() =>
                                      setExpandedSubId(
                                        isExpanded ? null : sub.id,
                                      )
                                    }
                                    className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5 mr-1" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    {isExpanded
                                      ? "Hide Answers"
                                      : "View Answers"}
                                  </button>
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
                                      value={scoreFor(sub)}
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
                                      onClick={() => handleGradeSubmission(sub)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded text-sm font-bold transition"
                                    >
                                      Grade
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isExpanded && hasAnswers && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                                {Object.entries(sub.answers || {}).map(
                                  ([questionId, answer]) => {
                                    const q = questionsById.get(questionId);
                                    if (!q) return null;

                                    if (q.format === "essay") {
                                      return (
                                        <div
                                          key={questionId}
                                          className="text-sm"
                                        >
                                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                                            {q.prompt}{" "}
                                            <span className="text-xs font-normal text-slate-400">
                                              ({q.points} pts, essay)
                                            </span>
                                          </p>
                                          <p className="mt-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 whitespace-pre-wrap">
                                            {answer || "(no answer provided)"}
                                          </p>
                                          {q.rubric && (
                                            <p className="mt-1 text-xs text-slate-400 italic">
                                              Grading notes: {q.rubric}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    }

                                    let isCorrect = false;
                                    let answerLabel = answer;
                                    if (q.questionType === "multiple_choice") {
                                      const chosen = (q.options || []).find(
                                        (o) => o.id === answer,
                                      );
                                      const correct = (q.options || []).find(
                                        (o) => o.isCorrect,
                                      );
                                      isCorrect =
                                        !!chosen && chosen.isCorrect === true;
                                      answerLabel = chosen
                                        ? chosen.text
                                        : "(no answer)";
                                      return (
                                        <div
                                          key={questionId}
                                          className="text-sm flex items-start gap-2"
                                        >
                                          {isCorrect ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                          )}
                                          <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                              {q.prompt}{" "}
                                              <span className="text-xs font-normal text-slate-400">
                                                ({q.points} pts)
                                              </span>
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-300">
                                              Answered: {answerLabel}
                                              {!isCorrect && correct && (
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                  {" "}
                                                  • Correct: {correct.text}
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    }

                                    // true_false
                                    isCorrect =
                                      answer === String(q.correctBoolean);
                                    answerLabel =
                                      answer === "true" ? "True" : "False";
                                    return (
                                      <div
                                        key={questionId}
                                        className="text-sm flex items-start gap-2"
                                      >
                                        {isCorrect ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        )}
                                        <div>
                                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                                            {q.prompt}{" "}
                                            <span className="text-xs font-normal text-slate-400">
                                              ({q.points} pts)
                                            </span>
                                          </p>
                                          <p className="text-slate-600 dark:text-slate-300">
                                            Answered: {answerLabel}
                                            {!isCorrect && (
                                              <span className="text-emerald-600 dark:text-emerald-400">
                                                {" "}
                                                • Correct:{" "}
                                                {q.correctBoolean
                                                  ? "True"
                                                  : "False"}
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
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

      {previewAssessment && (
        <AssessmentPreviewModal
          assessment={previewAssessment}
          orgMembers={orgMembers}
          onClose={() => setPreviewAssessment(null)}
          onEdit={() => {
            setEditingAssessment(previewAssessment);
            setPreviewAssessment(null);
          }}
        />
      )}

      {editingAssessment && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl my-8">
            <CreateAssessmentForm
              key={editingAssessment.id}
              courseId={editingAssessment.courseId}
              orgMembers={orgMembers}
              instructorDefaultName={instructorDefaultName}
              addAssessment={addAssessment}
              initialAssessment={editingAssessment}
              onCancel={() => setEditingAssessment(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
