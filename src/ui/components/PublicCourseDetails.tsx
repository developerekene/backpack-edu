import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Course, Organization, CourseReview, CourseFAQ } from "../../types";
import { formatPriceWithDecimals, getEffectivePrice } from "../../lib/price";
import {
  GraduationCap,
  Award,
  Clock,
  CheckCircle2,
  Star,
  User,
  ShieldCheck,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  ThumbsUp,
  CreditCard,
  Laptop,
  FileText,
  Building,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  DoorOpen,
  DoorClosed,
  Share2,
  HeartHandshake,
  Settings2,
  Edit3,
} from "lucide-react";
import courseHeroBanner from "../../assets/images/course_hero_banner_1790126241947.jpg";

interface PublicCourseDetailsProps {
  course: Course;
  courseOrg?: Organization;
  currentUser?: {
    id: string;
    name: string;
    role?: string;
    email?: string;
  } | null;
  enrollmentStatus?: "approved" | "pending" | "rejected" | "none";
  paymentStatus?: "paid" | "unpaid";
  hasActiveInvite?: boolean;
  isVocationalFunded?: boolean;
  totalDonations?: number;
  tuitionCostPerStudent?: number;
  onApply: () => void;
  onPayTuition: () => void;
  onAcceptInvite: () => void;
  onDonate?: () => void;
  onManageSessions?: () => void;
  canManageSessions?: boolean;
  hasAccessToClassroom?: boolean;
  onGoToClassroom?: () => void;
  canEditCourse?: boolean;
  onEditCourse?: () => void;
}

