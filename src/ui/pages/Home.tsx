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
} from "lucide-react";
import { useAppContext } from "../../store/AppContext";
import { Course } from "../../types";
import { CourseDonationModal } from "../components/CourseDonationModal";
import { getEffectivePrice, formatPriceWithDecimals } from "../../lib/price";

const Home = () => {
  const { courses, organizations } = useAppContext();
  const [donatingCourse, setDonatingCourse] = useState<Course | null>(null);

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
        "Access free sponsored courses instantly, or pay tuition securely via Paystack with one-time or 3-installment options in NGN, GHS, or KES.",
      feature: "Paystack Split Checkout",
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
        "Link your bank account or Paystack subaccount. Backpack automates split payouts so 100% of your tuition lands directly in your bank account.",
      feature: "Automated Direct Payouts",
      icon: Banknote,
      to: "/onboarding",
      actionText: "Set up Paystack",
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

      {/* Highlights Section */}
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Backpack. All rights reserved.
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
