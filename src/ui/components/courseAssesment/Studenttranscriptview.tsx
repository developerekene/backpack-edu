import React, { useState } from "react";
import { Assessment, Submission } from "../../../types";
import { Award, Paperclip, X, CheckCircle2, Circle } from "lucide-react";
import { ProctoringSession } from "../ProctoringSession";
import { FileUpload } from "../FileUpload";
import { generateId } from "../../../lib/id";

function computeAutoGrade(
  ass: Assessment,
  answers: Record<string, string>,
): { autoGradedPoints: number; autoGradedMax: number; hasEssay: boolean } {
  const questions = ass.questions || [];
  let autoGradedPoints = 0;
  let autoGradedMax = 0;
  let hasEssay = false;

  questions.forEach((q) => {
    if (q.format === "essay") {
      hasEssay = true;
      return;
    }
    autoGradedMax += q.points || 0;
    const studentAnswer = answers[q.id];
    if (q.questionType === "multiple_choice") {
      const correctOpt = (q.options || []).find((o) => o.isCorrect);
      if (correctOpt && studentAnswer === correctOpt.id) {
        autoGradedPoints += q.points || 0;
      }
    } else if (q.questionType === "true_false") {
      if (studentAnswer === String(q.correctBoolean)) {
        autoGradedPoints += q.points || 0;
      }
    }
  });

  return { autoGradedPoints, autoGradedMax, hasEssay };
}

