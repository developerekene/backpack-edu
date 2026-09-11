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
  addSubmission,
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
  addSubmission: (submission: Submission) => Promise<void> | void;
  addAssessment: (assessment: Assessment) => Promise<void> | void;
  instructorDefaultName?: string;
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>(
    {},
  );
  const [toggledSubIds, setToggledSubIds] = useState<Set<string>>(new Set());
  // Unsaved-in-this-render essay score edits, keyed by submission id then
  // question id. These layer on top of `sub.essayScores` (the persisted
  // values) so typing feels instant while saving still happens on blur.
  const [pendingEssayEdits, setPendingEssayEdits] = useState<
    Record<string, Record<string, number>>
  >({});
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(
    null,
  );
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(
    null,
  );

  const isExpandedFor = (sub: Submission) => {
    const defaultOpen = !!sub.pendingEssayGrading && sub.status !== "graded";
    const toggled = toggledSubIds.has(sub.id);
    return toggled ? !defaultOpen : defaultOpen;
  };
  const toggleExpand = (id: string) => {
    setToggledSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mergedEssayScores = (sub: Submission): Record<string, number> => ({
    ...(sub.essayScores || {}),
    ...(pendingEssayEdits[sub.id] || {}),
  });

  const updateEssayEdit = (
    subId: string,
    questionId: string,
    value: number,
  ) => {
    setPendingEssayEdits((prev) => ({
      ...prev,
      [subId]: { ...(prev[subId] || {}), [questionId]: value },
    }));
  };

  const essayTotalFor = (sub: Submission) =>
    Object.values(mergedEssayScores(sub)).reduce(
      (a, b) => a + (Number(b) || 0),
      0,
    );
  const combinedTotalFor = (sub: Submission) =>
    (sub.autoGradedPoints || 0) + essayTotalFor(sub);

  // Persist essay scores in progress without finalizing the grade. Called
  // on blur so a paused grading session isn't lost on refresh.
  const persistEssayProgress = async (sub: Submission) => {
    const merged = mergedEssayScores(sub);
    // Nothing to save yet, or nothing changed from what's already stored.
    if (JSON.stringify(merged) === JSON.stringify(sub.essayScores || {}))
      return;
    await addSubmission({ ...sub, essayScores: merged });
  };

  const handleSaveEssayGrade = async (sub: Submission) => {
    const merged = mergedEssayScores(sub);
    await addSubmission({ ...sub, essayScores: merged });
    await updateSubmissionScore(
      sub.id,
      combinedTotalFor(sub),
      "Graded by instructor",
    );
  };

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
                        const student = sub.userName
                          ? { name: sub.userName }
                          : orgMembers.find(
                              (m) =>
                                m.email === sub.userId || m.id === sub.userId,
                            ) || { name: "Unknown Student" };
                        const hasAnswers =
                          sub.answers && Object.keys(sub.answers).length > 0;
                        const isExpanded = isExpandedFor(sub);
                        const needsEssayGrading =
                          sub.pendingEssayGrading && sub.status !== "graded";

                        return (
                          <div
                            key={sub.id}
                            className="p-4 bg-white dark:bg-slate-800/50 rounded-lg"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="mb-1 sm:mb-0">
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                  {student.name}
                                  {needsEssayGrading && (
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
                                    onClick={() => toggleExpand(sub.id)}
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
                                ) : hasAnswers ? (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                    Score essay questions below
                                  </span>
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
                                      const currentEssayScore =
                                        mergedEssayScores(sub)[questionId] ??
                                        "";
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
                                          {sub.status !== "graded" ? (
                                            <div className="mt-2 flex items-center gap-2">
                                              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                Score:
                                              </label>
                                              <input
                                                type="number"
                                                min={0}
                                                max={q.points}
                                                value={currentEssayScore}
                                                onChange={(e) =>
                                                  updateEssayEdit(
                                                    sub.id,
                                                    questionId,
                                                    Number(e.target.value),
                                                  )
                                                }
                                                onBlur={() =>
                                                  persistEssayProgress(sub)
                                                }
                                                placeholder="0"
                                                className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm text-center outline-none focus:border-indigo-500"
                                              />
                                              <span className="text-xs text-slate-400">
                                                / {q.points}
                                              </span>
                                              {sub.essayScores?.[questionId] !==
                                                undefined && (
                                                <span className="text-[10px] text-slate-400 italic">
                                                  saved
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                              Included in final grade
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

                                {needsEssayGrading && (
                                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                      Objective: {sub.autoGradedPoints ?? 0}/
                                      {sub.autoGradedMax ?? 0} (auto) + Essay:{" "}
                                      {essayTotalFor(sub)} pts entered ={" "}
                                      <strong>
                                        {combinedTotalFor(sub)} / {ass.maxScore}
                                      </strong>
                                    </span>
                                    <button
                                      onClick={() => handleSaveEssayGrade(sub)}
                                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition shrink-0"
                                    >
                                      Save Grade
                                    </button>
                                  </div>
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
