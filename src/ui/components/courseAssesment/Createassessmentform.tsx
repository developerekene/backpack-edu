import React, { useState } from "react";
// import { Assessment, AssessmentType, Submission } from "../../../types";
import { Assessment, AssessmentType } from "../../../types";
import {
  Plus,
  Paperclip,
  X,
  Calendar,
  BarChart3,
  ClipboardList,
  Users,
  UploadCloud,
  Eye,
  BookOpen,
} from "lucide-react";
import { FileUpload } from "../FileUpload";
import { generateId } from "../../../lib/id";
import {
  FormSection,
  Field,
  inputClass,
  checkboxRowClass,
} from "./Formprimitives";
import {
  QUESTION_TYPES,
  FILE_TYPE_OPTIONS,
  ASSESSMENT_TYPES,
} from "./Constants";

type OrgMember = { id?: string; email?: string; name: string };

type SectionKey =
  | "basic"
  | "scheduling"
  | "grading"
  | "format"
  | "studentGroup"
  | "submission"
  | "results";

export function CreateAssessmentForm({
  courseId,
  orgMembers,
  instructorDefaultName,
  addAssessment,
}: {
  courseId: string;
  orgMembers: OrgMember[];
  instructorDefaultName?: string;
  addAssessment: (assessment: Assessment) => Promise<void> | void;
}) {
  // 1. Basic Assessment Information
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssessmentType>("assignment");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [description, setDescription] = useState("");
  const [instructorName, setInstructorName] = useState(
    instructorDefaultName || "",
  );

  // 2. Scheduling
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");

  // 3. Grading
  const [maxScore, setMaxScore] = useState(100);
  const [passingScore, setPassingScore] = useState<number | "">("");
  const [gradingType, setGradingType] =
    useState<NonNullable<Assessment["gradingType"]>>("points");
  const [weight, setWeight] = useState<number | "">("");

  // 4. Assessment Format
  const [questionType, setQuestionType] =
    useState<NonNullable<Assessment["questionType"]>>("multiple_choice");
  const [numberOfQuestions, setNumberOfQuestions] = useState<number | "">("");
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number | "">("");
  const [referenceMaterials, setReferenceMaterials] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  // 5. Student / Group Settings
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupSize, setGroupSize] = useState<number | "">("");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | "">("");

  // 6. Submission Settings
  const [submissionMethod, setSubmissionMethod] =
    useState<NonNullable<Assessment["submissionMethod"]>>("online");
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([]);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number | "">("");
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [requireStudentComments, setRequireStudentComments] = useState(false);

  // 7. Results & Feedback
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [releaseResultsDate, setReleaseResultsDate] = useState("");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [allowStudentReview, setAllowStudentReview] = useState(false);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      basic: true,
      scheduling: true,
      grading: true,
      format: false,
      studentGroup: false,
      submission: false,
      results: false,
    },
  );
  const toggleSection = (key: SectionKey) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const isQuestionBased = type === "quiz" || type === "test" || type === "exam";
  const supportsGroup =
    type === "assignment" || type === "project" || type === "classwork";

  const toggleFileType = (ft: string) => {
    setAllowedFileTypes((prev) =>
      prev.includes(ft) ? prev.filter((f) => f !== ft) : [...prev, ft],
    );
  };

  const toggleAssignedStudent = (id: string) => {
    setAssignedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const resetForm = () => {
    setTitle("");
    setType("assignment");
    setSubject("");
    setGradeLevel("");
    setDescription("");
    setInstructorName(instructorDefaultName || "");

    setStartDate("");
    setDueDate("");
    setStartTime("");
    setEndTime("");
    setDurationMinutes("");

    setMaxScore(100);
    setPassingScore("");
    setGradingType("points");
    setWeight("");

    setQuestionType("multiple_choice");
    setNumberOfQuestions("");
    setPointsPerQuestion("");
    setReferenceMaterials("");
    setAttachments([]);

    setAssignedStudentIds([]);
    setIsGroup(false);
    setGroupSize("");
    setRandomizeQuestions(false);
    setAllowMultipleAttempts(false);
    setMaxAttempts("");

    setSubmissionMethod("online");
    setAllowedFileTypes([]);
    setMaxFileSizeMb("");
    setAllowResubmission(false);
    setRequireStudentComments(false);

    setShowScoreImmediately(true);
    setReleaseResultsDate("");
    setShowCorrectAnswers(false);
    setTeacherFeedback("");
    setAllowStudentReview(false);
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAssessment: Assessment = {
      id: generateId("ass"),
      courseId,
      title,
      type,
      subject: subject || undefined,
      gradeLevel: gradeLevel || undefined,
      description: description || undefined,
      instructorName: instructorName || undefined,

      startDate: startDate || undefined,
      dueDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationMinutes:
        durationMinutes === "" ? undefined : Number(durationMinutes),

      maxScore: Number(maxScore),
      passingScore: passingScore === "" ? undefined : Number(passingScore),
      gradingType,
      weight: weight === "" ? undefined : Number(weight),

      questionType: isQuestionBased ? questionType : undefined,
      numberOfQuestions:
        isQuestionBased && numberOfQuestions !== ""
          ? Number(numberOfQuestions)
          : undefined,
      pointsPerQuestion:
        isQuestionBased && pointsPerQuestion !== ""
          ? Number(pointsPerQuestion)
          : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      referenceMaterials: referenceMaterials || undefined,

      assignedStudentIds:
        assignedStudentIds.length > 0 ? assignedStudentIds : undefined,
      isGroup: supportsGroup ? isGroup : false,
      groupSize:
        supportsGroup && isGroup && groupSize !== ""
          ? Number(groupSize)
          : undefined,
      randomizeQuestions: isQuestionBased ? randomizeQuestions : undefined,
      allowMultipleAttempts,
      maxAttempts:
        allowMultipleAttempts && maxAttempts !== ""
          ? Number(maxAttempts)
          : undefined,

      submissionMethod,
      allowedFileTypes:
        submissionMethod !== "in_class" && allowedFileTypes.length > 0
          ? allowedFileTypes
          : undefined,
      maxFileSizeMb: maxFileSizeMb === "" ? undefined : Number(maxFileSizeMb),
      allowResubmission,
      requireStudentComments,

      showScoreImmediately,
      releaseResultsDate: releaseResultsDate || undefined,
      showCorrectAnswers,
      teacherFeedback: teacherFeedback || undefined,
      allowStudentReview,
    };
    await addAssessment(newAssessment);
    resetForm();
  };

  return (
    <form
      onSubmit={handleCreateAssessment}
      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl space-y-4"
    >
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center">
        <Plus className="w-5 h-5 mr-2 text-indigo-400" /> Create New Assessment
      </h3>

      {/* 1. Basic Assessment Information */}
      <FormSection
        title="Basic Information"
        icon={<BookOpen className="w-4 h-4" />}
        isOpen={openSections.basic}
        onToggle={() => toggleSection("basic")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Assessment Title">
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Midterm Exam"
            />
          </Field>
          <Field label="Assessment Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssessmentType)}
              className={inputClass}
            >
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject / Course">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
              placeholder="e.g. Algebra II"
            />
          </Field>
          <Field label="Class / Grade">
            <input
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className={inputClass}
              placeholder="e.g. Grade 10 - Section B"
            />
          </Field>
          <Field label="Teacher / Instructor">
            <input
              type="text"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Ms. Adaeze Okafor"
            />
          </Field>
        </div>
        <Field label="Description / Instructions">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="What should students know before starting?"
          />
        </Field>
      </FormSection>

      {/* 2. Scheduling */}
      <FormSection
        title="Scheduling"
        icon={<Calendar className="w-4 h-4" />}
        isOpen={openSections.scheduling}
        onToggle={() => toggleSection("scheduling")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Start Date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Due Date">
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Start Time">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="End Time">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Duration (minutes)"
            hint={
              isQuestionBased
                ? "Recommended for timed tests/exams/quizzes."
                : undefined
            }
          >
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className={inputClass}
              placeholder="e.g. 60"
            />
          </Field>
        </div>
      </FormSection>

      {/* 3. Grading */}
      <FormSection
        title="Grading"
        icon={<BarChart3 className="w-4 h-4" />}
        isOpen={openSections.grading}
        onToggle={() => toggleSection("grading")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Maximum Score">
            <input
              required
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Passing Score">
            <input
              type="number"
              min={0}
              value={passingScore}
              onChange={(e) =>
                setPassingScore(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className={inputClass}
              placeholder="e.g. 60"
            />
          </Field>
          <Field label="Grading Type">
            <select
              value={gradingType}
              onChange={(e) =>
                setGradingType(
                  e.target.value as NonNullable<Assessment["gradingType"]>,
                )
              }
              className={inputClass}
            >
              <option value="points">Points</option>
              <option value="percentage">Percentage</option>
              <option value="letter">Letter Grade</option>
            </select>
          </Field>
          <Field
            label="Weight (% of final grade)"
            hint="Leave blank if this course doesn't weight assessments."
          >
            <input
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputClass}
              placeholder="e.g. 20"
            />
          </Field>
        </div>
      </FormSection>

      {/* 4. Assessment Format */}
      <FormSection
        title="Assessment Format"
        icon={<ClipboardList className="w-4 h-4" />}
        isOpen={openSections.format}
        onToggle={() => toggleSection("format")}
      >
        {isQuestionBased ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Question Type">
              <select
                value={questionType}
                onChange={(e) =>
                  setQuestionType(
                    e.target.value as NonNullable<Assessment["questionType"]>,
                  )
                }
                className={inputClass}
              >
                {QUESTION_TYPES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Number of Questions">
              <input
                type="number"
                min={0}
                value={numberOfQuestions}
                onChange={(e) =>
                  setNumberOfQuestions(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className={inputClass}
                placeholder="e.g. 20"
              />
            </Field>
            <Field label="Points per Question">
              <input
                type="number"
                min={0}
                value={pointsPerQuestion}
                onChange={(e) =>
                  setPointsPerQuestion(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className={inputClass}
                placeholder="e.g. 5"
              />
            </Field>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            Question-level settings apply to Quiz, Test, and Exam types.
          </p>
        )}

        <Field label="Reference Materials">
          <textarea
            value={referenceMaterials}
            onChange={(e) => setReferenceMaterials(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Chapters, links, or notes students may reference"
          />
        </Field>

        <Field label="Attachments / Resources">
          <div className="space-y-2">
            {attachments.map((url, i) => (
              <div
                key={i}
                className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg"
              >
                <Paperclip className="w-4 h-4 mr-2 text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
                  {url}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <FileUpload
              label="Add attachment"
              onUpload={(url) => setAttachments((prev) => [...prev, url])}
            />
          </div>
        </Field>
      </FormSection>

      {/* 5. Student / Group Settings */}
      <FormSection
        title="Student & Group Settings"
        icon={<Users className="w-4 h-4" />}
        isOpen={openSections.studentGroup}
        onToggle={() => toggleSection("studentGroup")}
      >
        <Field
          label="Assigned Students"
          hint="Leave empty to assign to the whole class."
        >
          <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
            {orgMembers.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">
                No students found in this organization.
              </p>
            ) : (
              orgMembers.map((m) => {
                const memberId = m.id || m.email || m.name;
                return (
                  <label
                    key={memberId}
                    className={checkboxRowClass + " px-1 py-1"}
                  >
                    <input
                      type="checkbox"
                      checked={assignedStudentIds.includes(memberId)}
                      onChange={() => toggleAssignedStudent(memberId)}
                      className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
                    />
                    <span>{m.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </Field>

        {supportsGroup && (
          <>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isGroup"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <label htmlFor="isGroup" className={checkboxRowClass}>
                Group Assessment (Students can work in teams)
              </label>
            </div>
            {isGroup && (
              <Field label="Group Size">
                <input
                  type="number"
                  min={2}
                  value={groupSize}
                  onChange={(e) =>
                    setGroupSize(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={inputClass + " md:w-40"}
                  placeholder="e.g. 4"
                />
              </Field>
            )}
          </>
        )}

        {isQuestionBased && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="randomizeQuestions"
              checked={randomizeQuestions}
              onChange={(e) => setRandomizeQuestions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
            />
            <label htmlFor="randomizeQuestions" className={checkboxRowClass}>
              Randomize Question Order
            </label>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allowMultipleAttempts"
            checked={allowMultipleAttempts}
            onChange={(e) => setAllowMultipleAttempts(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
          />
          <label htmlFor="allowMultipleAttempts" className={checkboxRowClass}>
            Allow Multiple Attempts
          </label>
        </div>
        {allowMultipleAttempts && (
          <Field label="Maximum Attempts">
            <input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) =>
                setMaxAttempts(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className={inputClass + " md:w-40"}
              placeholder="e.g. 2"
            />
          </Field>
        )}
      </FormSection>

      {/* 6. Submission Settings */}
      <FormSection
        title="Submission Settings"
        icon={<UploadCloud className="w-4 h-4" />}
        isOpen={openSections.submission}
        onToggle={() => toggleSection("submission")}
      >
        <Field label="Submission Method">
          <select
            value={submissionMethod}
            onChange={(e) =>
              setSubmissionMethod(
                e.target.value as NonNullable<Assessment["submissionMethod"]>,
              )
            }
            className={inputClass}
          >
            <option value="online">Online</option>
            <option value="file_upload">File Upload</option>
            <option value="in_class">In-Class</option>
          </select>
        </Field>

        {submissionMethod !== "in_class" && (
          <>
            <Field label="Allowed File Types">
              <div className="flex flex-wrap gap-2">
                {FILE_TYPE_OPTIONS.map((ft) => {
                  const active = allowedFileTypes.includes(ft);
                  return (
                    <button
                      type="button"
                      key={ft}
                      onClick={() => toggleFileType(ft)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {ft}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Maximum File Size (MB)">
              <input
                type="number"
                min={1}
                value={maxFileSizeMb}
                onChange={(e) =>
                  setMaxFileSizeMb(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className={inputClass + " md:w-40"}
                placeholder="e.g. 25"
              />
            </Field>
          </>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allowResubmission"
            checked={allowResubmission}
            onChange={(e) => setAllowResubmission(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
          />
          <label htmlFor="allowResubmission" className={checkboxRowClass}>
            Allow Resubmission
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="requireStudentComments"
            checked={requireStudentComments}
            onChange={(e) => setRequireStudentComments(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
          />
          <label htmlFor="requireStudentComments" className={checkboxRowClass}>
            Require Student Comments on Submission
          </label>
        </div>
      </FormSection>

      {/* 7. Results & Feedback */}
      <FormSection
        title="Results & Feedback"
        icon={<Eye className="w-4 h-4" />}
        isOpen={openSections.results}
        onToggle={() => toggleSection("results")}
      >
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showScoreImmediately"
            checked={showScoreImmediately}
            onChange={(e) => setShowScoreImmediately(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
          />
          <label htmlFor="showScoreImmediately" className={checkboxRowClass}>
            Show Score Immediately After Grading
          </label>
        </div>

        {!showScoreImmediately && (
          <Field label="Release Results Date">
            <input
              type="date"
              value={releaseResultsDate}
              onChange={(e) => setReleaseResultsDate(e.target.value)}
              className={inputClass + " md:w-60"}
            />
          </Field>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showCorrectAnswers"
            checked={showCorrectAnswers}
            onChange={(e) => setShowCorrectAnswers(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
          />
          <label htmlFor="showCorrectAnswers" className={checkboxRowClass}>
            Show Correct Answers After Submission
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allowStudentReview"
            checked={allowStudentReview}
            onChange={(e) => setAllowStudentReview(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
          />
          <label htmlFor="allowStudentReview" className={checkboxRowClass}>
            Allow Student Review Session
          </label>
        </div>

        <Field label="Default Teacher Feedback Template">
          <textarea
            value={teacherFeedback}
            onChange={(e) => setTeacherFeedback(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Optional note shown alongside every graded submission"
          />
        </Field>
      </FormSection>

      <button
        type="submit"
        className="px-5 py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 dark:text-white rounded-lg font-bold transition w-full sm:w-auto"
      >
        Publish Assessment
      </button>
    </form>
  );
}
