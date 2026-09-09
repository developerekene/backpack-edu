import React from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { AssessmentQuestion, AssessmentQuestionOption } from "../../../types";
import { generateId } from "../../../lib/id";
import { inputClass, Field } from "./Formprimitives";

const formatBadgeClass = (format: "objective" | "essay") =>
  format === "objective"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";

function newQuestion(format: "objective" | "essay"): AssessmentQuestion {
  if (format === "essay") {
    return {
      id: generateId("q"),
      format: "essay",
      questionType: "essay",
      prompt: "",
      points: 10,
      rubric: "",
    };
  }
  return {
    id: generateId("q"),
    format: "objective",
    questionType: "multiple_choice",
    prompt: "",
    points: 5,
    options: [
      { id: generateId("opt"), text: "", isCorrect: true },
      { id: generateId("opt"), text: "", isCorrect: false },
    ],
  };
}

function convertFormat(
  q: AssessmentQuestion,
  format: "objective" | "essay",
): AssessmentQuestion {
  const base = newQuestion(format);
  return { ...base, id: q.id, prompt: q.prompt, points: q.points };
}

export function QuestionBuilder({
  questions,
  onChange,
  targetMaxScore,
  onSyncMaxScore,
}: {
  questions: AssessmentQuestion[];
  onChange: (questions: AssessmentQuestion[]) => void;
  targetMaxScore: number;
  onSyncMaxScore: (total: number) => void;
}) {
  const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);

  const updateQuestion = (id: string, updates: Partial<AssessmentQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const addQuestion = (format: "objective" | "essay") => {
    onChange([...questions, newQuestion(format)]);
  };

  const setFormat = (id: string, format: "objective" | "essay") => {
    onChange(
      questions.map((q) => (q.id === id ? convertFormat(q, format) : q)),
    );
  };

  const setObjectiveType = (
    id: string,
    questionType: "multiple_choice" | "true_false",
  ) => {
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q;
        if (questionType === "true_false") {
          return {
            ...q,
            questionType,
            options: undefined,
            correctBoolean: q.correctBoolean ?? true,
          };
        }
        return {
          ...q,
          questionType,
          correctBoolean: undefined,
          options:
            q.options && q.options.length > 0
              ? q.options
              : [
                  { id: generateId("opt"), text: "", isCorrect: true },
                  { id: generateId("opt"), text: "", isCorrect: false },
                ],
        };
      }),
    );
  };

  const addOption = (questionId: string) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...(q.options || []),
                { id: generateId("opt"), text: "", isCorrect: false },
              ],
            }
          : q,
      ),
    );
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    updates: Partial<AssessmentQuestionOption>,
  ) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: (q.options || []).map((o) =>
                o.id === optionId ? { ...o, ...updates } : o,
              ),
            }
          : q,
      ),
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: (q.options || []).filter((o) => o.id !== optionId),
            }
          : q,
      ),
    );
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: (q.options || []).map((o) => ({
                ...o,
                isCorrect: o.id === optionId,
              })),
            }
          : q,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          Objective questions (Multiple Choice, True/False) are graded
          automatically. Essay questions are graded manually by the instructor.
        </p>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => addQuestion("objective")}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Objective
          </button>
          <button
            type="button"
            onClick={() => addQuestion("essay")}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Essay
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No questions added yet.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800/60 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-400">
                    Q{index + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${formatBadgeClass(q.format)}`}
                  >
                    {q.format === "objective"
                      ? "Objective • Auto-graded"
                      : "Essay • Manual"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="p-1.5 hover:bg-red-500/10 hover:text-red-500 text-slate-400 rounded-lg transition"
                  title="Remove question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-start">
                <textarea
                  value={q.prompt}
                  onChange={(e) =>
                    updateQuestion(q.id, { prompt: e.target.value })
                  }
                  rows={2}
                  placeholder="Question text"
                  className={inputClass}
                />
                <select
                  value={q.format}
                  onChange={(e) =>
                    setFormat(q.id, e.target.value as "objective" | "essay")
                  }
                  className={inputClass + " md:w-40"}
                >
                  <option value="objective">Objective</option>
                  <option value="essay">Essay</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={q.points}
                  onChange={(e) =>
                    updateQuestion(q.id, { points: Number(e.target.value) })
                  }
                  className={inputClass + " md:w-24"}
                  placeholder="Points"
                />
              </div>

              {q.format === "objective" ? (
                <div className="space-y-2 pl-1">
                  <select
                    value={q.questionType}
                    onChange={(e) =>
                      setObjectiveType(
                        q.id,
                        e.target.value as "multiple_choice" | "true_false",
                      )
                    }
                    className={inputClass + " md:w-56"}
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                  </select>

                  {q.questionType === "multiple_choice" ? (
                    <div className="space-y-2">
                      {(q.options || []).map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center space-x-2"
                        >
                          <button
                            type="button"
                            onClick={() => setCorrectOption(q.id, opt.id)}
                            title="Mark as correct answer"
                            className="shrink-0"
                          >
                            {opt.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) =>
                              updateOption(q.id, opt.id, {
                                text: e.target.value,
                              })
                            }
                            placeholder="Option text"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, opt.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(q.id)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      {[true, false].map((val) => (
                        <label
                          key={String(val)}
                          className="flex items-center space-x-1.5 text-sm text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`tf-${q.id}`}
                            checked={q.correctBoolean === val}
                            onChange={() =>
                              updateQuestion(q.id, { correctBoolean: val })
                            }
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span>{val ? "True" : "False"}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Field label="Grading Notes (optional, instructor-only)">
                  <textarea
                    value={q.rubric || ""}
                    onChange={(e) =>
                      updateQuestion(q.id, { rubric: e.target.value })
                    }
                    rows={2}
                    placeholder="What should a full-credit answer include?"
                    className={inputClass}
                  />
                </Field>
              )}
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-semibold">
            Total question points: <strong>{totalPoints}</strong>
            {totalPoints !== targetMaxScore && (
              <span className="text-amber-500 ml-1">
                (Maximum Score is set to {targetMaxScore})
              </span>
            )}
          </span>
          {totalPoints !== targetMaxScore && (
            <button
              type="button"
              onClick={() => onSyncMaxScore(totalPoints)}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Set Maximum Score to {totalPoints}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
