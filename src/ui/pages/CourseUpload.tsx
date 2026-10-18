/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { CourseModule, CourseModuleItem, CourseFAQ } from "../../types";
import { FileUpload } from "../components/FileUpload";
import { KnowledgeCityBanner } from "../components/instructor/KnowledgeCityBanner";
import { PaystackSubaccountOnboarding } from "../components/PaystackSubaccountOnboarding";
import { SpeechToTextButton } from "../components/SpeechToTextButton";
import { generateId } from "../../lib/id";
import {
  Plus,
  X,
  UploadCloud,
  CheckCircle2,
  FileText,
  Video,
  Building2,
  ShieldAlert,
  ArrowRight,
  Check,
  Link as LinkIcon,
  Trash2,
  HeartHandshake,
  Volume2,
  Image,
  FileSpreadsheet,
  Edit3,
  Sparkles,
  Clock,
  Award,
  HelpCircle,
  User,
  Lock,
} from "lucide-react";
import { OrgPlanUpgradeModal } from "../components/OrgPlanUpgradeModal";

const CourseUpload = () => {
  const navigate = useNavigate();
  const { addCourse, orgMembers, organizations, courses, updateOrgMember } = useAppContext();
  const { currentUser } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // Payment terms tick box state (select one or both)
  const [allowPayInFull, setAllowPayInFull] = useState(true);
  const [allowInstallments, setAllowInstallments] = useState(true);
  const [installmentInterval, setInstallmentInterval] = useState<
    "weekly" | "monthly" | "custom"
  >("monthly");
  const [customMilestonesText, setCustomMilestonesText] = useState("");

  // Vocational Education Funding & Admission Model
  const [fundingModel, setFundingModel] = useState<
    "direct_tuition" | "donations_sponsorships"
  >("direct_tuition");
  const [tuitionCostPerStudent, setTuitionCostPerStudent] = useState("");

  // Itemized Requirements State
  const [studentReqList, setStudentReqList] = useState<string[]>([]);
  const [newStudentReq, setNewStudentReq] = useState("");

  const [requiredDocList, setRequiredDocList] = useState<string[]>([]);
  const [newDocName, setNewDocName] = useState("");

  const [qualificationTitle, setQualificationTitle] = useState("");
  const [qualificationType, setQualificationType] = useState<
    | "bachelors"
    | "masters"
    | "doctorate"
    | "diploma"
    | "certificate"
    | "professional"
    | "other"
  >("certificate");

  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(false);

  // Admission Session & Intake Controls
  const [initialAdmissionStatus, setInitialAdmissionStatus] = useState<
    "open" | "closed"
  >("open");
  const [sessionName, setSessionName] = useState(() => {
    const year = new Date().getFullYear();
    return `${year}/${year + 1} Academic Session`;
  });
  const [applicationDeadline, setApplicationDeadline] = useState("");

  // Detailed Course Information & Public Showcase
  const [subtitle, setSubtitle] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [pacing, setPacing] = useState<
    "self-paced" | "live-online" | "blended"
  >("blended");
  const [durationWeeks, setDurationWeeks] = useState("8 Weeks");
  const [timeCommitment, setTimeCommitment] = useState("6–8 hours / week");
  const [totalHours, setTotalHours] = useState("48 Total Hours");
  const [language, setLanguage] = useState("English");
  const [subtitlesInput, setSubtitlesInput] = useState("English [CC]");
  const [accessDuration, setAccessDuration] = useState(
    "Allows student removal once they graduate",
  );
  const [studentRemovalOnGraduation, setStudentRemovalOnGraduation] =
    useState(true);

  // Learning Objectives
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState("");

  // Instructor Information
  const [instructorName, setInstructorName] = useState(
    currentUser?.role === "instructor" ? currentUser.name : "",
  );
  const [selectedInstructorMemberId, setSelectedInstructorMemberId] = useState("");
  const [instructorTitle, setInstructorTitle] = useState("");
  const [instructorBio, setInstructorBio] = useState("");

  // Certification & Policy
  const [certificationDetails, setCertificationDetails] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");

  // FAQs
  const [faqs, setFaqs] = useState<CourseFAQ[]>([]);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  // Curriculum Structure (Modules, Sections, Lectures)
  const [modules, setModules] = useState<CourseModule[]>(() => [
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

  const [showSubaccountModal, setShowSubaccountModal] = useState(false);
  const [bypassSubaccount, setBypassSubaccount] = useState(false);

  if (
    !currentUser ||
    (currentUser.role !== "organization" && currentUser.role !== "instructor")
  ) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Individual Uploads Restricted
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Backpack is an institutional learning platform. Only verified partner
          organizations and affiliated instructors with organizational
          permission can upload courses.
        </p>
        <KnowledgeCityBanner variant="instructor" />
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
      : [];

  const currentOrgIdToUse =
    currentUser.role === "organization" ? currentUser.id : selectedOrgId;
  const activeOrg = organizations.find(
    (o) =>
      o.id === currentOrgIdToUse ||
      o.id === `org_${currentOrgIdToUse}` ||
      o.ownerId === currentOrgIdToUse,
  );
  const isHigherEduOrg = activeOrg?.orgType === "higher";
  const isVocationalOrg = activeOrg?.orgType === "vocational";

  const activeSubaccount =
    activeOrg?.paystackSubaccount || currentUser?.paystackSubaccount;
  const hasSubaccount = Boolean(
    activeSubaccount?.subaccount_code &&
      activeSubaccount.subaccount_code.startsWith("ACCT_"),
  );

  // Organization existing courses and tier check (free accounts limited to 15 courses)
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
  const orgCourseLimitReached = !isPaidOrg && orgExistingCourses.length >= 15;

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
      <div className="max-w-3xl mx-auto py-10 space-y-8 animate-in fade-in">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
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
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <span>Explore & Join Organizations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/onboard"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
            >
              <span>Register Your Organization</span>
            </Link>
          </div>
        </div>

        {/* Redirect to Knowledge City for individual / freelance instructors */}
        <KnowledgeCityBanner variant="instructor" />
      </div>
    );
  }

  // Level 2: Module Handlers
  const addModule = () => {
    setModules([
      ...modules,
      {
        id: generateId("mod"),
        title: "",
        description: "",
        sections: [
          {
            id: generateId("sec"),
            title: "",
            description: "",
            items: [
              {
                id: generateId("lec"),
                title: "",
                type: "video",
              },
            ],
          },
        ],
        items: [],
      },
    ]);
  };

  const updateModule = (
    index: number,
    field: "title" | "description",
    value: string,
  ) => {
    const newModules = [...modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setModules(newModules);
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  // Section Handlers
  const addSection = (moduleIndex: number) => {
    const newModules = [...modules];
    const currentSections = newModules[moduleIndex].sections || [];
    newModules[moduleIndex] = {
      ...newModules[moduleIndex],
      sections: [
        ...currentSections,
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
    };
    setModules(newModules);
  };

  const updateSection = (
    moduleIndex: number,
    sectionIndex: number,
    field: "title" | "description" | "learningObjectives",
    value: string,
  ) => {
    const newModules = [...modules];
    if (newModules[moduleIndex].sections) {
      const sections = [...newModules[moduleIndex].sections!];
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        [field]: value,
      };
      newModules[moduleIndex] = {
        ...newModules[moduleIndex],
        sections,
      };
    }
    setModules(newModules);
  };

  const removeSection = (moduleIndex: number, sectionIndex: number) => {
    const newModules = [...modules];
    if (newModules[moduleIndex].sections) {
      const sections = newModules[moduleIndex].sections!.filter(
        (_, i) => i !== sectionIndex,
      );
      newModules[moduleIndex] = {
        ...newModules[moduleIndex],
        sections,
      };
    }
    setModules(newModules);
  };

  // Lecture Handlers
  const addLecture = (
    moduleIndex: number,
    sectionIndex: number,
    itemType: CourseModuleItem["type"] = "text",
  ) => {
    const newModules = [...modules];
    if (newModules[moduleIndex].sections && newModules[moduleIndex].sections![sectionIndex]) {
      const sections = [...newModules[moduleIndex].sections!];
      const targetSection = sections[sectionIndex];
      const currentLectures = targetSection.items || [];
      sections[sectionIndex] = {
        ...targetSection,
        items: [
          ...currentLectures,
          {
            id: generateId("lec"),
            title: "",
            description: "",
            learningOutcome: "",
            type: itemType,
            formats: [itemType],
          },
        ],
      };
      newModules[moduleIndex] = { ...newModules[moduleIndex], sections };
    }
    setModules(newModules);
  };

  const toggleLectureFormat = (
    moduleIndex: number,
    sectionIndex: number,
    lectureIndex: number,
    format: "text" | "video" | "document" | "audio" | "picture" | "embed",
  ) => {
    const newModules = [...modules];
    const section = newModules[moduleIndex]?.sections?.[sectionIndex];
    if (!section?.items?.[lectureIndex]) return;

    const lecture = section.items[lectureIndex];
    const currentFormats =
      lecture.formats && lecture.formats.length > 0
        ? [...(lecture.formats as any[])]
        : [(lecture.type as any) || "text"];

    let newFormats: any[];
    if (currentFormats.includes(format)) {
      if (currentFormats.length > 1) {
        newFormats = currentFormats.filter((f) => f !== format);
      } else {
        newFormats = [format];
      }
    } else {
      newFormats = [...currentFormats, format];
    }

    lecture.formats = newFormats;
    lecture.type = newFormats[0];
    setModules(newModules);
  };

  const updateLecture = (
    moduleIndex: number,
    sectionIndex: number,
    lectureIndex: number,
    field: keyof CourseModuleItem,
    value: any,
  ) => {
    const newModules = [...modules];
    if (
      newModules[moduleIndex].sections &&
      newModules[moduleIndex].sections![sectionIndex] &&
      newModules[moduleIndex].sections![sectionIndex].items
    ) {
      const sections = [...newModules[moduleIndex].sections!];
      const targetSection = sections[sectionIndex];
      const items = [...targetSection.items!];
      items[lectureIndex] = { ...items[lectureIndex], [field]: value };
      sections[sectionIndex] = { ...targetSection, items };
      newModules[moduleIndex] = { ...newModules[moduleIndex], sections };
    }
    setModules(newModules);
  };

  const removeLecture = (
    moduleIndex: number,
    sectionIndex: number,
    lectureIndex: number,
  ) => {
    const newModules = [...modules];
    if (
      newModules[moduleIndex].sections &&
      newModules[moduleIndex].sections![sectionIndex] &&
      newModules[moduleIndex].sections![sectionIndex].items
    ) {
      const sections = [...newModules[moduleIndex].sections!];
      const targetSection = sections[sectionIndex];
      const items = targetSection.items!.filter((_, i) => i !== lectureIndex);
      sections[sectionIndex] = { ...targetSection, items };
      newModules[moduleIndex] = { ...newModules[moduleIndex], sections };
    }
    setModules(newModules);
  };



  // Requirement helper handlers
  const handleAddStudentReq = () => {
    if (!newStudentReq.trim()) return;
    setStudentReqList([...studentReqList, newStudentReq.trim()]);
    setNewStudentReq("");
  };

  const handleRemoveStudentReq = (idx: number) => {
    setStudentReqList(studentReqList.filter((_, i) => i !== idx));
  };

  const handleAddRequiredDoc = () => {
    if (!newDocName.trim()) return;
    if (!requiredDocList.includes(newDocName.trim())) {
      setRequiredDocList([...requiredDocList, newDocName.trim()]);
    }
    setNewDocName("");
  };

  const handleRemoveRequiredDoc = (docToRemove: string) => {
    setRequiredDocList(requiredDocList.filter((d) => d !== docToRemove));
  };

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    setLearningObjectives([...learningObjectives, newObjective.trim()]);
    setNewObjective("");
  };

  const handleRemoveObjective = (idx: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== idx));
  };

  const handleAddFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    setFaqs([...faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }]);
    setNewFaqQ("");
    setNewFaqA("");
  };

  const handleRemoveFaq = (idx: number) => {
    setFaqs(faqs.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Check Organization Course Limit (Free plan permits maximum 15 courses; prompt payment on 16th)
    const existingOrgCourses = courses.filter((c) => {
      return (
        c.orgId === orgIdToUse ||
        c.orgId === `org_${orgIdToUse}` ||
        c.orgId === targetOrg?.id ||
        c.orgId === targetOrg?.ownerId
      );
    });

    const isTargetOrgPaid =
      targetOrg?.plan === "paid" ||
      (currentUser.role === "organization" && currentUser.plan === "paid");

    if (!isTargetOrgPaid && existingOrgCourses.length >= 15) {
      setShowUpgradeModal(true);
      return;
    }

    const effectiveTuitionCost =
      isVocationalOrg && fundingModel === "donations_sponsorships"
        ? Number(tuitionCostPerStudent) || Number(price) || 0
        : Number(price) || 0;

    // Determine payment terms allowed
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
          .map((s) => s.trim())
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

      // If an existing org instructor was selected, ensure this course is added to their courseIds
      if (selectedInstructor && updateOrgMember) {
        const prevCourseIds = selectedInstructor.courseIds || [];
        if (!prevCourseIds.includes(newCourseId)) {
          await updateOrgMember(selectedInstructor.id, {
            courseIds: [...prevCourseIds, newCourseId],
          });
        }
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to upload course", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in fade-in">
      {/* Knowledge City notice for freelance creators (instructor only) */}
      {currentUser?.role === "instructor" && (
        <KnowledgeCityBanner variant="instructor" />
      )}

      {/* 15-Course Free Plan Limit Banner */}
      {orgCourseLimitReached && (
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-amber-500/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Course Limit Reached ({orgExistingCourses.length}/15 Courses on
                  Free Plan)
                </h3>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  Upgrade Required
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Free organizations are allowed to publish a maximum of 15
                courses. To publish your 16th course and unlock unlimited
                courses, please upgrade your organization account to
                Organization Pro.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Upgrade Account</span>
          </button>
        </div>
      )}

      {/* Subaccount Prompt Banner */}
      {!hasSubaccount && !bypassSubaccount && (
        <div className="p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-6 h-6 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Paystack Settlement Subaccount Required Before Publishing
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 leading-relaxed">
                  To receive tuition payouts directly into your bank account (85% subaccount split / 15% platform split), your organization must create or link a Paystack settlement subaccount before publishing courses.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowSubaccountModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs whitespace-nowrap transition shadow-sm cursor-pointer"
              >
                Set Up Subaccount Now
              </button>
              <button
                type="button"
                onClick={() => setBypassSubaccount(true)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs whitespace-nowrap transition shadow-sm cursor-pointer"
              >
                Set Up Subaccount Later
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-amber-500/20">
            * Note: If you continue without a subaccount, tuition proceeds will be held securely in platform escrow until a verified settlement account is linked.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
            <UploadCloud className="w-8 h-8 mr-3 text-indigo-500" />
            Create Institutional Course
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {currentUser.role === "organization"
              ? "Publish an accredited curriculum for your organization."
              : "Publish a course under your verified organization's sponsorship."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3">
            Institutional Sponsorship & Course Overview
          </h2>

          {currentUser.role === "instructor" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Sponsoring Organization <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              >
                <option value="" disabled>
                  Select an approved organization with instructor permission
                </option>
                {approvedOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Instructors can only publish courses under authorized partner
                organizations.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Course Title <span className="text-red-500">*</span>
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setTitle((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master of Software Architecture"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Course Description <span className="text-red-500">*</span>
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setDescription((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed overview of the curriculum and learning outcomes..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-28 text-sm leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Subtitle or Hook (Optional)
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setSubtitle((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. A comprehensive, professional-grade curriculum designed to empower learners with tangible real-world mastery..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A one-sentence summary explaining the unique value proposition on
              the public course page.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Why This Course Matters & Philosophy (Optional)
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setWhyItMatters((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <textarea
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              placeholder="Explain why this course is essential, its educational philosophy, and real-world practical impact..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-24 text-sm leading-relaxed"
            />
          </div>

          {/* Degree & Qualification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Awarded Qualification Type
              </label>
              <select
                value={qualificationType}
                onChange={(e) =>
                  setQualificationType(
                    e.target.value as
                      | "bachelors"
                      | "masters"
                      | "doctorate"
                      | "diploma"
                      | "certificate"
                      | "professional"
                      | "other",
                  )
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="certificate">Professional Certificate</option>
                <option value="diploma">Diploma</option>
                <option value="bachelors" disabled={!isHigherEduOrg}>
                  Bachelor's Degree{" "}
                  {isHigherEduOrg
                    ? "(Higher Ed)"
                    : "(Requires Higher Ed Institution)"}
                </option>
                <option value="masters" disabled={!isHigherEduOrg}>
                  Master's Degree{" "}
                  {isHigherEduOrg
                    ? "(Higher Ed)"
                    : "(Requires Higher Ed Institution)"}
                </option>
                <option value="doctorate" disabled={!isHigherEduOrg}>
                  Doctorate{" "}
                  {isHigherEduOrg
                    ? "(Higher Ed)"
                    : "(Requires Higher Ed Institution)"}
                </option>
                <option value="professional">Professional License</option>
                <option value="other">Other Credential</option>
              </select>
              {!isHigherEduOrg && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Higher education degrees (Bachelors, Masters, Doctorate) are
                  restricted to Higher Education Institutions.
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Qualification Title (Optional)
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setQualificationTitle((prev) =>
                      prev ? `${prev} ${text}` : text
                    )
                  }
                />
              </div>
              <input
                type="text"
                value={qualificationTitle}
                onChange={(e) => setQualificationTitle(e.target.value)}
                placeholder="e.g. Certified Cloud Practitioner"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Vocational Education Funding & Admission Model Selection */}
          {isVocationalOrg && (
            <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-4">
              <div>
                <div className="flex items-center space-x-2">
                  <HeartHandshake className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Vocational Funding & Admission Model
                  </label>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  As a vocational education provider, choose how this course
                  will be funded: direct tuition from students, or community
                  donations and student sponsorships.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Direct Tuition */}
                <button
                  type="button"
                  onClick={() => setFundingModel("direct_tuition")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    fundingModel === "direct_tuition"
                      ? "bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      Charge Students Tuition Directly
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        fundingModel === "direct_tuition"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {fundingModel === "direct_tuition" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Students pay their tuition directly upon course enrollment
                    via one-time payment or installments.
                  </p>
                </button>

                {/* Option 2: Donations & Sponsorships */}
                <button
                  type="button"
                  onClick={() => {
                    setFundingModel("donations_sponsorships");
                    if (!tuitionCostPerStudent && price) {
                      setTuitionCostPerStudent(price);
                    }
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    fundingModel === "donations_sponsorships"
                      ? "bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-1.5">
                      <span>Donations & Sponsorships</span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        fundingModel === "donations_sponsorships"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {fundingModel === "donations_sponsorships" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Accept donations and sponsorships from anyone (even
                    unregistered non-app donors). Only covered students are
                    admitted.
                  </p>
                </button>
              </div>

              {fundingModel === "donations_sponsorships" && (
                <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Tuition Cost per Student (Calculates Admission Gate){" "}
                      <span className="text-red-500">*</span>
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold pr-24"
                      />
                      <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                        {currency} / student
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/60 leading-relaxed">
                    <strong>Admission Gate Calculation:</strong> Backpack
                    calculates the number of students admitted as:
                    <span className="font-mono font-bold mx-1">
                      floor(Total Donations ÷ Tuition Cost Per Student)
                    </span>
                    . Decimal results strictly consider the whole number for
                    student admission capacity. Donors can donate any amount or
                    sponsor specific students before the course closes.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tuition & Terms */}
          {(!isVocationalOrg || fundingModel === "direct_tuition") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Tuition Fee (0 for Free){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
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

          {/* Currency picker for donation funded model if tuition fee input is hidden */}
          {isVocationalOrg && fundingModel === "donations_sponsorships" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Tuition Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
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

          {/* Payment Terms Tick Boxes & Interactive Buttons */}
          {(!isVocationalOrg || fundingModel === "direct_tuition") &&
            Number(price) > 0 && (
              <div className="p-5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Permitted Payment Terms (Tick One or Both Options)
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Organisations can enable Pay in Full, Flexible Installments,
                    or both options seamlessly for students.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pay in Full (One-time payment) Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !allowPayInFull;
                      if (!nextVal && !allowInstallments) return;
                      setAllowPayInFull(nextVal);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                      allowPayInFull
                        ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        allowPayInFull
                          ? "bg-indigo-600 border-indigo-600 text-slate-900 dark:text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {allowPayInFull && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-xs block">
                        Pay in Full (One-time payment)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-relaxed">
                        Students pay 100% of the tuition upfront upon course
                        checkout.
                      </span>
                    </div>
                  </button>

                  {/* Flexible Installments Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !allowInstallments;
                      if (!nextVal && !allowPayInFull) return;
                      setAllowInstallments(nextVal);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                      allowInstallments
                        ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        allowInstallments
                          ? "bg-indigo-600 border-indigo-600 text-slate-900 dark:text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {allowInstallments && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-xs block">
                        Flexible Installments
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-relaxed">
                        Students pay tuition over periodic intervals or
                        milestone installments.
                      </span>
                    </div>
                  </button>
                </div>

                {/* Installment Frequency Options */}
                {allowInstallments && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Installment Payment Frequency
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setInstallmentInterval("monthly")}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          installmentInterval === "monthly"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Monthly (Every 30 Days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstallmentInterval("weekly")}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          installmentInterval === "weekly"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Weekly (Every 7 Days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstallmentInterval("custom")}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          installmentInterval === "custom"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Custom Milestones
                      </button>
                    </div>

                    {installmentInterval === "custom" && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Describe Custom Milestone Payment Schedule
                          </label>
                          <SpeechToTextButton
                            onTranscript={(text) =>
                              setCustomMilestonesText((prev) =>
                                prev ? `${prev} ${text}` : text
                              )
                            }
                          />
                        </div>
                        <input
                          type="text"
                          value={customMilestonesText}
                          onChange={(e) =>
                            setCustomMilestonesText(e.target.value)
                          }
                          placeholder="e.g. 40% upon admission, 30% mid-semester, 30% before final exams"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Requirements & Required Documents Configuration */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
            Application Requirements & Document Checklist
          </h2>

          {/* Required Documents from Students */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Required Documents for Admission Review
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Students must upload these documents when applying for
                organization review.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="e.g. High School Transcript, National ID"
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <SpeechToTextButton
                onTranscript={(text) =>
                  setNewDocName((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
              <button
                type="button"
                onClick={handleAddRequiredDoc}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Document Requirement</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {requiredDocList.map((doc) => (
                <span
                  key={doc}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold"
                >
                  <span>{doc}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequiredDoc(doc)}
                    className="ml-2 text-indigo-400 hover:text-red-500 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Criteria & Guidelines */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Student Eligibility Criteria
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStudentReq}
                onChange={(e) => setNewStudentReq(e.target.value)}
                placeholder="e.g. Basic understanding of JavaScript, Grade 12 completion"
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <SpeechToTextButton
                onTranscript={(text) =>
                  setNewStudentReq((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
              <button
                type="button"
                onClick={handleAddStudentReq}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criteria</span>
              </button>
            </div>

            {studentReqList.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {studentReqList.map((req, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <span>• {req}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudentReq(idx)}
                      className="text-slate-400 hover:text-red-500 transition p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Course Pacing, Time Commitment & Language */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-500" />
              Pacing, Time Commitment & Language
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Provide schedule expectations, duration, and translation options
              for public course visitors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Course Pacing
              </label>
              <select
                value={pacing}
                onChange={(e) =>
                  setPacing(
                    e.target.value as "self-paced" | "live-online" | "blended",
                  )
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="blended">Blended Learning</option>
                <option value="self-paced">Self-Paced</option>
                <option value="live-online">Live Online (Cohort)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Duration
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setDurationWeeks((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                placeholder="e.g. 8 Weeks, 1 Semester"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Weekly Commitment
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setTimeCommitment((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={timeCommitment}
                onChange={(e) => setTimeCommitment(e.target.value)}
                placeholder="e.g. 6–8 hours / week"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Total Hours
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setTotalHours((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder="e.g. 48 Total Hours"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Primary Language
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setLanguage((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English, French"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Access Duration
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setAccessDuration((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="Continuous Study Access">
                  Continuous Study Access - (treats access as continuous until the student specifically graduates. There is no predetermined time limit (like a semester or academic year) tied to the course itself; access remains active for as long as it takes the student to complete their program.)
                </option>
                <option value="Lifetime Access">
                  Lifetime Access
                </option>
                <option value="Academic Session Cohort">
                  Academic Session Cohort (Revoked upon graduation or session ends/closes)
                </option>
                <option value="Active enrolment Access">
                  Active enrolment Access (Automatically revokes student access upon graduation, withdrawal or expulsion)
                </option>
                <option value="Limited Extended 6 Months post-cohort Access">
                  Limited Extended 6 Months post-cohort Access (allows access 180 days after course session ends/closes, graduation, withdrawal or expulsion)
                </option>
                <option value="Fixed Term access">
                  Fixed Term access (institutional custom course access duration)
                </option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Available Subtitles / Translations (comma-separated)
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setSubtitlesInput((prev) => (prev ? `${prev}, ${text}` : text))
                }
              />
            </div>
            <input
              type="text"
              value={subtitlesInput}
              onChange={(e) => setSubtitlesInput(e.target.value)}
              placeholder="e.g. English [CC], Spanish, French"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-indigo-500" />
              Learning Objectives: What Students Will Learn
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add clear takeaways and skills students will acquire after
              finishing this course.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="e.g. Architect scalable enterprise backends using microservices"
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <SpeechToTextButton
              onTranscript={(text) =>
                setNewObjective((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
            <button
              type="button"
              onClick={handleAddObjective}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Objective</span>
            </button>
          </div>

          {learningObjectives.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {learningObjectives.map((obj, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span className="flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-2 shrink-0" />
                    {obj}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveObjective(idx)}
                    className="text-slate-400 hover:text-red-500 transition p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lead Instructor Profile */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <User className="w-5 h-5 mr-2 text-indigo-500" />
              Lead Instructor Profile & Credentials
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Highlight the instructor's background, authority, and industry
              credentials.
            </p>
          </div>

          {availableOrgInstructors.length > 0 && (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
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
                    if (matched.department) {
                      setInstructorTitle(matched.department);
                    }
                  }
                }}
                className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">-- Choose an Instructor or Enter Manually Below --</option>
                {availableOrgInstructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.email}) {inst.department ? `• ${inst.department}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
                Selecting an instructor assigns them full editing access to this course's curriculum, materials, and live lectures.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Instructor Name
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setInstructorName((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Professional Title & Credentials
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setInstructorTitle((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={instructorTitle}
                onChange={(e) => setInstructorTitle(e.target.value)}
                placeholder="e.g. Professor of Computer Science, Ex-Senior Architect"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Instructor Biography (Optional)
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setInstructorBio((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <textarea
              value={instructorBio}
              onChange={(e) => setInstructorBio(e.target.value)}
              placeholder="Detailed educator background, research focus, industry impact, and qualifications..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-24 text-sm leading-relaxed"
            />
          </div>
        </div>

        {/* Certification Details & Refund Policy */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Award className="w-5 h-5 mr-2 text-emerald-500" />
              Certification Details & Refund Policy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Clarify credential issuance criteria and money-back guarantee
              terms.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Certification Criteria & Details (Optional)
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setCertificationDetails((prev) =>
                    prev ? `${prev} ${text}` : text
                  )
                }
              />
            </div>
            <textarea
              value={certificationDetails}
              onChange={(e) => setCertificationDetails(e.target.value)}
              placeholder="e.g. Issued upon successful completion of all core modules, assessments, and capstone submissions with a passing score of 70% or higher."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-24 text-sm leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Refund Policy & Guarantee Window (Optional)
              </label>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setRefundPolicy((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <textarea
              value={refundPolicy}
              onChange={(e) => setRefundPolicy(e.target.value)}
              placeholder="e.g. 14-day 100% money-back guarantee prior to the second module unlock."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-20 text-sm leading-relaxed"
            />
          </div>
        </div>

        {/* Frequently Asked Questions (FAQ) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-indigo-500" />
              Frequently Asked Questions (FAQ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add common questions and answers to clarify pacing, requirements,
              and assessments.
            </p>
          </div>

          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Question
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setNewFaqQ((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="e.g. Are live classes recorded if I miss a lecture?"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Answer
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setNewFaqA((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <textarea
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                placeholder="e.g. Yes, all live sessions are recorded and made accessible in your curriculum within 24 hours."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-20 leading-relaxed"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ Item</span>
              </button>
            </div>
          </div>

          {faqs.length > 0 && (
            <div className="space-y-2 pt-1">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1 relative"
                >
                  <div className="flex items-start justify-between pr-6">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Q: {faq.question}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="text-slate-400 hover:text-red-500 transition absolute top-3 right-3"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    A: {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admission Intake Session Configuration */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <span
                className={`w-2.5 h-2.5 rounded-full mr-2.5 ${initialAdmissionStatus === "open" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
              />
              Admission Intake Session & Enrollment Controls
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold w-fit ${
                initialAdmissionStatus === "open"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}
            >
              {initialAdmissionStatus === "open"
                ? "ADMISSION OPENS ON PUBLISH"
                : "ADMISSION CLOSED INITIALLY"}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Backpack organises student applications into admission intake
            sessions. You can open and close admissions anytime from your
            dashboard, and launch new sessions so rejected applicants can
            reapply.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Initial Intake Session Name <span className="text-red-500">*</span>
                </label>
                <SpeechToTextButton
                  onTranscript={(text) =>
                    setSessionName((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <input
                type="text"
                required
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. 2026/2027 Session, Spring 2026 Cohort"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Application Deadline (Optional)
              </label>
              <input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                Initial Admission Status
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {initialAdmissionStatus === "open"
                  ? "Students can apply immediately upon publishing this course."
                  : "Course will be visible but admissions will remain closed until opened."}
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setInitialAdmissionStatus("open")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  initialAdmissionStatus === "open"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setInitialAdmissionStatus("closed")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  initialAdmissionStatus === "closed"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                Closed
              </button>
            </div>
          </div>
        </div>

        {/* Course Curriculum */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Curriculum
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Start putting together your course by creating sections, lectures and practice activities.
            </p>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Modules
            </h3>
            <button
              type="button"
              onClick={addModule}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Module</span>
            </button>
          </div>

          <div className="space-y-6">
            {modules.map((mod, modIndex) => (
              <div
                key={mod.id}
                className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-300 dark:border-slate-600 rounded-2xl relative group overflow-hidden space-y-5 p-5 sm:p-6"
              >
                {/* Module Level Order Above Title */}
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    Module {modIndex + 1}
                  </span>
                </div>

                {/* Module Header & Title */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                    <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      required
                      value={mod.title}
                      onChange={(e) =>
                        updateModule(modIndex, "title", e.target.value)
                      }
                      className="w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                      placeholder="Module Title"
                    />
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        updateModule(
                          modIndex,
                          "title",
                          mod.title ? `${mod.title} ${text}` : text,
                        )
                      }
                    />
                  </div>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(modIndex)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0 self-end sm:self-center cursor-pointer"
                      title="Delete Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Module Description / Overview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Module Description / Overview
                    </label>
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        updateModule(
                          modIndex,
                          "description",
                          mod.description ? `${mod.description} ${text}` : text,
                        )
                      }
                    />
                  </div>
                  <textarea
                    value={mod.description || ""}
                    onChange={(e) =>
                      updateModule(modIndex, "description", e.target.value)
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                    placeholder="Enter module description or overview..."
                    rows={2}
                  />
                </div>

                {/* Learning Goals Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Learning Goals
                    </label>
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        updateModule(
                          modIndex,
                          "learningGoals",
                          mod.learningGoals ? `${mod.learningGoals} ${text}` : text,
                        )
                      }
                    />
                  </div>
                  <textarea
                    value={mod.learningGoals || ""}
                    onChange={(e) =>
                      updateModule(modIndex, "learningGoals", e.target.value)
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                    placeholder="the core concepts, basic structures, and fundamental knowledge or skill students will gain"
                    rows={2}
                  />
                </div>

                {/* Sections within Module */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Sections
                    </h4>
                    <button
                      type="button"
                      onClick={() => addSection(modIndex)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-500" />
                      <span>Add Section</span>
                    </button>
                  </div>

                  {(mod.sections || []).map((sec, secIndex) => (
                    <div
                      key={sec.id}
                      className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs"
                    >
                      {/* Section Level Order Above Title */}
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          Section {secIndex + 1}
                        </span>
                      </div>

                      {/* Section Title */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-indigo-500">
                          <input
                            type="text"
                            required
                            value={sec.title}
                            onChange={(e) =>
                              updateSection(
                                modIndex,
                                secIndex,
                                "title",
                                e.target.value,
                              )
                            }
                            placeholder="Section Title"
                            className="w-full bg-transparent border-none p-0 text-xs font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                          />
                          <SpeechToTextButton
                            onTranscript={(text) =>
                              updateSection(
                                modIndex,
                                secIndex,
                                "title",
                                sec.title ? `${sec.title} ${text}` : text,
                              )
                            }
                          />
                        </div>
                        {(mod.sections || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(modIndex, secIndex)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0 cursor-pointer"
                            title="Delete Section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Section Description / Overview */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Section Description / Overview
                          </label>
                          <SpeechToTextButton
                            onTranscript={(text) =>
                              updateSection(
                                modIndex,
                                secIndex,
                                "description",
                                sec.description ? `${sec.description} ${text}` : text,
                              )
                            }
                          />
                        </div>
                        <input
                          type="text"
                          value={sec.description || ""}
                          onChange={(e) =>
                            updateSection(
                              modIndex,
                              secIndex,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Enter section description or overview..."
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Learning Objectives Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Learning Objectives
                          </label>
                          <SpeechToTextButton
                            onTranscript={(text) =>
                              updateSection(
                                modIndex,
                                secIndex,
                                "learningObjectives",
                                sec.learningObjectives ? `${sec.learningObjectives} ${text}` : text,
                              )
                            }
                          />
                        </div>
                        <textarea
                          value={sec.learningObjectives || ""}
                          onChange={(e) =>
                            updateSection(
                              modIndex,
                              secIndex,
                              "learningObjectives",
                              e.target.value,
                            )
                          }
                          placeholder="Measurable results or demonstration of targeted knowledge, skills, or behaviors students can possess after instruction"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                          rows={2}
                        />
                      </div>

                      {/* Lectures within Section */}
                      <div className="space-y-3 sm:pl-4 sm:border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-1">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Lectures
                          </span>
                          <button
                            type="button"
                            onClick={() => addLecture(modIndex, secIndex, "text")}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Add Lecture</span>
                          </button>
                        </div>

                        {(sec.items || []).map((item, itemIndex) => {
                          const activeFormats: ("text" | "video" | "document" | "audio" | "picture" | "embed")[] =
                            item.formats && item.formats.length > 0
                              ? (item.formats as any[])
                              : [(item.type as any) || "text"];

                          return (
                            <div
                              key={item.id}
                              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs group/item space-y-3 p-3.5"
                            >
                              {/* Lecture Level Order Above Title */}
                              <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Lecture {itemIndex + 1}
                                </span>
                              </div>

                              {/* Lecture Title */}
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-indigo-500">
                                  <input
                                    type="text"
                                    required
                                    value={item.title}
                                    onChange={(e) =>
                                      updateLecture(
                                        modIndex,
                                        secIndex,
                                        itemIndex,
                                        "title",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Lecture Title"
                                    className="w-full bg-transparent border-none p-0 text-xs font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                                  />
                                  <SpeechToTextButton
                                    onTranscript={(text) =>
                                      updateLecture(
                                        modIndex,
                                        secIndex,
                                        itemIndex,
                                        "title",
                                        item.title ? `${item.title} ${text}` : text,
                                      )
                                    }
                                  />
                                </div>
                                {(sec.items || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeLecture(modIndex, secIndex, itemIndex)
                                    }
                                    className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
                                    title="Delete Lecture"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Lecture Description / Overview */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    Lecture Description / Overview
                                  </label>
                                  <SpeechToTextButton
                                    onTranscript={(text) =>
                                      updateLecture(
                                        modIndex,
                                        secIndex,
                                        itemIndex,
                                        "description",
                                        item.description ? `${item.description} ${text}` : text,
                                      )
                                    }
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={item.description || ""}
                                  onChange={(e) =>
                                    updateLecture(
                                      modIndex,
                                      secIndex,
                                      itemIndex,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter lecture description or overview..."
                                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              {/* Learning Outcome Field */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    Learning Outcome
                                  </label>
                                  <SpeechToTextButton
                                    onTranscript={(text) =>
                                      updateLecture(
                                        modIndex,
                                        secIndex,
                                        itemIndex,
                                        "learningOutcome",
                                        item.learningOutcome ? `${item.learningOutcome} ${text}` : text,
                                      )
                                    }
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={item.learningOutcome || ""}
                                  onChange={(e) =>
                                    updateLecture(
                                      modIndex,
                                      secIndex,
                                      itemIndex,
                                      "learningOutcome",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="what students will know, understand, and be able to do by the end of lecture"
                                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              {/* Content Field (text first, audio, pictures, video, document, embed or mixture) */}
                              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    Content Formats (Select one or a mixture of formats)
                                  </label>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {(["text", "audio", "picture", "video", "document", "embed"] as const).map((fmt) => {
                                      const isFmtActive = activeFormats.includes(fmt);
                                      return (
                                        <button
                                          key={fmt}
                                          type="button"
                                          onClick={() =>
                                            toggleLectureFormat(
                                              modIndex,
                                              secIndex,
                                              itemIndex,
                                              fmt,
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer border ${
                                            isFmtActive
                                              ? fmt === "text"
                                                ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-2xs"
                                                : fmt === "audio"
                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs"
                                                : fmt === "picture"
                                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-2xs"
                                                : fmt === "video"
                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-2xs"
                                                : fmt === "document"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs"
                                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs"
                                              : "bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-slate-200 dark:border-slate-700"
                                          }`}
                                        >
                                          {fmt === "text" && <Edit3 className="w-3 h-3 text-slate-500" />}
                                          {fmt === "audio" && <Volume2 className="w-3 h-3 text-amber-500" />}
                                          {fmt === "picture" && <Image className="w-3 h-3 text-rose-500" />}
                                          {fmt === "video" && <Video className="w-3 h-3 text-purple-500" />}
                                          {fmt === "document" && <FileSpreadsheet className="w-3 h-3 text-blue-500" />}
                                          {fmt === "embed" && <LinkIcon className="w-3 h-3 text-emerald-500" />}
                                          <span className="capitalize">{fmt}</span>
                                          {isFmtActive && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Active Format Inputs with Delete / Remove option */}
                                <div className="space-y-3 pt-1">
                                  {/* Text Format Input */}
                                  {activeFormats.includes("text") && (
                                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 relative group/fmt">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                          <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Text Content (Markdown supported)
                                        </span>
                                        <div className="flex items-center space-x-2">
                                          <SpeechToTextButton
                                            onTranscript={(text) =>
                                              updateLecture(
                                                modIndex,
                                                secIndex,
                                                itemIndex,
                                                "content",
                                                item.content ? `${item.content} ${text}` : text,
                                              )
                                            }
                                          />
                                          {activeFormats.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => toggleLectureFormat(modIndex, secIndex, itemIndex, "text")}
                                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center"
                                              title="Remove Text Format"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <textarea
                                        value={item.content || ""}
                                        onChange={(e) =>
                                          updateLecture(
                                            modIndex,
                                            secIndex,
                                            itemIndex,
                                            "content",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-900 dark:text-white"
                                        placeholder="Write your lecture text or notes here..."
                                        rows={4}
                                      />
                                    </div>
                                  )}

                                  {/* Audio Format Input */}
                                  {activeFormats.includes("audio") && (
                                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center">
                                          Audio Content
                                        </span>
                                        {activeFormats.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => toggleLectureFormat(modIndex, secIndex, itemIndex, "audio")}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center"
                                            title="Remove Audio Format"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-900/40">
                                        <div className="max-w-xs mx-auto">
                                          <FileUpload
                                            label="Upload Audio (.mp3, .wav, .m4a)"
                                            accept="audio/*"
                                            onUpload={(url) => {
                                              updateLecture(modIndex, secIndex, itemIndex, "audioUrl", url);
                                            }}
                                          />
                                        </div>
                                        {item.audioUrl && (
                                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-md text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Audio Attached
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Picture Format Input */}
                                  {activeFormats.includes("picture") && (
                                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center">
                                          Picture / Image Content
                                        </span>
                                        {activeFormats.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => toggleLectureFormat(modIndex, secIndex, itemIndex, "picture")}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center"
                                            title="Remove Picture Format"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-900/40">
                                        <div className="max-w-xs mx-auto">
                                          <FileUpload
                                            label="Upload Image (.png, .jpg, .jpeg, .webp)"
                                            accept="image/*"
                                            onUpload={(url) => {
                                              updateLecture(modIndex, secIndex, itemIndex, "pictureUrl", url);
                                            }}
                                          />
                                        </div>
                                        {item.pictureUrl && (
                                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-md text-[11px] font-semibold border border-rose-200 dark:border-rose-800">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Picture Attached
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Video Format Input */}
                                  {activeFormats.includes("video") && (
                                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center">
                                          <Video className="w-3.5 h-3.5 mr-1.5" /> Video Content
                                        </span>
                                        {activeFormats.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => toggleLectureFormat(modIndex, secIndex, itemIndex, "video")}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center"
                                            title="Remove Video Format"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <input
                                          type="url"
                                          value={item.videoUrl || (item.type === "video" ? item.url : "") || ""}
                                          onChange={(e) => {
                                            updateLecture(modIndex, secIndex, itemIndex, "videoUrl", e.target.value);
                                            if (item.type === "video") {
                                              updateLecture(modIndex, secIndex, itemIndex, "url", e.target.value);
                                            }
                                          }}
                                          placeholder="Video link (YouTube, Vimeo, MP4 URL)..."
                                          className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-slate-900 dark:text-white"
                                        />
                                      </div>
                                      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-900/40">
                                        <div className="max-w-xs mx-auto">
                                          <FileUpload
                                            label="Upload Video File"
                                            accept="video/*"
                                            onUpload={(url) => {
                                              updateLecture(modIndex, secIndex, itemIndex, "videoUrl", url);
                                              updateLecture(modIndex, secIndex, itemIndex, "url", url);
                                            }}
                                          />
                                        </div>
                                        {(item.videoUrl || (item.type === "video" && item.url)) && (
                                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-md text-[11px] font-semibold border border-purple-200 dark:border-purple-800">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Video Attached
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Document Format Input (Including PowerPoint slides) */}
                                  {activeFormats.includes("document") && (
                                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center">
                                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Document / PowerPoint Slides
                                        </span>
                                        {activeFormats.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => toggleLectureFormat(modIndex, secIndex, itemIndex, "document")}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center"
                                            title="Remove Document Format"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-900/40">
                                        <div className="max-w-xs mx-auto">
                                          <FileUpload
                                            label="Upload Document / PowerPoint (.pdf, .doc, .docx, .ppt, .pptx, .txt)"
                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                                            onUpload={(url) => {
                                              updateLecture(modIndex, secIndex, itemIndex, "documentUrl", url);
                                              if (item.type === "document") {
                                                updateLecture(modIndex, secIndex, itemIndex, "url", url);
                                              }
                                            }}
                                          />
                                        </div>
                                        {(item.documentUrl || (item.type === "document" && item.url)) && (
                                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md text-[11px] font-semibold border border-blue-200 dark:border-blue-800">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Document Attached
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Embed Format Input */}
                                  {activeFormats.includes("embed") && (
                                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                                          <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Embed Resource
                                        </span>
                                        {activeFormats.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => toggleLectureFormat(modIndex, secIndex, itemIndex, "embed")}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center"
                                            title="Remove Embed Format"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <input
                                          type="url"
                                          value={item.embedUrl || (item.type === "embed" ? item.url : "") || ""}
                                          onChange={(e) => {
                                            updateLecture(modIndex, secIndex, itemIndex, "embedUrl", e.target.value);
                                            if (item.type === "embed") {
                                              updateLecture(modIndex, secIndex, itemIndex, "url", e.target.value);
                                            }
                                          }}
                                          placeholder="Paste embed link URL or external resource..."
                                          className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-slate-900 dark:text-white"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center transition shadow-lg shadow-indigo-600/25 text-sm"
          >
            {loading ? "Publishing Course..." : "Publish Institutional Course"}{" "}
            <CheckCircle2 className="w-5 h-5 ml-2" />
          </button>
        </div>
      </form>

      {/* Settlement Subaccount Setup Modal */}
      {showSubaccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800 relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-indigo-500" />
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
