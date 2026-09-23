import { Assessment, AssessmentType } from "../../../types";

export const QUESTION_TYPES: {
  value: NonNullable<Assessment["questionType"]>;
  label: string;
}[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay" },
  { value: "file_upload", label: "File Upload" },
  { value: "mixed", label: "Mixed" },
];

export const FILE_TYPE_OPTIONS = [
  "PDF",
  "DOCX",
  "PNG",
  "JPG",
  "ZIP",
  "XLSX",
  "PPTX",
];

export const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "test", label: "Test" },
  { value: "exam", label: "Exam" },
  { value: "project", label: "Project" },
  { value: "classwork", label: "Classwork" },
];
