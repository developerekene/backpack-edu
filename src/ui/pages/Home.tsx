/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  ShieldCheck,
  ArrowRight,
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
  Check,
} from "lucide-react";
import { useAppContext } from "../../store/AppContext";
import { Course } from "../../types";
import { CourseDonationModal } from "../components/CourseDonationModal";
import { getEffectivePrice, formatPriceWithDecimals } from "../../lib/price";

const Home: React.FC = () => {
  const { courses, organizations } = useAppContext();
  const [donatingCourse, setDonatingCourse] = useState<Course | null>(null);

  // Secondary school tracking suite interactive tab
  const [activeSchoolTab, setActiveSchoolTab] = useState<
    "signin_signout" | "grades" | "performance" | "parents"
  >("signin_signout");

  // Step-by-Step Workflow state
  const [activeStepTab, setActiveStepTab] = useState<"students" | "creators">("students");

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

  // Divide courses into Popular Courses and Non-Profit (Donation-Funded Vocational) Courses
  const nonProfitCourses = courses.filter(isDonationFundedVocational);
  const popularCourses = courses.filter((c) => !isDonationFundedVocational(c));

  // Fallback lists if empty
  const displayPopular =
    popularCourses.length > 0 ? popularCourses.slice(0, 3) : courses.slice(0, 3);
  const displayNonProfit =
    nonProfitCourses.length > 0 ? nonProfitCourses.slice(0, 3) : [];

  const studentSteps = [
    {
      step: "01",
      title: "Discover Accredited Courses",
      description:
        "Browse verified programs across STEM, software engineering, business, and vocational trades. Filter by syllabus, regional currency, and partner academy.",
      feature: "Search & Institution Filters",
      icon: Search,
      to: "/explore",
      actionText: "Browse catalog",
    },
    {
      step: "02",
      title: "Enroll with Flexible Payments",
      description:
        "Access sponsored vocational courses with 100% tuition waivers, or pay securely with one-time or split installment options in NGN, GHS, or KES.",
      feature: "Split Checkout",
      icon: CreditCard,
      to: "/explore",
      actionText: "Payment options",
    },
    {
      step: "03",
      title: "Attend Live Virtual Classes",
      description:
        "Join interactive video lecture rooms powered by LiveKit HD. Collaborate in real-time, ask questions, share screens, and review 24/7 cloud recordings.",
      feature: "LiveKit HD Classrooms",
      icon: Video,
      to: "/explore",
      actionText: "Virtual rooms",
    },
    {
      step: "04",
      title: "Complete Milestones & Graduate",
      description:
        "Submit coursework, track progress on the student gradebook, and earn verifiable digital certificates upon passing your final curriculum milestones.",
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
        "Establish an institutional workspace or verified instructor profile. Upload accreditation, faculty bios, institutional branding, and custom domains.",
      feature: "Verified Academy Portal",
      icon: Building2,
      to: "/onboard",
      actionText: "Start onboarding",
    },
    {
      step: "02",
      title: "Publish Structured Curriculums",
      description:
        "Build rich multi-week syllabuses with modular lessons, downloadable resources, continuous assessments, and flexible tuition pricing models.",
      feature: "Course & Cohort Builder",
      icon: Layers,
      to: "/upload-course",
      actionText: "Create a course",
    },
    {
      step: "03",
      title: "Connect Settlement Bank",
      description:
        "Link your local commercial bank account. Backpack automates split payouts so 100% of your tuition lands directly in your bank account with zero delay.",
      feature: "Automated Direct Payouts",
      icon: Banknote,
      to: "/onboard",
      actionText: "Set up account",
    },
    {
      step: "04",
      title: "Host Live Classes & Scale",
      description:
        "Stream interactive lectures to cohorts, review student submissions, track attendance telemetry, and monitor tuition revenue with live telemetry.",
      feature: "Telemetry & Live Teaching",
      icon: BarChart3,
      to: "/dashboard",
      actionText: "Instructor console",
    },
  ];

  const currentSteps = activeStepTab === "students" ? studentSteps : creatorSteps;

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 flex flex-col">
      {/* ======================================================== */}
      {/* 1. HERO SECTION (Full-Width with Framed Floating Icons)   */}
      {/* ======================================================== */}
      <section className="relative w-full overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 border-b border-[#d6e9f8] dark:border-[#1e3a52] bg-gradient-to-b from-[#f0f7fd]/90 via-white to-white dark:from-[#0f2231]/30 dark:via-[#0a1824] dark:to-[#0a1824]">
        {/* Ambient luminous glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#d6e9f8]/70 via-[#0078d4]/10 to-transparent dark:from-[#0078d4]/20 dark:via-[#0f2231]/30 dark:to-transparent rounded-full blur-3xl opacity-80" />
        </div>

        {/* Framing Container (Brings floating badges closer to content without edge-pinning) */}
        <div className="relative max-w-6xl mx-auto px-4">
          {/* FLOATING INSTITUTIONAL PLATFORM BADGES (Left Flank) */}
          <div className="hidden xl:flex flex-col gap-10 absolute left-0 top-10 z-20 pointer-events-auto">
            {/* Publish Curriculums */}
            <Link
              to="/onboard"
              className="w-52 flex items-center gap-3 p-3 rounded-2xl bg-white/95 dark:bg-[#0f2231]/95 backdrop-blur-md border border-[#d6e9f8] dark:border-[#1e3a52] shadow-xl hover:scale-105 hover:border-[#0078d4]/40 transition-all duration-300 animate-float-1 group cursor-pointer"
              title="Publish Institutional Courses"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d6e9f8]/70 dark:bg-[#1a384f]/80 border border-[#0078d4]/20 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] group-hover:rotate-6 transition-transform shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-heading">Publish Courses</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-body">Institutional Catalog</div>
              </div>
            </Link>

            {/* Tuition Payouts */}
            <Link
              to="/onboard"
              className="w-52 flex items-center gap-3 p-3 rounded-2xl bg-white/95 dark:bg-[#0f2231]/95 backdrop-blur-md border border-emerald-200/80 dark:border-emerald-900/60 shadow-xl hover:scale-105 hover:border-emerald-400/40 transition-all duration-300 animate-float-3 group cursor-pointer"
              title="Direct Bank Tuition Settlement"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#0d2618] border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:rotate-6 transition-transform shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-heading">Tuition Settlement</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-body">Direct Bank Settlement</div>
              </div>
            </Link>
          </div>

          {/* FLOATING INSTITUTIONAL PLATFORM BADGES (Right Flank) */}
          <div className="hidden xl:flex flex-col gap-10 absolute right-0 top-10 z-20 pointer-events-auto">
            {/* Live Classrooms */}
            <Link
              to="/explore"
              className="w-52 flex items-center gap-3 p-3 rounded-2xl bg-white/95 dark:bg-[#0f2231]/95 backdrop-blur-md border border-cyan-200/80 dark:border-cyan-900/60 shadow-xl hover:scale-105 hover:border-cyan-400/40 transition-all duration-300 animate-float-2 group cursor-pointer"
              title="Interactive Live HD Classrooms"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-[#0b242e] border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:rotate-6 transition-transform shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-heading">Live Classrooms</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-body">Interactive Video HD</div>
              </div>
            </Link>

            {/* Verifiable Credentials */}
            <Link
              to="/explore"
              className="w-52 flex items-center gap-3 p-3 rounded-2xl bg-white/95 dark:bg-[#0f2231]/95 backdrop-blur-md border border-amber-200/80 dark:border-amber-900/60 shadow-xl hover:scale-105 hover:border-amber-400/40 transition-all duration-300 animate-float-4 group cursor-pointer"
              title="Accredited Verifiable Certificates"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-[#261e0e] border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:rotate-6 transition-transform shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-heading">Accredited Certs</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-body">Digital Credentials</div>
              </div>
            </Link>
          </div>

          {/* Hero Content Container (Completely unobstructed, spacious, clean) */}
          <div className="max-w-2xl sm:max-w-3xl mx-auto text-center space-y-6 sm:space-y-8 px-4 relative z-10">
            {/* Main Title */}
            <div className="space-y-4 sm:space-y-5">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-heading tracking-tight text-slate-900 dark:text-white leading-[1.15] sm:leading-[1.12] break-words">
                Education Without Borders.
                <span className="block text-[#0078d4] dark:text-[#04a4ec] mt-1.5 sm:mt-3">
                  Learn, Teach, and Scale Across Africa.
                </span>
              </h1>

              <p className="text-sm sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal font-body px-2">
                Backpack connects students, secondary schools, universities, and vocational academies. 
                Attend live HD video classes, manage comprehensive student telemetry, and settle tuition in regional African currencies.
              </p>
            </div>

            {/* Action Link Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 text-sm font-heading max-w-md sm:max-w-none mx-auto w-full">
              <Link
                to="/explore"
                className="w-full sm:w-auto px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/signup"
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/onboard"
                className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-[#0f2231] hover:bg-slate-50 dark:hover:bg-[#1a384f] text-slate-700 dark:text-slate-200 border border-[#d6e9f8] dark:border-[#1e3a52] font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#0078d4]" />
                <span>Register an Institution</span>
              </Link>
            </div>

            {/* Proof Bar (Microsoft / Coursera Metric Tiles) */}
            <div className="pt-6 sm:pt-8 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-3xl sm:max-w-4xl mx-auto w-full">
              <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] text-center shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">100+</div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-body leading-tight">Partner Academies</div>
              </div>
              <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] text-center shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#0078d4] tracking-tight">15+</div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-body leading-tight">Regional Currencies</div>
              </div>
              <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] text-center shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400 tracking-tight">100%</div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-body leading-tight">Direct Bank Settlement</div>
              </div>
              <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] text-center shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">HD Live</div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-body leading-tight">Interactive Classrooms</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main page content wrapped in standard container */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 w-full space-y-20 sm:space-y-24 py-12">

      {/* ======================================================== */}
      {/* 2. CORE CAPABILITIES (3-Card Pillar Structure)           */}
      {/* ======================================================== */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider font-heading">
            Why Choose Backpack
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
            Built for Real Academic Outcomes
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-body">
            Equipping African educators and learners with modern, dependable infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900 text-[#0078d4] flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
              Pan-African Reach
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-body">
              Empower students across Nigeria, Ghana, Kenya, and beyond with localized pricing, Paystack integration, and seamless cross-border course delivery.
            </p>
            <div className="pt-2 text-xs font-semibold text-[#0078d4] flex items-center gap-1 font-heading">
              <span>Multi-currency support</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
              Live HD Classrooms
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-body">
              Deliver immersive video lectures powered by LiveKit HD. Screen sharing, real-time chat, collaborative workspaces, and automatic 24/7 cloud recording.
            </p>
            <div className="pt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-heading">
              <span>Interactive real-time rooms</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
              Academic Telemetry
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-body">
              Track student mastery with continuous assessment gradebooks, attendance check-ins, early remediation flags, and verifiable digital completion certificates.
            </p>
            <div className="pt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 font-heading">
              <span>Automated scorecards & transcripts</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. USE BACKPACK TODAY (Institutional Partnership Banner)  */}
      {/* ======================================================== */}
      <section className="bg-[#f8fafd] dark:bg-slate-800/50 rounded-2xl p-5 sm:p-8 md:p-12 border border-[#d6e9f8] dark:border-slate-700 shadow-xs">
        <div className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-[#0078d4] dark:text-blue-300 text-xs font-bold uppercase tracking-wider font-heading">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Institutional Partnership</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight leading-snug break-words">
            Use Backpack Today — Take Education Out of the Four Walls
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-body">
            Whether you run a high school, a software coding academy, or a vocational training center, Backpack provides everything needed to host live classes, organize syllabuses, manage student rosters, and receive 100% direct bank settlements.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-sm text-slate-700 dark:text-slate-200 font-body">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
              <span>Live HD Video Rooms & Cloud Recording</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
              <span>Multi-Currency Tuition & Split Payouts</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
              <span>Donation-Funded Vocational Waivers</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
              <span>Verifiable Digital Certificates</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 font-heading w-full">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-7 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="w-full sm:w-auto px-7 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-sm transition shadow-xs flex items-center justify-center cursor-pointer"
            >
              Explore Programs
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. TRADITIONAL CLASSROOM VS BACKPACK ONLINE CLASSROOM    */}
      {/* ======================================================== */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 px-2">
          <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider font-heading">
            Rethinking the Learning Space
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight break-words">
            Traditional Classroom vs. Backpack Online Classroom
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-body">
            Compare the limitations of physical brick walls with Backpack's borderless, real-time digital learning ecosystem.
          </p>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {/* Traditional Classroom Card */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-8 flex flex-col justify-between shadow-xs">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
                <div className="space-y-1 min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider font-heading">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Physical Bounds</span>
                  </span>
                  <h3 className="text-lg sm:text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
                    The Traditional Classroom
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
                    Confined to 4 brick walls, fixed physical desks, and manual paper workflows.
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                  <School className="w-5 h-5" />
                </div>
              </div>

              {/* In-Session Snapshot */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold font-heading text-slate-500 uppercase tracking-wider text-[10px] sm:text-[11px]">
                  <span>Physical Hall In Session</span>
                  <span className="text-amber-600 dark:text-amber-400 shrink-0">Capacity Capped: 45 / 45 Desks</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs italic leading-relaxed font-body">
                  "Teacher is writing rapidly on the chalkboard. Students in the back struggle to read small text. Late arrivals occur due to commuter traffic."
                </p>
              </div>

              {/* Traditional Pain Points List */}
              <div className="space-y-3.5 text-xs sm:text-sm font-body">
                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Location & Commute Bound
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Students battle transit traffic and weather daily. Missing transport means missing the live lesson entirely.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Chalkboard Notes & Lost Explanations
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Once wiped clean, board explanations are gone forever with no reliable digital archive.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Manual Paper Roll-Calls
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Teachers lose valuable teaching minutes reading names from paper registers that can be misplaced or forged.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Delayed Multi-Week Grading Cycles
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Physical paper stacks sit on staff desks, delaying student feedback until well after exam periods.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 font-heading">
              <span>District: Local physical radius</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400 shrink-0">Fixed Hall Capacity</span>
            </div>
          </div>

          {/* Backpack Online Classroom Card */}
          <div className="bg-white dark:bg-slate-800/80 border-2 border-[#0078d4] dark:border-[#04a4ec] rounded-2xl p-5 sm:p-8 flex flex-col justify-between shadow-sm relative">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4 pb-5 border-b border-blue-100 dark:border-slate-700">
                <div className="space-y-1 min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0078d4] text-white text-xs font-bold uppercase tracking-wider font-heading">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Borderless & Real-Time</span>
                  </span>
                  <h3 className="text-lg sm:text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
                    Backpack Online Classroom
                  </h3>
                  <p className="text-xs sm:text-sm text-[#0078d4] dark:text-[#04a4ec] font-medium font-body">
                    Live HD video rooms, 24/7 cloud recordings, instant automated telemetry, and connected guardians.
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0078d4] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Laptop className="w-5 h-5" />
                </div>
              </div>

              {/* In-Session Snapshot */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/60 dark:bg-slate-900/60 border border-blue-200 dark:border-blue-900 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold font-heading text-[#0078d4] uppercase tracking-wider text-[10px] sm:text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate">Live Virtual Room · LiveKit HD</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">128 Students Active</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs italic leading-relaxed font-body">
                  "Instructor shares interactive slides in 1080p. Students in Lagos, Nairobi, and Kigali ask questions in live chat; lecture automatically recorded."
                </p>
              </div>

              {/* Backpack Breakthroughs List */}
              <div className="space-y-3.5 text-xs sm:text-sm font-body">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Pan-African Borderless Reach
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Zero commute. Connect learners across multiple cities and regions seamlessly on phones, tablets, or laptops.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Live HD Video & Permanent Cloud Replays
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Crystal audio, screen sharing, and on-demand cloud recordings accessible anytime for exam revision.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Automated Sign-In Telemetry & Timestamps
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Instant verified check-in records. Punctuality, attendance rates, and cohort logs generated automatically.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-semibold font-heading">
                      Instant Automated Assessments & Analytics
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      Quizzes and exercises scored automatically with real-time feedback and weighted gradebook formulas.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 border-t border-blue-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-[#0078d4] font-heading">
              <span className="font-medium">Scale: Unlimited concurrent cohorts</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">100% Cloud Archiving</span>
            </div>
          </div>
        </div>

        {/* Quick Comparison Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block font-body">Commute Time</span>
            <div className="text-xs text-rose-500 line-through font-body">1–2 Hours in Traffic</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-heading">0 Mins · 1-Click Entry</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block font-body">Class Capacity</span>
            <div className="text-xs text-amber-600 font-body">Max 45 Physical Desks</div>
            <div className="text-xs sm:text-sm font-bold text-[#0078d4] font-heading">Unlimited Cohort Size</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block font-body">Lecture Retention</span>
            <div className="text-xs text-rose-500 font-body">Erased from Board</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-heading">Permanent Cloud Replays</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block font-body">Guardian Visibility</span>
            <div className="text-xs text-amber-600 font-body">Termly Paper Card</div>
            <div className="text-xs sm:text-sm font-bold text-[#0078d4] font-heading">24/7 Real-Time Portal</div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. SECONDARY SCHOOL STUDENT TRACKING SUITE (Light Mode)  */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-8 md:p-10 border border-slate-200 dark:border-slate-700 space-y-6 sm:space-y-8 shadow-xs">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-700 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#0078d4] dark:text-blue-300 text-xs font-semibold font-heading">
              <School className="w-3.5 h-3.5 shrink-0" />
              <span>Secondary School Administration & Student Tracking</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white tracking-tight break-words">
              Complete Student, Gradebook & Guardian Management
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-body">
              Backpack gives school leaders, teachers, and parents unified control over student attendance, continuous assessment gradebooks, and performance telemetry.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0 font-heading">
            <Link
              to="/onboard"
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Register Secondary School</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/about-us"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition border border-slate-200 dark:border-slate-600 flex items-center justify-center cursor-pointer"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Interactive Feature Tabs */}
        <div className="space-y-6">
          <div className="flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-heading">
            <button
              type="button"
              onClick={() => setActiveSchoolTab("signin_signout")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${
                activeSchoolTab === "signin_signout"
                  ? "bg-white dark:bg-slate-800 text-[#0078d4] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">Sign-In & Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSchoolTab("grades")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${
                activeSchoolTab === "grades"
                  ? "bg-white dark:bg-slate-800 text-[#0078d4] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span className="truncate">Continuous Assessment</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSchoolTab("performance")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${
                activeSchoolTab === "performance"
                  ? "bg-white dark:bg-slate-800 text-[#0078d4] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="truncate">Performance Telemetry</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSchoolTab("parents")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${
                activeSchoolTab === "parents"
                  ? "bg-white dark:bg-slate-800 text-[#0078d4] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Parents & Guardians</span>
            </button>
          </div>

          {/* Tab 1: Sign-In / Attendance */}
          {activeSchoolTab === "signin_signout" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block font-heading">
                    Module 01 · Real-Time Attendance
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
                    Automated Daily Sign-In & Sign-Out Tracking
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                    Track student arrival at school gates or morning homerooms with verified timestamps, instant late flags, and automated guardian SMS notifications.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 font-body">
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Exact Timestamps:</strong> Millisecond arrival and departure records.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Instant Absence Alerts:</strong> Immediate notifications if a student hasn't checked in by 08:00 AM.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                    <span><strong>Period-by-Period Roll Calls:</strong> Prevent subject truancy between class changes.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Ministry Compliance:</strong> One-click exportable broadsheet attendance reports.</span>
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white truncate font-heading">Gate Terminal · SS2 Science Cohort</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">Today, 07:30 – 08:30 AM</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    <div className="text-slate-500 text-[10px] truncate">Enrolled</div>
                    <div className="text-sm font-bold font-heading text-slate-900 dark:text-white">42</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    <div className="text-slate-500 text-[10px] truncate">Signed In</div>
                    <div className="text-sm font-bold font-heading text-emerald-600">39 (93%)</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    <div className="text-slate-500 text-[10px] truncate">Late Arrival</div>
                    <div className="text-sm font-bold font-heading text-amber-600">2</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    <div className="text-slate-500 text-[10px] truncate">Unexcused</div>
                    <div className="text-sm font-bold font-heading text-rose-600">1</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 font-heading">
                        AY
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">Amina Yusuf</div>
                        <div className="text-[10px] text-slate-500 truncate">Gate 1 Terminal · 07:38 AM</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 text-emerald-700 font-bold text-[10px] shrink-0 whitespace-nowrap">
                      Present (On Time)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0078d4] flex items-center justify-center font-bold text-[11px] shrink-0 font-heading">
                        CO
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">Chidi Okeke</div>
                        <div className="text-[10px] text-slate-500 truncate">Gate 1 Terminal · 07:44 AM</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 text-emerald-700 font-bold text-[10px] shrink-0 whitespace-nowrap">
                      Present (On Time)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center font-bold text-[11px] shrink-0 font-heading">
                        KM
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">Kofi Mensah</div>
                        <div className="text-[10px] text-slate-500 truncate">Gate 2 Terminal · 08:14 AM</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 border border-amber-200 text-amber-700 font-bold text-[10px] shrink-0 whitespace-nowrap">
                      Late (14m Late)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 flex items-center justify-center font-bold text-[11px] shrink-0 font-heading">
                        TB
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">Tunde Bakare</div>
                        <div className="text-[10px] text-slate-500 truncate">No Check-in Recorded</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/70 border border-rose-200 text-rose-700 font-bold text-[10px] shrink-0 whitespace-nowrap">
                      Absent (Unexcused)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Grades & Continuous Assessment */}
          {activeSchoolTab === "grades" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block font-heading">
                    Module 02 · Academic Evaluation
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
                    Continuous Assessment & Term Gradebook
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                    Record assignments, quizzes, practical labs, and terminal examinations with automatic weighted formulas (e.g. 30% Continuous Assessment + 70% Terminal Exam).
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 font-body">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>WAEC / NECO Standards:</strong> Built-in 9-point grading scale (A1 to F9) and custom rubrics.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                    <span><strong>Weighted CA Automation:</strong> Instant calculation of homework and exam contributions.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Class Averages & Curving:</strong> Real-time subject averages and ranking placement.</span>
                  </div>
                </div>
              </div>

              {/* Mock Gradebook Table */}
              <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-[#0078d4] shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white truncate font-heading">SS2 Term 2 Gradebook · Physics & Math</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
                    Weighting: 30% CA + 70% Exam
                  </span>
                </div>

                <div className="overflow-x-auto -mx-1 sm:mx-0">
                  <table className="w-full min-w-[500px] text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-heading">
                        <th className="pb-2">Student</th>
                        <th className="pb-2 text-center">CA (30)</th>
                        <th className="pb-2 text-center">Exam (70)</th>
                        <th className="pb-2 text-center">Total (100)</th>
                        <th className="pb-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">Chiamaka Nnamdi</td>
                        <td className="py-2.5 text-center">28.5</td>
                        <td className="py-2.5 text-center">64.0</td>
                        <td className="py-2.5 text-center font-bold text-emerald-600">92.5%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                            A1 Distinction
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">Ibrahim Sani</td>
                        <td className="py-2.5 text-center">26.0</td>
                        <td className="py-2.5 text-center">58.0</td>
                        <td className="py-2.5 text-center font-bold text-[#0078d4]">84.0%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0078d4] border border-blue-200 font-bold text-[10px]">
                            B2 Very Good
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">Favour Johnson</td>
                        <td className="py-2.5 text-center">23.0</td>
                        <td className="py-2.5 text-center">52.5</td>
                        <td className="py-2.5 text-center font-bold text-[#0078d4]">75.5%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0078d4] border border-blue-200 font-bold text-[10px]">
                            B3 Good
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">David Adeleke</td>
                        <td className="py-2.5 text-center">19.5</td>
                        <td className="py-2.5 text-center">45.0</td>
                        <td className="py-2.5 text-center font-bold text-amber-600">64.5%</td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                            C4 Credit
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span>Class Average: <strong className="text-slate-900 dark:text-white">79.1% (B3)</strong></span>
                  <span className="text-emerald-600 font-semibold">Published to Guardian Portal</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Performance Telemetry */}
          {activeSchoolTab === "performance" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block font-heading">
                    Module 03 · Academic Telemetry
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
                    Student Performance & Growth Curves
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                    Track cognitive strengths across STEM, Humanities, and Vocational subjects with automated growth curves and early-warning alerts for struggling students.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 font-body">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Term-over-Term Growth:</strong> View progress trajectories across test cycles.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Early Intervention:</strong> Flags specific concepts where students score under 60%.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                    <span><strong>Verifiable Transcripts:</strong> Official digital records that universities can verify.</span>
                  </div>
                </div>
              </div>

              {/* Performance Card */}
              <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#0078d4] text-white flex items-center justify-center font-bold text-xs shrink-0 font-heading">
                      CN
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">Chiamaka Nnamdi · ID #BP-SS-2024</div>
                      <div className="text-[10px] text-slate-500 truncate">Rank: #1 of 42 (SS2 Science Cohort)</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-bold shrink-0 self-start sm:self-auto">
                    GPA: 4.88 / 5.0
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                      <span className="truncate">Further Mathematics & Calculus</span>
                      <span className="font-mono text-emerald-600 font-bold shrink-0 text-[11px] sm:text-xs">94% · High Mastery</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                      <span className="truncate">Physics & Laboratory Mechanics</span>
                      <span className="font-mono text-[#0078d4] font-bold shrink-0 text-[11px] sm:text-xs">89% · High Mastery</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-[#0078d4] rounded-full" style={{ width: "89%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                      <span className="truncate">Chemistry & Stoichiometry</span>
                      <span className="font-mono text-[#0078d4] font-bold shrink-0 text-[11px] sm:text-xs">84% · Proficient</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-[#0078d4] rounded-full" style={{ width: "84%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                      <span className="truncate">English Language & Essay Writing</span>
                      <span className="font-mono text-amber-600 font-bold shrink-0 text-[11px] sm:text-xs">78% · Developing</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "78%" }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Targeted Faculty Insight:</strong> Chiamaka excels in quantitative STEM modules. Recommended 2 extra revision sessions on narrative essay composition before WAEC registration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Parents & Guardians Portal */}
          {activeSchoolTab === "parents" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block font-heading">
                    Module 04 · Guardian Connectivity
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
                    Dedicated Parent & Guardian Portal
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                    Keep parents actively involved. Guardians log in to view real-time gate entry times, test results, teacher remarks, and term fee balances.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 font-body">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>24/7 Mobile Access:</strong> Accessible on any smartphone across Africa and diaspora.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                    <span><strong>Daily Gate Alerts:</strong> Know the minute your child arrives safely on campus.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Transparent Fee Management:</strong> View term tuition and pay with installment options.</span>
                  </div>
                </div>
              </div>

              {/* Guardian Preview Card */}
              <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 text-[#0078d4] shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white truncate font-heading">Guardian Portal · Welcome, Mrs. Folake Adeleke</span>
                  </div>
                  <span className="text-slate-500 text-[10px] shrink-0">Ward: David Adeleke (SS2)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>Today's Campus Status</span>
                      <span className="text-emerald-600 font-bold">On Campus</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-heading">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Signed in at 07:41 AM</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Gate 1 Terminal verified. 5 periods attended.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>Term 2 Tuition Balance</span>
                      <span className="text-emerald-600 font-bold">100% Cleared</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-heading">
                      <CreditCard className="w-4 h-4 text-[#0078d4] shrink-0" />
                      <span>₦0.00 Outstanding</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Receipt #BP-8841 generated on 15 Feb.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate font-heading">
                      <FileText className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />
                      <span className="truncate">Teacher's Mid-Term Remark</span>
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">Yesterday, 4:15 PM</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-100 dark:border-slate-800 font-body">
                    "David demonstrated notable enthusiasm during the solar energy physics practical today. We encourage him to maintain this focus as mid-term exams approach." — Mr. O. Balogun (Physics Faculty)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. STEP-BY-STEP WORKFLOW (4 Steps with Role Switcher)     */}
      {/* ======================================================== */}
      <section className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block font-heading">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight break-words">
            How to Use Backpack in 4 Simple Steps
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-body">
            Whether you are a student leveling up your career or an institution building an academy, Backpack guides you from start to finish.
          </p>

          {/* Interactive Role Switcher Tabs */}
          <div className="pt-2 flex justify-center w-full">
            <div className="flex flex-col sm:inline-flex sm:flex-row p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs font-heading w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveStepTab("students")}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer w-full sm:w-auto ${
                  activeStepTab === "students"
                    ? "bg-[#0078d4] text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>For Students & Learners</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab("creators")}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer w-full sm:w-auto ${
                  activeStepTab === "creators"
                    ? "bg-[#0078d4] text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>For Instructors & Academies</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentSteps.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900 text-[#0078d4] flex items-center justify-center">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="font-heading text-sm font-bold text-slate-400">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold font-heading text-slate-900 dark:text-white group-hover:text-[#0078d4] transition">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 font-body">
                    {item.feature}
                  </span>
                  <Link
                    to={item.to}
                    className="font-bold font-heading text-[#0078d4] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{item.actionText}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow Bottom CTA Banner */}
        <div className="bg-[#f8fafd] dark:bg-slate-800 rounded-2xl p-5 sm:p-8 border border-[#d6e9f8] dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0078d4] font-heading">
              {activeStepTab === "students" ? "Student Pathway" : "Institution Workspace"}
            </span>
            <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white">
              {activeStepTab === "students"
                ? "Ready to begin learning on Backpack?"
                : "Ready to launch and scale your academy?"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl font-body">
              {activeStepTab === "students"
                ? "Explore accredited programs from verified universities, tech academies, and vocational leaders."
                : "Set up your workspace, publish courses, and receive automated tuition settlements directly to your bank account."}
            </p>
          </div>

          <Link
            to={activeStepTab === "students" ? "/explore" : "/onboard"}
            className="w-full sm:w-auto px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white font-semibold font-heading text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>{activeStepTab === "students" ? "Explore Catalog" : "Register Academy"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. FEATURED COURSES CATALOG (Popular & Non-Profit)       */}
      {/* ======================================================== */}
      {courses.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block mb-1 font-heading">
                Curated Catalog
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white tracking-tight break-words">
                Featured Programs
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-body">
                Explore academic courses and donation-funded non-profit vocational training.
              </p>
            </div>
            <Link
              to="/explore"
              className="text-sm font-semibold font-heading text-[#0078d4] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>View full catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Two-Column Grid: Popular Courses (Left) | Non-Profit Courses (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Popular Courses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#0078d4]" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white font-heading">Popular Courses</h3>
                </div>
                <span className="text-xs text-slate-500 font-body">High-demand pathways</span>
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
                      className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0078d4] transition shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#0078d4] bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 truncate">
                          {org?.name || "Verified Academy"}
                        </span>
                        <span className="text-slate-500 shrink-0">{(course as any).category || "Academic"}</span>
                      </div>

                      <Link to={`/course/${course.id}`}>
                        <h4 className="font-bold text-base font-heading text-slate-900 dark:text-white hover:text-[#0078d4] transition line-clamp-1">
                          {course.title}
                        </h4>
                      </Link>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-body">
                        {course.description}
                      </p>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <span className="font-bold font-heading text-slate-900 dark:text-white text-sm">
                          {course.price > 0
                            ? `${course.currency || "NGN"} ${formatPriceWithDecimals(getEffectivePrice(course.price))}`
                            : "Free Enrollment"}
                        </span>
                        <Link
                          to={`/course/${course.id}`}
                          className="font-bold font-heading text-[#0078d4] hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                          <span>Enroll Now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Non-Profit Courses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white font-heading">Non-Profit Courses</h3>
                </div>
                <span className="text-xs text-slate-500 font-body">Donation-funded vocational training</span>
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
                        className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition shadow-xs space-y-3 relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-600 dark:text-slate-400 truncate">
                            {org?.name || "Non-Profit Academy"}
                          </span>
                          <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px] shrink-0">
                            100% Tuition Waiver
                          </span>
                        </div>

                        <Link to={`/course/${course.id}`}>
                          <h4 className="font-bold text-base font-heading text-slate-900 dark:text-white hover:text-emerald-600 transition line-clamp-1">
                            {course.title}
                          </h4>
                        </Link>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-body">
                          {course.description}
                        </p>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            <span className="font-bold font-heading text-emerald-600 text-sm">
                              Sponsored by Donors
                            </span>
                            <Link
                              to={`/course/${course.id}`}
                              className="font-bold font-heading text-slate-700 dark:text-slate-300 hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>View Course</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>

                          {canDonate && (
                            <button
                              onClick={() => setDonatingCourse(course)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold font-heading text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <HeartHandshake className="w-4 h-4" />
                              <span>Sponsor a Student</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold font-heading text-slate-900 dark:text-white text-sm">
                    Donation-Funded Vocational Programs
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-body">
                    Accredited institutes can list tuition-waived programs supported by philanthropic sponsors and donors.
                  </p>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1 text-xs font-bold font-heading text-emerald-600 hover:underline pt-1"
                  >
                    <span>Browse All Available Courses</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Connected Modal to Course View */}
      {donatingCourse && (
        <CourseDonationModal
          course={donatingCourse}
          onClose={() => setDonatingCourse(null)}
        />
      )}

      {/* ======================================================== */}
      {/* 8. TESTIMONIALS (Coursera Community Stories)             */}
      {/* ======================================================== */}
      <section className="space-y-10 py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#0078d4] uppercase tracking-wider block font-heading">
            Community Voices
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight break-words">
            Trusted by Educators & Students
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-body">
            See how educational communities across Africa are utilizing Backpack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic font-body">
              "Backpack makes organizing courses and tracking cohorts straightforward. Having attendance telemetry and live rooms in one platform saves our school hours."
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0078d4] font-bold font-heading text-xs flex items-center justify-center shrink-0">
                AO
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold font-heading text-slate-900 dark:text-white truncate">Amaka Okafor</h4>
                <p className="text-[11px] text-slate-500 font-body truncate">Instructor · Lagos Tech Academy</p>
              </div>
            </div>
          </article>

          <article className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic font-body">
              "I love having my live classes, assignment submissions, and progress gradebook in one spot. The cloud recordings make exam revision so convenient."
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold font-heading text-xs flex items-center justify-center shrink-0">
                CN
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold font-heading text-slate-900 dark:text-white truncate">Chinedu Nwosu</h4>
                <p className="text-[11px] text-slate-500 font-body truncate">Computer Science Student</p>
              </div>
            </div>
          </article>

          <article className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic font-body">
              "The automatic split payout with Paystack is a gamechanger. Tuition lands directly into our school bank account with no reconciliation friction."
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold font-heading text-xs flex items-center justify-center shrink-0">
                EJ
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold font-heading text-slate-900 dark:text-white truncate">Esther James</h4>
                <p className="text-[11px] text-slate-500 font-body truncate">School Administrator · Accra</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. FOOTER (Clean Microsoft / Coursera Navigation)        */}
      {/* ======================================================== */}
      <footer className="pt-12 border-t border-slate-200 dark:border-slate-700 font-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 text-xs">
          <div className="space-y-3">
            <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">Backpack</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Empowering educational organizations and students across Africa through accessible, borderless digital learning.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold font-heading text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Platform</h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li><Link to="/explore" className="hover:text-[#0078d4]">Explore Courses</Link></li>
              <li><Link to="/signup" className="hover:text-[#0078d4]">Create Account</Link></li>
              <li><Link to="/login" className="hover:text-[#0078d4]">Sign In</Link></li>
              <li><Link to="/onboard" className="hover:text-[#0078d4]">Register Institution</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold font-heading text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Resources</h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li><Link to="/about-us" className="hover:text-[#0078d4]">About Us</Link></li>
              <li><Link to="/privacy" className="hover:text-[#0078d4]">Privacy Policy</Link></li>
              <li><Link to="/privacy" className="hover:text-[#0078d4]">Terms of Service</Link></li>
              <li><Link to="/events" className="hover:text-[#0078d4]">Academic Events</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold font-heading text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Support</h4>
            <p className="text-slate-600 dark:text-slate-400">Questions or institutional inquiries?</p>
            <a href="mailto:support@backpack-edu.com" className="text-[#0078d4] font-medium hover:underline block">
              support@backpack-edu.com
            </a>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Backpack Education Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-[#0078d4]">Privacy</Link>
            <Link to="/privacy" className="hover:text-[#0078d4]">Terms</Link>
            <Link to="/events" className="hover:text-[#0078d4]">Events</Link>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              v0.1.4
            </span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default Home;
