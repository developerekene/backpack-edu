import { useState } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import {
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  TrendingUp,
  Award,
  PlayCircle,
  Eye,
  CreditCard,
  Ban,
  AlertTriangle,
  RotateCcw,
  DoorOpen,
  DoorClosed,
  Settings2,
  Mail,
  UserCheck,
  Paperclip,
  Bell,
  Trash2,
  Building2,
} from "lucide-react";
import { AnalyticsOverview } from "../components/AnalyticsOverview";
import { StudentReviewModal } from "../components/StudentReviewModal";
import { CoursePaymentModal } from "../components/CoursePaymentModal";
import { CourseJoinModal } from "../components/CourseJoinModal";
import { AdmissionSessionManagerModal } from "../components/AdmissionSessionManagerModal";
import { EnrollmentModal } from "../components/EnrollmentModal";
import { KnowledgeCityBanner } from "../components/instructor/KnowledgeCityBanner";
import { EnrollmentRequest, Course, OrgMember } from "../../types";
import { Link } from "react-router-dom";
import { AssessmentsOverview } from "../components/courseAssesment/AssessmentOverview";

const Dashboard = () => {
  const {
    enrollmentRequests,
    updateEnrollmentRequest,
    cancelEnrollmentRequest,
    addEnrollmentRequest,
    openCourseAdmission,
    closeCourseAdmission,
    courses,
    userProgress,
    orgMembers,
    organizations,
    deleteOrgMember,
    assessments,
    submissions,
  } = useAppContext();
  const { currentUser } = useAuth();
  const [selectedReviewReq, setSelectedReviewReq] =
    useState<EnrollmentRequest | null>(null);
  const [paymentModalReq, setPaymentModalReq] =
    useState<EnrollmentRequest | null>(null);
  const [joiningInvite, setJoiningInvite] = useState<{
    course: Course;
    invite: OrgMember;
  } | null>(null);
  const [reapplyReq, setReapplyReq] = useState<EnrollmentRequest | null>(null);
  const [selectedCourseForSessions, setSelectedCourseForSessions] =
    useState<Course | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (!currentUser)
    return <div className="p-8 text-center text-slate-500">Please login.</div>;

  const handleConfirmCancel = async (id: string) => {
    setCancelling(true);
    try {
      await cancelEnrollmentRequest(id);
    } catch (err) {
      console.error("Failed to cancel application", err);
    } finally {
      setCancelling(false);
      setConfirmCancelId(null);
    }
  };

  // Student Dashboard Logic
  const studentRequests = enrollmentRequests.filter(
    (r) => r.userId === currentUser.id,
  );
  const studentInvites = orgMembers.filter(
    (m) =>
      m.email?.toLowerCase() === currentUser.email?.toLowerCase() &&
      m.status === "invited" &&
      m.role === "student",
  );
  const approvedCoursesIds = studentRequests
    .filter(
      (r) =>
        r.status === "approved" &&
        (courses.find((c) => c.id === r.courseId)?.price === 0 ||
          r.paymentStatus === "paid"),
    )
    .map((r) => r.courseId);

  const enrolledCourses = courses.filter((c) =>
    approvedCoursesIds.includes(c.id),
  );
  const studentProgressList = userProgress.filter(
    (p) => p.userId === currentUser.id,
  );
  const averageScore =
    studentProgressList.length > 0
      ? studentProgressList.reduce(
          (acc, curr) => acc + curr.performanceScore,
          0,
        ) / studentProgressList.length
      : 0;

  if (currentUser.role === "student") {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Student Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Welcome back, {currentUser.name}
            </p>
          </div>
        </div>

        {/* Dedicated Pending Course Invitations Card */}
        {studentInvites.length > 0 && (
          <div
            id="pending-course-invitations"
            className="bg-white dark:bg-slate-800 border-2 border-indigo-500/30 dark:border-indigo-500/40 rounded-3xl p-6 space-y-5 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    Pending Course Invitations
                    <span className="ml-2 px-2.5 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
                      {studentInvites.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Direct course invitations issued by partner organizations
                    for your student enrollment
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {studentInvites.map((invite) => {
                const targetCourse =
                  courses.find((c) => invite.courseIds?.includes(c.id)) ||
                  courses.find((c) => c.orgId === invite.orgId);
                if (!targetCourse) return null;

                const sponsoringOrg = organizations.find(
                  (o) =>
                    o.id === invite.orgId ||
                    o.id === targetCourse.orgId ||
                    o.ownerId === invite.orgId,
                );
                const requiresFee =
                  invite.requiresPayment !== false && targetCourse.price > 0;
                const requiresDocs =
                  invite.requiresDocuments !== false &&
                  ((invite.requiredDocNames &&
                    invite.requiredDocNames.length > 0) ||
                    (targetCourse.requiredDocuments &&
                      targetCourse.requiredDocuments.length > 0));

                return (
                  <div
                    key={invite.id}
                    className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
                          <Building2 className="w-3 h-3 mr-1" />
                          {sponsoringOrg?.name || "Sponsoring Organization"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {invite.joinedAt}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                        {targetCourse.title}
                      </h3>

                      {targetCourse.qualificationType && (
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Qualification:{" "}
                          <span className="text-slate-700 dark:text-slate-200 font-semibold capitalize">
                            {targetCourse.qualificationType}
                          </span>
                        </div>
                      )}

                      {invite.inviteNote && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          "{invite.inviteNote}"
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                        {requiresFee ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex items-center border border-amber-500/20">
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Fee:{" "}
                            {targetCourse.currency}{" "}
                            {targetCourse.price.toLocaleString()}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Fee
                            Waived by Org
                          </span>
                        )}

                        {requiresDocs ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex items-center border border-amber-500/20">
                            <Paperclip className="w-3.5 h-3.5 mr-1" /> Docs
                            Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> No Docs
                            Required
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() =>
                          setJoiningInvite({ course: targetCourse, invite })
                        }
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Accept & Join Course</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (
                            confirm(
                              "Are you sure you want to decline this course invitation?",
                            )
                          ) {
                            await deleteOrgMember(invite.id);
                          }
                        }}
                        className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center space-x-1"
                        title="Decline Invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Knowledge City banner for individual course purchases */}
        <KnowledgeCityBanner variant="student" />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center space-x-4 shadow-sm">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Enrolled Courses
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {enrolledCourses.length}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center space-x-4 shadow-sm">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Modules Completed
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {studentProgressList.reduce(
                  (acc, curr) => acc + curr.completedModuleIds.length,
                  0,
                )}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center space-x-4 shadow-sm">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Average Score
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {averageScore.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Applications & Payment Status with Cancel Application capability */}
        {studentRequests.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                  <span>Course Applications & Admissions</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track application reviews, uploaded documents, tuition
                  requirements, and cancel if needed.
                </p>
              </div>
              <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 font-bold self-start">
                {studentRequests.length}{" "}
                {studentRequests.length === 1 ? "Application" : "Applications"}
              </span>
            </div>

            <div className="space-y-3.5">
              {studentRequests.map((req) => {
                const reqCourse = courses.find((c) => c.id === req.courseId);
                const isFree = !reqCourse || reqCourse.price === 0;
                const isPaid = req.paymentStatus === "paid";
                const canCancel =
                  req.status === "pending" ||
                  (req.status === "approved" && !isFree && !isPaid);

                return (
                  <div
                    key={req.id}
                    className="p-5 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                          {req.courseTitle ||
                            reqCourse?.title ||
                            "Course Application"}
                        </h3>
                        {req.sessionName && (
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold">
                            Session: {req.sessionName}
                          </span>
                        )}
                        {req.documents &&
                          Object.keys(req.documents).length > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                              {Object.keys(req.documents).length} Documents
                              Uploaded
                            </span>
                          )}
                        {req.reapplicationHistory &&
                          req.reapplicationHistory.length > 0 && (
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-md text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                              Attempt #{req.reapplicationHistory.length + 1}
                            </span>
                          )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span>
                          Payment Plan:{" "}
                          <strong className="text-slate-700 dark:text-slate-300 capitalize">
                            {req.paymentMethod === "installment"
                              ? "3-Split Installments"
                              : "Pay in Full"}
                          </strong>
                        </span>
                        {reqCourse && (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            ({reqCourse.currency}{" "}
                            {reqCourse.price.toLocaleString()})
                          </span>
                        )}
                        {req.appliedAt && (
                          <span className="text-slate-400">
                            Applied on{" "}
                            {new Date(req.appliedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {req.status === "rejected" && req.rejectionReason && (
                        <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
                          <strong className="font-bold">
                            Reviewer Feedback:
                          </strong>{" "}
                          "{req.rejectionReason}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2.5 flex-wrap">
                      {req.status === "pending" && (
                        <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5" /> Under Review
                        </span>
                      )}

                      {req.status === "rejected" && (
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center">
                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Declined
                          </span>
                          {reqCourse &&
                          reqCourse.admissionStatus !== "closed" ? (
                            <button
                              onClick={() => setReapplyReq(req)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />{" "}
                              Reapply (Session:{" "}
                              {reqCourse.activeSessionName || "Next"})
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                              Admissions Closed (Awaiting Next Intake)
                            </span>
                          )}
                        </div>
                      )}

                      {req.status === "cancelled" && (
                        <span className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center">
                          <Ban className="w-3.5 h-3.5 mr-1.5" /> Application
                          Cancelled
                        </span>
                      )}

                      {req.status === "approved" &&
                        (isFree || isPaid ? (
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center">
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />{" "}
                              Enrolled
                            </span>
                            <Link
                              to={`/course/${req.courseId}`}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                              Go to Classroom
                            </Link>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center">
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />{" "}
                              Accepted (Tuition Due)
                            </span>
                            <button
                              onClick={() => setPaymentModalReq(req)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-md shadow-emerald-600/20"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Pay
                              Tuition
                            </button>
                          </div>
                        ))}

                      {/* Cancel Application Button */}
                      {canCancel && (
                        <button
                          onClick={() => setConfirmCancelId(req.id)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-xs font-bold transition border border-transparent hover:border-red-300 dark:hover:border-red-800 flex items-center"
                          title="Cancel this application"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          <span>Cancel Application</span>
                        </button>
                      )}

                      {req.status === "cancelled" && (
                        <Link
                          to={`/course/${req.courseId}`}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition"
                        >
                          Re-apply
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Enrolled Courses */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            My Enrolled Courses
          </h2>
          {enrolledCourses.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700 border-dashed space-y-4">
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
                {studentRequests.length > 0
                  ? "Your applications are currently undergoing review or waiting for tuition payment."
                  : "You have not enrolled in any organization courses yet."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/explore"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center shadow-lg shadow-indigo-600/25"
                >
                  <span>Explore Organizations</span>
                  <BookOpen className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrolledCourses.map((course) => {
                const progress = userProgress.find(
                  (p) =>
                    p.courseId === course.id && p.userId === currentUser.id,
                );
                const completedCount = progress?.completedModuleIds.length || 0;
                const percent =
                  course.modules.length > 0
                    ? (completedCount / course.modules.length) * 100
                    : 0;

                return (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 hover:border-indigo-400 transition group shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                          <Link to={`/course/${course.id}`}>
                            {course.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {course.modules.length} Modules
                        </p>
                      </div>
                      {percent >= 100 && (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center border border-emerald-500/20">
                          <Award className="w-3.5 h-3.5 mr-1" /> Mastered
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2.5 mb-4 border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                        {Math.min(percent, 100).toFixed(0)}% Complete
                      </span>
                      {percent < 100 ? (
                        <Link
                          to={`/course/${course.id}`}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" /> Resume
                          Course
                        </Link>
                      ) : (
                        <Link
                          to={`/course/${course.id}`}
                          className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center hover:underline"
                        >
                          Review Materials{" "}
                          <CheckCircle className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation modal for cancelling application */}
        {confirmCancelId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cancel Course Application?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to cancel this application? The
                  reviewing organization will be notified and your submission
                  will be withdrawn.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmCancelId(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Keep Application
                </button>
                <button
                  onClick={() => handleConfirmCancel(confirmCancelId)}
                  disabled={cancelling}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20"
                >
                  {cancelling ? "Cancelling..." : "Yes, Cancel Application"}
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentModalReq &&
          courses.find((c) => c.id === paymentModalReq.courseId) && (
            <CoursePaymentModal
              course={courses.find((c) => c.id === paymentModalReq.courseId)!}
              request={paymentModalReq}
              onClose={() => setPaymentModalReq(null)}
              onPaymentSuccess={async () => {
                await updateEnrollmentRequest(
                  paymentModalReq.id,
                  undefined,
                  "paid",
                );
                setPaymentModalReq(null);
              }}
            />
          )}

        {joiningInvite && (
          <CourseJoinModal
            course={joiningInvite.course}
            invite={joiningInvite.invite}
            onClose={() => setJoiningInvite(null)}
            onJoinSuccess={() => setJoiningInvite(null)}
          />
        )}
      </div>
    );
  }

  // Organization / Instructor Dashboard Logic
  const myOrgMemberRecords = orgMembers.filter(
    (m) => m.email === currentUser.email,
  );
  let assignedCourseIds: string[] = [];
  myOrgMemberRecords.forEach((record) => {
    if (record.courseIds) {
      assignedCourseIds = [...assignedCourseIds, ...record.courseIds];
    }
  });

  const myCourses =
    currentUser.role === "organization"
      ? courses.filter(
          (c) =>
            c.orgId === currentUser.id || c.orgId === `org_${currentUser.id}`,
        )
      : courses.filter((c) => assignedCourseIds.includes(c.id));

  const orgRequests =
    currentUser.role === "organization"
      ? enrollmentRequests.filter(
          (r) =>
            r.orgId === currentUser.id || r.orgId === `org_${currentUser.id}`,
        )
      : enrollmentRequests.filter((r) =>
          assignedCourseIds.includes(r.courseId),
        );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            {currentUser.role === "organization"
              ? "Organization Management Dashboard"
              : "Instructor Teaching Dashboard"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {currentUser.role === "organization"
              ? "Manage cohorts, review student admissions, inspect uploaded documents, and track analytics."
              : "Manage your assigned institutional courses, student applications, and grading."}
          </p>
        </div>
      </div>

      {/* Knowledge City banner for independent/freelance instructors only */}
      {currentUser.role === "instructor" && (
        <KnowledgeCityBanner variant="instructor" />
      )}

      {currentUser.role === "organization" && (
        <AnalyticsOverview
          courses={myCourses}
          progressData={userProgress}
          enrollmentRequests={enrollmentRequests}
          orgMembers={orgMembers}
        />
      )}

      {/* Student Applications & Review Board */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-500" />
              Admissions & Document Review Board
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review submitted student requirement documents, verify
              qualifications, and approve admission.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full shrink-0 self-start sm:self-auto border border-indigo-500/20">
            {orgRequests.filter((r) => r.status === "pending").length} Pending
            Review
          </span>
        </div>

        {orgRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No student enrollment applications received yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {orgRequests.map((req) => {
              const hasDocs =
                req.documents && Object.keys(req.documents).length > 0;
              return (
                <div
                  key={req.id}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <p className="font-bold text-slate-900 dark:text-white text-base">
                        {req.userName || "Applicant"}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          req.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : req.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : req.status === "cancelled"
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        }`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                      {hasDocs && (
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                          {Object.keys(req.documents!).length} Documents
                          Attached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Applied for{" "}
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {req.courseTitle}
                      </span>
                      {req.sessionName && (
                        <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-semibold">
                          Intake: {req.sessionName}
                        </span>
                      )}
                      {req.reapplicationHistory &&
                        req.reapplicationHistory.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                            Reapplication #{req.reapplicationHistory.length + 1}
                          </span>
                        )}
                      {req.paymentMethod && (
                        <span className="ml-2 text-indigo-500 dark:text-indigo-400 font-medium">
                          (
                          {req.paymentMethod === "installment"
                            ? "Installments"
                            : "Full Payment"}
                          )
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedReviewReq(req)}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center border border-indigo-200 dark:border-indigo-800"
                    >
                      <Eye className="w-4 h-4 mr-1.5" /> Review Application &
                      Docs
                    </button>

                    {req.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateEnrollmentRequest(req.id, "approved")
                          }
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition"
                          title="Quick Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedReviewReq(req)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition"
                          title="Review with Feedback to Decline"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assessments Overview */}
      <AssessmentsOverview
        myCourses={myCourses}
        assessments={assessments}
        submissions={submissions}
      />

      {/* Courses Overview & Admission Session Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Active Courses & Admission Sessions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control intake sessions, open/close admissions, and configure
              deadlines.
            </p>
          </div>
          <Link
            to="/upload-course"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            + Add Course
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myCourses.map((course) => {
            const isOpen = course.admissionStatus !== "closed";
            return (
              <div
                key={course.id}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                      {course.title}
                    </h3>
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isOpen
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {isOpen ? (
                        <>
                          <DoorOpen className="w-3 h-3 mr-1" /> Open
                        </>
                      ) : (
                        <>
                          <DoorClosed className="w-3 h-3 mr-1" /> Closed
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {course.modules.length} Modules • {course.currency}{" "}
                    {course.price.toLocaleString()}
                  </p>
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="font-medium truncate">
                      Active Intake:{" "}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {course.activeSessionName || "Current Session"}
                      </strong>
                    </span>
                    {currentUser.role === "organization" && (
                      <button
                        onClick={() => setSelectedCourseForSessions(course)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center shrink-0 ml-2"
                      >
                        <Settings2 className="w-3.5 h-3.5 mr-1" /> Sessions
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  {currentUser.role === "organization" ? (
                    <button
                      onClick={async () => {
                        if (isOpen) {
                          await closeCourseAdmission(course.id);
                        } else {
                          await openCourseAdmission(
                            course.id,
                            course.activeSessionId,
                          );
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition border ${
                        isOpen
                          ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100"
                          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {isOpen ? "Close Admission" : "Open Admission"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium italic">
                      Managed by Organization
                    </span>
                  )}
                  <Link
                    to={`/course/${course.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                  >
                    View Classroom &rarr;
                  </Link>
                  {/* <div className="flex items-center space-x-3">
                    <Link
                      to={`/course/${course.id}`}
                      className="text-slate-500 dark:text-slate-400 hover:underline font-bold"
                    >
                      Assessments
                    </Link>
                    <Link
                      to={`/course/${course.id}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    >
                      View Classroom &rarr;
                    </Link>
                  </div> */}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedReviewReq && (
        <StudentReviewModal
          request={selectedReviewReq}
          course={courses.find((c) => c.id === selectedReviewReq.courseId)}
          onClose={() => setSelectedReviewReq(null)}
          onApprove={(id) => updateEnrollmentRequest(id, "approved")}
          onReject={(id, reason) =>
            updateEnrollmentRequest(id, "rejected", undefined, reason)
          }
        />
      )}

      {selectedCourseForSessions && (
        <AdmissionSessionManagerModal
          course={selectedCourseForSessions}
          onClose={() => setSelectedCourseForSessions(null)}
        />
      )}

      {joiningInvite && (
        <CourseJoinModal
          course={joiningInvite.course}
          invite={joiningInvite.invite}
          onClose={() => setJoiningInvite(null)}
          onJoinSuccess={() => setJoiningInvite(null)}
        />
      )}

      {reapplyReq && courses.find((c) => c.id === reapplyReq.courseId) && (
        <EnrollmentModal
          course={courses.find((c) => c.id === reapplyReq.courseId)!}
          isReapplication={true}
          previousRequest={reapplyReq}
          onClose={() => setReapplyReq(null)}
          onEnroll={async (reqData) => {
            await addEnrollmentRequest(reqData);
            setReapplyReq(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
