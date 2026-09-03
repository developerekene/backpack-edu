import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import {
  Book,
  MessageSquare,
  FileText,
  CheckCircle,
  Send,
  Upload,
  Paperclip,
  Users,
  Award,
  Calendar,
  Video,
  Info,
  X,
  Clock,
  CreditCard,
  Rocket,
  Building,
  DoorOpen,
  DoorClosed,
  RotateCcw,
  Settings2,
  UserCheck,
  Mail,
  Pencil,
  Trash2,
} from "lucide-react";
import { LiveKitCall } from "../components/LiveKitCall";
import { ChatMessage } from "../../types";
import { LunchGames } from "../components/LunchGames";
import { CourseAssessments } from "../components/CourseAssessments";
import { CourseSchedule } from "../components/CourseSchedule";
import { OrgUserOnboarding } from "../components/OrgUserOnboarding";
import { CourseCertificate } from "../components/CourseCertificate";
import { FileUpload } from "../components/FileUpload";
import { EnrollmentModal } from "../components/EnrollmentModal";
import { CoursePaymentModal } from "../components/CoursePaymentModal";
import { CourseJoinModal } from "../components/CourseJoinModal";
import { AdmissionSessionManagerModal } from "../components/AdmissionSessionManagerModal";
import { CourseModulesTab } from "../components/CourseModulesTab";
import { CustomAlert } from "../components/CustomAlert";
import { generateId } from "../../lib/id";

