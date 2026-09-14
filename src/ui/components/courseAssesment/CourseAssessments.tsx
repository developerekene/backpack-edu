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
    courses,
  } = useAppContext();
  const { currentUser } = useAuth();

  const courseAssessments = assessments.filter((a) => a.courseId === courseId);
  const courseSubmissions = submissions.filter((s) => s.courseId === courseId);

  // orgMembers from context is a platform-wide list (every organization's
  // members, loaded across all backpack docs). Never hand that raw list to
  // the assessment form/list -- scope it down to students belonging to the
  // organization that owns this course.
  const normalizeOrgId = (id?: string) =>
    id?.startsWith("org_") ? id.slice(4) : id;
  const course = courses.find((c) => c.id === courseId);
  const courseOrgId = normalizeOrgId(course?.orgId);
  const orgStudentsRaw = orgMembers.filter(
    (m) =>
      m.role === "student" &&
      courseOrgId !== undefined &&
      normalizeOrgId(m.orgId) === courseOrgId,
  );
  // Multiple invite/membership records can exist for the same person (e.g.
  // separate invites per course). Collapse to one row per person so they
  // don't show up twice in the assigned-students list.
  const seenIdentities = new Set<string>();
  const orgStudents = orgStudentsRaw.filter((m) => {
    const identity = (m.email || m.name || m.id || "").toLowerCase();
    if (seenIdentities.has(identity)) return false;
    seenIdentities.add(identity);
    return true;
  });

  if (isStudent) {
    return (
      <StudentTranscriptView
        courseId={courseId}
        courseAssessments={courseAssessments}
        courseSubmissions={courseSubmissions}
        currentUserId={currentUser?.id}
        currentUserName={currentUser?.name}
        addSubmission={addSubmission}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CreateAssessmentForm
        courseId={courseId}
        orgMembers={orgStudents}
        instructorDefaultName={currentUser?.name}
        addAssessment={addAssessment}
      />
      <ManageAssessmentsList
        courseAssessments={courseAssessments}
        courseSubmissions={courseSubmissions}
        orgMembers={orgMembers}
        updateSubmissionScore={updateSubmissionScore}
        addSubmission={addSubmission}
        addAssessment={addAssessment}
        instructorDefaultName={currentUser?.name}
      />
    </div>
  );
};
