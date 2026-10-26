/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
  BarChart3,
  GraduationCap,
  Star,
  HeartHandshake,
  TrendingUp,
  Award,
  CheckCircle2,
  Users,
  Search,
  CreditCard,
  Video,
  Building2,
  Layers,
  Banknote,
  ChevronRight,
  School,
  Clock,
  UserCheck,
  XCircle,
  Smartphone,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Bell,
  Laptop,
} from "lucide-react";
import { useAppContext } from "../../store/AppContext";
import { Course } from "../../types";
import { CourseDonationModal } from "../components/CourseDonationModal";
import { getEffectivePrice, formatPriceWithDecimals } from "../../lib/price";

const Home = () => {
  const { courses, organizations } = useAppContext();
  const [donatingCourse, setDonatingCourse] = useState<Course | null>(null);

  // Secondary school tracking suite interactive tab
  const [activeSchoolTab, setActiveSchoolTab] = useState<
    "signin_signout" | "grades" | "performance" | "parents"
  >("signin_signout");

  // Helper to identify donation-funded vocational education courses
  const isDonationFundedVocational = (c: Course) => {
    const org = organizations.find(
      (o) =>
        o.id === c.orgId ||
        o.ownerId === c.orgId ||
        `org_${o.ownerId}` === c.orgId,
    );
    const isVocationalOrg = org ? org.orgType === "vocational" : true;
    return c.fundingModel === "donations_sponsorships" && isVocationalOrg;
  };

  // Divide courses strictly into Popular Courses and Non-Profit (Donation-Funded Vocational) Courses
  const nonProfitCourses = courses.filter(isDonationFundedVocational);
  const popularCourses = courses.filter((c) => !isDonationFundedVocational(c));

  // Fallback lists if empty
  const displayPopular =
    popularCourses.length > 0
      ? popularCourses.slice(0, 3)
      : courses.slice(0, 3);
  const displayNonProfit =
    nonProfitCourses.length > 0 ? nonProfitCourses.slice(0, 3) : [];

  // Step-by-Step Workflow state & data
  const [activeStepTab, setActiveStepTab] = useState<"students" | "creators">("students");

  const studentSteps = [
    {
      step: "01",
      title: "Discover Accredited Courses",
      description:
        "Browse verified courses across STEM, software engineering, business, and vocational trades. Filter by schedule, syllabus, and partner academy.",
      feature: "Search & Institution Filters",
      icon: Search,
      to: "/courses",
      actionText: "Browse catalog",
    },
    {
      step: "02",
      title: "Enroll with Flexible Payments",
      description:
        "Access free sponsored courses instantly, or pay tuition securely with one-time or 3-installment options in NGN, GHS, or KES.",
      feature: "Split Checkout",
      icon: CreditCard,
      to: "/courses",
      actionText: "Payment options",
    },
    {
      step: "03",
      title: "Attend Live Virtual Classes",
      description:
        "Join interactive video lecture rooms powered by LiveKit. Collaborate in real-time, ask questions, share screens, and review recorded lessons.",
      feature: "LiveKit HD Classrooms",
      icon: Video,
      to: "/courses",
      actionText: "Virtual rooms",
    },
    {
      step: "04",
      title: "Complete Milestones & Graduate",
      description:
        "Submit assignments, track your progress on the student dashboard, and earn verifiable digital certificates upon course completion.",
      feature: "Verifiable Certificates",
      icon: Award,
      to: "/dashboard",
      actionText: "Track progress",
    },
  ];

  const creatorSteps = [
    {
      step: "01",
      title: "Register Your Academy",
      description:
        "Establish an institutional workspace or verified instructor profile. Upload accreditation, KYC verification, faculty bios, and custom branding.",
      feature: "Verified Academy Portal",
      icon: Building2,
      to: "/onboarding",
      actionText: "Start onboarding",
    },
    {
      step: "02",
      title: "Publish Structured Curriculums",
      description:
        "Build rich multi-week syllabuses with modular lessons, downloadable resources, assignments, and custom tuition or donation-sponsored models.",
      feature: "Course & Cohort Builder",
      icon: Layers,
      to: "/create-course",
      actionText: "Create a course",
    },
    {
      step: "03",
      title: "Connect Settlement Bank",
      description:
        "Link your bank account. Backpack automates split payouts so 100% of your tuition lands directly in your bank account.",
      feature: "Automated Direct Payouts",
      icon: Banknote,
      to: "/onboarding",
      actionText: "Set up account",
    },
    {
      step: "04",
      title: "Host Live Classes & Scale",
      description:
        "Stream interactive lectures to your cohorts, review student submissions, track attendance, and monitor tuition revenue with live telemetry.",
      feature: "Telemetry & Live Teaching",
      icon: BarChart3,
      to: "/dashboard",
      actionText: "Instructor console",
    },
  ];

  const currentSteps = activeStepTab === "students" ? studentSteps : creatorSteps;

  return (
    <div className="py-8 sm:py-12 md:py-16 space-y-16 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Next-Gen Pan-African Education Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
          Education,{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            Without Borders.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
          Backpack connects educational organizations with students across
          Africa. Upload courses, track student progress, and accept payments in
          multiple regional currencies.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto sm:max-w-none">
          <Link
            to="/signup"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white dark:text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center text-base sm:text-lg shadow-md hover:shadow-indigo-500/20 active:scale-95"
          >
            Launch Your Future <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center text-base sm:text-lg shadow-sm"
          >
            Access Portal
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 px-4">
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            Pan-African Reach
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
            Empower students across the continent with accessible education,
            breaking down geographical barriers and fostering a unified learning
            community.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            Immersive Curriculum
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
            Deliver rich, engaging modules with live video classes,
            collaborative workspaces, and automated grading systems that do the
            heavy lifting for you.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl flex items-center justify-center mb-6">
            <GraduationCap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            Intelligent Insights
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
            Track student brilliance with dynamic academic transcripts. Build
            automated scorecards that measure progress and simulate intelligent
            career routing.
          </p>
        </div>
      </div>

      {/* ========================================== */}
      {/* USE BACKPACK TODAY SECTION                  */}
      {/* ========================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-indigo-500/20 mx-4 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-4 relative z-10">
          <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Borderless Education Platform</span>
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Use backpack today - We have all the tools needed to take education out it the four walls
          </h2>

          <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed">
            Whether you are an independent instructor, a tech academy, or a vocational school, Backpack equips you with everything required to deliver live virtual classes, structure multi-week syllabuses, manage student rosters, and receive 100% tuition payouts directly into your bank account.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-slate-200">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Live HD Video Rooms & Recording</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-Currency Tuition & Split Payouts</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Donation-Funded Vocational Waivers</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verifiable Digital Certificates</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base transition shadow-lg shadow-indigo-600/30 inline-flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700 px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base transition inline-flex items-center justify-center"
            >
              Explore Programs
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TRADITIONAL CLASSROOM VS BACKPACK ONLINE CLASSROOM      */}
      {/* ======================================================== */}
      <section className="mx-4 my-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <School className="w-3.5 h-3.5" />
            <span>Rethinking The Modern Learning Space</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Traditional Classroom vs. Backpack Online Classroom
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            See the transformative difference when schools and students move beyond physical 
            four walls into Backpack's borderless, real-time learning ecosystem.
          </p>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Classroom Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5" />
                    Physical Bounds
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    The Traditional Classroom
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Confined to 4 brick walls, fixed physical desks, and manual paper workflows.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <School className="w-6 h-6" />
                </div>
              </div>

              {/* In-Session Classroom Snapshot */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>Classroom In Session</span>
                  <span className="text-amber-600 dark:text-amber-400">Capacity Capped: 45 / 45 Desks</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed italic">
                  "Teacher is writing rapidly on the chalkboard. Students in the back row struggle to read small text. Two students arrived 35 minutes late due to commuter traffic."
                </p>
              </div>

              {/* Traditional Pain Points List */}
              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Location & Commute Bound
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Students and teachers battle 1–2 hours of traffic, rainstorms, and transit costs every day. Missing the bus means missing the lesson entirely.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Chalkboard Notes & Lost Replays
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Once the chalkboard is wiped clean, explanations are gone forever. Absent students must rely on secondhand handwritten peer notes.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Paper Roll-Call & Register Tampering
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Teachers lose 15 minutes of each period reading names out loud from paper booklets that can be easily forged, misplaced, or water-damaged.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Delayed 2–3 Week Grading Loops
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Stacks of exam scripts sit on staff desks. By the time papers are returned, the class has moved to the next term topic with lingering gaps.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Disconnected Parents & Guardians
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Parents only find out about missed classes, late arrivals, or failing grades weeks later at end-of-term open day meetings.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom summary badge */}
            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Environment: Local physical district</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">Fixed Hall Capacity</span>
            </div>
          </div>

          {/* Backpack Online Classroom Card */}
          <div className="bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all shadow-md">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-indigo-100 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Borderless & Real-Time
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Backpack Online Classroom
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                    Live HD video rooms, 24/7 cloud recordings, instant automated telemetry, and connected guardians.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
                  <Laptop className="w-6 h-6" />
                </div>
              </div>

              {/* In-Session Online Classroom Snapshot */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Virtual Room · LiveKit HD
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">128 Students Active</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed italic">
                  "Instructor shares interactive code terminal & slides in 1080p. Students in Lagos, Nairobi, and London ask questions in live chat; lecture is being automatically recorded to cloud."
                </p>
              </div>

              {/* Backpack Breakthroughs List */}
              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Pan-African Borderless Reach
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Zero commute. Connect learners across multiple cities and regions seamlessly on phones, tablets, or laptops with bandwidth-adaptive streaming.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Live HD Video Classrooms & 24/7 Cloud Replays
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      High-fidelity video rooms powered by LiveKit with crystal audio, screen sharing, digital whiteboard, and instant on-demand replays saved forever.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Automated Sign-In / Sign-Out Telemetry
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Students are logged in milliseconds with verified timestamps. Punctuality, attention span, and attendance rates are tracked automatically.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Instant Automated Assessments & Analytics
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Quizzes, practical exercises, and assignments are graded automatically. Real-time feedback alerts teachers to students who need extra guidance.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      Real-Time Guardian & Parent Synchronization
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Guardians receive immediate SMS/dashboard updates when their ward signs in, submits homework, or completes an assessment milestone.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom summary badge */}
            <div className="mt-8 pt-4 border-t border-indigo-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 relative z-10">
              <span className="font-medium">Scale: Unlimited concurrent cohorts</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Cloud Archiving</span>
            </div>
          </div>
        </div>

        {/* Quick Comparison Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Commute Time</span>
            <div className="text-xs text-rose-500 line-through">1–2 Hours in Traffic</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">0 Mins · 1-Click Entry</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Class Capacity</span>
            <div className="text-xs text-amber-500">Max 45 Physical Desks</div>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Unlimited Cohort Size</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Lecture Retention</span>
            <div className="text-xs text-rose-500">Erased from Board</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Permanent Cloud Replays</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Parent Visibility</span>
            <div className="text-xs text-amber-500">Termly Paper Card</div>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">24/7 Real-Time Portal</div>
          </div>
        </div>
      </section>
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-700/60 mx-4 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-700 pb-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Built for Schools, Academies & Independent Instructors
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl">
              Onboard instructor staff, manage enrolled student rosters, and
              create structured courses.
            </p>
          </div>
          <Link
            to="/onboard"
            className="self-start md:self-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white dark:text-white font-semibold text-sm rounded-xl transition shadow-sm"
          >
            Get Started Now
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
              Staff Onboarding
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Register instructors into faculty departments with streamlined
              administrative access and course ownership.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <GraduationCap className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
              Student Management
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Onboard students directly into cohorts or programs with
              auto-course enrollment and progress metrics.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-700/60 mx-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-700 pb-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Everything You Need to Manage Learning
            </h2>

            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl">
              A complete learning management experience designed to help
              schools, instructors, and students stay organized and focused.
            </p>
          </div>

          <Link
            to="/courses"
            className="self-start md:self-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-sm"
          >
            Explore Courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Course Management */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />

            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
              Course Management
            </h4>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Create structured courses, organize learning materials, and give
              instructors the tools they need to deliver engaging learning
              experiences.
            </p>
          </div>

          {/* Student Progress */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />

            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
              Student Progress
            </h4>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Monitor student activity, course progress, and learning
              performance with clear metrics that make it easier to identify
              areas for improvement.
            </p>
          </div>

          {/* Instructor Workspace */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />

            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
              Instructor Workspace
            </h4>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Give instructors a dedicated workspace to manage their courses,
              students, learning content, and day-to-day teaching activities.
            </p>
          </div>

          {/* Learning Experience */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <GraduationCap className="w-8 h-8 text-amber-600 dark:text-amber-400" />

            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
              Better Learning Experience
            </h4>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect instructors and students through a structured platform
              that keeps learning resources, enrollment, and progress in one
              accessible place.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECONDARY SCHOOL STUDENT TRACKING SUITE                 */}
      {/* ======================================================== */}
      <section className="mx-4 my-10 space-y-8">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800 pb-8 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                <School className="w-3.5 h-3.5" />
                <span>Secondary School Administration & Student Tracking</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Empowering Secondary Schools: Complete Student & Guardian Management
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Secondary schools (JSS & SSS / High Schools) require precise daily administration. 
                Backpack gives school leaders, teachers, and parents unified control over student 
                attendance, continuous assessment gradebooks, performance analytics, and guardian communications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/onboard"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                Register Secondary School <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition border border-slate-700"
              >
                Request School Demo
              </Link>
            </div>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="pt-8 space-y-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSchoolTab("signin_signout")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeSchoolTab === "signin_signout"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="truncate">Sign-In / Sign-Out</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSchoolTab("grades")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeSchoolTab === "grades"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span className="truncate">Grades & Continuous CA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSchoolTab("performance")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeSchoolTab === "performance"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="truncate">Performance Telemetry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSchoolTab("parents")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeSchoolTab === "parents"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">Parents & Guardians</span>
              </button>
            </div>

            {/* Tab 1: Sign-In / Sign-Out Content */}
            {activeSchoolTab === "signin_signout" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      Module 01 · Real-Time Attendance
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Automated Daily Sign-In & Sign-Out Tracking
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Say goodbye to manual paper registers prone to forgery or delays. Secondary schools track student arrival at gate checkpoints or morning virtual roll-calls with exact timestamps, instant late flags, and automated guardian SMS notifications.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300 pt-2">
                    <div className="flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Exact Timestamps:</strong> Millisecond arrival & departure records for gate check-in or virtual homerooms.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Instant Absence & Late Alerts:</strong> Parents receive immediate SMS/app notices if their child hasn't checked in by 08:00 AM.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Period-by-Period Roll Calls:</strong> Subject instructors mark attendance for every single teaching period to prevent truancy.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Ministry Compliance:</strong> Export official termly attendance sheets in one click for educational boards.</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Mock Terminal */}
                <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-white">Gate Terminal · SS2 Science Cohort</span>
                    </div>
                    <span className="text-slate-400 font-mono">Today, 07:30 – 08:30 AM</span>
                  </div>

                  {/* Quick stats strip */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">Enrolled</div>
                      <div className="text-sm font-bold text-white">42</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">Signed In</div>
                      <div className="text-sm font-bold text-emerald-400">39 (93%)</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">Late Arrival</div>
                      <div className="text-sm font-bold text-amber-400">2</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">Unexcused</div>
                      <div className="text-sm font-bold text-rose-400">1</div>
                    </div>
                  </div>

                  {/* Student Sign-in Table */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                          AY
                        </div>
                        <div>
                          <div className="font-semibold text-white">Amina Yusuf</div>
                          <div className="text-[10px] text-slate-400">Gate 1 Terminal · 07:38 AM</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                          Present (On Time)
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5">SMS to Mrs. Yusuf: Delivered</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                          CO
                        </div>
                        <div>
                          <div className="font-semibold text-white">Chidi Okeke</div>
                          <div className="text-[10px] text-slate-400">Gate 1 Terminal · 07:44 AM</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                          Present (On Time)
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5">Parent Notification: Confirmed</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                          KM
                        </div>
                        <div>
                          <div className="font-semibold text-white">Kofi Mensah</div>
                          <div className="text-[10px] text-slate-400">Gate 2 Terminal · 08:14 AM</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-800 text-amber-300 font-bold text-[10px]">
                          Late (14m Late)
                        </span>
                        <div className="text-[9px] text-amber-400/80 mt-0.5">Late Notice Dispatched to Parent</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[11px]">
                          TB
                        </div>
                        <div>
                          <div className="font-semibold text-white">Tunde Bakare</div>
                          <div className="text-[10px] text-slate-400">No Check-in Recorded</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-800 text-rose-300 font-bold text-[10px]">
                          Absent (Unexcused)
                        </span>
                        <div className="text-[9px] text-rose-400/80 mt-0.5">Automated SMS Alert Sent</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Grades & Continuous Assessment Content */}
            {activeSchoolTab === "grades" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      Module 02 · Academic Evaluation
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Comprehensive Secondary School Gradebook & CA
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Secondary school teachers can record assignments, weekly quizzes, mid-term tests, practical science experiments, and end-of-term examinations with automatic weighted formulas (e.g. 30% Continuous Assessment + 70% Terminal Exam).
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300 pt-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Standard Secondary Schemes:</strong> Built-in WAEC/NECO 9-point scale (A1 to F9), KCSE, Cambridge IGCSE, or custom percentage rubrics.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Weighted CA Automation:</strong> Instant calculation of homework, lab assessments, and exam contributions without spreadsheet errors.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Class Averages & Curving:</strong> Real-time subject averages and automated rank placement for each student.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Exportable Broad-sheets:</strong> Download official school broad-sheets and stamped PDF report cards in seconds.</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Mock Gradebook Table */}
                <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 overflow-x-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-white">SS2 Term 2 Gradebook · Physics & Math</span>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px]">Weighting: 30% CA + 70% Exam</span>
                  </div>

                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="pb-2">Student</th>
                        <th className="pb-2 text-center">CA (30)</th>
                        <th className="pb-2 text-center">Exam (70)</th>
                        <th className="pb-2 text-center">Total (100)</th>
                        <th className="pb-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-white">Chiamaka Nnamdi</td>
                        <td className="py-2.5 text-center text-slate-300">28.5</td>
                        <td className="py-2.5 text-center text-slate-300">64.0</td>
                        <td className="py-2.5 text-center font-bold text-emerald-400">92.5%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">
                            A1 Distinction
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-white">Ibrahim Sani</td>
                        <td className="py-2.5 text-center text-slate-300">26.0</td>
                        <td className="py-2.5 text-center text-slate-300">58.0</td>
                        <td className="py-2.5 text-center font-bold text-indigo-400">84.0%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold text-[10px]">
                            B2 Very Good
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-white">Favour Johnson</td>
                        <td className="py-2.5 text-center text-slate-300">23.0</td>
                        <td className="py-2.5 text-center text-slate-300">52.5</td>
                        <td className="py-2.5 text-center font-bold text-indigo-400">75.5%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold text-[10px]">
                            B3 Good
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-white">David Adeleke</td>
                        <td className="py-2.5 text-center text-slate-300">19.5</td>
                        <td className="py-2.5 text-center text-slate-300">45.0</td>
                        <td className="py-2.5 text-center font-bold text-amber-400">64.5%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-[10px]">
                            C4 Credit
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Class Average: <strong className="text-white">79.1% (B3)</strong></span>
                    <span className="text-emerald-400 font-semibold">100% of grades published to Guardian Portal</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Performance Telemetry Content */}
            {activeSchoolTab === "performance" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      Module 03 · Academic Telemetry
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Student Performance & Learning Trajectories
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Go beyond static letter grades. Backpack monitors cognitive strengths across STEM, Humanities, and Vocational subjects with automated growth curves, early-warning alerts for struggling students, and verifiable transcripts.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300 pt-2">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Term-over-Term Growth:</strong> View progress trajectories comparing Term 1, Term 2, and Mock Exam results.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Early Intervention Flags:</strong> Highlights specific curriculum concepts where students score under 60% before final exams.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Cumulative GPA & Class Ranking:</strong> Automated computation of student ranks without administrative overhead.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Verifiable Transcripts:</strong> Official cryptographic badges that universities and employers can independently verify.</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Mock Performance Card */}
                <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        CN
                      </div>
                      <div>
                        <div className="font-semibold text-white">Chiamaka Nnamdi · Student ID #BP-SS-2024</div>
                        <div className="text-[10px] text-slate-400">Class Rank: #1 of 42 (SS2 Science Cohort)</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px] font-bold">
                      GPA: 4.88 / 5.0
                    </span>
                  </div>

                  {/* Subject Mastery Bars */}
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Further Mathematics & Calculus</span>
                        <span className="font-mono text-emerald-400 font-bold">94% · High Mastery</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94%" }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Physics & Laboratory Mechanics</span>
                        <span className="font-mono text-indigo-400 font-bold">89% · High Mastery</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: "89%" }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Chemistry & Stoichiometry</span>
                        <span className="font-mono text-indigo-400 font-bold">84% · Proficient</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: "84%" }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>English Language & Essay Writing</span>
                        <span className="font-mono text-amber-400 font-bold">78% · Developing</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: "78%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Early Warning / Remediation Callout */}
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Targeted Teacher Insight:</strong> Chiamaka excels in quantitative STEM modules. Recommended 2 extra revision sessions on narrative essay composition before WAEC registration.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Parents & Guardians Portal Content */}
            {activeSchoolTab === "parents" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      Module 04 · Guardian Connectivity
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Dedicated Parent & Guardian Mobile Portal
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Keep parents actively involved in their ward's education. Parents log in to view real-time gate entry times, continuous test results, teacher remarks, fee balances, and receive instant alerts directly via SMS or WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300 pt-2">
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>24/7 Mobile Access:</strong> Accessible on any smartphone for working parents across Africa and diaspora.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Daily Gate & Sign-In Alerts:</strong> Know the minute your child arrives safely at school and departs for home.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Transparent Fee Management:</strong> View term tuition, lunch schemes, and pay securely with 3-split installment options.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Direct Teacher Messaging:</strong> Book virtual appointments or message subject instructors without phone tag.</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Guardian Mobile Preview */}
                <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-white">Guardian Portal · Welcome, Mrs. Folake Adeleke</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">Ward: David Adeleke (SS2)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>Today's School Attendance</span>
                        <span className="text-emerald-400 font-bold">On Campus</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        Signed in at 07:41 AM
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Gate 1 Terminal check verified. 5 of 6 periods attended.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>Term 2 Tuition Balance</span>
                        <span className="text-emerald-400 font-bold">100% Cleared</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-indigo-400" />
                        ₦0.00 Outstanding
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Receipt #BP-8841 generated on 15 Feb.
                      </p>
                    </div>
                  </div>

                  {/* Recent Teacher Note */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Teacher's Mid-Term Remark
                      </span>
                      <span className="text-[10px] text-slate-400">Yesterday, 4:15 PM</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed italic bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      "David demonstrated notable enthusiasm during the solar energy physics practical today. We encourage him to maintain this focus as mid-term exams approach next month." — Mr. O. Balogun (Physics Faculty)
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition">
                        Reply to Instructor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* HOW TO USE BACKPACK (STEP-BY-STEP WORKFLOW)*/}
      {/* ========================================== */}
      <section className="py-16 sm:py-24 bg-slate-50/70 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400 block">
              Streamlined Experience
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              How to Use Backpack in 4 Simple Steps
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Whether you are a student leveling up your career or an organization building a regional academy, here is how Backpack guides you from onboarding to graduation.
            </p>

            {/* Interactive Role Switcher Tabs */}
            <div className="pt-2 flex justify-center">
              <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveStepTab("students")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeStepTab === "students"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>For Students & Learners</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStepTab("creators")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeStepTab === "creators"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>For Instructors & Academies</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4-Step Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentSteps.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/70 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group shadow-xs hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Icon + Step Counter */}
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-105">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="font-mono text-sm font-black text-slate-400 dark:text-slate-500">
                        {item.step}
                      </span>
                    </div>

                    {/* Step Title */}
                    <h3 className="mt-5 text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h3>

                    {/* Step Description */}
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Footer Meta + Quick Action */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {item.feature}
                    </span>
                    <Link
                      to={item.to}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 transition"
                    >
                      <span>{item.actionText}</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Flow Banner / CTA */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                {activeStepTab === "students" ? "Student Path" : "Educator Portal"}
              </span>
              <h3 className="text-lg sm:text-xl font-bold">
                {activeStepTab === "students"
                  ? "Ready to begin learning on Backpack?"
                  : "Ready to launch and monetize your academy?"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                {activeStepTab === "students"
                  ? "Explore accredited programs from verified African universities, tech academies, and vocational leaders."
                  : "Set up your institution workspace, publish courses, and receive automated settlement directly to your bank account."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={activeStepTab === "students" ? "/courses" : "/onboarding"}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md inline-flex items-center gap-2"
              >
                <span>{activeStepTab === "students" ? "Explore All Courses" : "Register Academy Now"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* TESTIMONIALS                               */}
      {/* ========================================== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              Testimonials
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              What Our Learners Say
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Hear from students, instructors, and learning communities using
              the platform to build better learning experiences.
            </p>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <article className="bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300">
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-current" />
                ))}
              </div>

              <p className="mt-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                "The platform makes it much easier to organize courses and keep
                track of what students are learning. Everything feels structured
                and easy to manage."
              </p>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    AO
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Amaka Okafor
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Instructor
                  </p>
                </div>
              </div>
            </article>

            {/* Testimonial 2 */}
            <article className="bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-current" />
                ))}
              </div>

              <p className="mt-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                "I like having my courses and learning progress in one place. It
                gives me a clearer picture of what I have completed and what I
                still need to work on."
              </p>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    CN
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chinedu Nwosu
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Student
                  </p>
                </div>
              </div>
            </article>

            {/* Testimonial 3 */}
            <article className="bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-current" />
                ))}
              </div>

              <p className="mt-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                "Managing students and course content is significantly simpler.
                The platform gives us the structure we need without making the
                learning process complicated."
              </p>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    EJ
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Esther James
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Academy Administrator
                  </p>
                </div>
              </div>
            </article>
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ready to create your own learning experience?
            </p>

            <Link
              to="/onboard"
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      {courses.length > 0 && (
        <div className="px-4 space-y-8">
          {/* Main Section Title */}
          <div className="border-b border-slate-200 dark:border-slate-700/80 pb-4">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Featured Courses
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore top-enrolled popular courses and donation-funded
              non-profit vocational education programs.
            </p>
          </div>

          {/* Two-Column Grid: Popular Courses (Left) | Non-Profit Courses (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            {/* Left Column: Popular Courses */}
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/80 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Popular Courses
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      High-demand academic & professional pathways
                    </p>
                  </div>
                </div>
                <Link
                  to="/explore?filter=popular"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:underline flex items-center shrink-0"
                >
                  view all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>

              <div className="space-y-4">
                {displayPopular.map((course) => {
                  const org = organizations.find(
                    (o) =>
                      o.id === course.orgId ||
                      o.ownerId === course.orgId ||
                      `org_${o.ownerId}` === course.orgId,
                  );
                  return (
                    <div
                      key={course.id}
                      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-indigo-500/80 transition-all group shadow-xs hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            {org?.name || "Partner Organization"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {(course as any).category || "Popular"}
                          </span>
                        </div>
                        <Link to={`/course/${course.id}`}>
                          <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-1">
                            {course.title}
                          </h4>
                        </Link>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {course.price > 0
                            ? `${course.currency || "NGN"} ${formatPriceWithDecimals(getEffectivePrice(course.price))}`
                            : "Free Enrollment"}
                        </span>
                        <Link
                          to={`/course/${course.id}`}
                          className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center hover:underline"
                        >
                          View Details{" "}
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Non-Profit Courses */}
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/80 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Non-Profit Courses
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Donation-funded vocational education programs
                    </p>
                  </div>
                </div>
                <Link
                  to="/explore?filter=non-profit"
                  className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs hover:underline flex items-center shrink-0"
                >
                  view all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>

              {displayNonProfit.length > 0 ? (
                <div className="space-y-4">
                  {displayNonProfit.map((course) => {
                    const org = organizations.find(
                      (o) =>
                        o.id === course.orgId ||
                        o.ownerId === course.orgId ||
                        `org_${o.ownerId}` === course.orgId,
                    );
                    const canDonate = isDonationFundedVocational(course);
                    return (
                      <div
                        key={course.id}
                        className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-emerald-500/80 transition-all group shadow-xs hover:shadow-md relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Sponsored
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                            {org?.name || "Non-Profit Academy"}
                          </span>
                          <Link to={`/course/${course.id}`}>
                            <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition line-clamp-1">
                              {course.title}
                            </h4>
                          </Link>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              100% Tuition Waiver
                            </span>
                            <Link
                              to={`/course/${course.id}`}
                              className="font-bold text-slate-700 dark:text-slate-300 flex items-center hover:underline"
                            >
                              View Details{" "}
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                          </div>

                          {canDonate && (
                            <button
                              onClick={() => setDonatingCourse(course)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition flex items-center justify-center shadow-md shadow-emerald-600/20"
                            >
                              <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
                              Donate/Sponsor
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Donation-Funded Vocational Education
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    No active non-profit vocational courses listed yet.
                    Accredited vocational institutes can offer tuition-waived
                    programs supported by donors.
                  </p>
                  <Link
                    to="/explore?filter=non-profit"
                    className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                  >
                    View Non-Profit List{" "}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected Modal to Course View */}
      {donatingCourse && (
        <CourseDonationModal
          course={donatingCourse}
          onClose={() => setDonatingCourse(null)}
        />
      )}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Backpack
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connecting students, educators, and institutions across Africa
                through accessible, borderless digital education.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                Platform
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/explore"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Explore Courses
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/onboard"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Register Institution
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                Resources
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/about"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                Contact
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Email
              </p>
              <a
                href="mailto:support@backpack-edu.com"
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
              >
                support@backpack-edu.com
              </a>

              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Empowering education across Africa.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>© {new Date().getFullYear()} Backpack. All rights reserved.</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                v0.1.2
              </span>
            </p>

            <div className="flex items-center gap-6 text-sm">
              <Link
                to="/privacy"
                className="text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                Terms
              </Link>
              <Link
                to="/events"
                className="text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                Events
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
