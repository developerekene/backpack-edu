import React from "react";
import { X, CheckCircle2, Circle, Pencil } from "lucide-react";
import { Assessment } from "../../../types";

type OrgMember = { id?: string; email?: string; name: string };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">
        {label}
      </span>
      <span className="text-slate-800 dark:text-slate-200 font-medium text-right">
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function AssessmentPreviewModal({
  assessment,
  orgMembers,
  onClose,
  onEdit,
}: {
  assessment: Assessment;
  orgMembers: OrgMember[];
  onClose: () => void;
  onEdit?: () => void;
}) {
  const assignedNames =
    assessment.assignedStudentIds && assessment.assignedStudentIds.length > 0
      ? assessment.assignedStudentIds
          .map(
            (id) =>
              orgMembers.find((m) => m.id === id || m.email === id)?.name || id,
          )
          .join(", ")
      : "Whole class";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl my-8 shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {assessment.type}
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {assessment.title}
            </h2>
            {assessment.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                {assessment.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center border border-indigo-200 dark:border-indigo-800"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Basic Info">
              <Row label="Subject" value={assessment.subject} />
              <Row label="Class / Grade" value={assessment.gradeLevel} />
              <Row label="Instructor" value={assessment.instructorName} />
            </SectionCard>
            <SectionCard title="Scheduling">
              <Row
                label="Start Date"
                value={
                  assessment.startDate
                    ? new Date(assessment.startDate).toLocaleDateString()
                    : undefined
                }
              />
              <Row
                label="Due Date"
                value={new Date(assessment.dueDate).toLocaleDateString()}
              />
              <Row label="Start Time" value={assessment.startTime} />
              <Row label="End Time" value={assessment.endTime} />
              <Row
                label="Duration"
                value={
                  assessment.durationMinutes
                    ? `${assessment.durationMinutes} min`
                    : undefined
                }
              />
            </SectionCard>
            <SectionCard title="Grading">
              <Row label="Maximum Score" value={`${assessment.maxScore} pts`} />
              <Row label="Passing Score" value={assessment.passingScore} />
              <Row label="Grading Type" value={assessment.gradingType} />
              <Row
                label="Weight"
                value={
                  assessment.weight !== undefined
                    ? `${assessment.weight}%`
                    : undefined
                }
              />
            </SectionCard>
            <SectionCard title="Student & Group">
              <Row label="Assigned To" value={assignedNames} />
              <Row
                label="Group Assessment"
                value={assessment.isGroup ? "Yes" : undefined}
              />
              <Row label="Group Size" value={assessment.groupSize} />
              <Row
                label="Randomize Questions"
                value={assessment.randomizeQuestions ? "Yes" : undefined}
              />
              <Row
                label="Multiple Attempts"
                value={
                  assessment.allowMultipleAttempts
                    ? `Yes (max ${assessment.maxAttempts ?? "unlimited"})`
                    : undefined
                }
              />
            </SectionCard>
            <SectionCard title="Submission">
              <Row label="Method" value={assessment.submissionMethod} />
              <Row
                label="Allowed File Types"
                value={assessment.allowedFileTypes?.join(", ")}
              />
              <Row
                label="Max File Size"
                value={
                  assessment.maxFileSizeMb
                    ? `${assessment.maxFileSizeMb} MB`
                    : undefined
                }
              />
              <Row
                label="Allow Resubmission"
                value={assessment.allowResubmission ? "Yes" : undefined}
              />
              <Row
                label="Require Comments"
                value={assessment.requireStudentComments ? "Yes" : undefined}
              />
            </SectionCard>
            <SectionCard title="Results & Feedback">
              <Row
                label="Show Score Immediately"
                value={assessment.showScoreImmediately ? "Yes" : "No"}
              />
              <Row
                label="Release Date"
                value={
                  assessment.releaseResultsDate
                    ? new Date(
                        assessment.releaseResultsDate,
                      ).toLocaleDateString()
                    : undefined
                }
              />
              <Row
                label="Show Correct Answers"
                value={assessment.showCorrectAnswers ? "Yes" : undefined}
              />
              <Row
                label="Student Review Session"
                value={assessment.allowStudentReview ? "Yes" : undefined}
              />
            </SectionCard>
          </div>

          {assessment.referenceMaterials && (
            <SectionCard title="Reference Materials">
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                {assessment.referenceMaterials}
              </p>
            </SectionCard>
          )}

          {assessment.attachments && assessment.attachments.length > 0 && (
            <SectionCard title="Attachments">
              <ul className="space-y-1">
                {assessment.attachments.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {assessment.questions && assessment.questions.length > 0 && (
            <SectionCard title={`Questions (${assessment.questions.length})`}>
              <div className="space-y-3">
                {assessment.questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {index + 1}. {q.prompt || "(no prompt entered)"}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ({q.points} pts,{" "}
                        {q.format === "essay" ? "essay" : "auto-graded"})
                      </span>
                    </p>

                    {q.format === "essay" ? (
                      q.rubric && (
                        <p className="text-xs text-slate-400 italic mt-1">
                          Grading notes: {q.rubric}
                        </p>
                      )
                    ) : q.questionType === "multiple_choice" ? (
                      <div className="mt-2 space-y-1">
                        {(q.options || []).map((opt) => (
                          <div
                            key={opt.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            {opt.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                            <span
                              className={
                                opt.isCorrect
                                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                  : "text-slate-600 dark:text-slate-300"
                              }
                            >
                              {opt.text || "(empty option)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Correct answer:{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {q.correctBoolean ? "True" : "False"}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
