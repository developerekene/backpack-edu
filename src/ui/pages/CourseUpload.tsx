/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { CourseModule, CourseModuleItem, CourseFAQ } from "../../types";
import { FileUpload } from "../components/FileUpload";
import { KnowledgeCityBanner } from "../components/instructor/KnowledgeCityBanner";
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
  Sparkles,
  Clock,
  Award,
  HelpCircle,
  User,
} from "lucide-react";

const CourseUpload = () => {
  const navigate = useNavigate();
  const { addCourse, orgMembers, organizations } = useAppContext();
  const { currentUser } = useAuth();

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
  const [pacing, setPacing] = useState<"self-paced" | "live-online" | "blended">("blended");
  const [durationWeeks, setDurationWeeks] = useState("8 Weeks");
  const [timeCommitment, setTimeCommitment] = useState("6–8 hours / week");
  const [totalHours, setTotalHours] = useState("48 Total Hours");
  const [language, setLanguage] = useState("English");
  const [subtitlesInput, setSubtitlesInput] = useState("English [CC]");
  const [accessDuration, setAccessDuration] = useState("Lifetime Access upon Enrollment");

  // Learning Objectives
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState("");

  // Instructor Information
  const [instructorName, setInstructorName] = useState(
    currentUser?.role === "instructor" ? currentUser.name : ""
  );
  const [instructorTitle, setInstructorTitle] = useState("");
  const [instructorBio, setInstructorBio] = useState("");

  // Certification & Policy
  const [certificationDetails, setCertificationDetails] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");

  // FAQs
  const [faqs, setFaqs] = useState<CourseFAQ[]>([]);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  const [modules, setModules] = useState<CourseModule[]>(() => [
    { id: generateId("mod"), title: "", description: "", items: [] },
  ]);

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

  const addModule = () => {
    setModules([
      ...modules,
      { id: generateId("mod"), title: "", description: "", items: [] },
    ]);
  };

  const updateModule = (
    index: number,
    field: keyof CourseModule,
    value: unknown,
  ) => {
    const newModules = [...modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setModules(newModules);
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const addModuleItem = (
    moduleIndex: number,
    itemType: CourseModuleItem["type"],
  ) => {
    const newModules = [...modules];
    const currentItems = newModules[moduleIndex].items || [];
    newModules[moduleIndex].items = [
      ...currentItems,
      {
        id: generateId("item"),
        title: "",
        type: itemType,
      },
    ];
    setModules(newModules);
  };

  const updateModuleItem = (
    moduleIndex: number,
    itemIndex: number,
    field: keyof CourseModuleItem,
    value: any,
  ) => {
    const newModules = [...modules];
    if (newModules[moduleIndex].items) {
      newModules[moduleIndex].items![itemIndex] = {
        ...newModules[moduleIndex].items![itemIndex],
        [field]: value,
      };
    }
    setModules(newModules);
  };

  const removeModuleItem = (moduleIndex: number, itemIndex: number) => {
    const newModules = [...modules];
    if (newModules[moduleIndex].items) {
      newModules[moduleIndex].items = newModules[moduleIndex].items!.filter(
        (_, i) => i !== itemIndex,
      );
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

    try {
      await addCourse({
        id: generateId("c"),
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
        subtitles: subtitlesInput.split(",").map((s) => s.trim()).filter(Boolean),
        accessDuration: accessDuration.trim() || undefined,
        learningObjectives: learningObjectives.filter(Boolean),
        prerequisites: studentReqList.filter(Boolean),
        instructorName:
          (instructorName.trim() || (currentUser.role === "instructor" ? currentUser.name : "")) || undefined,
        instructorId:
          currentUser.role === "instructor" ? currentUser.id : undefined,
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
        modules,
      });
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Course Title <span className="text-red-500">*</span>
            </label>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Course Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed overview of the curriculum and learning outcomes..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-28 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Subtitle or Hook (Optional)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. A comprehensive, professional-grade curriculum designed to empower learners with tangible real-world mastery..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A one-sentence summary explaining the unique value proposition on the public course page.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Why This Course Matters & Philosophy (Optional)
            </label>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Qualification Title (Optional)
              </label>
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
                  As a vocational education provider, choose how this course will be funded: direct tuition from students, or community donations and student sponsorships.
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
                    Students pay their tuition directly upon course enrollment via one-time payment or installments.
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
                    Accept donations and sponsorships from anyone (even unregistered non-app donors). Only covered students are admitted.
                  </p>
                </button>
              </div>

              {fundingModel === "donations_sponsorships" && (
                <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Tuition Cost per Student (Calculates Admission Gate) <span className="text-red-500">*</span>
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
                    <strong>Admission Gate Calculation:</strong> Backpack calculates the number of students admitted as:
                    <span className="font-mono font-bold mx-1">floor(Total Donations ÷ Tuition Cost Per Student)</span>.
                    Decimal results strictly consider the whole number for student admission capacity. Donors can donate any amount or sponsor specific students before the course closes.
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
                  Tuition Fee (0 for Free) <span className="text-red-500">*</span>
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
          {(!isVocationalOrg || fundingModel === "direct_tuition") && Number(price) > 0 && (
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
                      Students pay tuition over periodic intervals or milestone
                      installments.
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
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Describe Custom Milestone Payment Schedule
                      </label>
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
              <button
                type="button"
                onClick={handleAddRequiredDoc}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
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
                    className="ml-2 text-indigo-400 hover:text-red-500 transition"
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
              <button
                type="button"
                onClick={handleAddStudentReq}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
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
              Provide schedule expectations, duration, and translation options for public course visitors.
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
                    e.target.value as "self-paced" | "live-online" | "blended"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Duration
              </label>
              <input
                type="text"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                placeholder="e.g. 8 Weeks, 1 Semester"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Weekly Commitment
              </label>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Total Hours
              </label>
              <input
                type="text"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder="e.g. 48 Total Hours"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Primary Language
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English, French"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Access Duration
              </label>
              <input
                type="text"
                value={accessDuration}
                onChange={(e) => setAccessDuration(e.target.value)}
                placeholder="e.g. Lifetime Access upon Enrollment"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Available Subtitles / Translations (comma-separated)
            </label>
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
              Add clear takeaways and skills students will acquire after finishing this course.
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
              Highlight the instructor's background, authority, and industry credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Instructor Name
              </label>
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Professional Title & Credentials
              </label>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Instructor Biography (Optional)
            </label>
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
              Clarify credential issuance criteria and money-back guarantee terms.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Certification Criteria & Details (Optional)
            </label>
            <textarea
              value={certificationDetails}
              onChange={(e) => setCertificationDetails(e.target.value)}
              placeholder="e.g. Issued upon successful completion of all core modules, assessments, and capstone submissions with a passing score of 70% or higher."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-24 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Refund Policy & Guarantee Window (Optional)
            </label>
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
              Add common questions and answers to clarify pacing, requirements, and assessments.
            </p>
          </div>

          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Question
              </label>
              <input
                type="text"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="e.g. Are live classes recorded if I miss a lecture?"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Answer
              </label>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Intake Session Name{" "}
                <span className="text-red-500">*</span>
              </label>
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Start putting together your course by creating sections, lectures
              and practice activities.
            </p>
          </div>

          <div className="space-y-6">
            {modules.map((mod, index) => (
              <div
                key={mod.id}
                className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-600 rounded-xl relative group overflow-hidden"
              >
                {/* Section Header */}
                <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4">
                  <div className="font-bold text-slate-900 dark:text-white shrink-0 flex items-center">
                    <span className="text-sm">Section {index + 1}:</span>
                  </div>
                  <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                    <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      required
                      value={mod.title}
                      onChange={(e) =>
                        updateModule(index, "title", e.target.value)
                      }
                      className="w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                      placeholder="Enter a title for this section"
                    />
                  </div>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(index)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0"
                      title="Delete Section"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Section Body */}
                <div className="p-4 sm:p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      What will students learn in this section?
                    </label>
                    <textarea
                      value={mod.description || ""}
                      onChange={(e) =>
                        updateModule(index, "description", e.target.value)
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                      placeholder="Brief summary of the learning objectives..."
                      rows={2}
                    />
                  </div>

                  {/* Lectures / Items */}
                  <div className="space-y-4 sm:pl-8 sm:border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                    {mod.items &&
                      mod.items.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow group/item"
                        >
                          {/* Lecture Header */}
                          <div className="p-3 sm:px-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">
                                Lecture {itemIndex + 1}:
                              </span>
                              {item.type === "video" && (
                                <Video className="w-4 h-4 text-purple-500 shrink-0" />
                              )}
                              {item.type === "document" && (
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              )}
                              {item.type === "embed" && (
                                <LinkIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                              {item.type === "text" && (
                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                              <input
                                type="text"
                                required
                                value={item.title}
                                onChange={(e) =>
                                  updateModuleItem(
                                    index,
                                    itemIndex,
                                    "title",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter a title"
                                className="flex-1 bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeModuleItem(index, itemIndex)}
                              className="text-slate-400 hover:text-red-500 ml-3 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                              title="Delete Lecture"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Lecture Content */}
                          <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 space-y-3">
                            {item.type === "text" && (
                              <textarea
                                required
                                value={item.content || ""}
                                onChange={(e) =>
                                  updateModuleItem(
                                    index,
                                    itemIndex,
                                    "content",
                                    e.target.value,
                                  )
                                }
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-900 dark:text-white"
                                placeholder="Write your lecture content here... (Markdown supported)"
                                rows={5}
                              />
                            )}
                            {item.type === "embed" && (
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700">
                                  <LinkIcon className="w-5 h-5 text-slate-500" />
                                </div>
                                <input
                                  type="url"
                                  required
                                  value={item.url || ""}
                                  onChange={(e) =>
                                    updateModuleItem(
                                      index,
                                      itemIndex,
                                      "url",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                  placeholder="Paste video or external resource link URL here..."
                                />
                              </div>
                            )}
                            {(item.type === "video" ||
                              item.type === "document") && (
                              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition duration-200">
                                <div className="max-w-xs mx-auto">
                                  <FileUpload
                                    label={`Upload ${item.type === "video" ? "Video" : "Document"}`}
                                    accept={
                                      item.type === "video"
                                        ? "video/*"
                                        : ".pdf,.doc,.docx,.txt"
                                    }
                                    onUpload={(url) =>
                                      updateModuleItem(
                                        index,
                                        itemIndex,
                                        "url",
                                        url,
                                      )
                                    }
                                  />
                                </div>
                                {item.url && (
                                  <div className="mt-4 inline-flex items-center px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold border border-emerald-200 dark:border-emerald-800/50">
                                    <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                                    File Uploaded Successfully
                                  </div>
                                )}
                                {!item.url && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                                    No file selected. Please upload a{" "}
                                    {item.type}.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                    {/* Add Item Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                        <Plus className="w-4 h-4 mr-1" /> Add Curriculum Item
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addModuleItem(index, "video")}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                        >
                          <Video className="w-3.5 h-3.5 mr-1.5" /> Video
                        </button>
                        <button
                          type="button"
                          onClick={() => addModuleItem(index, "document")}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Article /
                          Doc
                        </button>
                        <button
                          type="button"
                          onClick={() => addModuleItem(index, "embed")}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                        >
                          <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Link
                        </button>
                        <button
                          type="button"
                          onClick={() => addModuleItem(index, "text")}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-500 hover:text-slate-900 dark:hover:text-white text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Text
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addModule}
              className="w-full py-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 rounded-2xl text-sm font-bold transition flex items-center justify-center bg-transparent"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Section
            </button>
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
    </div>
  );
};

export default CourseUpload;
