import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { getEffectivePrice, formatPriceWithDecimals } from "../../lib/price";
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
  HeartHandshake,
  Share2,
  Check,
  Eye,
  EyeOff,
  BookOpen,
  Edit3,
  Timer,
} from "lucide-react";
import { PublicCourseDetails } from "../components/PublicCourseDetails";
import { EditCourseDetailsModal } from "../components/EditCourseDetailsModal";
import { LiveKitCall } from "../components/LiveKitCall";
import { CourseAttendance } from "../components/CourseAttendance";
import { LunchGames } from "../components/LunchGames";
import { CourseAssessments } from "../components/courseAssesment/CourseAssessments";
import { CourseSchedule } from "../components/CourseSchedule";
import { OrgUserOnboarding } from "../components/OrgUserOnboarding";
import { CourseCertificate } from "../components/CourseCertificate";
import { FileUpload } from "../components/FileUpload";
import { EnrollmentModal } from "../components/EnrollmentModal";
import { CoursePaymentModal } from "../components/CoursePaymentModal";
import { CourseJoinModal } from "../components/CourseJoinModal";
import { CourseDonationModal } from "../components/CourseDonationModal";
import { AdmissionSessionManagerModal } from "../components/AdmissionSessionManagerModal";
import { CourseModulesTab } from "../components/CourseModulesTab";
import { CustomAlert } from "../components/CustomAlert";
import { generateId } from "../../lib/id";
import { CourseDiscussions } from "../components/discussion/CourseDiscussions ";
import { SpecialNeedsAccommodations, ScheduleEvent } from "../../types";
import {
  getLiveClassRoomName,
  createLiveKitMeetingUrl,
  getLiveKitDirectUrl,
  endLiveClassSessionApi,
} from "../../lib/liveClass";

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    courses,
    userProgress,
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    enrollmentRequests,
    addEnrollmentRequest,
    updateEnrollmentRequest,
    orgMembers,
    scheduleEvents,
    addScheduleEvent,
    updateScheduleEvent,
    organizations,
    courseDonations,
    getCourseAdmissionGate,
    deleteCourse,
  } = useAppContext();
  const { currentUser } = useAuth();
  
  const [isCallActiveInApp, setIsCallActiveInApp] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("live") === "true" ||
        params.get("joinLive") === "true" ||
        Boolean(params.get("eventId"))
      );
    }
    return false;
  });

  const [isPreviewAsStudent, setIsPreviewAsStudent] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("preview") === "student";
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<"classroom" | "public">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "public" || params.get("preview") === "true") {
        return "public";
      }
    }
    return "classroom";
  });

  useEffect(() => {
    const params = new URLSearchParams(
      location.search || window.location.search,
    );
    const wantsLive =
      params.get("live") === "true" ||
      params.get("joinLive") === "true" ||
      Boolean(params.get("eventId"));

    if (wantsLive) {
      const timer = setTimeout(() => {
        setIsCallActiveInApp(true);
        setViewMode("classroom");
        const el = document.getElementById("live-class-viewport");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.search, courseId]);

  const [activeTab, setActiveTab] = useState<
    | "info"
    | "modules"
    | "materials"
    | "chat"
    | "lunch"
    | "people"
    | "assessments"
    | "schedule"
    | "attendance"
    | "certificate"
    | "donations"
  >("info");
  
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("donate") === "true" ||
        params.get("action") === "donate" ||
        window.location.search.includes("donate")
      );
    }
    return false;
  });
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedClassLink, setCopiedClassLink] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleCopyClassUrl = async (targetRoom: string) => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/live/${targetRoom}`;
      await navigator.clipboard.writeText(url);
      setCopiedClassLink(true);
      setTimeout(() => setCopiedClassLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Materials state
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatUrl, setNewMatUrl] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null,
  );
  const [editingMaterialTitle, setEditingMaterialTitle] = useState("");
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "info" | "warning" | "error" | "success" | "danger";
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const course = courses.find((c) => c.id === courseId);
  const progress = userProgress.find(
    (p) => p.courseId === courseId && p.userId === currentUser?.id,
  );
  const courseMaterials = materials.filter((m) => m.courseId === courseId);

  let totalTrackables = course?.modules.length || 0;
  let completedTrackables = (progress?.completedModuleIds || []).filter((id) =>
    course?.modules.some((m) => m.id === id),
  ).length;

  course?.modules.forEach((mod) => {
    if (mod.items) {
      totalTrackables += mod.items.length;
      const completedItemsCount = (progress?.completedItemIds || []).filter(
        (id) => mod.items?.some((i) => i.id === id),
      ).length;
      completedTrackables += completedItemsCount;
    }
  });

  const progressPercentage =
    totalTrackables > 0 ? (completedTrackables / totalTrackables) * 100 : 0;

  // Access check logic
  const isOrganization = currentUser?.role === "organization";

  const myOrgMemberRecords = orgMembers.filter(
    (m) =>
      m.email?.toLowerCase().trim() ===
        currentUser?.email?.toLowerCase().trim() ||
      (currentUser?.id && m.userId === currentUser.id) ||
      (currentUser?.id && m.id === currentUser.id),
  );

  const hasInstructorAccess =
    myOrgMemberRecords.some(
      (m) =>
        m.role === "instructor" &&
        (m.courseIds?.includes(courseId as string) ||
          m.orgId === course?.orgId ||
          `org_${m.orgId}` === course?.orgId ||
          m.orgId === `org_${course?.orgId}`),
    ) ||
    currentUser?.id === course?.instructorId ||
    Boolean(course?.instructors?.includes(currentUser?.id || "")) ||
    (currentUser?.role === "instructor" &&
      (course?.createdBy === currentUser?.id ||
        (course?.instructorName &&
          currentUser?.name &&
          course.instructorName.toLowerCase().trim() ===
            currentUser.name.toLowerCase().trim())));

  const myEnrollment = enrollmentRequests.find(
    (r) => r.userId === currentUser?.id && r.courseId === courseId,
  );
  const myInvite = myOrgMemberRecords.find(
    (m) =>
      m.status === "invited" &&
      (m.courseIds?.includes(courseId as string) || m.orgId === course?.orgId),
  );
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

  const isVocationalDonationFunded =
    courseOrg?.orgType === "vocational" &&
    course?.fundingModel === "donations_sponsorships";
  const gate =
    isVocationalDonationFunded && course
      ? getCourseAdmissionGate(course.id)
      : null;
  const courseDonationList =
    isVocationalDonationFunded && course
      ? courseDonations.filter((d) => d.courseId === course.id)
      : [];

  const isStudentApproved = myEnrollment?.status === "approved";
  const isStudentPaidOrFree =
    !course ||
    course.price === 0 ||
    isVocationalDonationFunded ||
    myEnrollment?.paymentStatus === "paid" ||
    Boolean(myEnrollment?.isSponsored);
  const hasStudentAccess = isStudentApproved && isStudentPaidOrFree;

  const hasOrgAccess =
    isOrganization &&
    (course?.orgId === currentUser?.id ||
      course?.orgId === `org_${currentUser?.id}` ||
      (myOrg &&
        (course?.orgId === myOrg.id || course?.orgId === myOrg.ownerId)));

  const hasAccess =
    hasStudentAccess ||
    hasInstructorAccess ||
    hasOrgAccess ||
    Boolean(currentUser?.id === course?.instructorId);
  const effectiveViewMode = hasAccess ? viewMode : "public";

  const isEnrolledStudent =
    myOrgMemberRecords.some(
      (m) => m.role === "student" && m.courseIds?.includes(courseId as string),
    ) ||
    myEnrollment?.status === "approved" ||
    (currentUser?.role === "student" && !hasInstructorAccess && !hasOrgAccess);

  const isStudent =
    isPreviewAsStudent ||
    (!hasOrgAccess && !hasInstructorAccess && isEnrolledStudent);

  const canStartVideoCall =
    !isStudent &&
    (hasOrgAccess ||
      hasInstructorAccess ||
      currentUser?.role === "organization" ||
      currentUser?.role === "instructor");
  const canManageSessions = Boolean(
    !isStudent && (isOrganization || hasOrgAccess || hasInstructorAccess),
  );
  const canEditCourse = Boolean(
    hasOrgAccess ||
    hasInstructorAccess ||
    currentUser?.id === course?.instructorId ||
    (isOrganization &&
      (course?.orgId === currentUser?.id ||
        course?.orgId === `org_${currentUser?.id}` ||
        (myOrg &&
          (course?.orgId === myOrg.id || course?.orgId === myOrg.ownerId)))),
  );

  const canDeleteCourse = Boolean(
    currentUser?.role === "organization" &&
    course &&
    (course.orgId === currentUser.id ||
      course.orgId === `org_${currentUser.id}` ||
      course.createdBy === currentUser.id ||
      (currentUser.id && course.orgId?.includes(currentUser.id)) ||
      (myOrg &&
        (course.orgId === myOrg.id ||
          course.orgId === myOrg.ownerId ||
          course.orgId === `org_${myOrg.id}`))),
  );

  const isAdmissionOpen = course?.admissionStatus !== "closed";
  const isReapplicationCandidate = myEnrollment?.status === "rejected";

  const participantDisplayName =
    currentUser?.role === "organization"
      ? myOrg?.name || currentUser?.name || "Organization"
      : currentUser?.name || "Participant";

  const targetEventId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(
      location.search || window.location.search,
    );
    return params.get("eventId");
  }, [location.search]);

  const activeCall = useMemo(() => {
    if (targetEventId) {
      const match = scheduleEvents.find(
        (e) => e.id === targetEventId && e.courseId === courseId,
      );
      if (match) return match;
    }
    return (
      scheduleEvents.find((e) => e.courseId === courseId && e.isActive) || null
    );
  }, [scheduleEvents, courseId, targetEventId]);

  const liveCallActiveEvent = useMemo(() => {
    return (
      scheduleEvents.find((e) => e.courseId === courseId && e.isActive) || null
    );
  }, [scheduleEvents, courseId]);

  const getEffectiveRoomName = (call?: ScheduleEvent | null) => {
    const target = call || liveCallActiveEvent || activeCall;
    return getLiveClassRoomName(target, courseId);
  };

  const handleStartCall = async () => {
    if (!courseId || !course) return;

    if (liveCallActiveEvent) {
      setIsCallActiveInApp(true);
      return;
    }

    if (targetEventId) {
      const match = scheduleEvents.find(
        (e) => e.id === targetEventId && e.courseId === courseId,
      );
      if (match) {
        const roomName = getLiveClassRoomName(match, courseId);
        const livekitRes = await createLiveKitMeetingUrl({
          roomName,
          participantName: currentUser?.name || "Participant",
          courseId,
          role: currentUser?.role || "student",
          forceSync: true,
        });
        const meetingUrl =
          match.meetingUrl || livekitRes.url || getLiveKitDirectUrl(roomName);
        await updateScheduleEvent(match.id, {
          isActive: true,
          meetingUrl,
        });
        setIsCallActiveInApp(true);
        return;
      }
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todayScheduled = scheduleEvents.find(
      (e) => e.courseId === courseId && e.date === todayStr && !e.isActive,
    );
    if (todayScheduled) {
      const roomName = getLiveClassRoomName(todayScheduled, courseId);
      const livekitRes = await createLiveKitMeetingUrl({
        roomName,
        participantName: currentUser?.name || "Participant",
        courseId,
        role: currentUser?.role || "student",
        forceSync: true,
      });
      const meetingUrl =
        todayScheduled.meetingUrl ||
        livekitRes.url ||
        getLiveKitDirectUrl(roomName);
      await updateScheduleEvent(todayScheduled.id, {
        isActive: true,
        meetingUrl,
      });
      setIsCallActiveInApp(true);
      return;
    }

    const newEventId = `live_${courseId}_${Date.now()}`;
    const roomName = getLiveClassRoomName(
      { id: newEventId, courseId },
      courseId,
    );

    const livekitRes = await createLiveKitMeetingUrl({
      roomName,
      participantName: currentUser?.name || "Participant",
      courseId,
      role: currentUser?.role || "student",
      forceSync: true,
    });
    const meetingUrl = livekitRes.url || getLiveKitDirectUrl(roomName);

    await addScheduleEvent({
      id: newEventId,
      courseId,
      title: `${course.title} - Live Class`,
      date: todayStr,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      durationMins: 60,
      type: "lecture",
      meetingUrl,
      isActive: true,
    });
    setIsCallActiveInApp(true);
  };

  const handleEndCall = async () => {
    const activeEvts = scheduleEvents.filter(
      (e) => e.courseId === courseId && e.isActive,
    );
    for (const evt of activeEvts) {
      const room = getLiveClassRoomName(evt, courseId);
      await endLiveClassSessionApi(room, courseId);
      await updateScheduleEvent(evt.id, { isActive: false });
    }
    if (activeCall?.isActive) {
      const room = getLiveClassRoomName(activeCall, courseId);
      await endLiveClassSessionApi(room, courseId);
      await updateScheduleEvent(activeCall.id, { isActive: false });
    }
    setIsCallActiveInApp(false);
  };

  const handleEnrollSubmit = async (
    paymentMethod: "one-time" | "installment",
    documents?: Record<string, string>,
    additionalDocs?: Array<{ id: string; name: string; url: string }>,
    notes?: string,
    sessionId?: string,
    sessionName?: string,
    accommodations?: SpecialNeedsAccommodations,
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
      sessionId,
      sessionName,
      accommodations,
      appliedAt: new Date().toISOString(),
    });
    setShowEnrollModal(false);
  };

  if (!course)
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400 font-body">
        Course not found.
      </div>
    );

  const renderAccessBlocker = () => (
    <div className="max-w-2xl mx-auto py-20 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {myInvite ? (
        <>
          <div className="w-16 h-16 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-2xl flex items-center justify-center mx-auto border border-[#0078d4]/20 shadow-xs">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            You Have Been Invited!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
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
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 max-w-md mx-auto border border-slate-200 dark:border-slate-700 text-left font-body shadow-xs">
              <span className="font-bold block mb-1 text-slate-900 dark:text-white">
                Note from Institution:
              </span>
              "{myInvite.inviteNote}"
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl font-bold transition shadow-sm hover:shadow-md text-sm cursor-pointer font-heading"
            >
              <UserCheck className="w-4 h-4 mr-2" /> Accept Invitation & Join
              Course
            </button>
          </div>
        </>
      ) : myEnrollment?.status === "pending" ? (
        <>
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Application Under Review
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
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
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm transition font-heading shadow-sm"
            >
              Return to Dashboard
            </Link>
          </div>
        </>
      ) : myEnrollment?.status === "approved" &&
        course.price > 0 &&
        myEnrollment?.paymentStatus !== "paid" ? (
        <>
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Application Accepted!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
            Congratulations! Your application for{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>{" "}
            has been approved. Please complete your tuition payment below to
            unlock full classroom access.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-sm hover:shadow-md text-sm cursor-pointer font-heading"
            >
              <CreditCard className="w-4 h-4 mr-2" /> Pay Tuition (
              {course.currency || "NGN"} {course.price.toLocaleString()})
            </button>
          </div>
        </>
      ) : isReapplicationCandidate ? (
        <>
          {course.admissionStatus === "closed" ? (
            <>
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 shadow-xs">
                <DoorClosed className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
                Admissions Currently Closed
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
                Your application for the previous session was declined.
                Admissions for{" "}
                <strong className="text-slate-900 dark:text-white">
                  {course.title}
                </strong>{" "}
                are currently closed. You will be eligible to reapply as soon as
                the organization opens the next admission session.
              </p>
              {myEnrollment.rejectionReason && (
                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 text-left font-body shadow-2xs">
                  <span className="font-bold block mb-1 text-slate-900 dark:text-white">
                    Feedback from Reviewer:
                  </span>
                  "{myEnrollment.rejectionReason}"
                </div>
              )}
              <div className="pt-2">
                <button
                  disabled
                  className="inline-flex items-center px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm cursor-not-allowed font-heading"
                >
                  <DoorClosed className="w-4 h-4 mr-2" /> Admissions Closed
                  (Awaiting Next Intake)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-2xl flex items-center justify-center mx-auto border border-[#0078d4]/20 shadow-xs">
                <RotateCcw className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
                Admissions Open — Reapply Now
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
                A new admission intake (
                <strong className="text-[#0078d4] dark:text-[#04a4ec]">
                  {course.activeSessionName || "Current Session"}
                </strong>
                ) is currently open! You can submit a fresh reapplication with
                updated credentials.
              </p>
              {myEnrollment.rejectionReason && (
                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 text-left font-body shadow-2xs">
                  <span className="font-bold block mb-1 text-slate-900 dark:text-white">
                    Previous Session Feedback:
                  </span>
                  "{myEnrollment.rejectionReason}"
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!currentUser) {
                      navigate("/login");
                      return;
                    }
                    if (currentUser.role === "organization") {
                      setAlertConfig({
                        isOpen: true,
                        title: "Role Restriction",
                        message:
                          "Only student and instructor accounts can apply for courses.",
                        type: "info",
                        onConfirm: () => {
                          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
                        },
                      });
                      return;
                    }
                    setShowEnrollModal(true);
                  }}
                  className="inline-flex items-center px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl font-bold transition shadow-sm hover:shadow-md text-sm cursor-pointer font-heading"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reapply for Admission (
                  {course.activeSessionName || "New Session"})
                </button>
              </div>
            </>
          )}
        </>
      ) : course.admissionStatus === "closed" ? (
        <>
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 shadow-xs">
            <DoorClosed className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Admissions Currently Closed
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
            The sponsoring organization is not currently accepting new student
            applications for{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>
            . Please check back when the next admission session opens.
          </p>
          <div className="pt-2">
            <button
              disabled
              className="inline-flex items-center px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm cursor-not-allowed font-heading"
            >
              <DoorClosed className="w-4 h-4 mr-2" /> Admissions Closed
            </button>
          </div>
        </>
      ) : isOrganization ? (
        <>
          <div className="w-16 h-16 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-2xl flex items-center justify-center mx-auto border border-[#0078d4]/20 shadow-xs">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Organization Account
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
            Organization accounts cannot enroll in courses. You can manage and
            view the classroom for your own institution's courses.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl font-bold transition shadow-sm hover:shadow-md text-sm font-heading"
            >
              Go to Organization Dashboard
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-2xl flex items-center justify-center mx-auto border border-[#0078d4]/20 shadow-xs">
            <Book className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Application Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-body">
            Submit an application for the{" "}
            <strong className="text-[#0078d4] dark:text-[#04a4ec]">
              {course.activeSessionName || "current intake session"}
            </strong>{" "}
            of{" "}
            <strong className="text-slate-900 dark:text-white">
              {course.title}
            </strong>
            . No tuition payment is charged today.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                if (!currentUser) {
                  navigate("/login");
                  return;
                }
                if (currentUser.role === "organization") {
                  setAlertConfig({
                    isOpen: true,
                    title: "Role Restriction",
                    message:
                      "Only student and instructor accounts can apply for courses.",
                    type: "info",
                  });
                  return;
                }
                setShowEnrollModal(true);
              }}
              className="inline-flex items-center px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl font-bold transition shadow-sm hover:shadow-md text-sm cursor-pointer font-heading"
            >
              <Send className="w-4 h-4 mr-2" /> Apply (
              {course.activeSessionName || "Current Session"})
            </button>
          </div>
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
      message:
        "Are you sure you want to delete this material? This action cannot be undone.",
      onConfirm: async () => {
        await deleteMaterial(id);
      },
    });
  };

  if (effectiveViewMode === "public") {
    return (
      <div className="space-y-6 animate-in fade-in pb-16">
        <PublicCourseDetails
          course={course}
          courseOrg={courseOrg}
          currentUser={currentUser}
          enrollmentStatus={myEnrollment?.status}
          paymentStatus={myEnrollment?.paymentStatus}
          hasActiveInvite={Boolean(myInvite)}
          isVocationalFunded={isVocationalDonationFunded}
          totalDonations={gate?.totalDonations || 0}
          tuitionCostPerStudent={gate?.tuitionCostPerStudent || course.price}
          onApply={() => {
            if (!currentUser) {
              navigate("/login");
              return;
            }
            if (currentUser.role === "organization") {
              setAlertConfig({
                isOpen: true,
                title: "Role Restriction",
                message:
                  "Only student and instructor accounts can apply for courses.",
                type: "info",
              });
              return;
            }
            setShowEnrollModal(true);
          }}
          onPayTuition={() => setShowPaymentModal(true)}
          onAcceptInvite={() => setShowJoinModal(true)}
          onDonate={() => setShowDonationModal(true)}
          onManageSessions={() => setShowSessionModal(true)}
          canManageSessions={canManageSessions}
          hasAccessToClassroom={hasAccess}
          onGoToClassroom={() => setViewMode("classroom")}
          canEditCourse={canEditCourse}
          onEditCourse={() => setShowEditCourseModal(true)}
          canDeleteCourse={canDeleteCourse}
          onDeleteCourse={() => setShowDeleteModal(true)}
        />

        {showEditCourseModal && course && (
          <EditCourseDetailsModal
            course={course}
            onClose={() => setShowEditCourseModal(false)}
          />
        )}

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

        {showDonationModal && (
          <CourseDonationModal
            course={course}
            onClose={() => setShowDonationModal(false)}
          />
        )}

        {showEditCourseModal && course && (
          <EditCourseDetailsModal
            course={course}
            onClose={() => setShowEditCourseModal(false)}
          />
        )}

        <CustomAlert
          isOpen={alertConfig.isOpen}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={alertConfig.onConfirm}
          onCancel={() =>
            setAlertConfig((prev) => ({ ...prev, isOpen: false }))
          }
        />

        {course && (
          <CustomAlert
            isOpen={showDeleteModal}
            title="Delete Course Permanently?"
            message={`Are you sure you want to delete "${course.title}"? This action will permanently remove this course, syllabus modules, admission sessions, and all course materials.`}
            confirmText="Yes, Delete Course"
            cancelText="Cancel"
            type="danger"
            onConfirm={async () => {
              await deleteCourse(course.id);
              setShowDeleteModal(false);
              navigate("/dashboard");
            }}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* ======================================================== */}
      {/* 1. HERO HEADER (Enterprise Dashboard Style)              */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {courseOrg && (
              <Link
                to={`/org/${courseOrg.id || course.orgId}`}
                className="inline-flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition font-heading"
              >
                <Building className="w-3.5 h-3.5 mr-1.5" /> {courseOrg.name}
              </Link>
            )}
            <span
              className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider font-heading ${
                isAdmissionOpen
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              {isAdmissionOpen ? (
                <>
                  <DoorOpen className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Admission: Open
                </>
              ) : (
                <>
                  <DoorClosed className="w-3.5 h-3.5 mr-1" />
                  Admission: Closed
                </>
              )}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2.5 font-heading tracking-tight">
            {course.title}
          </h1>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl font-body leading-relaxed line-clamp-2">
            {course.description}
          </p>
        </div>

        {/* Action Buttons Container */}
        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 shrink-0 min-w-[280px]">
          
          {/* Group 1: Core/Live Actions (Primary Focus) */}
          <div className="flex w-full sm:w-auto items-center gap-2 order-1 md:order-2">
            {liveCallActiveEvent
              ? !isCallActiveInApp && (
                  <button
                    onClick={() => setIsCallActiveInApp(true)}
                    className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs sm:text-sm whitespace-nowrap shadow-sm hover:shadow-md animate-pulse font-heading cursor-pointer"
                  >
                    <Video className="w-4 h-4 mr-2" /> Join Live Class
                  </button>
                )
              : canStartVideoCall && (
                  <button
                    onClick={handleStartCall}
                    className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition text-xs sm:text-sm whitespace-nowrap shadow-sm hover:shadow-md font-heading cursor-pointer"
                  >
                    <Video className="w-4 h-4 mr-2" /> Start Live Class
                  </button>
                )}
          </div>

          {/* Group 2: Secondary / Admin Actions */}
          <div className="flex flex-wrap w-full sm:w-auto items-center justify-start md:justify-end gap-2 order-2 md:order-1">
            {isVocationalDonationFunded && (
              <button
                onClick={() => setShowDonationModal(true)}
                className="flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs shadow-xs cursor-pointer font-heading"
              >
                <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
                Sponsor
              </button>
            )}

            {/* Preview as Student toggle */}
            {(hasOrgAccess || hasInstructorAccess || canEditCourse) && (
              <button
                onClick={() => setIsPreviewAsStudent((prev) => !prev)}
                className={`flex items-center px-3.5 py-2 font-bold rounded-xl transition text-xs border shadow-2xs cursor-pointer font-heading ${
                  isPreviewAsStudent
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                title={
                  isPreviewAsStudent
                    ? "Exit student preview mode"
                    : "Preview course as an enrolled student (Read-Only Mode)"
                }
              >
                {isPreviewAsStudent ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    Exit Preview
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    Student View
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setViewMode("public")}
              className="flex items-center px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition text-xs border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer font-heading"
              title="View public course details & syllabus"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Public Page
            </button>
            
            {isVocationalDonationFunded && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/course/${course.id}?donate=true`,
                  );
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2500);
                }}
                className="flex items-center px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition text-xs border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer font-heading"
                title="Copy public donation link"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    Share
                  </>
                )}
              </button>
            )}

            {canEditCourse && !isStudent && (
              <button
                onClick={() => setShowEditCourseModal(true)}
                className="flex items-center p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#0078d4] dark:hover:text-[#04a4ec] border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-2xs cursor-pointer"
                title="Edit Course Information"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {canManageSessions && !isStudent && (
              <button
                onClick={() => setShowSessionModal(true)}
                className="flex items-center p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#0078d4] dark:hover:text-[#04a4ec] border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-2xs cursor-pointer"
                title="Manage Admission Sessions"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}

            {canDeleteCourse && !isStudent && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center p-2 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-2xs cursor-pointer"
                title="Delete this course permanently"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Student Preview Mode Active Banner */}
      {isPreviewAsStudent && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                  Student Preview Mode Active
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider font-heading">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-body">
                You are previewing this course exactly as an enrolled student experiences it. Editing controls are disabled.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewAsStudent(false)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shrink-0 shadow-sm cursor-pointer font-heading"
          >
            <EyeOff className="w-4 h-4" />
            <span>Exit Preview</span>
          </button>
        </div>
      )}

      {/* Prominent Live Class Alert Banner */}
      {liveCallActiveEvent && !isCallActiveInApp && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping absolute" />
              <Video className="w-5 h-5 relative z-10" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-rose-200/50 dark:bg-rose-800/50 text-rose-700 dark:text-rose-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-heading">
                  Live Session Active
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-heading mt-0.5">
                {liveCallActiveEvent.title || "Live Class Session In Progress"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-body">
                Students and instructors are currently connected in the virtual classroom.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={() =>
                handleCopyClassUrl(getEffectiveRoomName(liveCallActiveEvent))
              }
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer font-heading"
              title="Copy direct join link to share with students or guests"
            >
              {copiedClassLink ? (
                <Check className="w-4 h-4 mr-1.5 text-emerald-500" />
              ) : (
                <Share2 className="w-4 h-4 mr-1.5 text-slate-400" />
              )}
              <span>
                {copiedClassLink ? "Copied Link!" : "Copy Class Link"}
              </span>
            </button>
            <button
              onClick={() => setIsCallActiveInApp(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm hover:shadow-md flex items-center justify-center shrink-0 cursor-pointer font-heading"
            >
              <Video className="w-4 h-4 mr-2" />
              Join Live Class Now
            </button>
          </div>
        </div>
      )}

      {isCallActiveInApp && (
        <div className="mb-6" id="live-class-viewport">
          <LiveKitCall
            roomName={getEffectiveRoomName(liveCallActiveEvent || activeCall)}
            participantName={participantDisplayName}
            userRole={currentUser?.role}
            courseId={course.id}
            onClose={() => {
              handleEndCall().catch(console.error);
            }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TABS NAVIGATION (Custom Tailwind Minimal Scrollbar)    */}
      {/* ======================================================== */}
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        <button
          onClick={() => setActiveTab("info")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "info" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Info className={`w-4 h-4 mr-1.5 ${activeTab === "info" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Requirements
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "modules" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Book className={`w-4 h-4 mr-1.5 ${activeTab === "modules" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Modules
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "materials" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <FileText className={`w-4 h-4 mr-1.5 ${activeTab === "materials" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Library & Materials
        </button>
        <button
          onClick={() => setActiveTab("assessments")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "assessments" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Award className={`w-4 h-4 mr-1.5 ${activeTab === "assessments" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} />{" "}
          {isStudent ? "Transcripts" : "Assessments"}
        </button>
        <button
          onClick={() => setActiveTab("certificate")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "certificate" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Award className={`w-4 h-4 mr-1.5 ${activeTab === "certificate" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Certificate
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "schedule" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Calendar className={`w-4 h-4 mr-1.5 ${activeTab === "schedule" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Timetable
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "attendance" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Timer className={`w-4 h-4 mr-1.5 ${activeTab === "attendance" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Attendance & Engagement
        </button>
        {isVocationalDonationFunded && (
          <button
            onClick={() => setActiveTab("donations")}
            className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "donations" ? "text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
          >
            <HeartHandshake className={`w-4 h-4 mr-1.5 ${activeTab === "donations" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />{" "}
            Sponsorships
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${activeTab === "donations" ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
              {courseDonationList.length}
            </span>
          </button>
        )}
        <button
          onClick={() => setActiveTab("chat")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "chat" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <MessageSquare className={`w-4 h-4 mr-1.5 ${activeTab === "chat" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> Discussions
        </button>
        {!isStudent && (
          <button
            onClick={() => setActiveTab("people")}
            className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "people" ? "text-[#0078d4] dark:text-[#04a4ec] border-[#0078d4] dark:border-[#04a4ec]" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
          >
            <Users className={`w-4 h-4 mr-1.5 ${activeTab === "people" ? "text-[#0078d4] dark:text-[#04a4ec]" : "text-slate-400"}`} /> People & Invites
          </button>
        )}
        <button
          onClick={() => setActiveTab("lunch")}
          className={`pb-3 font-semibold text-sm flex items-center transition-colors whitespace-nowrap cursor-pointer font-heading border-b-2 ${activeTab === "lunch" ? "text-pink-600 dark:text-pink-400 border-pink-600 dark:border-pink-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"}`}
        >
          <Rocket className={`w-4 h-4 mr-1.5 ${activeTab === "lunch" ? "text-pink-600 dark:text-pink-400" : "text-slate-400"}`} /> Launch Box
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. TAB CONTENT AREA (Unboxed Flow)                        */}
      {/* ======================================================== */}
      <div className="py-6 min-h-[500px]">
        {!hasAccess && isStudent && activeTab !== "info" ? (
          renderAccessBlocker()
        ) : (
          <>
            {activeTab === "info" && (
              <div className="space-y-8 animate-in fade-in">
                <div>
                  {!hasAccess && isStudent && renderAccessBlocker()}

                  {/* Vocational Donation Funding & Admission Gate Banner */}
                  {isVocationalDonationFunded && gate && (
                    <div className="mb-8 p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 text-slate-900 dark:text-white font-bold font-heading">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                             <HeartHandshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-lg">
                            Vocational Tuition Covered by Donations
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto uppercase tracking-wider font-heading ${
                            gate.canAdmitMore
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {gate.canAdmitMore
                            ? `${gate.remainingSpots} Open Funded Seat(s)`
                            : "Awaiting More Donations"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                        Tuition fees for students in this course are completely
                        funded by community donors and sponsors. Admitted
                        students pay <strong>$0 tuition</strong>. As community
                        donations are pledged, admission seats unlock
                        progressively until reaching the session limit.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading mb-1">
                            Raised
                          </span>
                          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
                            {gate.currency}{" "}
                            {gate.totalDonations.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading mb-1">
                            Cost / Student
                          </span>
                          <span className="text-lg font-extrabold text-slate-900 dark:text-white font-heading">
                            {gate.currency}{" "}
                            {formatPriceWithDecimals(
                              getEffectivePrice(gate.tuitionCostPerStudent),
                            )}
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading mb-1">
                            Funded Seats
                          </span>
                          <span className="text-lg font-extrabold text-[#0078d4] dark:text-[#04a4ec] font-heading">
                            {gate.maxAdmissibleStudents} max
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading mb-1">
                            Enrolled
                          </span>
                          <span className="text-lg font-extrabold text-slate-900 dark:text-white font-heading">
                            {gate.currentlyAdmittedCount}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={() => setShowDonationModal(true)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center cursor-pointer font-heading"
                        >
                          <HeartHandshake className="w-4 h-4 mr-2" />
                          Donate or Sponsor
                        </button>
                        <button
                          onClick={() => setActiveTab("donations")}
                          className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer font-heading"
                        >
                          View Donor Hall & Sponsorships →
                        </button>
                      </div>
                    </div>
                  )}

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 font-heading">
                    Admission & Guidelines
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-heading flex items-center">
                          <CreditCard className="w-4 h-4 mr-2 text-slate-300" /> Payment Availability
                        </h3>
                        <p className="text-slate-900 dark:text-white text-sm font-medium font-body">
                          {course.paymentTermsAllowed === "both"
                            ? "One-time & Installment Plans Available"
                            : course.paymentTermsAllowed === "installment"
                              ? "Installment Plan Only"
                              : "One-Time Payment Only"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-heading flex items-center">
                           <BookOpen className="w-4 h-4 mr-2 text-slate-300" /> Student Admission Guidelines
                        </h3>
                        <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-body">
                          {course.requirements ? (
                            <ul className="space-y-2 list-disc pl-5">
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
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-heading flex items-center">
                          <Send className="w-4 h-4 mr-2 text-slate-300" /> Enrollment Procedure
                        </h3>
                        <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-body">
                          {course.applicationProcess ? (
                            <ol className="space-y-3">
                              {course.applicationProcess
                                .split("\n")
                                .filter(Boolean)
                                .map((step, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="w-5 h-5 rounded-md bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] text-[10px] font-bold flex items-center justify-center mr-2.5 mt-0.5 shrink-0 font-heading">
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
                    </div>
                    
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-heading flex items-center">
                          <Award className="w-4 h-4 mr-2 text-slate-300" /> Instructor Qualifications
                        </h3>
                        <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-body">
                          {course.instructorRequirements ? (
                            <ul className="space-y-2 list-disc pl-5">
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
              <div className="animate-in fade-in">
                <CourseModulesTab
                  course={course}
                  isStudent={isStudent}
                  isPreview={isPreviewAsStudent}
                  onTogglePreview={setIsPreviewAsStudent}
                />
              </div>
            )}

            {activeTab === "materials" && (
              <div className="animate-in fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                    Library & Resources
                  </h2>
                </div>

                {!isStudent && (
                  <form
                    onSubmit={handleAddMaterial}
                    className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4 shadow-sm"
                  >
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-heading">
                        Material Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newMatTitle}
                        onChange={(e) => setNewMatTitle(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] transition font-body"
                        placeholder="e.g. Course Syllabus PDF"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-heading">
                        Resource URL or Upload
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          required={!newMatUrl}
                          value={newMatUrl}
                          onChange={(e) => setNewMatUrl(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] transition font-body"
                          placeholder="https://..."
                        />
                        <div className="shrink-0 h-[42px] flex items-center">
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
                      className="px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-sm font-bold flex items-center h-[42px] shrink-0 transition shadow-sm font-heading cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Add Material
                    </button>
                  </form>
                )}

                <div className="space-y-3">
                  {courseMaterials.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800">
                      <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-body">
                        No materials have been uploaded yet.
                      </p>
                    </div>
                  ) : (
                    courseMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] dark:hover:border-[#04a4ec] rounded-xl transition-all shadow-sm group"
                      >
                        <a
                          href={mat.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center flex-1 min-w-0"
                        >
                          <div className="w-10 h-10 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-xl flex items-center justify-center mr-4 group-hover:bg-[#0078d4] group-hover:text-white transition-colors shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingMaterialId === mat.id ? (
                              <input
                                type="text"
                                value={editingMaterialTitle}
                                onChange={(e) =>
                                  setEditingMaterialTitle(e.target.value)
                                }
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-[#0078d4]/30 focus:outline-none rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white mb-1 font-body"
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
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate font-heading group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition-colors">
                                {mat.title}
                              </p>
                            )}
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading mt-0.5">
                              {mat.type}
                            </p>
                          </div>
                        </a>

                        {!isStudent && (
                          <div className="flex items-center space-x-2 ml-4 shrink-0">
                            {editingMaterialId === mat.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateMaterial(mat.id!)}
                                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                  title="Save"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingMaterialId(null)}
                                  className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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
                                  className="p-2 text-slate-400 hover:text-[#0078d4] hover:bg-[#d6e9f8]/50 rounded-lg transition-colors cursor-pointer"
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
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
              <div className="animate-in fade-in">
                 <CourseDiscussions courseId={course.id} isStudent={isStudent} />
              </div>
            )}

            {activeTab === "people" && !isStudent && (
              <div className="animate-in fade-in">
                <OrgUserOnboarding courseId={course.id} />
              </div>
            )}

            {activeTab === "assessments" && (
              <div className="animate-in fade-in">
                <CourseAssessments courseId={course.id} isStudent={isStudent} />
              </div>
            )}
            
            {activeTab === "certificate" && (
              <div className="animate-in fade-in">
                <CourseCertificate
                  course={course}
                  isStudent={isStudent}
                  progress={progressPercentage}
                />
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="animate-in fade-in">
                <CourseSchedule
                  courseId={course.id}
                  isStudent={isStudent}
                  onJoinLiveCall={() => {
                    setIsCallActiveInApp(true);
                    setTimeout(() => {
                      const el = document.getElementById("live-class-viewport");
                      if (el)
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }, 200);
                  }}
                  onStartLiveCall={() => {
                    setIsCallActiveInApp(true);
                    setTimeout(() => {
                      const el = document.getElementById("live-class-viewport");
                      if (el)
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }, 200);
                  }}
                />
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="animate-in fade-in">
                <CourseAttendance course={course} isStudent={isStudent} />
              </div>
            )}

            {activeTab === "donations" && (
              <div className="animate-in fade-in space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider mb-1.5 font-heading">
                      <HeartHandshake className="w-4 h-4" />
                      <span>Community Sponsorship & Donation Campaign</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
                      Vocational Tuition Funding Hall
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-body">
                      This course is tuition-free for admitted students, powered
                      directly by generous individual donors and corporate
                      sponsors.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDonationModal(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow-sm hover:shadow-md flex items-center justify-center self-start md:self-auto cursor-pointer font-heading"
                  >
                    <HeartHandshake className="w-4 h-4 mr-2" />
                    Make a Donation / Sponsor
                  </button>
                </div>

                {gate && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-heading">
                        Total Raised
                      </span>
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-heading">
                        {gate.currency} {gate.totalDonations.toLocaleString()}
                      </div>
                      {course.donationTargetAmount && (
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 font-body">
                          Goal: {gate.currency}{" "}
                          {course.donationTargetAmount.toLocaleString()} (
                          {Math.min(
                            100,
                            Math.round(
                              (gate.totalDonations /
                                course.donationTargetAmount) *
                                100,
                            ),
                          )}
                          %)
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-heading">
                        Tuition Cost / Student
                      </span>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-heading">
                        {gate.currency}{" "}
                        {gate.tuitionCostPerStudent.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 font-body">
                        Covers training, tools & certification
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-heading">
                        Funded Admission Spots
                      </span>
                      <div className="text-2xl font-extrabold text-[#0078d4] dark:text-[#04a4ec] mt-1 font-heading">
                        {gate.currentlyAdmittedCount} /{" "}
                        {gate.maxAdmissibleStudents}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 font-body">
                        {gate.remainingSpots > 0
                          ? `${gate.remainingSpots} seats open right now`
                          : "All funded seats filled"}
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-heading">
                        Next Seat Unlocks At
                      </span>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-heading">
                        {gate.nextSeatNeededAmount > 0
                          ? `+${gate.currency} ${gate.nextSeatNeededAmount.toLocaleString()}`
                          : "Session Full"}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 font-body">
                        {gate.nextSeatNeededAmount > 0
                          ? "additional donations needed"
                          : "maximum batch limit reached"}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5 font-heading">
                    Pledges & Sponsoring Contributors (
                    {courseDonationList.length})
                  </h3>

                  {courseDonationList.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                      <HeartHandshake className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 font-body">
                        Be the first generous contributor to sponsor students
                        for this course!
                      </p>
                      <button
                        onClick={() => setShowDonationModal(true)}
                        className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center cursor-pointer font-heading"
                      >
                        <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
                        Sponsor a Seat
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courseDonationList.map((donation) => (
                        <div
                          key={donation.id}
                          className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center font-heading">
                                <span>
                                  {donation.donorName || "Anonymous Donor"}
                                </span>
                                {donation.donorOrganization && (
                                  <span className="ml-2 text-xs font-normal text-slate-500">
                                    • {donation.donorOrganization}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-body block mt-0.5">
                                {new Date(
                                  donation.createdAt,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>

                            <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm border border-emerald-200 dark:border-emerald-800/60 font-heading shrink-0">
                              {donation.currency}{" "}
                              {donation.amount.toLocaleString()}
                            </span>
                          </div>

                          {donation.message && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-body leading-relaxed">
                              "{donation.message}"
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-heading">
                            <span
                              className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
                                donation.donationType === "sponsorship"
                                  ? "bg-[#d6e9f8]/60 text-[#0078d4] dark:bg-[#0078d4]/15 dark:text-[#04a4ec] border border-[#0078d4]/20"
                                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              }`}
                            >
                              {donation.donationType === "sponsorship"
                                ? `Direct Sponsorship (${donation.seatsSponsored || 1} Seat${(donation.seatsSponsored || 1) > 1 ? "s" : ""})`
                                : "General Tuition Donation"}
                            </span>

                            {donation.sponsoredStudentEmails &&
                              donation.sponsoredStudentEmails.length > 0 && (
                                <span className="text-slate-500 font-medium font-body truncate max-w-[200px]" title={donation.sponsoredStudentEmails.join(", ")}>
                                  Sponsored:{" "}
                                  {donation.sponsoredStudentEmails.join(", ")}
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "lunch" && (
              <div className="animate-in fade-in">
                <LunchGames />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* MODALS */}
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

      {showDonationModal && (
        <CourseDonationModal
          course={course}
          onClose={() => setShowDonationModal(false)}
        />
      )}

      {showEditCourseModal && course && (
        <EditCourseDetailsModal
          course={course}
          onClose={() => setShowEditCourseModal(false)}
        />
      )}

      {course && (
        <CustomAlert
          isOpen={showDeleteModal}
          title="Delete Course Permanently?"
          message={`Are you sure you want to delete "${course.title}"? This action will permanently remove this course, syllabus modules, admission sessions, and all course materials.`}
          confirmText="Yes, Delete Course"
          cancelText="Cancel"
          type="danger"
          onConfirm={async () => {
            await deleteCourse(course.id);
            setShowDeleteModal(false);
            navigate("/dashboard");
          }}
          onCancel={() => setShowDeleteModal(false)}
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