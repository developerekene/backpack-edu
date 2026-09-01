import { useAppContext } from "../../../store/AppContext";
import { useAuth } from "../../../store/AuthContext";
import { CreateAssessmentForm } from "./Createassessmentform";
import { StudentTranscriptView } from "./Studenttranscriptview";
import { ManageAssessmentsList } from "./ManageAssessmentList";

export const CourseAssessments = ({
  courseId,
  isStudent,
}: {
  courseId: string;
  isStudent: boolean;
}) => {
  const {
    assessments,
    submissions,
    addAssessment,
    addSubmission,
    updateSubmissionScore,
    orgMembers,
  } = useAppContext();
  const { currentUser } = useAuth();

  const courseAssessments = assessments.filter((a) => a.courseId === courseId);
  const courseSubmissions = submissions.filter((s) => s.courseId === courseId);

  if (isStudent) {
    return (
      <StudentTranscriptView
        courseId={courseId}
        courseAssessments={courseAssessments}
        courseSubmissions={courseSubmissions}
        currentUserId={currentUser?.id}
        addSubmission={addSubmission}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CreateAssessmentForm
        courseId={courseId}
        orgMembers={orgMembers}
        instructorDefaultName={currentUser?.name}
        addAssessment={addAssessment}
      />
      <ManageAssessmentsList
        courseAssessments={courseAssessments}
        courseSubmissions={courseSubmissions}
        orgMembers={orgMembers}
        updateSubmissionScore={updateSubmissionScore}
      />
    </div>
  );
};

// import React, { useState } from "react";
// import { useAppContext } from "../../../store/AppContext";
// import { useAuth } from "../../../store/AuthContext";
// import { Assessment, AssessmentType, Submission } from "../../../types";
// import {
//   Award,
//   Plus,
//   Paperclip,
//   X,
//   ChevronDown,
//   ChevronUp,
//   Calendar,
//   Clock,
//   BarChart3,
//   ClipboardList,
//   Users,
//   UploadCloud,
//   Eye,
//   BookOpen,
// } from "lucide-react";
// import { ProctoringSession } from "../ProctoringSession";
// import { FileUpload } from "../FileUpload";
// import { generateId } from "../../../lib/id";

// const QUESTION_TYPES: {
//   value: NonNullable<Assessment["questionType"]>;
//   label: string;
// }[] = [
//   { value: "multiple_choice", label: "Multiple Choice" },
//   { value: "true_false", label: "True / False" },
//   { value: "short_answer", label: "Short Answer" },
//   { value: "essay", label: "Essay" },
//   { value: "file_upload", label: "File Upload" },
//   { value: "mixed", label: "Mixed" },
// ];

// const FILE_TYPE_OPTIONS = ["PDF", "DOCX", "PNG", "JPG", "ZIP", "XLSX", "PPTX"];

// const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
//   { value: "assignment", label: "Assignment" },
//   { value: "quiz", label: "Quiz" },
//   { value: "test", label: "Test" },
//   { value: "exam", label: "Exam" },
//   { value: "project", label: "Project" },
//   { value: "classwork", label: "Classwork" },
// ];

// type SectionKey =
//   | "basic"
//   | "scheduling"
//   | "grading"
//   | "format"
//   | "studentGroup"
//   | "submission"
//   | "results";

// function FormSection({
//   title,
//   icon,
//   isOpen,
//   onToggle,
//   children,
// }: {
//   title: string;
//   icon: React.ReactNode;
//   isOpen: boolean;
//   onToggle: () => void;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
//       <button
//         type="button"
//         onClick={onToggle}
//         className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
//       >
//         <span className="flex items-center font-bold text-slate-900 dark:text-white">
//           <span className="mr-2 text-indigo-400">{icon}</span>
//           {title}
//         </span>
//         {isOpen ? (
//           <ChevronUp className="w-4 h-4 text-slate-400" />
//         ) : (
//           <ChevronDown className="w-4 h-4 text-slate-400" />
//         )}
//       </button>
//       {isOpen && (
//         <div className="p-5 pt-1 space-y-4 border-t border-slate-200 dark:border-slate-700">
//           {children}
//         </div>
//       )}
//     </div>
//   );
// }

// function Field({
//   label,
//   children,
//   hint,
// }: {
//   label: string;
//   children: React.ReactNode;
//   hint?: string;
// }) {
//   return (
//     <div>
//       <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
//         {label}
//       </label>
//       {children}
//       {hint && (
//         <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
//           {hint}
//         </p>
//       )}
//     </div>
//   );
// }

// const inputClass =
//   "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none";

// const checkboxRowClass =
//   "flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 font-medium";

// export const CourseAssessments = ({
//   courseId,
//   isStudent,
// }: {
//   courseId: string;
//   isStudent: boolean;
// }) => {
//   const {
//     assessments,
//     submissions,
//     addAssessment,
//     addSubmission,
//     updateSubmissionScore,
//     orgMembers,
//   } = useAppContext();
//   const { currentUser } = useAuth();
//   const courseAssessments = assessments.filter((a) => a.courseId === courseId);
//   const courseSubmissions = submissions.filter((s) => s.courseId === courseId);

//   // ── 1. Basic Assessment Information ──────────────────────────
//   const [title, setTitle] = useState("");
//   const [type, setType] = useState<AssessmentType>("assignment");
//   const [subject, setSubject] = useState("");
//   const [gradeLevel, setGradeLevel] = useState("");
//   const [description, setDescription] = useState("");
//   const [instructorName, setInstructorName] = useState(currentUser?.name || "");

//   // ── 2. Scheduling ─────────────────────────────────────────────
//   const [startDate, setStartDate] = useState("");
//   const [dueDate, setDueDate] = useState("");
//   const [startTime, setStartTime] = useState("");
//   const [endTime, setEndTime] = useState("");
//   const [durationMinutes, setDurationMinutes] = useState<number | "">("");

//   // ── 3. Grading ────────────────────────────────────────────────
//   const [maxScore, setMaxScore] = useState(100);
//   const [passingScore, setPassingScore] = useState<number | "">("");
//   const [gradingType, setGradingType] =
//     useState<NonNullable<Assessment["gradingType"]>>("points");
//   const [weight, setWeight] = useState<number | "">("");

//   // ── 4. Assessment Format ─────────────────────────────────────
//   const [questionType, setQuestionType] =
//     useState<NonNullable<Assessment["questionType"]>>("multiple_choice");
//   const [numberOfQuestions, setNumberOfQuestions] = useState<number | "">("");
//   const [pointsPerQuestion, setPointsPerQuestion] = useState<number | "">("");
//   const [referenceMaterials, setReferenceMaterials] = useState("");
//   const [attachments, setAttachments] = useState<string[]>([]);

//   // ── 5. Student / Group Settings ──────────────────────────────
//   const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
//   const [isGroup, setIsGroup] = useState(false);
//   const [groupSize, setGroupSize] = useState<number | "">("");
//   const [randomizeQuestions, setRandomizeQuestions] = useState(false);
//   const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
//   const [maxAttempts, setMaxAttempts] = useState<number | "">("");

//   // ── 6. Submission Settings ────────────────────────────────────
//   const [submissionMethod, setSubmissionMethod] =
//     useState<NonNullable<Assessment["submissionMethod"]>>("online");
//   const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([]);
//   const [maxFileSizeMb, setMaxFileSizeMb] = useState<number | "">("");
//   const [allowResubmission, setAllowResubmission] = useState(false);
//   const [requireStudentComments, setRequireStudentComments] = useState(false);

//   // ── 7. Results & Feedback ─────────────────────────────────────
//   const [showScoreImmediately, setShowScoreImmediately] = useState(true);
//   const [releaseResultsDate, setReleaseResultsDate] = useState("");
//   const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
//   const [teacherFeedback, setTeacherFeedback] = useState("");
//   const [allowStudentReview, setAllowStudentReview] = useState(false);

//   const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
//     {
//       basic: true,
//       scheduling: true,
//       grading: true,
//       format: false,
//       studentGroup: false,
//       submission: false,
//       results: false,
//     },
//   );
//   const toggleSection = (key: SectionKey) =>
//     setOpenSections((s) => ({ ...s, [key]: !s[key] }));

//   const isQuestionBased = type === "quiz" || type === "test" || type === "exam";
//   const supportsGroup =
//     type === "assignment" || type === "project" || type === "classwork";

//   // For grading (existing)
//   const [selectedAssessmentId, setSelectedAssessmentId] = useState<
//     string | null
//   >(null);
//   const [gradingScores, setGradingScores] = useState<Record<string, number>>(
//     {},
//   );

//   // For submitting (existing)
//   const [submissionContent, setSubmissionContent] = useState("");
//   const [submissionFileUrl, setSubmissionFileUrl] = useState("");
//   const [activeProctoringId, setActiveProctoringId] = useState<string | null>(
//     null,
//   );

//   const toggleFileType = (ft: string) => {
//     setAllowedFileTypes((prev) =>
//       prev.includes(ft) ? prev.filter((f) => f !== ft) : [...prev, ft],
//     );
//   };

//   const toggleAssignedStudent = (id: string) => {
//     setAssignedStudentIds((prev) =>
//       prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
//     );
//   };

//   const resetForm = () => {
//     setTitle("");
//     setType("assignment");
//     setSubject("");
//     setGradeLevel("");
//     setDescription("");
//     setInstructorName(currentUser?.name || "");

//     setStartDate("");
//     setDueDate("");
//     setStartTime("");
//     setEndTime("");
//     setDurationMinutes("");

//     setMaxScore(100);
//     setPassingScore("");
//     setGradingType("points");
//     setWeight("");

//     setQuestionType("multiple_choice");
//     setNumberOfQuestions("");
//     setPointsPerQuestion("");
//     setReferenceMaterials("");
//     setAttachments([]);

//     setAssignedStudentIds([]);
//     setIsGroup(false);
//     setGroupSize("");
//     setRandomizeQuestions(false);
//     setAllowMultipleAttempts(false);
//     setMaxAttempts("");

//     setSubmissionMethod("online");
//     setAllowedFileTypes([]);
//     setMaxFileSizeMb("");
//     setAllowResubmission(false);
//     setRequireStudentComments(false);

//     setShowScoreImmediately(true);
//     setReleaseResultsDate("");
//     setShowCorrectAnswers(false);
//     setTeacherFeedback("");
//     setAllowStudentReview(false);
//   };

//   const handleCreateAssessment = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const newAssessment: Assessment = {
//       id: generateId("ass"),
//       courseId,
//       title,
//       type,
//       subject: subject || undefined,
//       gradeLevel: gradeLevel || undefined,
//       description: description || undefined,
//       instructorName: instructorName || undefined,

//       startDate: startDate || undefined,
//       dueDate,
//       startTime: startTime || undefined,
//       endTime: endTime || undefined,
//       durationMinutes:
//         durationMinutes === "" ? undefined : Number(durationMinutes),

//       maxScore: Number(maxScore),
//       passingScore: passingScore === "" ? undefined : Number(passingScore),
//       gradingType,
//       weight: weight === "" ? undefined : Number(weight),

//       questionType: isQuestionBased ? questionType : undefined,
//       numberOfQuestions:
//         isQuestionBased && numberOfQuestions !== ""
//           ? Number(numberOfQuestions)
//           : undefined,
//       pointsPerQuestion:
//         isQuestionBased && pointsPerQuestion !== ""
//           ? Number(pointsPerQuestion)
//           : undefined,
//       attachments: attachments.length > 0 ? attachments : undefined,
//       referenceMaterials: referenceMaterials || undefined,

//       assignedStudentIds:
//         assignedStudentIds.length > 0 ? assignedStudentIds : undefined,
//       isGroup: supportsGroup ? isGroup : false,
//       groupSize:
//         supportsGroup && isGroup && groupSize !== ""
//           ? Number(groupSize)
//           : undefined,
//       randomizeQuestions: isQuestionBased ? randomizeQuestions : undefined,
//       allowMultipleAttempts,
//       maxAttempts:
//         allowMultipleAttempts && maxAttempts !== ""
//           ? Number(maxAttempts)
//           : undefined,

//       submissionMethod,
//       allowedFileTypes:
//         submissionMethod !== "in_class" && allowedFileTypes.length > 0
//           ? allowedFileTypes
//           : undefined,
//       maxFileSizeMb: maxFileSizeMb === "" ? undefined : Number(maxFileSizeMb),
//       allowResubmission,
//       requireStudentComments,

//       showScoreImmediately,
//       releaseResultsDate: releaseResultsDate || undefined,
//       showCorrectAnswers,
//       teacherFeedback: teacherFeedback || undefined,
//       allowStudentReview,
//     };
//     await addAssessment(newAssessment);
//     resetForm();
//   };

//   const handleSubmitAssessment = async (assessmentId: string) => {
//     if (!currentUser || (!submissionContent.trim() && !submissionFileUrl))
//       return;
//     const sub: Submission = {
//       id: generateId("sub"),
//       assessmentId,
//       userId: currentUser.id,
//       courseId,
//       submittedAt: new Date().toISOString(),
//       content: submissionContent,
//       fileUrl: submissionFileUrl,
//       status: "submitted",
//     };
//     await addSubmission(sub);
//     setSubmissionContent("");
//     setSubmissionFileUrl("");
//   };

//   const handleGradeSubmission = async (submissionId: string) => {
//     const score = gradingScores[submissionId] || 0;
//     await updateSubmissionScore(submissionId, score, "Graded by instructor");
//   };

//   if (isStudent) {
//     // Transcript view & Submission
//     const mySubmissions = courseSubmissions.filter(
//       (s) => s.userId === currentUser?.id,
//     );
//     const totalScore = mySubmissions.reduce(
//       (acc, sub) => acc + (sub.score || 0),
//       0,
//     );
//     const totalMaxScore = courseAssessments.reduce(
//       (acc, ass) => acc + ass.maxScore,
//       0,
//     );
//     const gpa =
//       totalMaxScore > 0
//         ? ((totalScore / totalMaxScore) * 4.0).toFixed(2)
//         : "N/A";

//     return (
//       <div className="space-y-6">
//         <div className="bg-indigo-900/40 p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
//           <div>
//             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center">
//               <Award className="w-5 h-5 mr-2 text-amber-400" /> Academic
//               Transcript
//             </h3>
//             <p className="text-sm text-indigo-200">
//               Track your performance across assignments and exams.
//             </p>
//           </div>
//           <div className="text-right">
//             <div className="text-3xl font-black text-slate-900 dark:text-white">
//               {totalScore}{" "}
//               <span className="text-lg text-indigo-300 font-medium">
//                 / {totalMaxScore}
//               </span>
//             </div>
//             <div className="text-sm font-semibold text-emerald-400 mt-1">
//               GPA Equivalent: {gpa}
//             </div>
//           </div>
//         </div>

//         <div className="space-y-4">
//           {courseAssessments.length === 0 ? (
//             <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
//               No assessments scheduled yet.
//             </div>
//           ) : (
//             courseAssessments.map((ass) => {
//               const sub = mySubmissions.find((s) => s.assessmentId === ass.id);
//               return (
//                 <div
//                   key={ass.id}
//                   className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
//                 >
//                   <div className="flex justify-between items-start mb-4">
//                     <div>
//                       <h4 className="font-bold text-lg text-slate-900 dark:text-white">
//                         {ass.title}
//                         {ass.isGroup && (
//                           <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
//                             Group
//                           </span>
//                         )}
//                       </h4>
//                       <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
//                         <span className="capitalize">{ass.type}</span>
//                         {ass.subject && (
//                           <>
//                             <span>•</span>
//                             <span>{ass.subject}</span>
//                           </>
//                         )}
//                         <span>•</span>
//                         <span>
//                           Due: {new Date(ass.dueDate).toLocaleDateString()}
//                         </span>
//                         {ass.durationMinutes && (
//                           <>
//                             <span>•</span>
//                             <span>{ass.durationMinutes} min</span>
//                           </>
//                         )}
//                         <span>•</span>
//                         <span>Score: {ass.maxScore} pts</span>
//                       </div>
//                       {ass.description && (
//                         <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
//                           {ass.description}
//                         </p>
//                       )}
//                     </div>
//                     {sub ? (
//                       <div className="flex flex-col items-end">
//                         {sub.status === "graded" ? (
//                           <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-center mb-2">
//                             <div className="text-xs uppercase font-bold tracking-wider mb-1">
//                               Graded
//                             </div>
//                             <div className="font-black text-xl">
//                               {sub.score}{" "}
//                               <span className="text-sm text-emerald-500/70">
//                                 / {ass.maxScore}
//                               </span>
//                             </div>
//                           </div>
//                         ) : (
//                           <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm font-semibold rounded-full border border-amber-500/20 mb-2">
//                             Pending Review
//                           </span>
//                         )}
//                         {sub.fileUrl && (
//                           <a
//                             href={sub.fileUrl}
//                             target="_blank"
//                             rel="noreferrer"
//                             className="flex items-center text-sm text-indigo-400 hover:underline"
//                           >
//                             <Paperclip className="w-4 h-4 mr-1" /> My Attachment
//                           </a>
//                         )}
//                       </div>
//                     ) : (
//                       <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-full">
//                         Not Submitted
//                       </span>
//                     )}
//                   </div>
//                   {!sub && (
//                     <div className="mt-4 pt-4 border-t border-slate-800">
//                       {(ass.type === "exam" || ass.type === "test") &&
//                       activeProctoringId !== ass.id ? (
//                         <button
//                           onClick={() => setActiveProctoringId(ass.id)}
//                           className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white rounded-lg font-bold transition flex items-center justify-center"
//                         >
//                           Start Monitored Session
//                         </button>
//                       ) : (
//                         <div className="space-y-4">
//                           {(ass.type === "exam" || ass.type === "test") &&
//                             activeProctoringId === ass.id && (
//                               <ProctoringSession
//                                 assessmentTitle={ass.title}
//                                 onComplete={() => setActiveProctoringId(null)}
//                               />
//                             )}
//                           <div className="flex flex-col space-y-3">
//                             {submissionFileUrl && (
//                               <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
//                                 <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
//                                   Attached: Document
//                                 </span>
//                                 <button
//                                   onClick={() => setSubmissionFileUrl("")}
//                                   className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
//                                 >
//                                   <X className="w-4 h-4" />
//                                 </button>
//                               </div>
//                             )}
//                             <div className="flex space-x-3">
//                               <FileUpload
//                                 label=""
//                                 onUpload={(url) => setSubmissionFileUrl(url)}
//                               />
//                               <input
//                                 type="text"
//                                 value={submissionContent}
//                                 onChange={(e) =>
//                                   setSubmissionContent(e.target.value)
//                                 }
//                                 placeholder="Link to your work or text"
//                                 className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
//                               />
//                               <button
//                                 onClick={() => {
//                                   handleSubmitAssessment(ass.id);
//                                   setActiveProctoringId(null);
//                                 }}
//                                 disabled={
//                                   (!submissionContent.trim() &&
//                                     !submissionFileUrl) ||
//                                   ((ass.type === "exam" ||
//                                     ass.type === "test") &&
//                                     activeProctoringId !== ass.id)
//                                 }
//                                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-lg font-medium transition"
//                               >
//                                 Submit
//                               </button>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               );
//             })
//           )}
//         </div>
//       </div>
//     );
//   }

//   // Instructor / Org View
//   return (
//     <div className="space-y-8">
//       <form
//         onSubmit={handleCreateAssessment}
//         className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl space-y-4"
//       >
//         <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center">
//           <Plus className="w-5 h-5 mr-2 text-indigo-400" /> Create New
//           Assessment
//         </h3>

//         {/* 1. Basic Assessment Information */}
//         <FormSection
//           title="Basic Information"
//           icon={<BookOpen className="w-4 h-4" />}
//           isOpen={openSections.basic}
//           onToggle={() => toggleSection("basic")}
//         >
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field label="Assessment Title">
//               <input
//                 required
//                 type="text"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 className={inputClass}
//                 placeholder="e.g. Midterm Exam"
//               />
//             </Field>
//             <Field label="Assessment Type">
//               <select
//                 value={type}
//                 onChange={(e) => setType(e.target.value as AssessmentType)}
//                 className={inputClass}
//               >
//                 {ASSESSMENT_TYPES.map((t) => (
//                   <option key={t.value} value={t.value}>
//                     {t.label}
//                   </option>
//                 ))}
//               </select>
//             </Field>
//             <Field label="Subject / Course">
//               <input
//                 type="text"
//                 value={subject}
//                 onChange={(e) => setSubject(e.target.value)}
//                 className={inputClass}
//                 placeholder="e.g. Algebra II"
//               />
//             </Field>
//             <Field label="Class / Grade">
//               <input
//                 type="text"
//                 value={gradeLevel}
//                 onChange={(e) => setGradeLevel(e.target.value)}
//                 className={inputClass}
//                 placeholder="e.g. Grade 10 - Section B"
//               />
//             </Field>
//             <Field label="Teacher / Instructor">
//               <input
//                 type="text"
//                 value={instructorName}
//                 onChange={(e) => setInstructorName(e.target.value)}
//                 className={inputClass}
//                 placeholder="e.g. Ms. Adaeze Okafor"
//               />
//             </Field>
//           </div>
//           <Field label="Description / Instructions">
//             <textarea
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               rows={3}
//               className={inputClass}
//               placeholder="What should students know before starting?"
//             />
//           </Field>
//         </FormSection>

//         {/* 2. Scheduling */}
//         <FormSection
//           title="Scheduling"
//           icon={<Calendar className="w-4 h-4" />}
//           isOpen={openSections.scheduling}
//           onToggle={() => toggleSection("scheduling")}
//         >
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field label="Start Date">
//               <input
//                 type="date"
//                 value={startDate}
//                 onChange={(e) => setStartDate(e.target.value)}
//                 className={inputClass}
//               />
//             </Field>
//             <Field label="Due Date">
//               <input
//                 required
//                 type="date"
//                 value={dueDate}
//                 onChange={(e) => setDueDate(e.target.value)}
//                 className={inputClass}
//               />
//             </Field>
//             <Field label="Start Time">
//               <input
//                 type="time"
//                 value={startTime}
//                 onChange={(e) => setStartTime(e.target.value)}
//                 className={inputClass}
//               />
//             </Field>
//             <Field label="End Time">
//               <input
//                 type="time"
//                 value={endTime}
//                 onChange={(e) => setEndTime(e.target.value)}
//                 className={inputClass}
//               />
//             </Field>
//             <Field
//               label="Duration (minutes)"
//               hint={
//                 isQuestionBased
//                   ? "Recommended for timed tests/exams/quizzes."
//                   : undefined
//               }
//             >
//               <input
//                 type="number"
//                 min={0}
//                 value={durationMinutes}
//                 onChange={(e) =>
//                   setDurationMinutes(
//                     e.target.value === "" ? "" : Number(e.target.value),
//                   )
//                 }
//                 className={inputClass}
//                 placeholder="e.g. 60"
//               />
//             </Field>
//           </div>
//         </FormSection>

//         {/* 3. Grading */}
//         <FormSection
//           title="Grading"
//           icon={<BarChart3 className="w-4 h-4" />}
//           isOpen={openSections.grading}
//           onToggle={() => toggleSection("grading")}
//         >
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field label="Maximum Score">
//               <input
//                 required
//                 type="number"
//                 min={1}
//                 value={maxScore}
//                 onChange={(e) => setMaxScore(Number(e.target.value))}
//                 className={inputClass}
//               />
//             </Field>
//             <Field label="Passing Score">
//               <input
//                 type="number"
//                 min={0}
//                 value={passingScore}
//                 onChange={(e) =>
//                   setPassingScore(
//                     e.target.value === "" ? "" : Number(e.target.value),
//                   )
//                 }
//                 className={inputClass}
//                 placeholder="e.g. 60"
//               />
//             </Field>
//             <Field label="Grading Type">
//               <select
//                 value={gradingType}
//                 onChange={(e) =>
//                   setGradingType(
//                     e.target.value as NonNullable<Assessment["gradingType"]>,
//                   )
//                 }
//                 className={inputClass}
//               >
//                 <option value="points">Points</option>
//                 <option value="percentage">Percentage</option>
//                 <option value="letter">Letter Grade</option>
//               </select>
//             </Field>
//             <Field
//               label="Weight (% of final grade)"
//               hint="Leave blank if this course doesn't weight assessments."
//             >
//               <input
//                 type="number"
//                 min={0}
//                 max={100}
//                 value={weight}
//                 onChange={(e) =>
//                   setWeight(e.target.value === "" ? "" : Number(e.target.value))
//                 }
//                 className={inputClass}
//                 placeholder="e.g. 20"
//               />
//             </Field>
//           </div>
//         </FormSection>

//         {/* 4. Assessment Format */}
//         <FormSection
//           title="Assessment Format"
//           icon={<ClipboardList className="w-4 h-4" />}
//           isOpen={openSections.format}
//           onToggle={() => toggleSection("format")}
//         >
//           {isQuestionBased ? (
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <Field label="Question Type">
//                 <select
//                   value={questionType}
//                   onChange={(e) =>
//                     setQuestionType(
//                       e.target.value as NonNullable<Assessment["questionType"]>,
//                     )
//                   }
//                   className={inputClass}
//                 >
//                   {QUESTION_TYPES.map((q) => (
//                     <option key={q.value} value={q.value}>
//                       {q.label}
//                     </option>
//                   ))}
//                 </select>
//               </Field>
//               <Field label="Number of Questions">
//                 <input
//                   type="number"
//                   min={0}
//                   value={numberOfQuestions}
//                   onChange={(e) =>
//                     setNumberOfQuestions(
//                       e.target.value === "" ? "" : Number(e.target.value),
//                     )
//                   }
//                   className={inputClass}
//                   placeholder="e.g. 20"
//                 />
//               </Field>
//               <Field label="Points per Question">
//                 <input
//                   type="number"
//                   min={0}
//                   value={pointsPerQuestion}
//                   onChange={(e) =>
//                     setPointsPerQuestion(
//                       e.target.value === "" ? "" : Number(e.target.value),
//                     )
//                   }
//                   className={inputClass}
//                   placeholder="e.g. 5"
//                 />
//               </Field>
//             </div>
//           ) : (
//             <p className="text-sm text-slate-500 dark:text-slate-400 italic">
//               Question-level settings apply to Quiz, Test, and Exam types.
//             </p>
//           )}

//           <Field label="Reference Materials">
//             <textarea
//               value={referenceMaterials}
//               onChange={(e) => setReferenceMaterials(e.target.value)}
//               rows={2}
//               className={inputClass}
//               placeholder="Chapters, links, or notes students may reference"
//             />
//           </Field>

//           <Field label="Attachments / Resources">
//             <div className="space-y-2">
//               {attachments.map((url, i) => (
//                 <div
//                   key={i}
//                   className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg"
//                 >
//                   <Paperclip className="w-4 h-4 mr-2 text-indigo-400 shrink-0" />
//                   <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
//                     {url}
//                   </span>
//                   <button
//                     type="button"
//                     onClick={() =>
//                       setAttachments((prev) =>
//                         prev.filter((_, idx) => idx !== i),
//                       )
//                     }
//                     className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 </div>
//               ))}
//               <FileUpload
//                 label="Add attachment"
//                 onUpload={(url) => setAttachments((prev) => [...prev, url])}
//               />
//             </div>
//           </Field>
//         </FormSection>

//         {/* 5. Student / Group Settings */}
//         <FormSection
//           title="Student & Group Settings"
//           icon={<Users className="w-4 h-4" />}
//           isOpen={openSections.studentGroup}
//           onToggle={() => toggleSection("studentGroup")}
//         >
//           <Field
//             label="Assigned Students"
//             hint="Leave empty to assign to the whole class."
//           >
//             <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
//               {orgMembers.length === 0 ? (
//                 <p className="text-xs text-slate-400 italic px-1">
//                   No students found in this organization.
//                 </p>
//               ) : (
//                 orgMembers.map((m) => {
//                   const memberId = m.id || m.email;
//                   return (
//                     <label
//                       key={memberId}
//                       className={checkboxRowClass + " px-1 py-1"}
//                     >
//                       <input
//                         type="checkbox"
//                         checked={assignedStudentIds.includes(memberId)}
//                         onChange={() => toggleAssignedStudent(memberId)}
//                         className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//                       />
//                       <span>{m.name}</span>
//                     </label>
//                   );
//                 })
//               )}
//             </div>
//           </Field>

//           {supportsGroup && (
//             <>
//               <div className="flex items-center space-x-2">
//                 <input
//                   type="checkbox"
//                   id="isGroup"
//                   checked={isGroup}
//                   onChange={(e) => setIsGroup(e.target.checked)}
//                   className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
//                 />
//                 <label htmlFor="isGroup" className={checkboxRowClass}>
//                   Group Assessment (Students can work in teams)
//                 </label>
//               </div>
//               {isGroup && (
//                 <Field label="Group Size">
//                   <input
//                     type="number"
//                     min={2}
//                     value={groupSize}
//                     onChange={(e) =>
//                       setGroupSize(
//                         e.target.value === "" ? "" : Number(e.target.value),
//                       )
//                     }
//                     className={inputClass + " md:w-40"}
//                     placeholder="e.g. 4"
//                   />
//                 </Field>
//               )}
//             </>
//           )}

//           {isQuestionBased && (
//             <div className="flex items-center space-x-2">
//               <input
//                 type="checkbox"
//                 id="randomizeQuestions"
//                 checked={randomizeQuestions}
//                 onChange={(e) => setRandomizeQuestions(e.target.checked)}
//                 className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//               />
//               <label htmlFor="randomizeQuestions" className={checkboxRowClass}>
//                 Randomize Question Order
//               </label>
//             </div>
//           )}

//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="allowMultipleAttempts"
//               checked={allowMultipleAttempts}
//               onChange={(e) => setAllowMultipleAttempts(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//             />
//             <label htmlFor="allowMultipleAttempts" className={checkboxRowClass}>
//               Allow Multiple Attempts
//             </label>
//           </div>
//           {allowMultipleAttempts && (
//             <Field label="Maximum Attempts">
//               <input
//                 type="number"
//                 min={1}
//                 value={maxAttempts}
//                 onChange={(e) =>
//                   setMaxAttempts(
//                     e.target.value === "" ? "" : Number(e.target.value),
//                   )
//                 }
//                 className={inputClass + " md:w-40"}
//                 placeholder="e.g. 2"
//               />
//             </Field>
//           )}
//         </FormSection>

//         {/* 6. Submission Settings */}
//         <FormSection
//           title="Submission Settings"
//           icon={<UploadCloud className="w-4 h-4" />}
//           isOpen={openSections.submission}
//           onToggle={() => toggleSection("submission")}
//         >
//           <Field label="Submission Method">
//             <select
//               value={submissionMethod}
//               onChange={(e) =>
//                 setSubmissionMethod(
//                   e.target.value as NonNullable<Assessment["submissionMethod"]>,
//                 )
//               }
//               className={inputClass}
//             >
//               <option value="online">Online</option>
//               <option value="file_upload">File Upload</option>
//               <option value="in_class">In-Class</option>
//             </select>
//           </Field>

//           {submissionMethod !== "in_class" && (
//             <>
//               <Field label="Allowed File Types">
//                 <div className="flex flex-wrap gap-2">
//                   {FILE_TYPE_OPTIONS.map((ft) => {
//                     const active = allowedFileTypes.includes(ft);
//                     return (
//                       <button
//                         type="button"
//                         key={ft}
//                         onClick={() => toggleFileType(ft)}
//                         className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
//                           active
//                             ? "bg-indigo-600 text-white border-indigo-600"
//                             : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
//                         }`}
//                       >
//                         {ft}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </Field>
//               <Field label="Maximum File Size (MB)">
//                 <input
//                   type="number"
//                   min={1}
//                   value={maxFileSizeMb}
//                   onChange={(e) =>
//                     setMaxFileSizeMb(
//                       e.target.value === "" ? "" : Number(e.target.value),
//                     )
//                   }
//                   className={inputClass + " md:w-40"}
//                   placeholder="e.g. 25"
//                 />
//               </Field>
//             </>
//           )}

//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="allowResubmission"
//               checked={allowResubmission}
//               onChange={(e) => setAllowResubmission(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//             />
//             <label htmlFor="allowResubmission" className={checkboxRowClass}>
//               Allow Resubmission
//             </label>
//           </div>
//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="requireStudentComments"
//               checked={requireStudentComments}
//               onChange={(e) => setRequireStudentComments(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//             />
//             <label
//               htmlFor="requireStudentComments"
//               className={checkboxRowClass}
//             >
//               Require Student Comments on Submission
//             </label>
//           </div>
//         </FormSection>

//         {/* 7. Results & Feedback */}
//         <FormSection
//           title="Results & Feedback"
//           icon={<Eye className="w-4 h-4" />}
//           isOpen={openSections.results}
//           onToggle={() => toggleSection("results")}
//         >
//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="showScoreImmediately"
//               checked={showScoreImmediately}
//               onChange={(e) => setShowScoreImmediately(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//             />
//             <label htmlFor="showScoreImmediately" className={checkboxRowClass}>
//               Show Score Immediately After Grading
//             </label>
//           </div>

//           {!showScoreImmediately && (
//             <Field label="Release Results Date">
//               <input
//                 type="date"
//                 value={releaseResultsDate}
//                 onChange={(e) => setReleaseResultsDate(e.target.value)}
//                 className={inputClass + " md:w-60"}
//               />
//             </Field>
//           )}

//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="showCorrectAnswers"
//               checked={showCorrectAnswers}
//               onChange={(e) => setShowCorrectAnswers(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//             />
//             <label htmlFor="showCorrectAnswers" className={checkboxRowClass}>
//               Show Correct Answers After Submission
//             </label>
//           </div>
//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="allowStudentReview"
//               checked={allowStudentReview}
//               onChange={(e) => setAllowStudentReview(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500"
//             />
//             <label htmlFor="allowStudentReview" className={checkboxRowClass}>
//               Allow Student Review Session
//             </label>
//           </div>

//           <Field label="Default Teacher Feedback Template">
//             <textarea
//               value={teacherFeedback}
//               onChange={(e) => setTeacherFeedback(e.target.value)}
//               rows={2}
//               className={inputClass}
//               placeholder="Optional note shown alongside every graded submission"
//             />
//           </Field>
//         </FormSection>

//         <button
//           type="submit"
//           className="px-5 py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 dark:text-white rounded-lg font-bold transition w-full sm:w-auto"
//         >
//           Publish Assessment
//         </button>
//       </form>

//       <div className="space-y-6">
//         <h3 className="text-xl font-bold text-slate-900 dark:text-white">
//           Manage Assessments
//         </h3>
//         {courseAssessments.length === 0 ? (
//           <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 dark:text-slate-400">
//             No assessments created yet.
//           </div>
//         ) : (
//           courseAssessments.map((ass) => {
//             const subs = courseSubmissions.filter(
//               (s) => s.assessmentId === ass.id,
//             );
//             const isGrading = selectedAssessmentId === ass.id;

//             return (
//               <div
//                 key={ass.id}
//                 className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
//               >
//                 <div className="flex justify-between items-center mb-4">
//                   <div>
//                     <h4 className="font-bold text-lg text-slate-900 dark:text-white">
//                       {ass.title}
//                       {ass.isGroup && (
//                         <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
//                           Group
//                         </span>
//                       )}
//                     </h4>
//                     <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
//                       {ass.type}
//                       {ass.subject ? ` • ${ass.subject}` : ""}
//                       {ass.gradeLevel ? ` • ${ass.gradeLevel}` : ""} • Max:{" "}
//                       {ass.maxScore} pts • Due:{" "}
//                       {new Date(ass.dueDate).toLocaleDateString()}
//                     </p>
//                   </div>
//                   <button
//                     onClick={() =>
//                       setSelectedAssessmentId(isGrading ? null : ass.id)
//                     }
//                     className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition"
//                   >
//                     {isGrading
//                       ? "Close Submissions"
//                       : `View ${subs.length} Submissions`}
//                   </button>
//                 </div>

//                 {isGrading && (
//                   <div className="mt-4 pt-4 border-t border-slate-800">
//                     {subs.length === 0 ? (
//                       <p className="text-slate-500 text-sm italic">
//                         No submissions yet.
//                       </p>
//                     ) : (
//                       <div className="space-y-3">
//                         {subs.map((sub) => {
//                           const student = orgMembers.find(
//                             (m) =>
//                               m.email === sub.userId || m.id === sub.userId,
//                           ) || { name: "Unknown Student" };
//                           return (
//                             <div
//                               key={sub.id}
//                               className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-lg"
//                             >
//                               <div className="mb-3 sm:mb-0">
//                                 <div className="font-semibold text-slate-900 dark:text-white">
//                                   {student.name}
//                                 </div>
//                                 <div className="text-sm text-indigo-400 truncate max-w-xs">
//                                   <a
//                                     href={sub.content}
//                                     target="_blank"
//                                     rel="noreferrer"
//                                     className="hover:underline"
//                                   >
//                                     {sub.content}
//                                   </a>
//                                 </div>
//                                 {sub.fileUrl && (
//                                   <a
//                                     href={sub.fileUrl}
//                                     target="_blank"
//                                     rel="noreferrer"
//                                     className="flex items-center text-sm text-indigo-400 hover:underline mt-1"
//                                   >
//                                     <Paperclip className="w-4 h-4 mr-1" /> View
//                                     Attachment
//                                   </a>
//                                 )}
//                               </div>
//                               <div className="flex items-center space-x-3">
//                                 {sub.status === "graded" ? (
//                                   <div className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
//                                     {sub.score} / {ass.maxScore}
//                                   </div>
//                                 ) : (
//                                   <>
//                                     <input
//                                       type="number"
//                                       max={ass.maxScore}
//                                       value={gradingScores[sub.id] || ""}
//                                       onChange={(e) =>
//                                         setGradingScores({
//                                           ...gradingScores,
//                                           [sub.id]: Number(e.target.value),
//                                         })
//                                       }
//                                       placeholder="Score"
//                                       className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center"
//                                     />
//                                     <button
//                                       onClick={() =>
//                                         handleGradeSubmission(sub.id)
//                                       }
//                                       className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded text-sm font-bold transition"
//                                     >
//                                       Grade
//                                     </button>
//                                   </>
//                                 )}
//                               </div>
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// };

// import React, { useState } from "react";
// import { useAppContext } from "../../store/AppContext";
// import { useAuth } from "../../store/AuthContext";
// import { Assessment, Submission } from "../../types";
// import { Award, Plus, Paperclip, X } from "lucide-react";
// import { ProctoringSession } from "./ProctoringSession";
// import { FileUpload } from "./FileUpload";
// import { generateId } from "../../lib/id";

// export const CourseAssessments = ({
//   courseId,
//   isStudent,
// }: {
//   courseId: string;
//   isStudent: boolean;
// }) => {
//   const {
//     assessments,
//     submissions,
//     addAssessment,
//     addSubmission,
//     updateSubmissionScore,
//     orgMembers,
//   } = useAppContext();
//   const { currentUser } = useAuth();
//   const courseAssessments = assessments.filter((a) => a.courseId === courseId);
//   const courseSubmissions = submissions.filter((s) => s.courseId === courseId);

//   const [title, setTitle] = useState("");
//   const [type, setType] = useState<"assignment" | "test" | "exam" | "project">(
//     "assignment",
//   );
//   const [maxScore, setMaxScore] = useState(100);
//   const [dueDate, setDueDate] = useState("");
//   const [isGroup, setIsGroup] = useState(false);

//   // For grading
//   const [selectedAssessmentId, setSelectedAssessmentId] = useState<
//     string | null
//   >(null);
//   const [gradingScores, setGradingScores] = useState<Record<string, number>>(
//     {},
//   );

//   // For submitting
//   const [submissionContent, setSubmissionContent] = useState("");
//   const [submissionFileUrl, setSubmissionFileUrl] = useState("");
//   const [activeProctoringId, setActiveProctoringId] = useState<string | null>(
//     null,
//   );

//   const handleCreateAssessment = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const newAssessment: Assessment = {
//       id: generateId("ass"),
//       courseId,
//       title,
//       type,
//       maxScore: Number(maxScore),
//       dueDate,
//       isGroup,
//     };
//     await addAssessment(newAssessment);
//     setTitle("");
//     setMaxScore(100);
//     setDueDate("");
//     setIsGroup(false);
//   };

//   const handleSubmitAssessment = async (assessmentId: string) => {
//     if (!currentUser || (!submissionContent.trim() && !submissionFileUrl))
//       return;
//     const sub: Submission = {
//       id: generateId("sub"),
//       assessmentId,
//       userId: currentUser.id,
//       courseId,
//       submittedAt: new Date().toISOString(),
//       content: submissionContent,
//       fileUrl: submissionFileUrl,
//       status: "submitted",
//     };
//     await addSubmission(sub);
//     setSubmissionContent("");
//     setSubmissionFileUrl("");
//   };

//   const handleGradeSubmission = async (submissionId: string) => {
//     const score = gradingScores[submissionId] || 0;
//     await updateSubmissionScore(submissionId, score, "Graded by instructor");
//   };

//   if (isStudent) {
//     // Transcript view & Submission
//     const mySubmissions = courseSubmissions.filter(
//       (s) => s.userId === currentUser?.id,
//     );
//     const totalScore = mySubmissions.reduce(
//       (acc, sub) => acc + (sub.score || 0),
//       0,
//     );
//     const totalMaxScore = courseAssessments.reduce(
//       (acc, ass) => acc + ass.maxScore,
//       0,
//     );
//     const gpa =
//       totalMaxScore > 0
//         ? ((totalScore / totalMaxScore) * 4.0).toFixed(2)
//         : "N/A";

//     return (
//       <div className="space-y-6">
//         <div className="bg-indigo-900/40 p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
//           <div>
//             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center">
//               <Award className="w-5 h-5 mr-2 text-amber-400" /> Academic
//               Transcript
//             </h3>
//             <p className="text-sm text-indigo-200">
//               Track your performance across assignments and exams.
//             </p>
//           </div>
//           <div className="text-right">
//             <div className="text-3xl font-black text-slate-900 dark:text-white">
//               {totalScore}{" "}
//               <span className="text-lg text-indigo-300 font-medium">
//                 / {totalMaxScore}
//               </span>
//             </div>
//             <div className="text-sm font-semibold text-emerald-400 mt-1">
//               GPA Equivalent: {gpa}
//             </div>
//           </div>
//         </div>

//         <div className="space-y-4">
//           {courseAssessments.length === 0 ? (
//             <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
//               No assessments scheduled yet.
//             </div>
//           ) : (
//             courseAssessments.map((ass) => {
//               const sub = mySubmissions.find((s) => s.assessmentId === ass.id);
//               return (
//                 <div
//                   key={ass.id}
//                   className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
//                 >
//                   <div className="flex justify-between items-start mb-4">
//                     <div>
//                       <h4 className="font-bold text-lg text-slate-900 dark:text-white">
//                         {ass.title}
//                         {ass.isGroup && (
//                           <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
//                             Group
//                           </span>
//                         )}
//                       </h4>
//                       <div className="flex space-x-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
//                         <span className="capitalize">{ass.type}</span>
//                         <span>•</span>
//                         <span>
//                           Due: {new Date(ass.dueDate).toLocaleDateString()}
//                         </span>
//                         <span>•</span>
//                         <span>Score: {ass.maxScore} pts</span>
//                       </div>
//                     </div>
//                     {sub ? (
//                       <div className="flex flex-col items-end">
//                         {sub.status === "graded" ? (
//                           <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-center mb-2">
//                             <div className="text-xs uppercase font-bold tracking-wider mb-1">
//                               Graded
//                             </div>
//                             <div className="font-black text-xl">
//                               {sub.score}{" "}
//                               <span className="text-sm text-emerald-500/70">
//                                 / {ass.maxScore}
//                               </span>
//                             </div>
//                           </div>
//                         ) : (
//                           <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm font-semibold rounded-full border border-amber-500/20 mb-2">
//                             Pending Review
//                           </span>
//                         )}
//                         {sub.fileUrl && (
//                           <a
//                             href={sub.fileUrl}
//                             target="_blank"
//                             rel="noreferrer"
//                             className="flex items-center text-sm text-indigo-400 hover:underline"
//                           >
//                             <Paperclip className="w-4 h-4 mr-1" /> My Attachment
//                           </a>
//                         )}
//                       </div>
//                     ) : (
//                       <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-full">
//                         Not Submitted
//                       </span>
//                     )}
//                   </div>
//                   {!sub && (
//                     <div className="mt-4 pt-4 border-t border-slate-800">
//                       {(ass.type === "exam" || ass.type === "test") &&
//                       activeProctoringId !== ass.id ? (
//                         <button
//                           onClick={() => setActiveProctoringId(ass.id)}
//                           className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white rounded-lg font-bold transition flex items-center justify-center"
//                         >
//                           Start Monitored Session
//                         </button>
//                       ) : (
//                         <div className="space-y-4">
//                           {(ass.type === "exam" || ass.type === "test") &&
//                             activeProctoringId === ass.id && (
//                               <ProctoringSession
//                                 assessmentTitle={ass.title}
//                                 onComplete={() => setActiveProctoringId(null)}
//                               />
//                             )}
//                           <div className="flex flex-col space-y-3">
//                             {submissionFileUrl && (
//                               <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
//                                 <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
//                                   Attached: Document
//                                 </span>
//                                 <button
//                                   onClick={() => setSubmissionFileUrl("")}
//                                   className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
//                                 >
//                                   <X className="w-4 h-4" />
//                                 </button>
//                               </div>
//                             )}
//                             <div className="flex space-x-3">
//                               <FileUpload
//                                 label=""
//                                 onUpload={(url) => setSubmissionFileUrl(url)}
//                               />
//                               <input
//                                 type="text"
//                                 value={submissionContent}
//                                 onChange={(e) =>
//                                   setSubmissionContent(e.target.value)
//                                 }
//                                 placeholder="Link to your work or text"
//                                 className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
//                               />
//                               <button
//                                 onClick={() => {
//                                   handleSubmitAssessment(ass.id);
//                                   setActiveProctoringId(null);
//                                 }}
//                                 disabled={
//                                   (!submissionContent.trim() &&
//                                     !submissionFileUrl) ||
//                                   ((ass.type === "exam" ||
//                                     ass.type === "test") &&
//                                     activeProctoringId !== ass.id)
//                                 }
//                                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-lg font-medium transition"
//                               >
//                                 Submit
//                               </button>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               );
//             })
//           )}
//         </div>
//       </div>
//     );
//   }

//   // Instructor / Org View
//   return (
//     <div className="space-y-8">
//       <form
//         onSubmit={handleCreateAssessment}
//         className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl"
//       >
//         <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
//           <Plus className="w-5 h-5 mr-2 text-indigo-400" /> Create New
//           Assessment
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//           <div>
//             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
//               Title
//             </label>
//             <input
//               required
//               type="text"
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
//               placeholder="e.g. Midterm Exam"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
//               Type
//             </label>
//             <select
//               value={type}
//               onChange={(e) =>
//                 setType(
//                   e.target.value as "assignment" | "test" | "exam" | "project",
//                 )
//               }
//               className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
//             >
//               <option value="assignment">Assignment</option>
//               <option value="test">Test</option>
//               <option value="exam">Exam</option>
//               <option value="project">Project</option>
//             </select>
//           </div>
//           <div>
//             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
//               Due Date
//             </label>
//             <input
//               required
//               type="date"
//               value={dueDate}
//               onChange={(e) => setDueDate(e.target.value)}
//               className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
//               Max Score
//             </label>
//             <input
//               required
//               type="number"
//               min={1}
//               value={maxScore}
//               onChange={(e) => setMaxScore(Number(e.target.value))}
//               className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//         </div>
//         {(type === "assignment" || type === "project") && (
//           <div className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               id="isGroup"
//               checked={isGroup}
//               onChange={(e) => setIsGroup(e.target.checked)}
//               className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
//             />
//             <label
//               htmlFor="isGroup"
//               className="text-sm text-slate-600 dark:text-slate-300 font-medium"
//             >
//               Group Assessment (Students can work in teams)
//             </label>
//           </div>
//         )}
//         <button
//           type="submit"
//           className="px-5 py-2.5 mt-6 bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-shadow-slate-100 dark:text-white rounded-lg font-bold transition w-full sm:w-auto"
//         >
//           Publish Assessment
//         </button>
//       </form>

//       <div className="space-y-6">
//         <h3 className="text-xl font-bold text-slate-900 dark:text-white">
//           Manage Assessments
//         </h3>
//         {courseAssessments.length === 0 ? (
//           <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 dark:text-slate-400">
//             No assessments created yet.
//           </div>
//         ) : (
//           courseAssessments.map((ass) => {
//             const subs = courseSubmissions.filter(
//               (s) => s.assessmentId === ass.id,
//             );
//             const isGrading = selectedAssessmentId === ass.id;

//             return (
//               <div
//                 key={ass.id}
//                 className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
//               >
//                 <div className="flex justify-between items-center mb-4">
//                   <div>
//                     <h4 className="font-bold text-lg text-slate-900 dark:text-white">
//                       {ass.title}
//                       {ass.isGroup && (
//                         <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
//                           Group
//                         </span>
//                       )}
//                     </h4>
//                     <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
//                       {ass.type} • Max: {ass.maxScore} pts • Due:{" "}
//                       {new Date(ass.dueDate).toLocaleDateString()}
//                     </p>
//                   </div>
//                   <button
//                     onClick={() =>
//                       setSelectedAssessmentId(isGrading ? null : ass.id)
//                     }
//                     className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition"
//                   >
//                     {isGrading
//                       ? "Close Submissions"
//                       : `View ${subs.length} Submissions`}
//                   </button>
//                 </div>

//                 {isGrading && (
//                   <div className="mt-4 pt-4 border-t border-slate-800">
//                     {subs.length === 0 ? (
//                       <p className="text-slate-500 text-sm italic">
//                         No submissions yet.
//                       </p>
//                     ) : (
//                       <div className="space-y-3">
//                         {subs.map((sub) => {
//                           const student = orgMembers.find(
//                             (m) =>
//                               m.email === sub.userId || m.id === sub.userId,
//                           ) || { name: "Unknown Student" };
//                           return (
//                             <div
//                               key={sub.id}
//                               className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-lg"
//                             >
//                               <div className="mb-3 sm:mb-0">
//                                 <div className="font-semibold text-slate-900 dark:text-white">
//                                   {student.name}
//                                 </div>
//                                 <div className="text-sm text-indigo-400 truncate max-w-xs">
//                                   <a
//                                     href={sub.content}
//                                     target="_blank"
//                                     rel="noreferrer"
//                                     className="hover:underline"
//                                   >
//                                     {sub.content}
//                                   </a>
//                                 </div>
//                                 {sub.fileUrl && (
//                                   <a
//                                     href={sub.fileUrl}
//                                     target="_blank"
//                                     rel="noreferrer"
//                                     className="flex items-center text-sm text-indigo-400 hover:underline mt-1"
//                                   >
//                                     <Paperclip className="w-4 h-4 mr-1" /> View
//                                     Attachment
//                                   </a>
//                                 )}
//                               </div>
//                               <div className="flex items-center space-x-3">
//                                 {sub.status === "graded" ? (
//                                   <div className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
//                                     {sub.score} / {ass.maxScore}
//                                   </div>
//                                 ) : (
//                                   <>
//                                     <input
//                                       type="number"
//                                       max={ass.maxScore}
//                                       value={gradingScores[sub.id] || ""}
//                                       onChange={(e) =>
//                                         setGradingScores({
//                                           ...gradingScores,
//                                           [sub.id]: Number(e.target.value),
//                                         })
//                                       }
//                                       placeholder="Score"
//                                       className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center"
//                                     />
//                                     <button
//                                       onClick={() =>
//                                         handleGradeSubmission(sub.id)
//                                       }
//                                       className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded text-sm font-bold transition"
//                                     >
//                                       Grade
//                                     </button>
//                                   </>
//                                 )}
//                               </div>
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// };
