import React, { useState, useRef } from "react";
import {
  ArrowRight,
  GraduationCap,
  Target,
  Users,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Monitor,
  Layout,
  Code2,
  ShieldCheck,
  Building2,
  Video,
  CreditCard,
  BarChart3,
  Laptop,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";

interface DeveloperProfile {
  name: string;
  role: string;
  number: string;
  image: string;
  initials: string;
  bio: string;
  focus: string;
  icon: React.ElementType;
}

const DEVELOPERS: DeveloperProfile[] = [
  {
    name: "Ekenedilichukwu Okoli",
    role: "Lead Software Engineer",
    number: "01",
    initials: "EO",
    image:
      "https://media.licdn.com/dms/image/v2/D4E03AQHiqi4YHQpQLA/profile-displayphoto-crop_800_800/B4EZywxwZxGYAM-/0/1772492361198?e=1789603200&v=beta&t=RDKpliGLTyAKSqD5XPvMqyu9zsLJ9YsvXSrLvXn-GJA",
    bio: "Leading overall platform engineering, distributed system design, and secure cloud infrastructure.",
    focus: "System Architecture",
    icon: Code2,
  },
  {
    name: "Ogochukwu Okoli",
    role: "AI Developer",
    number: "02",
    initials: "OO",
    image:
      "https://media.licdn.com/dms/image/v2/D4E03AQEOPrCW2KTHrw/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1729331170966?e=1789603200&v=beta&t=F83iBZgBuT6rjLGAyrkOEx9BOU-tRJaSRSVf7gHz5cg",
    bio: "Engineering intelligent automated grading models, classroom telemetry, and conversational learning assistants.",
    focus: "Intelligent Systems",
    icon: Sparkles,
  },
  {
    name: "Richard Onyekachi",
    role: "Backend Engineer",
    number: "03",
    initials: "RO",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQEH8lBu1Lca3Q/profile-displayphoto-crop_800_800/B4DZvLtaH9KoAI-/0/1768649239267?e=1789603200&v=beta&t=PG20w_SbBQKSHfJhAhEBDx5zCTaf2A9t6BlFBN3VsUw",
    bio: "Crafting intuitive web interfaces, reusable component design systems, and responsive user journeys.",
    focus: "Backend Architecture",
    icon: Layout,
  },
  {
    name: "Stella Eneh",
    role: "Frontend Engineer",
    number: "04",
    initials: "SE",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQG_Kk8suQsnyg/profile-displayphoto-crop_800_800/B4DZ21.xaHGcAI-/0/1776874637809?e=1789603200&v=beta&t=wVkJDQIBpe8hnfC7St_ugtX61jAWJ_n7VK8FBUzs3fo",
    bio: "Translating educational product requirements into polished, accessible, and high-performance frontend interfaces.",
    focus: "Accessibility & UX",
    icon: Monitor,
  },
  {
    name: "Ilonuba Chukwudi",
    role: "Frontend Engineer",
    number: "05",
    initials: "IC",
    image:
      "https://media.licdn.com/dms/image/v2/D4E03AQFK6M42xcMg5A/profile-displayphoto-crop_800_800/B4EZ6sZCB1JkAI-/0/1781008704690?e=1789603200&v=beta&t=YZ2KC6qZsyLRh5I68_yzdyOT8n1rt3k9YNeDA_l1E38",
    bio: "Building fluid interactive components, course management tools, and seamless learning room workflows.",
    focus: "Interactive Web",
    icon: Laptop,
  },
];

const AboutUs: React.FC = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const clamped = Math.max(0, Math.min(index, DEVELOPERS.length - 1));
    const card = container.children[clamped] as HTMLElement;
    if (card) {
      const targetLeft = card.offsetLeft - container.offsetLeft;
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
    setCarouselIndex(clamped);
  };

  const handlePrev = () => {
    const target = carouselIndex === 0 ? DEVELOPERS.length - 1 : carouselIndex - 1;
    scrollToIndex(target);
  };

  const handleNext = () => {
    const target = carouselIndex === DEVELOPERS.length - 1 ? 0 : carouselIndex + 1;
    scrollToIndex(target);
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const children = Array.from(container.children) as HTMLElement[];
    if (!children.length) return;

    let closestIndex = 0;
    let minDiff = Infinity;
    children.forEach((child, idx) => {
      const diff = Math.abs(child.offsetLeft - container.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    setCarouselIndex(closestIndex);
  };

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 flex flex-col">
      {/* ======================================================== */}
      {/* 1. HERO BANNER (Full-Width Edge-to-Edge like Home Page)   */}
      {/* ======================================================== */}
      <section className="relative w-full overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 border-b border-[#d6e9f8] dark:border-[#1e3a52] bg-gradient-to-b from-[#f0f7fd]/90 via-white to-white dark:from-[#0f2231]/30 dark:via-[#0a1824] dark:to-[#0a1824]">
        {/* Ambient luminous glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#d6e9f8]/70 via-[#0078d4]/10 to-transparent dark:from-[#0078d4]/20 dark:via-[#0f2231]/30 dark:to-transparent rounded-full blur-3xl opacity-80" />
        </div>

        {/* Framing Container */}
        <div className="relative max-w-6xl mx-auto px-4">
          {/* Hero Content Container */}
          <div className="max-w-2xl sm:max-w-3xl mx-auto text-center space-y-6 sm:space-y-8 px-4 relative z-10">
            {/* Eyebrow badge */}


            {/* Main Title */}
            <div className="space-y-4 sm:space-y-5">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-heading tracking-tight text-slate-900 dark:text-white leading-[1.15] sm:leading-[1.12] break-words">
                Empowering Academies.
                <span className="block text-[#0078d4] dark:text-[#04a4ec] mt-1.5 sm:mt-3">
                  Connecting African Learners.
                </span>
              </h1>

              <p className="text-sm sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal font-body px-2">
                We are building modern technology infrastructure for African schools, universities, and vocational academies — making world-class education structured, accessible, and connected to direct regional tuition settlements.
              </p>
            </div>

            {/* Action Link Group (Tailored for About Us) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 text-sm font-heading max-w-md sm:max-w-none mx-auto w-full">
              <a
                href="#mission"
                className="w-full sm:w-auto px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>Our Mission &amp; Pillars</span>
              </a>
              <a
                href="#team"
                className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-[#0f2231] hover:bg-slate-50 dark:hover:bg-[#1a384f] text-slate-800 dark:text-slate-200 border border-[#d6e9f8] dark:border-[#1e3a52] font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                <span>Meet the Developers</span>
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-5 py-3 text-slate-600 dark:text-slate-300 hover:text-[#0078d4] dark:hover:text-[#04a4ec] font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>How It Works</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Foundational Tenets Grid (About Us Specific) 
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto w-full text-left">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xs hover:border-[#0078d4]/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] mb-3">
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">Pan-African Access</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                  Breaking geographic barriers so any learner can access verified curriculums across borders.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xs hover:border-emerald-400/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">Institutional Freedom</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                  Schools maintain full curricular autonomy, brand identity, and direct bank settlements.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xs hover:border-cyan-400/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-3">
                  <Video className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">Real-Time Connection</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                  Live interactive video classrooms with built-in attendance telemetry and recordings.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#0f2231]/90 border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xs hover:border-amber-400/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">Community Driven</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                  Built alongside Nigerian and African educators to solve everyday educational bottlenecks.
                </p>
              </div>
            </div>
            */}
          </div>
        </div>
      </section>

      {/* Main page content wrapped in standard container */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 w-full space-y-20 sm:space-y-24 py-12">
        {/* ======================================================== */}
        {/* 2. CORE PILLARS (Mission, Vision, Approach)               */}
        {/* ======================================================== */}
        <section id="mission" className="space-y-8 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#0078d4] dark:text-[#04a4ec] uppercase tracking-wider font-heading">
              Our Foundation
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
              Built for Purpose, Designed for Scale
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
              Guiding principles that define how we construct learning tools for students and faculty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Mission */}
            <article className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/70 hover:border-[#0078d4] dark:hover:border-[#04a4ec] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#0078d4] to-cyan-500 absolute top-0 left-0" />

              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#d6e9f8]/70 dark:bg-[#0f2231] border border-[#0078d4]/20 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6" />
                </div>

                <h3 className="mt-5 text-xl font-bold font-heading text-slate-900 dark:text-white">
                  Our Mission
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-body">
                  To simplify educational technology across Africa, allowing schools and educators to focus on teaching while providing students with modern tools, real-time telemetry, and verifiable credentials.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold font-heading text-[#0078d4] dark:text-[#04a4ec]">
                <span>Accessible Education</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </article>

            {/* Vision */}
            <article className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/70 hover:border-emerald-500 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400 absolute top-0 left-0" />

              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[#0d2618] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-6 h-6" />
                </div>

                <h3 className="mt-5 text-xl font-bold font-heading text-slate-900 dark:text-white">
                  Our Vision
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-body">
                  We envision a future where universities, secondary academies, and vocational institutes collaborate friction-free across African borders without barriers of technology, curriculum management, or currency settlements.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold font-heading text-emerald-600 dark:text-emerald-400">
                <span>Borderless Horizons</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </article>

            {/* People First */}
            <article className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/70 hover:border-amber-500 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-400 absolute top-0 left-0" />

              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-[#261e0e] border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>

                <h3 className="mt-5 text-xl font-bold font-heading text-slate-900 dark:text-white">
                  People First
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-body">
                  We design directly for learners and teachers. Every button, schedule, and gradebook is optimized for low-bandwidth environments, accessible typography, and intuitive clarity.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold font-heading text-amber-600 dark:text-amber-400">
                <span>User-Centric Design</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </article>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. PLATFORM SHOWCASE (What We Do & What We Believe)       */}
        {/* ======================================================== */}
        <section id="philosophy" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch scroll-mt-24">
          {/* Left: What We Do (Brand Gradient Hero Card) */}
          <div className="bg-gradient-to-br from-[#0078d4] via-[#006bbd] to-[#04a4ec] rounded-3xl p-7 sm:p-10 text-white relative overflow-hidden shadow-xl flex flex-col justify-between">
            {/* Subtle luminous blur orb */}
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100 font-heading">
                What We Do
              </span>

              <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold font-heading leading-tight">
                Bridging African Education with Reliable Cloud Software.
              </h3>

              <p className="mt-4 text-xs sm:text-sm text-blue-50 leading-relaxed font-body">
                Backpack unifies all vital academic tools: curriculum publishing, instructor onboarding, automated tuition disbursements, student cohort telemetry, and interactive video classrooms.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 hover:bg-white/15 transition">
                  <GraduationCap className="w-5 h-5 text-white mb-2.5" />
                  <h4 className="text-sm font-bold font-heading">Curriculum Systems</h4>
                  <p className="mt-1 text-xs text-blue-100 font-body">
                    Modular academic syllabi, grading rubrics, and lesson resources.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 hover:bg-white/15 transition">
                  <Video className="w-5 h-5 text-white mb-2.5" />
                  <h4 className="text-sm font-bold font-heading">Live HD Classrooms</h4>
                  <p className="mt-1 text-xs text-blue-100 font-body">
                    Real-time interactive video with student attendance logging.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 hover:bg-white/15 transition">
                  <CreditCard className="w-5 h-5 text-white mb-2.5" />
                  <h4 className="text-sm font-bold font-heading">Tuition Settlement</h4>
                  <p className="mt-1 text-xs text-blue-100 font-body">
                    Automated direct bank payouts with 0% reconciliation friction.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 hover:bg-white/15 transition">
                  <BarChart3 className="w-5 h-5 text-white mb-2.5" />
                  <h4 className="text-sm font-bold font-heading">Cohort Telemetry</h4>
                  <p className="mt-1 text-xs text-blue-100 font-body">
                    Comprehensive performance analytics and exam verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/20 relative z-10 flex items-center justify-between">
              <span className="text-xs text-blue-100 font-heading">
                Multi-Campus Academic Platform
              </span>
              <Link
                to="/explore"
                className="text-xs font-bold text-white hover:underline inline-flex items-center gap-1 font-heading"
              >
                Explore Institutions
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right: What We Believe */}
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-7 sm:p-10 border border-slate-200/90 dark:border-slate-700/70 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0078d4] dark:text-[#04a4ec] font-heading">
                Our Core Philosophy
              </span>

              <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
                Technology Should Make Education Simpler, Never Harder.
              </h3>

              <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-body">
                Managing a university, school, or training bootcamp is already demanding. Educational software should remove overhead, protect institutional independence, and make progress visible.
              </p>

              <div className="mt-7 space-y-4">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                      Frictionless by Default
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body">
                      Clear UI patterns, zero unnecessary forms, and instant setup for both institutions and students.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 border border-[#0078d4]/20 dark:border-[#0078d4]/30 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                      Bank-Grade Security &amp; Payouts
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body">
                      Tuition lands directly into your institutional bank account with automated split disbursements via Paystack.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                      Continuous Listening &amp; Evolution
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body">
                      We listen directly to educators across Africa, continually updating tools to meet real academic requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-body">
                Ready to modernize your academy?
              </span>
              <Link
                to="/onboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold font-heading text-[#0078d4] dark:text-[#04a4ec] hover:underline"
              >
                Get Started as an Institution
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. USER GUIDES (For Institutions & Students)              */}
        {/* ======================================================== */}
        <section id="how-it-works" className="space-y-8 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#0078d4] dark:text-[#04a4ec] uppercase tracking-wider font-heading">
              User Guides
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
              How to Use Backpack
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
              Straightforward step-by-step guidance tailored for organizations, instructors, and learners.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Organisation / Instructor Guide */}
            <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-7 sm:p-9 border border-slate-200/90 dark:border-slate-700/70 shadow-xs flex flex-col justify-between gap-6">
              <div>
                <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-700/60 pb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#d6e9f8]/70 dark:bg-[#0f2231] border border-[#0078d4]/20 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white">
                      For Institutions &amp; Educators
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                      Publish curriculums, receive tuition payouts, and lead cohorts
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-[#0078d4] text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Register &amp; Complete Academy Profile
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Sign up for an institutional account, upload your logo, configure your school branding, and draft your bio.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-[#0078d4] text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Connect Direct Bank Payout Subaccount
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Navigate to Settings &gt; Payouts. Enter your bank details to receive 100% of your tuition fees straight into your school bank account.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-[#0078d4] text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Publish Courses &amp; Define Tuition Pricing
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Upload modules, assign instructors, and set flexible payment options (single upfront or installment milestone splits).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-[#0078d4] text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Host Live Video Classes &amp; Track Telemetry
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Run interactive live HD lectures with auto-attendance, utilize grading rubrics, and track cohort progress in real time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <Link
                  to="/onboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading transition shadow-xs hover:shadow-md cursor-pointer"
                >
                  <span>Register Your Institution</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Student Guide */}
            <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-7 sm:p-9 border border-slate-200/90 dark:border-slate-700/70 shadow-xs flex flex-col justify-between gap-6">
              <div>
                <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-700/60 pb-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[#0d2618] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white">
                      For Students &amp; Learners
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                      Discover programs, enroll safely, and attend live lectures
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Create Your Free Student Profile
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Register with your email, set your academic interests, and configure your personalized student dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Explore Curriculums &amp; Vocational Scholarships
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Browse accredited university and vocational courses, review lesson plans, and apply for 100% tuition-waiver non-profit programs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Secure Multi-Currency Checkout
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Pay tuition in regional currencies (NGN, GHS, KES) through instant one-time or installment milestone options.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs font-heading flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Enter Classrooms &amp; Earn Credentials
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-body leading-relaxed">
                        Join live video sessions, submit graded projects, collaborate with peers, and obtain verifiable digital certificates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <Link
                  to="/explore"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold font-heading transition shadow-xs cursor-pointer"
                >
                  <span>Browse Course Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. MEET THE DEVELOPERS (Interactive Carousel Slider)      */}
        {/* ======================================================== */}
        <section id="team" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-bold text-[#0078d4] dark:text-[#04a4ec] uppercase tracking-wider block mb-1 font-heading">
                The Engineering Team
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
                Meet the Developers
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body max-w-xl">
                The engineers and AI developers designing scalable technologies, intuitive interfaces, and cloud services for Backpack.
              </p>
            </div>

            {/* Slider Navigation Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold font-heading text-slate-400 dark:text-slate-500 mr-2">
                {carouselIndex + 1} of {DEVELOPERS.length}
              </span>
              <button
                onClick={handlePrev}
                aria-label="Previous developer"
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-[#0078d4] hover:text-[#0078d4] dark:hover:text-[#04a4ec] shadow-2xs transition-all flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next developer"
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-[#0078d4] hover:text-[#0078d4] dark:hover:text-[#04a4ec] shadow-2xs transition-all flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Carousel Track */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 pt-2 px-1 scroll-smooth no-scrollbar"
          >
            {DEVELOPERS.map((dev) => {
              const IconComponent = dev.icon;
              const hasError = imageError[dev.number];

              return (
                <article
                  key={dev.number}
                  className="w-[290px] sm:w-[330px] md:w-[350px] shrink-0 snap-center group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-700/70 overflow-hidden hover:border-[#0078d4] dark:hover:border-[#04a4ec] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Photo Container with Error Fallback */}
                    <div className="relative h-64 sm:h-72 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                      {hasError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2231] via-slate-900 to-[#0a1824] relative text-center p-6">
                          <div className="w-16 h-16 rounded-2xl bg-[#0078d4]/15 border border-[#0078d4]/30 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] text-2xl font-extrabold font-heading mb-2">
                            {dev.initials}
                          </div>
                          <span className="text-xs font-semibold text-slate-400 font-heading">
                            {dev.name}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={dev.image}
                          alt={dev.name}
                          onError={() =>
                            setImageError((prev) => ({ ...prev, [dev.number]: true }))
                          }
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                        />
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent pointer-events-none" />

                      {/* Number badge */}
                      <span className="absolute top-3.5 left-3.5 w-7 h-7 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-white/15 flex items-center justify-center text-[11px] font-bold font-heading text-white shadow-xs">
                        {dev.number}
                      </span>

                      {/* Specialty pill */}
                      <span className="absolute bottom-3 left-3 text-[10px] font-bold font-heading uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                        {dev.focus}
                      </span>
                    </div>

                    {/* Developer Info */}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white leading-snug group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition-colors">
                            {dev.name}
                          </h3>
                          <p className="mt-0.5 text-xs font-semibold text-[#0078d4] dark:text-[#04a4ec] font-heading">
                            {dev.role}
                          </p>
                        </div>

                        <div className="w-9 h-9 shrink-0 rounded-xl bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 border border-[#0078d4]/20 dark:border-[#0078d4]/30 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec]">
                          <IconComponent className="w-4 h-4" />
                        </div>
                      </div>

                      <p className="mt-3.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body leading-relaxed line-clamp-3">
                        {dev.bio}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 pb-5 pt-0">
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0078d4] dark:group-hover:bg-[#04a4ec] transition-colors rounded-full" />
                  </div>
                </article>
              );
            })}
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {DEVELOPERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                aria-label={`Jump to developer ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${carouselIndex === idx
                  ? "w-8 h-2.5 bg-[#0078d4]"
                  : "w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                  }`}
              />
            ))}
          </div>

          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-body">
              <span className="w-12 h-px bg-slate-200 dark:bg-slate-700" />
              <span>Swipe or click arrows to explore the team</span>
              <span className="w-12 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. BOTTOM CALL TO ACTION BANNER                          */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-gradient-to-r from-[#f0f7fd]/95 via-white to-[#f0f7fd]/95 dark:from-[#0f2231]/40 dark:via-[#0e1e2c] dark:to-[#0f2231]/40 p-8 sm:p-12 text-center shadow-xs">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0078d4]/10 dark:bg-[#0078d4]/20 border border-[#0078d4]/20 text-[#0078d4] dark:text-[#04a4ec] text-xs font-bold font-heading uppercase tracking-wider">
              Start Learning &amp; Teaching Today
            </span>

            <h3 className="text-2xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
              Ready to Build a Better Learning Experience?
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-body leading-relaxed max-w-xl mx-auto">
              Join hundreds of institutions, secondary schools, and students scaling digital education across Africa.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/onboard"
                className="w-full sm:w-auto px-6 py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs sm:text-sm font-semibold font-heading rounded-xl transition shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Onboard Your Institution</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/explore"
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold font-heading rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Explore All Courses</span>
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>

    </div>
  );
};

export default AboutUs;
