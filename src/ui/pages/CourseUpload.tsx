/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { CourseModule, CourseFAQ } from "../../types";
import { KnowledgeCityBanner } from "../components/instructor/KnowledgeCityBanner";
import { PaystackSubaccountOnboarding } from "../components/PaystackSubaccountOnboarding";
import { SpeechToTextButton } from "../components/SpeechToTextButton";
import { generateId } from "../../lib/id";
import {
  Plus,
  X,
  CheckCircle2,
  Building2,
  ShieldAlert,
  ArrowLeft,
  RotateCcw,
  Check,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";
import { OrgPlanUpgradeModal } from "../components/OrgPlanUpgradeModal";
import { CourseModulesTab } from "../components/CourseModulesTab";

const COURSE_UPLOAD_DRAFT_KEY = "bp_draft_course_upload";

const getCourseUploadDraft = () => {
  try {
    const raw = localStorage.getItem(COURSE_UPLOAD_DRAFT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") return data;
    }
  } catch (err) {
    console.error("Failed to parse course upload draft", err);
  }
  return null;
};

const CourseUpload = () => {
  const navigate = useNavigate();
  const { addCourse, orgMembers, organizations, courses, updateOrgMember } = useAppContext();
  const { currentUser } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const initialDraft = getCourseUploadDraft();

  const [title, setTitle] = useState(() => initialDraft?.title || "");
  const [description, setDescription] = useState(() => initialDraft?.description || "");
  const [price, setPrice] = useState(() => initialDraft?.price || "");
  const [currency, setCurrency] = useState(() => initialDraft?.currency || "NGN");

  // Payment terms tick box state (select one or both)
  const [allowPayInFull, setAllowPayInFull] = useState(() => initialDraft?.allowPayInFull ?? true);
  const [allowInstallments, setAllowInstallments] = useState(() => initialDraft?.allowInstallments ?? true);
  const [installmentInterval, setInstallmentInterval] = useState<
    "weekly" | "monthly" | "custom"
  >(() => initialDraft?.installmentInterval || "monthly");
  const [customMilestonesText, setCustomMilestonesText] = useState(() => initialDraft?.customMilestonesText || "");

  // Vocational Education Funding & Admission Model
  const [fundingModel, setFundingModel] = useState<
    "direct_tuition" | "donations_sponsorships"
  >(() => initialDraft?.fundingModel || "direct_tuition");
  const [tuitionCostPerStudent, setTuitionCostPerStudent] = useState(() => initialDraft?.tuitionCostPerStudent || "");

  // Itemized Requirements State
  const [studentReqList, setStudentReqList] = useState<string[]>(() => initialDraft?.studentReqList || []);
  const [newStudentReq, setNewStudentReq] = useState("");

  const [requiredDocList, setRequiredDocList] = useState<string[]>(() => initialDraft?.requiredDocList || []);
  const [newDocName, setNewDocName] = useState("");

  const [qualificationTitle, setQualificationTitle] = useState(() => initialDraft?.qualificationTitle || "");
  const [qualificationType, setQualificationType] = useState<
    | "bachelors"
    | "masters"
    | "doctorate"
    | "diploma"
    | "certificate"
    | "professional"
    | "other"
  >(() => initialDraft?.qualificationType || "certificate");

  const [selectedOrgId, setSelectedOrgId] = useState(() => initialDraft?.selectedOrgId || "");
  const [loading, setLoading] = useState(false);

  // Admission Session & Intake Controls
  const [initialAdmissionStatus, setInitialAdmissionStatus] = useState<
    "open" | "closed"
  >(() => initialDraft?.initialAdmissionStatus || "open");
  const [sessionName, setSessionName] = useState(() => {
    if (initialDraft?.sessionName) return initialDraft.sessionName;
    const year = new Date().getFullYear();
    return `${year}/${year + 1} Academic Session`;
  });
  const [applicationDeadline, setApplicationDeadline] = useState(() => initialDraft?.applicationDeadline || "");

  // Detailed Course Information & Public Showcase
  const [subtitle, setSubtitle] = useState(() => initialDraft?.subtitle || "");
  const [whyItMatters, setWhyItMatters] = useState(() => initialDraft?.whyItMatters || "");
  const [pacing, setPacing] = useState<
    "self-paced" | "live-online" | "blended"
  >(() => initialDraft?.pacing || "blended");
  const [durationWeeks, setDurationWeeks] = useState(() => initialDraft?.durationWeeks || "8 Weeks");
  const [timeCommitment, setTimeCommitment] = useState(() => initialDraft?.timeCommitment || "6–8 hours / week");
  const [totalHours] = useState(() => initialDraft?.totalHours || "48 Total Hours");
  const [language, setLanguage] = useState(() => initialDraft?.language || "English");
  const [subtitlesInput, setSubtitlesInput] = useState(() => initialDraft?.subtitlesInput || "English [CC]");
  const [accessDuration, setAccessDuration] = useState(
    () => initialDraft?.accessDuration || "Allows student removal once they graduate",
  );
  const [studentRemovalOnGraduation, setStudentRemovalOnGraduation] = useState(
    () => initialDraft?.studentRemovalOnGraduation ?? true
  );

  // Learning Objectives
  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    () => initialDraft?.learningObjectives || []
  );
  const [newObjective, setNewObjective] = useState("");

  // Instructor Information
  const [instructorName, setInstructorName] = useState(
    () => initialDraft?.instructorName || (currentUser?.role === "instructor" ? currentUser.name : "")
  );
  const [selectedInstructorMemberId, setSelectedInstructorMemberId] = useState(
    () => initialDraft?.selectedInstructorMemberId || ""
  );
  const [instructorTitle, setInstructorTitle] = useState(() => initialDraft?.instructorTitle || "");
  const [instructorBio, setInstructorBio] = useState(() => initialDraft?.instructorBio || "");

  // Certification & Policy
  const [certificationDetails, setCertificationDetails] = useState(() => initialDraft?.certificationDetails || "");
  const [refundPolicy, setRefundPolicy] = useState(() => initialDraft?.refundPolicy || "");

  // FAQs
  const [faqs, setFaqs] = useState<CourseFAQ[]>(() => initialDraft?.faqs || []);

  // Curriculum Structure (Modules, Sections, Lectures)
  const [modules, setModules] = useState<CourseModule[]>(() => {
    if (Array.isArray(initialDraft?.modules) && initialDraft.modules.length > 0) {
      return initialDraft.modules;
    }
    return [
      {
        id: generateId("mod"),
        title: "",
        description: "",
        learningGoals: "",
        sections: [
          {
            id: generateId("sec"),
            title: "",
            description: "",
            learningObjectives: "",
            items: [
              {
                id: generateId("lec"),
                title: "",
                description: "",
                learningOutcome: "",
                type: "text",
                formats: ["text"],
              },
            ],
          },
        ],
        items: [],
      },
    ];
  });

  const [showSubaccountModal, setShowSubaccountModal] = useState(false);
  const [bypassSubaccount, setBypassSubaccount] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(() => Boolean(initialDraft));

  // Step state for creation flow
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 6;
  const stepTitles = [
    "Basic Information",
    "Pricing & Admissions",
    "Requirements & Docs",
    "Pacing & Language",
    "Learning & Instructor",
    "Curriculum Builder"
  ];

  // Auto-save form draft whenever any field changes
  useEffect(() => {
    const draftData = {
      title,
      description,
      price,
      currency,
      allowPayInFull,
      allowInstallments,
      installmentInterval,
      customMilestonesText,
      fundingModel,
      tuitionCostPerStudent,
      studentReqList,
      requiredDocList,
      qualificationTitle,
      qualificationType,
      selectedOrgId,
      initialAdmissionStatus,
      sessionName,
      applicationDeadline,
      subtitle,
      whyItMatters,
      pacing,
      durationWeeks,
      timeCommitment,
      totalHours,
      language,
      subtitlesInput,
      accessDuration,
      studentRemovalOnGraduation,
      learningObjectives,
      instructorName,
      selectedInstructorMemberId,
      instructorTitle,
      instructorBio,
      certificationDetails,
      refundPolicy,
      faqs,
      modules,
      updatedAt: new Date().toISOString(),
    };

    const isAnyFieldFilled =
      Boolean(title.trim()) ||
      Boolean(description.trim()) ||
      Boolean(price) ||
      Boolean(subtitle.trim()) ||
      learningObjectives.length > 0 ||
      studentReqList.length > 0;

    if (isAnyFieldFilled) {
      localStorage.setItem(COURSE_UPLOAD_DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [
    title,
    description,
    price,
    currency,
    allowPayInFull,
    allowInstallments,
    installmentInterval,
    customMilestonesText,
    fundingModel,
    tuitionCostPerStudent,
    studentReqList,
    requiredDocList,
    qualificationTitle,
    qualificationType,
    selectedOrgId,
    initialAdmissionStatus,
    sessionName,
    applicationDeadline,
    subtitle,
    whyItMatters,
    pacing,
    durationWeeks,
    timeCommitment,
    totalHours,
    language,
    subtitlesInput,
    accessDuration,
    studentRemovalOnGraduation,
    learningObjectives,
    instructorName,
    selectedInstructorMemberId,
    instructorTitle,
    instructorBio,
    certificationDetails,
    refundPolicy,
    faqs,
    modules,
  ]);

  const clearDraft = () => {
    localStorage.removeItem(COURSE_UPLOAD_DRAFT_KEY);
    setTitle("");
    setDescription("");
    setPrice("");
    setSubtitle("");
    setWhyItMatters("");
    setStudentReqList([]);
    setRequiredDocList([]);
    setQualificationTitle("");
    setLearningObjectives([]);
    setCertificationDetails("");
    setRefundPolicy("");
    setFaqs([]);
    setModules([
      {
        id: generateId("mod"),
        title: "",
        description: "",
        learningGoals: "",
        sections: [
          {
            id: generateId("sec"),
            title: "",
            description: "",
            learningObjectives: "",
            items: [
              {
                id: generateId("lec"),
                title: "",
                description: "",
                learningOutcome: "",
                type: "text",
                formats: ["text"],
              },
            ],
          },
        ],
        items: [],
      },
    ]);
    setIsDraftRestored(false);
  };

  const isSuperAdmin =
    currentUser?.role === "super_admin" ||
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com";

  if (
    !currentUser ||
    (currentUser.role !== "organization" &&
      currentUser.role !== "instructor" &&
      !isSuperAdmin)
  ) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-body">
        <div className="max-w-xl text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800/60 shadow-xs">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Individual Uploads Restricted
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
            Backpack is an institutional learning platform. Only verified partner
            organizations and affiliated instructors with organizational
            permission can upload courses.
          </p>
          <KnowledgeCityBanner variant="instructor" />
        </div>
      </div>
    );
  }

  // Check organization permissions and orgType
  const myOrgMemberships = orgMembers.filter(
    (m) =>
      m.email === currentUser.email && (m.status === "active" || !m.status),
  );
  const approvedOrgs =
    currentUser.role === "instructor"
      ? organizations.filter((org) =>
          myOrgMemberships.some(
            (m) => m.orgId === org.id || m.orgId === org.ownerId,
          ),
        )
      : organizations;

  const currentOrgIdToUse =
    currentUser.role === "organization"
      ? currentUser.id
      : selectedOrgId || (isSuperAdmin ? "org_backpack_global" : "");
  const activeOrg = organizations.find(
    (o) =>
      o.id === currentOrgIdToUse ||
      o.id === `org_${currentOrgIdToUse}` ||
      o.ownerId === currentOrgIdToUse,
  );
  const isHigherEduOrg = activeOrg?.orgType === "higher" || isSuperAdmin;
  const isVocationalOrg = activeOrg?.orgType === "vocational";

  const activeSubaccount =
    activeOrg?.paystackSubaccount || currentUser?.paystackSubaccount;
  const hasSubaccount =
    isSuperAdmin ||
    Boolean(
      activeSubaccount?.subaccount_code &&
        activeSubaccount.subaccount_code.startsWith("ACCT_"),
    );

  // Organization existing courses and tier check
  const orgExistingCourses = courses.filter((c) => {
    return (
      c.orgId === currentOrgIdToUse ||
      c.orgId === `org_${currentOrgIdToUse}` ||
      c.orgId === activeOrg?.id ||
      c.orgId === activeOrg?.ownerId
    );
  });
  const isPaidOrg =
    activeOrg?.plan === "paid" ||
    (currentUser.role === "organization" && currentUser.plan === "paid");

  const availableOrgInstructors = orgMembers.filter((m) => {
    return (
      (m.orgId === currentOrgIdToUse ||
        m.orgId === `org_${currentOrgIdToUse}` ||
        m.orgId === activeOrg?.id ||
        m.orgId === activeOrg?.ownerId) &&
      m.role === "instructor"
    );
  });

  // If an instructor is logged in but has NO affiliated organization with permission, block individual upload
  if (currentUser.role === "instructor" && approvedOrgs.length === 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-body space-y-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 text-center space-y-5 shadow-sm max-w-2xl">
          <div className="w-16 h-16 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-2xl flex items-center justify-center mx-auto border border-[#0078d4]/20">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
              Organizational Permission Required
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
              On Backpack, instructors{" "}
              <strong>cannot upload courses as individuals</strong>. All courses
              must be published under an authorized partner organization where
              you have active instructor membership and permission.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/explore"
              className="w-full sm:w-auto px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-sm font-bold transition flex items-center justify-center font-heading"
            >
              <span>Explore & Join Organizations</span>
            </Link>
            <Link
              to="/onboard"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold transition font-heading"
            >
              <span>Register Your Organization</span>
            </Link>
          </div>
        </div>
        <KnowledgeCityBanner variant="instructor" />
      </div>
    );
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    const orgIdToUse =
      currentUser.role === "organization" ? currentUser.id : selectedOrgId;
    if (!orgIdToUse) {
      alert(
        "Please select the authorized partner organization sponsoring this course.",
      );
      return;
    }

    if (!hasSubaccount && !bypassSubaccount) {
      setShowSubaccountModal(true);
      return;
    }

    const targetOrg = organizations.find(
      (o) => o.id === orgIdToUse || o.ownerId === orgIdToUse,
    );
    const isHigherEduOrg = targetOrg?.orgType === "higher";
    const isVocationalOrg = targetOrg?.orgType === "vocational";
    const isHigherDegree = ["bachelors", "masters", "doctorate"].includes(
      qualificationType,
    );

    if (isHigherDegree && !isHigherEduOrg) {
      alert(
        "Higher education degrees (Bachelors, Masters, Doctorate) can only be offered by Higher Education Institutions.",
      );
      return;
    }

    if (!isPaidOrg && orgExistingCourses.length >= 15) {
      setShowUpgradeModal(true);
      return;
    }

    const effectiveTuitionCost =
      isVocationalOrg && fundingModel === "donations_sponsorships"
        ? Number(tuitionCostPerStudent) || Number(price) || 0
        : Number(price) || 0;

    let paymentTermsAllowed: "one-time" | "installment" | "both" = "both";
    if (allowPayInFull && allowInstallments) {
      paymentTermsAllowed = "both";
    } else if (allowPayInFull) {
      paymentTermsAllowed = "one-time";
    } else if (allowInstallments) {
      paymentTermsAllowed = "installment";
    }

    setLoading(true);

    const initialSessionId = generateId("ses");
    const effectiveSessionName =
      sessionName.trim() ||
      `${new Date().getFullYear()}/${new Date().getFullYear() + 1} Academic Session`;
    const initialSession = {
      id: initialSessionId,
      name: effectiveSessionName,
      status: initialAdmissionStatus,
      startDate: new Date().toISOString().split("T")[0],
      applicationDeadline: applicationDeadline || undefined,
      createdAt: new Date().toISOString(),
    };

    const selectedInstructor = availableOrgInstructors.find(
      (m) => m.id === selectedInstructorMemberId,
    );
    const resolvedInstructorId =
      selectedInstructor?.userId ||
      selectedInstructor?.id ||
      (currentUser.role === "instructor" ? currentUser.id : undefined);

    const newCourseId = generateId("c");

    try {
      await addCourse({
        id: newCourseId,
        orgId: orgIdToUse,
        title,
        description,
        price: effectiveTuitionCost,
        currency,
        paymentTermsAllowed:
          isVocationalOrg && fundingModel === "donations_sponsorships"
            ? "one-time"
            : paymentTermsAllowed,
        fundingModel: isVocationalOrg ? fundingModel : "direct_tuition",
        tuitionCostPerStudent: effectiveTuitionCost,
        totalDonationsReceived: 0,
        installmentInterval: allowInstallments
          ? installmentInterval
          : undefined,
        customMilestonesText:
          allowInstallments && installmentInterval === "custom"
            ? customMilestonesText.trim()
            : undefined,
        qualificationTitle: qualificationTitle.trim() || undefined,
        qualificationType,
        subtitle: subtitle.trim() || undefined,
        whyItMatters: whyItMatters.trim() || undefined,
        pacing,
        durationWeeks: durationWeeks.trim() || undefined,
        timeCommitment: timeCommitment.trim() || undefined,
        totalHours: totalHours.trim() || undefined,
        language: language.trim() || undefined,
        subtitles: subtitlesInput
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        accessDuration: accessDuration.trim() || undefined,
        accessType:
          accessDuration.toLowerCase().includes("removal") ||
          accessDuration.toLowerCase().includes("graduate")
            ? "graduation_removal"
            : accessDuration.toLowerCase().includes("lifetime")
            ? "lifetime"
            : accessDuration.toLowerCase().includes("session")
            ? "session_bound"
            : "fixed_term",
        studentRemovalOnGraduation,
        learningObjectives: learningObjectives.filter(Boolean),
        prerequisites: studentReqList.filter(Boolean),
        instructorName:
          instructorName.trim() ||
          selectedInstructor?.name ||
          (currentUser.role === "instructor" ? currentUser.name : "") ||
          undefined,
        instructorId: resolvedInstructorId,
        instructorTitle: instructorTitle.trim() || undefined,
        instructorBio: instructorBio.trim() || undefined,
        certificationDetails: certificationDetails.trim() || undefined,
        refundPolicy: refundPolicy.trim() || undefined,
        faqs: faqs.length > 0 ? faqs : undefined,
        admissionStatus: initialAdmissionStatus,
        activeSessionId: initialSessionId,
        activeSessionName: effectiveSessionName,
        admissionSessions: [initialSession],
        requirements: studentReqList.join("\n"),
        requiredDocuments: requiredDocList,
        modules: modules.map((mod) => {
          const sections = mod.sections || [];
          const allLectures = sections.flatMap((sec) => sec.items || []);
          return {
            ...mod,
            sections,
            items: allLectures.length > 0 ? allLectures : (mod.items || []),
          };
        }),
      });

      if (selectedInstructor && updateOrgMember) {
        const prevCourseIds = selectedInstructor.courseIds || [];
        if (!prevCourseIds.includes(newCourseId)) {
          await updateOrgMember(selectedInstructor.id, {
            courseIds: [...prevCourseIds, newCourseId],
          });
        }
      }

      localStorage.removeItem(COURSE_UPLOAD_DRAFT_KEY);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to upload course", err);
    } finally {
      setLoading(false);
    }
  };

  function handleAddStudentReq(): void {
    if (!newStudentReq.trim()) return;
    setStudentReqList([...studentReqList, newStudentReq.trim()]);
    setNewStudentReq("");
  }

  function handleRemoveStudentReq(idx: number): void {
    setStudentReqList(studentReqList.filter((_, i) => i !== idx));
  }

  function handleAddRequiredDoc(): void {
    if (!newDocName.trim()) return;
    if (!requiredDocList.includes(newDocName.trim())) {
      setRequiredDocList([...requiredDocList, newDocName.trim()]);
    }
    setNewDocName("");
  }

  function handleRemoveRequiredDoc(doc: string): void {
    setRequiredDocList(requiredDocList.filter((d) => d !== doc));
  }

  function handleAddObjective(): void {
    if (!newObjective.trim()) return;
    setLearningObjectives([...learningObjectives, newObjective.trim()]);
    setNewObjective("");
  }

  function handleRemoveObjective(idx: number): void {
    setLearningObjectives((objectives) =>
      idx >= 0 && idx < objectives.length
        ? objectives.filter((_, objectiveIdx) => objectiveIdx !== idx)
        : objectives,
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col font-body">
      
      {/* Top Fixed Header with Progress */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center space-x-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer font-heading"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading tracking-tight flex items-center">
              Course Creator
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isDraftRestored && (
              <span className="hidden sm:inline-flex text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider font-heading">
                Draft Auto-Saved
              </span>
            )}
            {isDraftRestored && (
              <button
                type="button"
                onClick={clearDraft}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 hover:text-red-600 text-slate-500 text-[11px] font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer font-heading"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Discard Draft</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Integrated Progress Bar in Header */}
        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0078d4] dark:text-[#04a4ec] font-heading">
                Step {currentStep} of {totalSteps}
              </span>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading mt-0.5">
                {stepTitles[currentStep - 1]}
              </h2>
            </div>
            <div className="flex items-center space-x-1.5 w-full sm:w-64">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${currentStep >= i + 1 ? 'bg-[#0078d4]' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container - Full Height Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full flex justify-center">
        
        <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md h-fit mb-12 overflow-hidden">
          
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              
              {/* STEP 1: Basic Information */}
              <div className={currentStep === 1 ? 'block animate-in fade-in slide-in-from-right-4 space-y-6' : 'hidden'}>
                
                {(currentUser.role === "instructor" || isSuperAdmin) && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                      Sponsoring Organization {isSuperAdmin ? "(Override)" : ""} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedOrgId || (isSuperAdmin ? "org_backpack_global" : "")}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                    >
                      {isSuperAdmin && (
                        <option value="org_backpack_global">
                          🌐 Backpack Central Global Academy (Platform Default)
                        </option>
                      )}
                      {!isSuperAdmin && (
                        <option value="" disabled>
                          Select an approved organization with instructor permission
                        </option>
                      )}
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          🏛️ {org.name} ({org.orgType || "Organization"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Master of Software Architecture"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                      <SpeechToTextButton
                        onTranscript={(text) =>
                          setTitle((prev: string) => (prev ? `${prev} ${text}` : text))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                    Course Description <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed overview of the curriculum and learning outcomes..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pt-3 pb-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] h-36 leading-relaxed transition shadow-2xs resize-none"
                    />
                    <div className="absolute right-3 bottom-3 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                      <SpeechToTextButton
                        onTranscript={(text) =>
                          setDescription((prev: string) => (prev ? `${prev} ${text}` : text))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                    Subtitle or Hook (Optional)
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="A short summary explaining the unique value proposition..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                      <SpeechToTextButton
                        onTranscript={(text) =>
                          setSubtitle((prev: any) => (prev ? `${prev} ${text}` : text))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                    Why This Course Matters & Philosophy (Optional)
                  </label>
                  <div className="relative group">
                    <textarea
                      value={whyItMatters}
                      onChange={(e) => setWhyItMatters(e.target.value)}
                      placeholder="Explain why this course is essential, its educational philosophy..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pt-3 pb-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] h-28 leading-relaxed transition shadow-2xs resize-none"
                    />
                    <div className="absolute right-3 bottom-3 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                      <SpeechToTextButton
                        onTranscript={(text) =>
                          setWhyItMatters((prev: any) => (prev ? `${prev} ${text}` : text))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                      Awarded Qualification Type
                    </label>
                    <select
                      value={qualificationType}
                      onChange={(e) =>
                        setQualificationType(e.target.value as any)
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                    >
                      <option value="certificate">Professional Certificate</option>
                      <option value="diploma">Diploma</option>
                      <option value="bachelors" disabled={!isHigherEduOrg}>
                        Bachelor's Degree {isHigherEduOrg ? "" : "(Requires Higher Ed)"}
                      </option>
                      <option value="masters" disabled={!isHigherEduOrg}>
                        Master's Degree {isHigherEduOrg ? "" : "(Requires Higher Ed)"}
                      </option>
                      <option value="doctorate" disabled={!isHigherEduOrg}>
                        Doctorate {isHigherEduOrg ? "" : "(Requires Higher Ed)"}
                      </option>
                      <option value="professional">Professional License</option>
                      <option value="other">Other Credential</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-heading">
                      Qualification Title (Optional)
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={qualificationTitle}
                        onChange={(e) => setQualificationTitle(e.target.value)}
                        placeholder="e.g. Certified Cloud Practitioner"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setQualificationTitle((prev: any) =>
                              prev ? `${prev} ${text}` : text
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Pricing & Admissions */}
              <div className={currentStep === 2 ? 'block animate-in fade-in slide-in-from-right-4 space-y-6' : 'hidden'}>
                
                {isVocationalOrg && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading flex items-center">
                      <HeartHandshake className="w-4 h-4 mr-2 text-[#0078d4] dark:text-[#04a4ec]" />
                      Vocational Funding Model
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFundingModel("direct_tuition")}
                        className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                          fundingModel === "direct_tuition"
                            ? "bg-white dark:bg-slate-800 border-[#0078d4] ring-2 ring-[#0078d4]/20 shadow-sm"
                            : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                            Charge Tuition
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${fundingModel === "direct_tuition" ? "border-[#0078d4] bg-[#0078d4]" : "border-slate-300 dark:border-slate-600"}`}>
                            {fundingModel === "direct_tuition" && <span className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Students pay tuition directly via one-time payment or installments.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFundingModel("donations_sponsorships");
                          if (!tuitionCostPerStudent && price) setTuitionCostPerStudent(price);
                        }}
                        className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                          fundingModel === "donations_sponsorships"
                            ? "bg-white dark:bg-slate-800 border-[#0078d4] ring-2 ring-[#0078d4]/20 shadow-sm"
                            : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                            Donations & Sponsorships
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${fundingModel === "donations_sponsorships" ? "border-[#0078d4] bg-[#0078d4]" : "border-slate-300 dark:border-slate-600"}`}>
                            {fundingModel === "donations_sponsorships" && <span className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Accept donations. Only fully covered students are admitted (Tuition is 0).
                        </p>
                      </button>
                    </div>

                    {fundingModel === "donations_sponsorships" && (
                      <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 font-heading">
                          Tuition Cost per Student <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required={fundingModel === "donations_sponsorships"}
                            min="1"
                            value={tuitionCostPerStudent || price}
                            onChange={(e) => {
                              setTuitionCostPerStudent(e.target.value);
                              setPrice(e.target.value);
                            }}
                            placeholder="e.g. 75000"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition pr-24"
                          />
                          <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 font-heading">
                            {currency} / student
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(!isVocationalOrg || fundingModel === "direct_tuition") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                        Tuition Fee (0 for Free) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                      >
                        <option value="NGN">NGN (Nigerian Naira)</option>
                        <option value="GHS">GHS (Ghanaian Cedi)</option>
                        <option value="KES">KES (Kenyan Shilling)</option>
                        <option value="ZAR">ZAR (South African Rand)</option>
                        <option value="USD">USD (US Dollar)</option>
                      </select>
                    </div>
                  </div>
                )}

                {(!isVocationalOrg || fundingModel === "direct_tuition") && Number(price) > 0 && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
                      Payment Terms (Select one or both)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !allowPayInFull;
                          if (!nextVal && !allowInstallments) return;
                          setAllowPayInFull(nextVal);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                          allowPayInFull
                            ? "bg-white dark:bg-slate-800 border-[#0078d4] ring-2 ring-[#0078d4]/20 shadow-sm"
                            : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${allowPayInFull ? "bg-[#0078d4] border-[#0078d4] text-white" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"}`}>
                          {allowPayInFull && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm block font-heading">Pay in Full</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">100% upfront payment.</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !allowInstallments;
                          if (!nextVal && !allowPayInFull) return;
                          setAllowInstallments(nextVal);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                          allowInstallments
                            ? "bg-white dark:bg-slate-800 border-[#0078d4] ring-2 ring-[#0078d4]/20 shadow-sm"
                            : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${allowInstallments ? "bg-[#0078d4] border-[#0078d4] text-white" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"}`}>
                          {allowInstallments && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm block font-heading">Installments</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Split payments over time.</span>
                        </div>
                      </button>
                    </div>

                    {allowInstallments && (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
                          Installment Schedule
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {['monthly', 'weekly', 'custom'].map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setInstallmentInterval(type as any)}
                              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all font-heading capitalize ${
                                installmentInterval === type
                                  ? "bg-[#0078d4] text-white border-[#0078d4] shadow-md"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                              }`}
                            >
                              {type === 'custom' ? 'Custom Milestones' : type}
                            </button>
                          ))}
                        </div>

                        {installmentInterval === "custom" && (
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                              Describe Custom Schedule
                            </label>
                            <div className="relative group">
                              <input
                                type="text"
                                value={customMilestonesText}
                                onChange={(e) => setCustomMilestonesText(e.target.value)}
                                placeholder="e.g. 40% upon admission, 30% mid-semester, 30% before finals"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] shadow-2xs"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                                <SpeechToTextButton onTranscript={(text) => setCustomMilestonesText((prev: any) => prev ? `${prev} ${text}` : text)} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading flex items-center">
                      <span className={`w-2.5 h-2.5 rounded-full mr-2.5 ${initialAdmissionStatus === "open" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                      Admission Intake Controls
                    </label>
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 font-heading">
                      <button
                        type="button"
                        onClick={() => setInitialAdmissionStatus("open")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                          initialAdmissionStatus === "open" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => setInitialAdmissionStatus("closed")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                          initialAdmissionStatus === "closed" ? "bg-red-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Closed
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                        Initial Intake Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          required
                          value={sessionName}
                          onChange={(e) => setSessionName(e.target.value)}
                          placeholder="e.g. 2026/2027 Session"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] shadow-2xs"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                          <SpeechToTextButton onTranscript={(text) => setSessionName((prev: any) => prev ? `${prev} ${text}` : text)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                        Deadline (Optional)
                      </label>
                      <input
                        type="date"
                        value={applicationDeadline}
                        onChange={(e) => setApplicationDeadline(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] shadow-2xs cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Requirements & Docs */}
              <div className={currentStep === 3 ? 'block animate-in fade-in slide-in-from-right-4 space-y-6' : 'hidden'}>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
                      Required Admission Documents
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Students must upload these documents during application.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative group">
                      <input
                        type="text"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="e.g. High School Transcript"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setNewDocName((prev) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRequiredDoc}
                      className="px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] hover:text-[#0078d4] text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition flex items-center cursor-pointer shadow-2xs font-heading"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add
                    </button>
                  </div>

                  {requiredDocList.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {requiredDocList.map((doc) => (
                        <span key={doc} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 text-[#0078d4] dark:text-[#04a4ec] border border-[#0078d4]/20 text-xs font-bold font-heading">
                          {doc}
                          <button type="button" onClick={() => handleRemoveRequiredDoc(doc)} className="ml-2 hover:text-red-500 transition cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
                      Student Eligibility Criteria
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Skills or knowledge required prior to taking this course.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative group">
                      <input
                        type="text"
                        value={newStudentReq}
                        onChange={(e) => setNewStudentReq(e.target.value)}
                        placeholder="e.g. Basic understanding of JavaScript"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setNewStudentReq((prev) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStudentReq}
                      className="px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] hover:text-[#0078d4] text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition flex items-center cursor-pointer shadow-2xs font-heading"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add
                    </button>
                  </div>

                  {studentReqList.length > 0 && (
                    <ul className="space-y-2 pt-2">
                      {studentReqList.map((req, idx) => (
                        <li key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 shadow-2xs">
                          <span>• {req}</span>
                          <button type="button" onClick={() => handleRemoveStudentReq(idx)} className="text-slate-400 hover:text-red-500 transition p-1 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* STEP 4: Pacing & Language */}
              <div className={currentStep === 4 ? 'block animate-in fade-in slide-in-from-right-4 space-y-6' : 'hidden'}>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                      Course Pacing
                    </label>
                    <select
                      value={pacing}
                      onChange={(e) => setPacing(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                    >
                      <option value="blended">Blended Learning</option>
                      <option value="self-paced">Self-Paced</option>
                      <option value="live-online">Live Online (Cohort)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                      Duration
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(e.target.value)}
                        placeholder="e.g. 8 Weeks"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setDurationWeeks((prev: any) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                      Weekly Commitment
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={timeCommitment}
                        onChange={(e) => setTimeCommitment(e.target.value)}
                        placeholder="e.g. 6–8 hours"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setTimeCommitment((prev: any) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                      Primary Language
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="e.g. English"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setLanguage((prev: any) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                      Subtitles (comma-separated)
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={subtitlesInput}
                        onChange={(e) => setSubtitlesInput(e.target.value)}
                        placeholder="e.g. English [CC], Spanish"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setSubtitlesInput((prev: any) => (prev ? `${prev}, ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                    Access Duration
                  </label>
                  <select
                    value={accessDuration}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAccessDuration(val);
                      setStudentRemovalOnGraduation(
                        val.toLowerCase().includes("removal") ||
                          val.toLowerCase().includes("graduate") ||
                          val.toLowerCase().includes("cohort") ||
                          val.toLowerCase().includes("enrolment") ||
                          val.toLowerCase().includes("continuous"),
                      );
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                  >
                    <option value="Continuous Study Access">Continuous Study Access (No predetermined time limit)</option>
                    <option value="Lifetime Access">Lifetime Access</option>
                    <option value="Academic Session Cohort">Academic Session Cohort (Revoked upon session close)</option>
                  </select>
                </div>
              </div>

              {/* STEP 5: Learning & Instructor */}
              <div className={currentStep === 5 ? 'block animate-in fade-in slide-in-from-right-4 space-y-6' : 'hidden'}>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
                      Learning Objectives
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      What will students learn in this course?
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative group">
                      <input
                        type="text"
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        placeholder="e.g. Architect scalable enterprise backends"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] shadow-2xs"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setNewObjective((prev) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      className="px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] hover:text-[#0078d4] text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition flex items-center cursor-pointer shadow-2xs font-heading"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add
                    </button>
                  </div>

                  {learningObjectives.length > 0 && (
                    <ul className="space-y-2 pt-2">
                      {learningObjectives.map((obj, idx) => (
                        <li key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 shadow-2xs">
                          <span className="flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-[#0078d4] mr-2 shrink-0" /> {obj}
                          </span>
                          <button type="button" onClick={() => handleRemoveObjective(idx)} className="text-slate-400 hover:text-red-500 transition p-1 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading mb-4">Instructor Profile</h3>
                  
                  {availableOrgInstructors.length > 0 && (
                    <div className="mb-5 p-4 bg-[#d6e9f8]/30 dark:bg-[#0078d4]/10 rounded-xl border border-[#0078d4]/20 space-y-2.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0078d4] dark:text-[#04a4ec] font-heading">
                        Assign Existing Organization Instructor (Optional)
                      </label>
                      <select
                        value={selectedInstructorMemberId}
                        onChange={(e) => {
                          const mId = e.target.value;
                          setSelectedInstructorMemberId(mId);
                          const matched = availableOrgInstructors.find((m) => m.id === mId);
                          if (matched) {
                            setInstructorName(matched.name);
                            if (matched.department) setInstructorTitle(matched.department);
                          }
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                      >
                        <option value="">-- Choose an Instructor or Enter Manually --</option>
                        {availableOrgInstructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                        Instructor Name
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={instructorName}
                          onChange={(e) => setInstructorName(e.target.value)}
                          placeholder="e.g. Dr. Jane Smith"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                          <SpeechToTextButton
                            onTranscript={(text) =>
                              setInstructorName((prev: any) => (prev ? `${prev} ${text}` : text))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                        Title & Credentials
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={instructorTitle}
                          onChange={(e) => setInstructorTitle(e.target.value)}
                          placeholder="e.g. Professor of Computer Science"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                          <SpeechToTextButton
                            onTranscript={(text) =>
                              setInstructorTitle((prev: any) => (prev ? `${prev} ${text}` : text))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                      Instructor Biography
                    </label>
                    <div className="relative group">
                      <textarea
                        value={instructorBio}
                        onChange={(e) => setInstructorBio(e.target.value)}
                        placeholder="Detailed educator background, research focus..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pt-3 pb-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] transition shadow-2xs h-28 resize-none"
                      />
                      <div className="absolute right-3 bottom-3 text-slate-400 group-focus-within:text-[#0078d4] transition-colors">
                        <SpeechToTextButton
                          onTranscript={(text) =>
                            setInstructorBio((prev: any) => (prev ? `${prev} ${text}` : text))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 6: Curriculum Builder */}
              <div className={currentStep === 6 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                <div className="space-y-6">
                  <CourseModulesTab
                    course={{
                      id: "draft",
                      title,
                      modules,
                      orgId: selectedOrgId
                    } as any}
                    isStudent={false}
                    isPreview={false}
                  />

                  <div className="pt-8 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-8 py-4 bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white rounded-2xl text-base font-bold flex items-center justify-center transition shadow-md cursor-pointer font-heading"
                    >
                      {loading ? "Publishing Course..." : "Publish Institutional Course"} <CheckCircle2 className="w-5 h-5 ml-2.5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Common Action Buttons below forms (Not on Step 6 because it has its own Publish button) */}
              {currentStep < totalSteps && (
                <div className="flex gap-3 pt-8 mt-4 border-t border-slate-100 dark:border-slate-700">
                  {currentStep > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setCurrentStep(prev => prev - 1)} 
                      className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition shadow-2xs cursor-pointer font-heading flex items-center justify-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={currentStep === 1 && (!title.trim() || !description.trim())}
                    className="flex-1 bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center transition shadow-sm cursor-pointer font-heading ml-auto"
                  >
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Settlement Subaccount Setup Modal */}
      {showSubaccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-xl border border-slate-200 dark:border-slate-800 relative my-auto font-body">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center font-heading">
                <Building2 className="w-5 h-5 mr-2 text-[#0078d4] dark:text-[#04a4ec]" />
                Settlement Subaccount Setup
              </h3>
              <button
                type="button"
                onClick={() => setShowSubaccountModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PaystackSubaccountOnboarding
              onClose={() => {
                setShowSubaccountModal(false);
                setBypassSubaccount(true);
              }}
            />
          </div>
        </div>
      )}

      <OrgPlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        organization={activeOrg}
        currentCourseCount={orgExistingCourses.length}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
};

export default CourseUpload;