export function StudentTranscriptView({
  courseId,
  courseAssessments,
  courseSubmissions,
  currentUserId,
  addSubmission,
}: {
  courseId: string;
  courseAssessments: Assessment[];
  courseSubmissions: Submission[];
  currentUserId: string | undefined;
  addSubmission: (submission: Submission) => Promise<void> | void;
}) {
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFileUrl, setSubmissionFileUrl] = useState("");
  const [activeProctoringId, setActiveProctoringId] = useState<string | null>(
    null,
  );
  const [answersByAssessment, setAnswersByAssessment] = useState<
    Record<string, Record<string, string>>
  >({});

  const mySubmissions = courseSubmissions.filter(
    (s) => s.userId === currentUserId,
  );
  const totalScore = mySubmissions.reduce(
    (acc, sub) => acc + (sub.score || 0),
    0,
  );
  const totalMaxScore = courseAssessments.reduce(
    (acc, ass) => acc + ass.maxScore,
    0,
  );
  const gpa =
    totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 4.0).toFixed(2) : "N/A";

  const setAnswer = (
    assessmentId: string,
    questionId: string,
    value: string,
  ) => {
    setAnswersByAssessment((prev) => ({
      ...prev,
      [assessmentId]: { ...(prev[assessmentId] || {}), [questionId]: value },
    }));
  };

  const handleSubmitGenericAssessment = async (assessmentId: string) => {
    if (!currentUserId || (!submissionContent.trim() && !submissionFileUrl))
      return;
    const sub: Submission = {
      id: generateId("sub"),
      assessmentId,
      userId: currentUserId,
      courseId,
      submittedAt: new Date().toISOString(),
      content: submissionContent,
      fileUrl: submissionFileUrl,
      status: "submitted",
    };
    await addSubmission(sub);
    setSubmissionContent("");
    setSubmissionFileUrl("");
  };

  const handleSubmitQuestionAssessment = async (ass: Assessment) => {
    if (!currentUserId) return;
    const answers = answersByAssessment[ass.id] || {};
    const { autoGradedPoints, autoGradedMax, hasEssay } = computeAutoGrade(
      ass,
      answers,
    );

    const sub: Submission = {
      id: generateId("sub"),
      assessmentId: ass.id,
      userId: currentUserId,
      courseId,
      submittedAt: new Date().toISOString(),
      content: "",
      fileUrl: "",
      answers,
      autoGradedPoints,
      autoGradedMax,
      pendingEssayGrading: hasEssay,
      status: hasEssay ? "submitted" : "graded",
      score: hasEssay ? undefined : autoGradedPoints,
      feedback: hasEssay
        ? undefined
        : "Auto-graded — objective questions only.",
    };
    await addSubmission(sub);
    setActiveProctoringId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-900/40 p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center">
            <Award className="w-5 h-5 mr-2 text-amber-400" /> Academic
            Transcript
          </h3>
          <p className="text-sm text-indigo-200">
            Track your performance across assignments and exams.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalScore}{" "}
            <span className="text-lg text-indigo-300 font-medium">
              / {totalMaxScore}
            </span>
          </div>
          <div className="text-sm font-semibold text-emerald-400 mt-1">
            GPA Equivalent: {gpa}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {courseAssessments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            No assessments scheduled yet.
          </div>
        ) : (
          courseAssessments.map((ass) => {
            const sub = mySubmissions.find((s) => s.assessmentId === ass.id);
            const hasStructuredQuestions = (ass.questions || []).length > 0;
            const answers = answersByAssessment[ass.id] || {};

            return (
              <div
                key={ass.id}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                      {ass.title}
                      {ass.isGroup && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                          Group
                        </span>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{ass.type}</span>
                      {ass.subject && (
                        <>
                          <span>•</span>
                          <span>{ass.subject}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        Due: {new Date(ass.dueDate).toLocaleDateString()}
                      </span>
                      {ass.durationMinutes && (
                        <>
                          <span>•</span>
                          <span>{ass.durationMinutes} min</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Score: {ass.maxScore} pts</span>
                    </div>
                    {ass.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                        {ass.description}
                      </p>
                    )}
                  </div>
                  {sub ? (
                    <div className="flex flex-col items-end">
                      {sub.status === "graded" ? (
                        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-center mb-2">
                          <div className="text-xs uppercase font-bold tracking-wider mb-1">
                            Graded
                          </div>
                          <div className="font-black text-xl">
                            {sub.score}{" "}
                            <span className="text-sm text-emerald-500/70">
                              / {ass.maxScore}
                            </span>
                          </div>
                        </div>
                      ) : sub.pendingEssayGrading ? (
                        <div className="flex flex-col items-end mb-2">
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm font-semibold rounded-full border border-amber-500/20">
                            Essay Pending Review
                          </span>
                          {sub.autoGradedMax !== undefined &&
                            sub.autoGradedMax > 0 && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                {sub.autoGradedPoints}/{sub.autoGradedMax}{" "}
                                auto-graded so far
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm font-semibold rounded-full border border-amber-500/20 mb-2">
                          Pending Review
                        </span>
                      )}
                      {sub.fileUrl && (
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-sm text-indigo-400 hover:underline"
                        >
                          <Paperclip className="w-4 h-4 mr-1" /> My Attachment
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-full">
                      Not Submitted
                    </span>
                  )}
                </div>

                {!sub && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    {(ass.type === "exam" || ass.type === "test") &&
                    activeProctoringId !== ass.id ? (
                      <button
                        onClick={() => setActiveProctoringId(ass.id)}
                        className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white rounded-lg font-bold transition flex items-center justify-center"
                      >
                        Start Monitored Session
                      </button>
                    ) : hasStructuredQuestions ? (
                      <div className="space-y-4">
                        {(ass.type === "exam" || ass.type === "test") &&
                          activeProctoringId === ass.id && (
                            <ProctoringSession
                              assessmentTitle={ass.title}
                              onComplete={() => {}}
                            />
                          )}

                        <div className="space-y-4">
                          {(ass.questions || []).map((q, index) => (
                            <div
                              key={q.id}
                              className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                            >
                              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                                {index + 1}. {q.prompt}{" "}
                                <span className="text-xs font-normal text-slate-400">
                                  ({q.points} pts)
                                </span>
                              </p>

                              {q.format === "essay" ? (
                                <textarea
                                  value={answers[q.id] || ""}
                                  onChange={(e) =>
                                    setAnswer(ass.id, q.id, e.target.value)
                                  }
                                  rows={4}
                                  placeholder="Write your answer here"
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              ) : q.questionType === "true_false" ? (
                                <div className="flex items-center space-x-4">
                                  {[true, false].map((val) => (
                                    <button
                                      key={String(val)}
                                      type="button"
                                      onClick={() =>
                                        setAnswer(ass.id, q.id, String(val))
                                      }
                                      className="flex items-center space-x-1.5 text-sm font-medium"
                                    >
                                      {answers[q.id] === String(val) ? (
                                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                      )}
                                      <span className="text-slate-700 dark:text-slate-200">
                                        {val ? "True" : "False"}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(q.options || []).map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        setAnswer(ass.id, q.id, opt.id)
                                      }
                                      className="flex items-center space-x-2 text-sm w-full text-left"
                                    >
                                      {answers[q.id] === opt.id ? (
                                        <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                                      )}
                                      <span className="text-slate-700 dark:text-slate-200">
                                        {opt.text}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleSubmitQuestionAssessment(ass)}
                          disabled={
                            (ass.type === "exam" || ass.type === "test") &&
                            activeProctoringId !== ass.id
                          }
                          className="cursor-pointer w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold transition"
                        >
                          Submit Answers
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(ass.type === "exam" || ass.type === "test") &&
                          activeProctoringId === ass.id && (
                            <ProctoringSession
                              assessmentTitle={ass.title}
                              onComplete={() => setActiveProctoringId(null)}
                            />
                          )}
                        <div className="flex flex-col space-y-3">
                          {submissionFileUrl && (
                            <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
                              <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
                                Attached: Document
                              </span>
                              <button
                                onClick={() => setSubmissionFileUrl("")}
                                className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <div className="flex space-x-3">
                            <FileUpload
                              label=""
                              onUpload={(url) => setSubmissionFileUrl(url)}
                            />
                            <input
                              type="text"
                              value={submissionContent}
                              onChange={(e) =>
                                setSubmissionContent(e.target.value)
                              }
                              placeholder="Link to your work or text"
                              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => {
                                handleSubmitGenericAssessment(ass.id);
                                setActiveProctoringId(null);
                              }}
                              disabled={
                                (!submissionContent.trim() &&
                                  !submissionFileUrl) ||
                                ((ass.type === "exam" || ass.type === "test") &&
                                  activeProctoringId !== ass.id)
                              }
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-lg font-medium transition"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