const CourseDetails = () => {
  const { courseId } = useParams();
  const {
    courses,
    userProgress,
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    sendMessage,
    enrollmentRequests,
    addEnrollmentRequest,
    updateEnrollmentRequest,
    orgMembers,
    scheduleEvents,
    addScheduleEvent,
    organizations,
  } = useAppContext();
  const { currentUser } = useAuth();
  const [isCallActiveInApp, setIsCallActiveInApp] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "info"
    | "modules"
    | "materials"
    | "chat"
    | "lunch"
    | "people"
    | "assessments"
    | "schedule"
    | "certificate"
  >("info");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Chat state
  const [chatMsg, setChatMsg] = useState("");
  const [chatAttachmentUrl, setChatAttachmentUrl] = useState("");
  const [chatAttachmentType, setChatAttachmentType] = useState<
    "image" | "video" | "document" | undefined
  >(undefined);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Materials state
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatUrl, setNewMatUrl] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialTitle, setEditingMaterialTitle] = useState("");
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const course = courses.find((c) => c.id === courseId);
  const progress = userProgress.find(
    (p) => p.courseId === courseId && p.userId === currentUser?.id,
  );
  const courseMaterials = materials.filter((m) => m.courseId === courseId);

  const progressPercentage =
    course && course.modules.length > 0
      ? ((progress?.completedModuleIds.length || 0) / course.modules.length) *
        100
      : 0;

  // Access check logic
  const isStudent = currentUser?.role === "student";
  const isOrganization = currentUser?.role === "organization";

  const myOrgMemberRecords = orgMembers.filter(
    (m) => m.email?.toLowerCase() === currentUser?.email?.toLowerCase(),
  );
  const onboardedCourseIds = myOrgMemberRecords.flatMap(
    (m) => m.courseIds || [],
  );

  const myEnrollment = enrollmentRequests.find(
    (r) => r.userId === currentUser?.id && r.courseId === courseId,
  );
  const myInvite = orgMembers.find(
    (m) =>
      m.email?.toLowerCase() === currentUser?.email?.toLowerCase() &&
      m.status === "invited" &&
      (m.courseIds?.includes(courseId as string) || m.orgId === course?.orgId),
  );
  const isStudentApproved = myEnrollment?.status === "approved";
  const isStudentPaidOrFree =
    !course || course.price === 0 || myEnrollment?.paymentStatus === "paid";
  const hasStudentAccess = isStudentApproved && isStudentPaidOrFree;

  const hasInstructorAccess = onboardedCourseIds.includes(courseId as string);
  const hasOrgAccess =
    isOrganization &&
    (course?.orgId === currentUser?.id ||
      course?.orgId === `org_${currentUser?.id}`);

  const hasAccess = hasStudentAccess || hasInstructorAccess || hasOrgAccess;
  const canStartVideoCall =
    !isStudent &&
    (hasOrgAccess ||
      hasInstructorAccess ||
      currentUser?.role === "organization" ||
      currentUser?.role === "instructor");
  const canManageSessions = isOrganization || hasOrgAccess;

  const isAdmissionOpen = course?.admissionStatus !== "closed";
  const isReapplicationCandidate = myEnrollment?.status === "rejected";

  const myOrg = organizations.find(
    (o) =>
      o.ownerId === currentUser?.id ||
      o.id === currentUser?.id ||
      o.id === course?.orgId,
  );
  const courseOrg =
    organizations.find(
      (o) => o.id === course?.orgId || o.ownerId === course?.orgId,
    ) || myOrg;
  const organisationName = (courseOrg?.name || "organisation")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const courseTitle = (course?.title || "course")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const participantDisplayName =
    currentUser?.role === "organization"
      ? myOrg?.name || currentUser?.name || "Organization"
      : currentUser?.name || "Participant";

  const activeCall = scheduleEvents.find(
    (e) => e.courseId === courseId && e.isActive,
  );

  const handleStartCall = async () => {
    if (!courseId) return;
    const timestamp = Date.now();
    const roomName = `${organisationName}-${courseTitle}-${timestamp}`;
    const meetingUrl = `https://meet.jit.si/${roomName}`;
    await addScheduleEvent({
      id: generateId("ev"),
      courseId,
      title: "Live Class Session",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
      durationMins: 60,
      type: "lecture",
      meetingUrl,
      isActive: true,
    });
    setIsCallActiveInApp(true);
  };

  const handleEnrollSubmit = async (
    paymentMethod: "one-time" | "installment",
    documents?: Record<string, string>,
    additionalDocs?: Array<{ id: string; name: string; url: string }>,
    notes?: string,
  ) => {
    if (!currentUser || !course) return;
    await addEnrollmentRequest({
      id: generateId("req"),
      userId: currentUser.id,
      userName: currentUser.name,
      orgId: course.orgId,
      courseId: course.id,
      courseTitle: course.title,
      status: "pending",
      paymentMethod,
      documents,
      additionalDocuments: additionalDocs,
      studentNotes: notes,
      appliedAt: new Date().toISOString(),
    });
    setShowEnrollModal(false);
  };

  useEffect(() => {
    // Use Firebase realtime listeners if needed in the future
  }, [courseId]);

  if (!course)
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        Course not found.
      </div>
    );

  const renderAccessBlocker = () => (
    <div className="max-w-2xl mx-auto py-16 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {myInvite ? (
        <>
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            You Have Been Invited!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            <strong className="text-slate-900 dark:text-white">
              {courseOrg?.name || "The sponsoring institution"}
            </strong>{" "}
            has invited you to join{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>
            .
          </p>
          {myInvite.inviteNote && (
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 max-w-md mx-auto border border-indigo-200 dark:border-indigo-800 text-left">
              <span className="font-bold block mb-1">
                Note from Institution:
              </span>
              "{myInvite.inviteNote}"
            </div>
          )}
          <div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/20 text-sm"
            >
              <UserCheck className="w-4 h-4 mr-2" /> Accept Invitation & Join
              Course
            </button>
          </div>
        </>
      ) : myEnrollment?.status === "pending" ? (
        <>
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Application Under Review
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            Your application for{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>{" "}
            (
            {myEnrollment.sessionName ||
              course.activeSessionName ||
              "Current Session"}
            ) has been submitted and is currently being reviewed by the
            organization. No tuition payment is due until accepted.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold text-sm transition"
          >
            Return to Dashboard
          </Link>
        </>
      ) : myEnrollment?.status === "approved" &&
        course.price > 0 &&
        myEnrollment?.paymentStatus !== "paid" ? (
        <>
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Application Accepted!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            Congratulations! Your application for{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>{" "}
            has been approved. Please complete your tuition payment below to
            unlock full classroom access.
          </p>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-600/20 text-sm"
          >
            <CreditCard className="w-4 h-4 mr-2" /> Pay Tuition (
            {course.currency} {course.price.toLocaleString()})
          </button>
        </>
      ) : isReapplicationCandidate ? (
        <>
          {course.admissionStatus === "closed" ? (
            <>
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                <DoorClosed className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Admissions Currently Closed
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                Your application for the previous session was declined.
                Admissions for{" "}
                <strong className="text-slate-900 dark:text-white">
                  {course.title}
                </strong>{" "}
                are currently closed. You will be eligible to reapply as soon as
                the organization opens the next admission session.
              </p>
              {myEnrollment.rejectionReason && (
                <div className="max-w-md mx-auto p-3.5 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 text-left">
                  <span className="font-bold block mb-1">
                    Feedback from Reviewer:
                  </span>
                  "{myEnrollment.rejectionReason}"
                </div>
              )}
              <div className="pt-2">
                <button
                  disabled
                  className="inline-flex items-center px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-sm cursor-not-allowed"
                >
                  <DoorClosed className="w-4 h-4 mr-2" /> Admissions Closed
                  (Awaiting Next Intake)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
                <RotateCcw className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Admissions Open — Reapply Now
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                A new admission intake (
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {course.activeSessionName || "Current Session"}
                </strong>
                ) is currently open! You can submit a fresh reapplication with
                updated credentials.
              </p>
              {myEnrollment.rejectionReason && (
                <div className="max-w-md mx-auto p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 text-left">
                  <span className="font-bold block mb-1">
                    Previous Session Feedback:
                  </span>
                  "{myEnrollment.rejectionReason}"
                </div>
              )}
              <button
                onClick={() => setShowEnrollModal(true)}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/20 text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reapply for Admission (
                {course.activeSessionName || "New Session"})
              </button>
            </>
          )}
        </>
      ) : course.admissionStatus === "closed" ? (
        <>
          <div className="w-16 h-16 bg-slate-500/10 text-slate-500 rounded-2xl flex items-center justify-center mx-auto border border-slate-500/20">
            <DoorClosed className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Admissions Currently Closed
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            The sponsoring organization is not currently accepting new student
            applications for{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>
            . Please check back when the next admission session opens.
          </p>
          <button
            disabled
            className="inline-flex items-center px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-sm cursor-not-allowed"
          >
            <DoorClosed className="w-4 h-4 mr-2" /> Admissions Closed
          </button>
        </>
      ) : isOrganization ? (
        <>
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
            <Book className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Organization Account
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            Organization accounts cannot enroll in courses. You can manage and
            view the classroom for your own institution's courses.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/20 text-sm"
          >
            Go to Organization Dashboard
          </Link>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
            <Book className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Application Required
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            Submit an application for the{" "}
            <strong className="text-indigo-600 dark:text-indigo-400">
              {course.activeSessionName || "current intake session"}
            </strong>{" "}
            of{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>
            . No tuition payment is charged today.
          </p>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/20 text-sm"
          >
            <Send className="w-4 h-4 mr-2" /> Apply for Course (
            {course.activeSessionName || "Current Session"})
          </button>
        </>
      )}
    </div>
  );

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatTitle || !newMatUrl) return;
    await addMaterial({
      courseId: course.id,
      title: newMatTitle,
      url: newMatUrl,
      type: "link",
    });
    setNewMatTitle("");
    setNewMatUrl("");
  };

  const handleUpdateMaterial = async (id: string) => {
    if (!editingMaterialTitle.trim()) return;
    await updateMaterial(id, { title: editingMaterialTitle });
    setEditingMaterialId(null);
    setEditingMaterialTitle("");
  };

  const handleDeleteMaterial = async (id: string) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Material",
      message: "Are you sure you want to delete this material? This action cannot be undone.",
      onConfirm: async () => {
        await deleteMaterial(id);
      },
    });
  };

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatMsg.trim() && !chatAttachmentUrl) || !currentUser) return;

    const newMsg: ChatMessage = {
      id: generateId("msg"),
      courseId: course.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: chatMsg,
      timestamp: new Date().getTime(),
      fileUrl: chatAttachmentUrl,
      fileType: chatAttachmentType,
    };

    await sendMessage(newMsg);
    setChatMessages([...chatMessages, newMsg]); // Local optimistic update
    setChatMsg("");
    setChatAttachmentUrl("");
    setChatAttachmentType(undefined);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {courseOrg && (
              <Link
                to={`/org/${courseOrg.id || course.orgId}`}
                className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20"
              >
                <Building className="w-3.5 h-3.5 mr-1" /> {courseOrg.name}
              </Link>
            )}
            <span
              className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isAdmissionOpen
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}
            >
              {isAdmissionOpen ? (
                <>
                  <DoorOpen className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Admission: Open (
                  {course.activeSessionName || "Current Session"})
                </>
              ) : (
                <>
                  <DoorClosed className="w-3.5 h-3.5 mr-1 text-red-500" />
                  Admission: Closed
                </>
              )}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {course.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
            {course.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canManageSessions && (
            <button
              onClick={() => setShowSessionModal(true)}
              className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition text-xs border border-slate-200 dark:border-slate-600 shadow-sm"
            >
              <Settings2 className="w-4 h-4 mr-1.5 text-indigo-500" />
              Manage Admission Sessions
            </button>
          )}

          {canStartVideoCall &&
            (isCallActiveInApp ? (
              <div className="flex items-center px-4 py-2 bg-emerald-500/10 text-emerald-400 font-bold rounded-lg border border-emerald-500/20 text-sm whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-2" />{" "}
                Live Call Active
              </div>
            ) : (
              <button
                onClick={handleStartCall}
                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition whitespace-nowrap shadow-sm"
              >
                <Video className="w-4 h-4 mr-2" /> Start Live Class
              </button>
            ))}
        </div>
      </div>

      {isCallActiveInApp && (
        <div className="mb-6">
          <LiveKitCall
            roomName={
              activeCall?.meetingUrl?.split("/").pop() ||
              `${organisationName}-${courseTitle}-room`
            }
            participantName={participantDisplayName}
            userRole={currentUser?.role}
            onClose={() => setIsCallActiveInApp(false)}
          />
        </div>
      )}

      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "info" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Info className="w-4 h-4 mr-2" /> Requirements
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "modules" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Book className="w-4 h-4 mr-2" /> Modules
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "materials" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <FileText className="w-4 h-4 mr-2" /> Library & Materials
        </button>
        <button
          onClick={() => setActiveTab("assessments")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "assessments" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Award className="w-4 h-4 mr-2" />{" "}
          {isStudent ? "Transcripts" : "Assessments"}
        </button>
        <button
          onClick={() => setActiveTab("certificate")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "certificate" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Award className="w-4 h-4 mr-2" /> Certificate
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "schedule" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Calendar className="w-4 h-4 mr-2" /> Timetable
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "chat" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <MessageSquare className="w-4 h-4 mr-2" /> Discussions
        </button>
        {!isStudent && (
          <button
            onClick={() => setActiveTab("people")}
            className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "people" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <Users className="w-4 h-4 mr-2" /> People & Invites
          </button>
        )}
        <button
          onClick={() => setActiveTab("lunch")}
          className={`px-4 py-3 font-medium text-sm flex items-center transition-colors ${activeTab === "lunch" ? "text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Rocket className="w-4 h-4 mr-2" /> Launch Box
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 min-h-[400px]">
        {!hasAccess && isStudent && activeTab !== "info" ? (
          renderAccessBlocker()
        ) : (
          <>
            {activeTab === "info" && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in">
                <div>
                  {!hasAccess && isStudent && renderAccessBlocker()}
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                    Admission & Guidelines
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Payment Availability
                        </h3>
                        <p className="text-slate-900 dark:text-white font-medium bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                          {course.paymentTermsAllowed === "both"
                            ? "One-time & Installment Plans Available"
                            : course.paymentTermsAllowed === "installment"
                              ? "Installment Plan Only"
                              : "One-Time Payment Only"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Student Admission Guidelines
                        </h3>
                        <div className="text-slate-900 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 leading-relaxed">
                          {course.requirements ? (
                            <ul className="space-y-1.5 list-disc pl-5">
                              {course.requirements
                                .split("\n")
                                .filter(Boolean)
                                .map((req, idx) => (
                                  <li key={idx}>{req.replace(/^•\s*/, "")}</li>
                                ))}
                            </ul>
                          ) : (
                            <p className="text-slate-500 italic">
                              Open admission. No prerequisites required.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Enrollment Procedure
                        </h3>
                        <div className="text-slate-900 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 leading-relaxed">
                          {course.applicationProcess ? (
                            <ol className="space-y-2">
                              {course.applicationProcess
                                .split("\n")
                                .filter(Boolean)
                                .map((step, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span>{step.replace(/^\d+\.\s*/, "")}</span>
                                  </li>
                                ))}
                            </ol>
                          ) : (
                            <p className="text-slate-500 italic">
                              Standard automatic enrollment upon payment.
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Instructor Qualifications
                        </h3>
                        <div className="text-slate-900 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 leading-relaxed">
                          {course.instructorRequirements ? (
                            <ul className="space-y-1.5 list-disc pl-5">
                              {course.instructorRequirements
                                .split("\n")
                                .filter(Boolean)
                                .map((req, idx) => (
                                  <li key={idx}>{req.replace(/^•\s*/, "")}</li>
                                ))}
                            </ul>
                          ) : (
                            <p className="text-slate-500 italic">
                              No specific instructor qualifications requested.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "modules" && (
              <CourseModulesTab course={course} isStudent={isStudent} />
            )}

            {activeTab === "materials" && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Library & Resources
                  </h2>
                </div>

                {!isStudent && (
                  <form
                    onSubmit={handleAddMaterial}
                    className="mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4"
                  >
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Material Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newMatTitle}
                        onChange={(e) => setNewMatTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white"
                        placeholder="e.g. Course Syllabus PDF"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Resource URL or Upload
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          required={!newMatUrl}
                          value={newMatUrl}
                          onChange={(e) => setNewMatUrl(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white"
                          placeholder="https://..."
                        />
                        <div className="shrink-0 h-[38px] flex items-center">
                          <FileUpload
                            label="Upload"
                            accept=".pdf,.doc,.docx,.txt"
                            onUpload={(url) => setNewMatUrl(url)}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium flex items-center h-[38px] shrink-0"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Add Material
                    </button>
                  </form>
                )}

                <div className="space-y-3">
                  {courseMaterials.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                      No materials have been uploaded yet.
                    </p>
                  ) : (
                    courseMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-500 rounded-xl transition-colors group"
                      >
                        <a
                          href={mat.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center flex-1"
                        >
                          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center mr-4 group-hover:bg-indigo-500 group-hover:text-slate-900 dark:text-white transition-colors shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            {editingMaterialId === mat.id ? (
                              <input
                                type="text"
                                value={editingMaterialTitle}
                                onChange={(e) => setEditingMaterialTitle(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-900 dark:text-white mb-1"
                                onClick={(e) => e.preventDefault()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleUpdateMaterial(mat.id!);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setEditingMaterialId(null);
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="font-medium text-slate-900 dark:text-white">
                                {mat.title}
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              {mat.type.toUpperCase()}
                            </p>
                          </div>
                        </a>
                        
                        {!isStudent && (
                          <div className="flex items-center space-x-2 ml-4">
                            {editingMaterialId === mat.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateMaterial(mat.id!)}
                                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                  title="Save"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingMaterialId(null)}
                                  className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEditingMaterialId(mat.id ?? null);
                                    setEditingMaterialTitle(mat.title);
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit Name"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (mat.id) {
                                      handleDeleteMaterial(mat.id);
                                    }
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Material"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-[500px]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Class Discussion
                  </h2>
                </div>
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-900/50">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-slate-500 mt-10">
                      Start the conversation!
                    </p>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const isMe = msg.senderId === currentUser?.id;
                      return (
                        <div
                          key={i}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <span className="text-xs text-slate-500 mb-1">
                            {isMe ? "You" : msg.senderName}
                          </span>
                          <div
                            className={`px-4 py-2 rounded-2xl max-w-[70%] ${isMe ? "bg-indigo-600 text-slate-900 dark:text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-200"}`}
                          >
                            {msg.text && <div className="mb-1">{msg.text}</div>}
                            {msg.fileUrl && (
                              <div className="mt-2">
                                {msg.fileType === "image" ? (
                                  <img
                                    src={msg.fileUrl}
                                    alt="attachment"
                                    className="max-w-full rounded-lg max-h-48 object-cover"
                                  />
                                ) : msg.fileType === "video" ? (
                                  <video
                                    src={msg.fileUrl}
                                    controls
                                    className="max-w-full rounded-lg max-h-48"
                                  />
                                ) : (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center text-sm underline opacity-90 hover:opacity-100"
                                  >
                                    <Paperclip className="w-4 h-4 mr-1" /> View
                                    Document
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
                  {chatAttachmentUrl && (
                    <div className="mb-3 flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
                      <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
                        Attached: {chatAttachmentType}
                      </span>
                      <button
                        onClick={() => {
                          setChatAttachmentUrl("");
                          setChatAttachmentType(undefined);
                        }}
                        className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMsg} className="flex space-x-2">
                    <FileUpload
                      label=""
                      onUpload={(url, type) => {
                        setChatAttachmentUrl(url);
                        setChatAttachmentType(type);
                      }}
                    />
                    <input
                      type="text"
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatMsg.trim() && !chatAttachmentUrl}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "people" && !isStudent && (
              <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
                <OrgUserOnboarding courseId={course.id} />
              </div>
            )}

            {activeTab === "assessments" && (
              <div className="p-4 sm:p-6 bg-slate-950">
                <CourseAssessments courseId={course.id} isStudent={isStudent} />
              </div>
            )}
            {activeTab === "certificate" && (
              <CourseCertificate
                course={course}
                isStudent={isStudent}
                progress={progressPercentage}
              />
            )}

            {activeTab === "schedule" && (
              <div className="p-4 sm:p-6 bg-slate-950">
                <CourseSchedule courseId={course.id} isStudent={isStudent} />
              </div>
            )}

            {activeTab === "lunch" && (
              <div className="p-4 sm:p-6">
                <LunchGames />
              </div>
            )}
          </>
        )}
      </div>
      {showEnrollModal && (
        <EnrollmentModal
          course={course}
          isReapplication={isReapplicationCandidate}
          previousRequest={myEnrollment}
          onClose={() => setShowEnrollModal(false)}
          onEnroll={handleEnrollSubmit}
        />
      )}

      {showPaymentModal && myEnrollment && (
        <CoursePaymentModal
          course={course}
          request={myEnrollment}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={async () => {
            await updateEnrollmentRequest(myEnrollment.id, undefined, "paid");
            setShowPaymentModal(false);
          }}
        />
      )}

      {showJoinModal && myInvite && (
        <CourseJoinModal
          course={course}
          invite={myInvite}
          onClose={() => setShowJoinModal(false)}
          onJoinSuccess={() => setShowJoinModal(false)}
        />
      )}

      {showSessionModal && (
        <AdmissionSessionManagerModal
          course={course}
          onClose={() => setShowSessionModal(false)}
        />
      )}

      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default CourseDetails;
