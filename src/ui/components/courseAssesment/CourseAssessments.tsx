import React from "react";
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
        addAssessment={addAssessment}
        instructorDefaultName={currentUser?.name}
      />
    </div>
  );
};