export const PublicCourseDetails: React.FC<PublicCourseDetailsProps> = ({
  course,
  courseOrg,
  currentUser,
  enrollmentStatus = "none",
  paymentStatus = "unpaid",
  hasActiveInvite = false,
  isVocationalFunded = false,
  totalDonations = 0,
  tuitionCostPerStudent = 0,
  onApply,
  onPayTuition,
  onAcceptInvite,
  onDonate,
  onManageSessions,
  canManageSessions,
  hasAccessToClassroom,
  onGoToClassroom,
  canEditCourse,
  onEditCourse,
}) => {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (course.modules && course.modules.length > 0) {
      initial[course.modules[0].id] = true;
    }
    return initial;
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [helpfulReviews, setHelpfulReviews] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<
    "overview" | "syllabus" | "instructor" | "tuition" | "reviews" | "faq"
  >("overview");

  // Calculations for pricing
  const rawPrice = course.price || 0;
  const effectivePrice = getEffectivePrice(rawPrice);
  const isFree = rawPrice === 0 || isVocationalFunded;
  const installmentAllowed =
    course.paymentTermsAllowed === "installment" ||
    course.paymentTermsAllowed === "both" ||
    course.paymentTerms === "installment";
  const installmentAmount = Math.round((effectivePrice / 3) * 100) / 100;
  const platformFeeAddition = Math.round((effectivePrice - rawPrice) * 100) / 100;

  // STRICTLY ONLY information the organisation has inputted for the course!
  // No hardcoded dummy strings or filler data.
  const subtitle = course.subtitle?.trim() || "";
  const whyItMatters = course.whyItMatters?.trim() || "";

  const pacing = course.pacing;
  const pacingLabel =
    pacing === "self-paced"
      ? "Self-Paced"
      : pacing === "live-online"
      ? "Live Online (Cohort)"
      : pacing === "blended"
      ? "Blended Learning"
      : null;

  const durationWeeks = course.durationWeeks ? String(course.durationWeeks) : "";
  const timeCommitment = course.timeCommitment?.trim() || "";
  const totalHours = course.totalHours ? String(course.totalHours) : "";
  const language = course.language?.trim() || "";
  const subtitles = (course.subtitles || []).filter(Boolean);
  const accessDuration = course.accessDuration?.trim() || "";

  const learningObjectives = (course.learningObjectives || []).filter(Boolean);
  const prerequisites =
    course.prerequisites && course.prerequisites.length > 0
      ? course.prerequisites.filter(Boolean)
      : course.requirements
      ? course.requirements.split("\n").map((r) => r.trim()).filter(Boolean)
      : [];

  const certificationDetails = course.certificationDetails?.trim() || "";
  const refundPolicy = course.refundPolicy?.trim() || "";

  // Real reviews only - NO dummy reviews
  const reviews: CourseReview[] = course.reviews || [];
  const faqs: CourseFAQ[] = course.faqs || [];

  // Metrics: only if inputted by the organisation
  const studentMetrics = course.studentMetrics;
  const hasStudentMetrics = Boolean(
    studentMetrics &&
      (studentMetrics.enrolledCount !== undefined ||
        studentMetrics.completionRate ||
        studentMetrics.satisfactionRate)
  );

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const markHelpful = (id: string) => {
    setHelpfulReviews((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const isEnrolled = enrollmentStatus === "approved";
  const isPending = enrollmentStatus === "pending";
  const isPaid = paymentStatus === "paid";
  const canDirectlyEnterClass =
    hasAccessToClassroom || (isEnrolled && (isFree || isPaid));

  const totalLessons = (course.modules || []).reduce(
    (acc, m) => acc + (m.items?.length || 0),
    0
  );

  const hasQuickFacts = Boolean(
    pacingLabel ||
      durationWeeks ||
      timeCommitment ||
      totalHours ||
      language ||
      subtitles.length > 0 ||
      course.qualificationTitle ||
      certificationDetails
  );

  return (
    <div className="space-y-8 animate-in fade-in pb-16">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            to="/explore"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Catalog
          </Link>
          <span>/</span>
          {courseOrg && (
            <>
              <Link
                to={`/org/${courseOrg.id || course.orgId}`}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                {courseOrg.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
            {course.title}
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          {canEditCourse && onEditCourse && (
            <button
              onClick={onEditCourse}
              className="flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-xs"
              title="Edit course details and syllabus"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Edit Course Information
            </button>
          )}

          {canManageSessions && onManageSessions && (
            <button
              onClick={onManageSessions}
              className="flex items-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition text-xs border border-slate-200 dark:border-slate-600 shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              Manage Admissions
            </button>
          )}

          {hasAccessToClassroom && onGoToClassroom && (
            <button
              onClick={onGoToClassroom}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs shadow-md shadow-emerald-600/20"
            >
              <GraduationCap className="w-4 h-4 mr-1.5" />
              Enter Classroom
            </button>
          )}

          <button
            onClick={handleShare}
            className="flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition text-xs border border-slate-200 dark:border-slate-600"
            title="Share course page"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Copied Link
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                Share
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Course Main Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Badges / Taxonomy Line */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {courseOrg && (
                <>
                  <Link
                    to={`/org/${courseOrg.id || course.orgId}`}
                    className="inline-flex items-center font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Building className="w-3.5 h-3.5 mr-1" />
                    {courseOrg.name}
                  </Link>
                </>
              )}
              {course.qualificationTitle && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center font-semibold text-slate-700 dark:text-slate-300">
                    <GraduationCap className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                    {course.qualificationTitle}
                  </span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span
                className={`font-bold inline-flex items-center ${
                  course.admissionStatus !== "closed"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500"
                }`}
              >
                {course.admissionStatus !== "closed" ? (
                  <>
                    <DoorOpen className="w-3.5 h-3.5 mr-1" />
                    Admissions Open ({course.activeSessionName || "Active Intake"})
                  </>
                ) : (
                  <>
                    <DoorClosed className="w-3.5 h-3.5 mr-1" />
                    Admissions Closed
                  </>
                )}
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {course.title}
              </h1>
              {subtitle && (
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Social Proof & Metrics Inline - ONLY show real inputted values */}
            {(course.rating || reviews.length > 0 || hasStudentMetrics) && (
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
                {(course.rating || reviews.length > 0) && (
                  <div className="flex items-center space-x-1">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(course.rating || 5)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      ))}
                    </div>
                    {course.rating && (
                      <span className="font-black text-slate-900 dark:text-white ml-1">
                        {course.rating}
                      </span>
                    )}
                    {reviews.length > 0 && (
                      <span>
                        ({reviews.length} verified {reviews.length === 1 ? "review" : "reviews"})
                      </span>
                    )}
                  </div>
                )}

                {studentMetrics?.enrolledCount !== undefined && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      {studentMetrics.enrolledCount.toLocaleString()} learners enrolled
                    </div>
                  </>
                )}

                {studentMetrics?.completionRate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {studentMetrics.completionRate} Completion Rate
                    </div>
                  </>
                )}

                {studentMetrics?.satisfactionRate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                      {studentMetrics.satisfactionRate} Satisfaction Rate
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Fact Grid - ONLY show facts that the organization has inputted! */}
            {hasQuickFacts && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                {pacingLabel && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Pacing
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                      <Laptop className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      {pacingLabel}
                    </span>
                  </div>
                )}

                {(durationWeeks || timeCommitment || totalHours) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Duration & Time
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      {[durationWeeks, timeCommitment, totalHours].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}

                {(language || subtitles.length > 0) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Language & Subtitles
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                      <Globe className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      {language || "Instruction"}
                      {subtitles.length > 0 ? ` (${subtitles.length} Subtitles)` : ""}
                    </span>
                  </div>
                )}

                {(course.qualificationTitle || certificationDetails) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Credential
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center truncate">
                      <Award className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" />
                      {course.qualificationTitle || "Certificate"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Instructor Quick Card in Hero */}
            {course.instructorName && (
              <div className="flex items-center space-x-3 pt-2">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">
                    Lead Instructor
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {course.instructorName}
                  </span>
                  {course.instructorTitle && (
                    <span className="text-xs text-slate-500 ml-2 font-medium">
                      · {course.instructorTitle}
                    </span>
                  )}
                  {courseOrg?.name && !course.instructorTitle && (
                    <span className="text-xs text-slate-500 ml-2">
                      · {courseOrg.name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing & Enrollment Action Card */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/80 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-6">
            {/* Course Image Preview slot */}
            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 group">
              <img
                src={courseHeroBanner}
                alt={course.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                <div className="text-white">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-300 block">
                    Curriculum Preview
                  </span>
                  <span className="text-xs font-medium text-slate-200">
                    {course.modules?.length || 0} Modules
                    {totalHours ? ` · ${totalHours}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing Details Block */}
            <div className="space-y-3 pt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tuition Fee
                </span>
                {isFree ? (
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      100% Free
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Sponsored by Vocational Fund
                    </span>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {course.currency} {formatPriceWithDecimals(effectivePrice)}
                    </div>
                    {platformFeeAddition > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        Base: {course.currency} {formatPriceWithDecimals(rawPrice)} + 15% platform ({course.currency} {formatPriceWithDecimals(platformFeeAddition)})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Installment Info if enabled */}
              {!isFree && installmentAllowed && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      Or 3 installments of
                    </span>
                  </div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {course.currency} {formatPriceWithDecimals(installmentAmount)}
                    <span className="text-[10px] font-normal text-slate-400">
                      /{course.installmentInterval === "weekly" ? "wk" : "mo"}
                    </span>
                  </span>
                </div>
              )}

              {/* Vocational Sponsorship Progress if applicable */}
              {isVocationalFunded && tuitionCostPerStudent > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-700 dark:text-emerald-300 flex items-center">
                      <HeartHandshake className="w-3.5 h-3.5 mr-1" />
                      Tuition Sponsorship Fund
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {course.currency} {totalDonations.toLocaleString()} Raised
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200/50 dark:bg-emerald-950/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (totalDonations /
                              Math.max(1, tuitionCostPerStudent * 10)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-tight">
                    Every {course.currency} {tuitionCostPerStudent.toLocaleString()} in donations sponsors 1 full student seat.
                  </p>
                </div>
              )}
            </div>

            {/* Primary Action Button Logic */}
            <div className="space-y-3 pt-2">
              {canDirectlyEnterClass && onGoToClassroom ? (
                <button
                  onClick={onGoToClassroom}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Enter Active Classroom</span>
                </button>
              ) : hasActiveInvite ? (
                <button
                  onClick={onAcceptInvite}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Invitation & Join</span>
                </button>
              ) : isEnrolled && !isPaid && !isFree ? (
                <button
                  onClick={onPayTuition}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Tuition ({course.currency} {formatPriceWithDecimals(effectivePrice)})</span>
                </button>
              ) : isPending ? (
                <div className="w-full py-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-xl text-center text-xs border border-amber-500/20">
                  Application Under Review by Admissions Board
                </div>
              ) : (
                <button
                  disabled={course.admissionStatus === "closed"}
                  onClick={() => {
                    if (!currentUser) {
                      navigate("/login");
                    } else {
                      onApply();
                    }
                  }}
                  className={`w-full py-3.5 font-bold rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg ${
                    course.admissionStatus === "closed"
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {course.admissionStatus === "closed"
                      ? "Admissions Closed"
                      : "Apply for Admission"}
                  </span>
                </button>
              )}

              {/* Donation/Sponsorship CTA for vocational courses */}
              {isVocationalFunded && onDonate && (
                <button
                  onClick={onDonate}
                  className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl transition text-xs border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center space-x-1.5"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Sponsor a Student / Donate</span>
                </button>
              )}
            </div>

            {/* Course Features Inclusions - ONLY show features that exist */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {accessDuration && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{accessDuration}</span>
                </div>
              )}
              {course.modules && course.modules.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{course.modules.length} Core Curriculum Modules</span>
                </div>
              )}
              {totalLessons > 0 && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{totalLessons} Lessons & Interactive Sessions</span>
                </div>
              )}
              {(course.qualificationTitle || certificationDetails) && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Official {course.qualificationTitle || "Certificate of Completion"}
                  </span>
                </div>
              )}
              {refundPolicy && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Refund Guarantee Policy Included</span>
                </div>
              )}
              {language && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Instruction in {language}
                    {subtitles.length > 0 ? ` with ${subtitles.join(", ")} subtitles` : ""}
                  </span>
                </div>
              )}
              {pacingLabel && (
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{pacingLabel} Track</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Subnav Bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto shadow-xs">
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "syllabus", label: `Syllabus (${course.modules?.length || 0})` },
              { key: "instructor", label: "Instructor" },
              { key: "tuition", label: "Cost & Aid" },
              { key: "reviews", label: `Reviews (${reviews.length})` },
              { key: "faq", label: `FAQ (${faqs.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center space-x-3 shrink-0 text-xs">
          <span className="font-bold text-slate-900 dark:text-white">
            {isFree
              ? "Free"
              : `${course.currency} ${formatPriceWithDecimals(effectivePrice)}`}
          </span>
          <button
            onClick={() => {
              if (hasAccessToClassroom && onGoToClassroom) {
                onGoToClassroom();
              } else if (!currentUser) {
                navigate("/login");
              } else {
                onApply();
              }
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-xs transition"
          >
            {hasAccessToClassroom ? "Open Class" : "Apply Now"}
          </button>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Tabbed & In-Depth Details (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* SECTION 1: Overview, Philosophy & Objectives */}
          {(activeTab === "overview" || activeTab === "syllabus") && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                  Course Description & Overview
                </h2>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {course.description}
                </p>
              </div>

              {/* Philosophy & Why it Matters callout - ONLY if inputted by organisation */}
              {whyItMatters && (
                <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Why This Course Matters
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {whyItMatters}
                  </p>
                </div>
              )}

              {/* Learning Objectives ("What you will learn") - ONLY if inputted */}
              {learningObjectives.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Learning Objectives: What You Will Learn
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {learningObjectives.map((obj, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start space-x-3"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-snug">
                          {obj}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Syllabus / Learning Path (Expandable Modules) */}
          {(activeTab === "overview" || activeTab === "syllabus") && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Syllabus & Curriculum Roadmap
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {course.modules?.length || 0} Modules
                    {totalLessons > 0 ? ` · ${totalLessons} Lessons & Sessions` : ""}
                    {totalHours ? ` · ${totalHours}` : ""}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const allOpen: Record<string, boolean> = {};
                      (course.modules || []).forEach((m) => (allOpen[m.id] = true));
                      setExpandedModules(allOpen);
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    onClick={() => setExpandedModules({})}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Module Accordion List */}
              <div className="space-y-3">
                {course.modules && course.modules.length > 0 ? (
                  course.modules.map((mod, idx) => {
                    const isOpen = Boolean(expandedModules[mod.id]);
                    const modItemsCount = mod.items?.length || 0;
                    return (
                      <div
                        key={mod.id || idx}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition"
                      >
                        <button
                          onClick={() => toggleModule(mod.id)}
                          className="w-full p-4 sm:p-5 text-left bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center space-x-3.5">
                            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/20">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                                {mod.title || `Module ${idx + 1}`}
                              </span>
                              {mod.description && (
                                <span className="text-[11px] text-slate-500 line-clamp-1">
                                  {mod.description}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                              {modItemsCount} {modItemsCount === 1 ? "lesson" : "lessons"}
                            </span>
                            <div className="text-slate-400">
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Collapsed Items List */}
                        {isOpen && (
                          <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            {mod.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pb-2 border-b border-slate-100 dark:border-slate-700/60">
                                {mod.description}
                              </p>
                            )}

                            {mod.items && mod.items.length > 0 ? (
                              <div className="space-y-2">
                                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                                  Lessons & Topics
                                </span>
                                {mod.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs"
                                  >
                                    <div className="flex items-center space-x-2.5">
                                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {item.title}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 capitalize px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md">
                                      {item.type}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">
                                Core lecture materials and assignments are unlocked sequentially upon enrollment.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Curriculum modules are currently being synchronized for the upcoming intake.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: Instructor Profile */}
          {(activeTab === "overview" || activeTab === "instructor") && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Meet Your Instructor
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl border border-indigo-500/20 shrink-0">
                  <User className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {course.instructorName || courseOrg?.name || "Course Lead Faculty"}
                    </h3>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Verified Faculty
                    </span>
                  </div>
                  {course.instructorTitle && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {course.instructorTitle}
                    </p>
                  )}
                  {courseOrg?.name && (
                    <p className="text-xs text-slate-400">
                      {courseOrg.name}
                    </p>
                  )}
                  {course.instructorBio && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1 leading-relaxed whitespace-pre-line">
                      {course.instructorBio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Cost, Financial Aid & Installments */}
          {(activeTab === "overview" || activeTab === "tuition") && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Transparent Tuition & Payment Options
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Zero hidden registration fees. Every breakdown is calculated clearly prior to payment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Upfront Card */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Option A: Pay in Full
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {isFree ? "Free" : `${course.currency} ${formatPriceWithDecimals(effectivePrice)}`}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    One-time payment upon acceptance. Unlocks the entire course curriculum, discussion board, live sessions, and verifiable certificate.
                  </p>
                  <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                    <div>Base Tuition: {course.currency} {formatPriceWithDecimals(rawPrice)}</div>
                    <div>Platform Addition (+15%): {course.currency} {formatPriceWithDecimals(platformFeeAddition)}</div>
                  </div>
                </div>

                {/* Installments Card */}
                {installmentAllowed && !isFree && (
                  <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Option B: 3-Split Installments
                    </span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {course.currency} {formatPriceWithDecimals(installmentAmount)}
                      <span className="text-xs font-normal text-slate-500">
                        /{course.installmentInterval === "weekly" ? "wk" : "mo"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Spread your tuition over 3 payments. Pay your first installment today after approval, and subsequent payments throughout your study.
                    </p>
                    <div className="pt-2 text-[11px] text-indigo-700 dark:text-indigo-300">
                      Total: {course.currency} {formatPriceWithDecimals(effectivePrice)}
                    </div>
                  </div>
                )}
              </div>

              {/* Refund Policy Card - ONLY if organisation inputted one */}
              {refundPolicy && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                      Refund Policy & Guarantee Window
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                      {refundPolicy}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Ratings & Student Reviews - ONLY real reviews */}
          {(activeTab === "overview" || activeTab === "reviews") && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Learner Reviews & Ratings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Evaluations submitted by verified students
                  </p>
                </div>
                {course.rating && (
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                      {course.rating}
                    </div>
                    <div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.floor(course.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300 dark:text-slate-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400">Average Rating</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {rev.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {rev.userName}
                              </span>
                              {rev.verified && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full">
                                  Verified Learner
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {[rev.role, rev.date].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(rev.rating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300 dark:text-slate-600"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        {rev.title && (
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                            "{rev.title}"
                          </h4>
                        )}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Was this review helpful?</span>
                        <button
                          onClick={() => markHelpful(rev.id)}
                          className="inline-flex items-center space-x-1 hover:text-indigo-600 transition"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Helpful ({helpfulReviews[rev.id] || 0})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No learner reviews have been published yet for this course. Reviews from verified students will appear here once submitted.
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: FAQ Accordion - ONLY real FAQs */}
          {(activeTab === "overview" || activeTab === "faq") && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Inquiries and clarifications directly from the course institution
                </p>
              </div>

              {faqs.length > 0 ? (
                <div className="space-y-3">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full p-4 sm:p-5 text-left bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition flex items-center justify-between gap-4"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {faq.question}
                          </span>
                          <div className="text-slate-400 shrink-0">
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No frequently asked questions have been added yet for this course.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Institutional Trust, Prerequisites & Credential Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Institutional Trust Card */}
          {courseOrg && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sponsoring Organization
              </span>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/20 shrink-0">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {courseOrg.name}
                  </h3>
                  {courseOrg.location && (
                    <span className="text-xs text-slate-500">
                      {courseOrg.location}
                    </span>
                  )}
                </div>
              </div>

              {courseOrg.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {courseOrg.description}
                </p>
              )}

              <Link
                to={`/org/${courseOrg.id || course.orgId}`}
                className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View Institutional Profile <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          )}

          {/* Prerequisites Card - ONLY if prerequisites or required documents exist */}
          {(prerequisites.length > 0 ||
            (course.requiredDocuments && course.requiredDocuments.length > 0)) && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Laptop className="w-4 h-4 mr-2 text-indigo-500" />
                Prerequisites & Requirements
              </h3>

              {prerequisites.length > 0 && (
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  {prerequisites.map((req, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              )}

              {course.requiredDocuments && course.requiredDocuments.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Application Documents Required
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {course.requiredDocuments.map((doc, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verifiable Certificate Card - ONLY if certification details or qualification exists */}
          {(certificationDetails || course.qualificationTitle) && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Official Credential Preview
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase block">
                  {course.qualificationTitle || "Certificate of Completion"}
                </span>
                <div className="font-serif italic text-base font-bold text-slate-900 dark:text-white">
                  {course.title}
                </div>
                <div className="text-[11px] text-slate-500">
                  Awarded by {courseOrg?.name || "Partner Institution"}
                </div>
                <div className="pt-2 flex items-center justify-center space-x-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Cryptographically Verifiable ID</span>
                </div>
              </div>

              {certificationDetails && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                  {certificationDetails}
                </p>
              )}
            </div>
          )}

          {/* Student Success Metrics Highlight - ONLY if organisation inputted them */}
          {hasStudentMetrics && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Reported Cohort Milestones
              </span>
              <div className="grid grid-cols-2 gap-3 text-center">
                {studentMetrics?.enrolledCount !== undefined && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-black text-slate-900 dark:text-white block">
                      {studentMetrics.enrolledCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">Total Enrolled</span>
                  </div>
                )}
                {studentMetrics?.completionRate && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
                      {studentMetrics.completionRate}
                    </span>
                    <span className="text-[10px] text-slate-400">Graduation Rate</span>
                  </div>
                )}
                {studentMetrics?.satisfactionRate && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block">
                      {studentMetrics.satisfactionRate}
                    </span>
                    <span className="text-[10px] text-slate-400">Satisfaction</span>
                  </div>
                )}
                {course.rating && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-black text-slate-900 dark:text-white block">
                      {course.rating} / 5
                    </span>
                    <span className="text-[10px] text-slate-400">Faculty Rating</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
