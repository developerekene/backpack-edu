/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Play,
  Star,
  Users,
  Video,
  BookOpen,
  Award,
  ChevronRight,
  HeartHandshake,
  CheckCircle2,
  Code,
  Briefcase,
  Palette,
  Wrench,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  School,
  FileSpreadsheet,
} from "lucide-react";
import { useAppContext } from "../../store/AppContext";
import { Course } from "../../types";
import { CourseDonationModal } from "../components/CourseDonationModal";
import { formatPriceWithDecimals } from "../../lib/price";
import heroStudentImg from "../../assets/images/hero_student.jpg";

const Home: React.FC = () => {
  const { courses, organizations } = useAppContext();
  const navigate = useNavigate();
  const [donatingCourse, setDonatingCourse] = useState<Course | null>(null);
  const [heroSearchQuery, setHeroSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const nonProfitCourses = courses.filter(isDonationFundedVocational);
  const popularCourses = courses.filter((c) => !isDonationFundedVocational(c));

  // Filter popular courses by active category tab
  const filteredCourses =
    selectedCategory === "all"
      ? popularCourses
      : popularCourses.filter((c) => {
          const cat = selectedCategory.toLowerCase();
          const qType = (c.qualificationType || "").toLowerCase();
          const title = (c.title || "").toLowerCase();
          const desc = (c.description || "").toLowerCase();
          const customCat = ((c as any).category || "").toLowerCase();
          return (
            qType.includes(cat) ||
            title.includes(cat) ||
            desc.includes(cat) ||
            customCat.includes(cat)
          );
        });

  const displayCourses =
    filteredCourses.length > 0
      ? filteredCourses.slice(0, 6)
      : popularCourses.slice(0, 6);

  const displayNonProfit =
    nonProfitCourses.length > 0 ? nonProfitCourses.slice(0, 3) : [];

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(heroSearchQuery.trim())}`);
    } else {
      navigate("/explore");
    }
  };

  const categories = [
    { id: "all", label: "All Categories", icon: BookOpen },
    { id: "tech", label: "Coding & Tech", icon: Code },
    { id: "business", label: "Business & Management", icon: Briefcase },
    { id: "high school", label: "K-12 & Secondary", icon: School },
    { id: "design", label: "Creative & Design", icon: Palette },
    { id: "vocational", label: "Vocational Trades", icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ======================================================== */}
      {/* 1. HERO SECTION (Clean Pastel Aura + Visual Composition) */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef7fd] via-[#f7faff] to-white pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-slate-100">
        {/* Soft background ambient glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Heading & Calls to Action */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#0078d4] text-xs font-semibold shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#0078d4]" />
                <span>Verified Hybrid Learning Platform</span>
              </div>

              {/* Main Headline with Clean Curved Underline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
                  Professionalize <br />
                  yourself in <br />
                  <span className="relative inline-block text-slate-900">
                    either field
                    {/* Hand-drawn style clean curved blue underline matching reference design */}
                    <svg
                      className="absolute -bottom-2.5 left-0 w-full h-3.5 text-[#0078d4] pointer-events-none"
                      viewBox="0 0 200 12"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M3 9C60 2 140 2 197 9"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed pt-2">
                  Backpack helps you gain real-world skills for in-demand careers.
                  Over 1,000+ interactive courses, live HD classrooms, and accredited
                  certifications for individuals and academic institutions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-[#5b5fc7] hover:bg-[#4d51b3] shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                </Link>

                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#0078d4] bg-white border border-blue-200 hover:bg-blue-50/60 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[#0078d4]">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </div>
                  <span>Watch Video</span>
                </Link>
              </div>

              {/* Search Bar (Coursera/Udemy Style) */}
              <form onSubmit={handleHeroSearch} className="pt-2 max-w-xl">
                <div className="relative flex items-center rounded-full bg-white border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-[#0078d4] focus-within:border-transparent p-1.5 transition-all">
                  <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                  <input
                    type="text"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    placeholder="Search by topic, skill, school or curriculum..."
                    className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent border-none focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#0078d4] hover:bg-blue-700 rounded-full transition-colors shrink-0"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Visual Composition with Hero Student & Floating Badges */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              {/* Central Circle Graphic Backdrop */}
              <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] flex items-center justify-center">
                {/* Indigo/Blue Ring Arch */}
                <div className="absolute inset-0 rounded-full border-[22px] sm:border-[28px] border-[#5b5fc7]/90 -rotate-12 transition-transform duration-700 hover:rotate-0" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50" />

                {/* Hero Student Photo */}
                <div className="relative z-10 w-[88%] h-[88%] rounded-full overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src={heroStudentImg}
                    alt="Backpack Student learning with laptop"
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Minimalist Geometric Sparkles (Matching reference mockup) */}
                <Sparkles className="absolute -top-2 left-6 w-5 h-5 text-[#5b5fc7] animate-pulse" />
                <div className="absolute top-1/2 -right-3 w-4 h-4 rounded-full border-2 border-[#0078d4]" />
                <div className="absolute -bottom-2 left-16 w-3 h-3 bg-[#5b5fc7] rotate-45" />

                {/* Floating Pill Badge 1: 1k+ Total Courses (Top-Left) */}
                <div className="absolute -top-2 -left-4 sm:top-8 sm:-left-8 z-20 bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-full px-4 py-2 flex items-center gap-2.5 transform -translate-y-2 hover:translate-y-0 transition-transform">
                  <div className="w-6 h-6 rounded-full bg-[#5b5fc7] flex items-center justify-center text-white shadow-xs">
                    <Play className="w-3 h-3 fill-white ml-0.5" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-900">1k+</span>
                    <span className="text-slate-500 font-medium">Total Courses</span>
                  </div>
                </div>

                {/* Floating Pill Badge 2: 42k+ Learners (Bottom-Right) */}
                <div className="absolute -bottom-3 -right-2 sm:bottom-6 sm:-right-6 z-20 bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 transform translate-y-1 hover:translate-y-0 transition-transform">
                  <div className="flex -space-x-2">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=face"
                      alt="Learner"
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face"
                      alt="Learner"
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face"
                      alt="Learner"
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                    />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">42k+</span>{" "}
                    <span className="text-slate-500 font-medium">Learners</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof Brand Logos Strip (Matching reference mockup bottom bar) */}
        <div className="max-w-6xl mx-auto px-4 mt-14 sm:mt-20 pt-8 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-20 text-slate-400 font-bold text-lg sm:text-xl tracking-wide select-none">
            <span className="hover:text-slate-600 transition-colors lowercase font-mono">
              ûdemy
            </span>
            <span className="hover:text-slate-600 transition-colors font-mono tracking-tighter">
              [code<span className="font-normal">cademy</span>]
            </span>
            <span className="hover:text-slate-600 transition-colors uppercase tracking-wider text-base font-black">
              SKILL<span className="font-light">SHARE.</span>
            </span>
            <span className="hover:text-slate-600 transition-colors font-serif lowercase italic text-2xl font-normal">
              teachable
            </span>
            <span className="hover:text-slate-600 transition-colors lowercase font-sans font-semibold tracking-tight text-xl">
              coursera
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. TOP FIELDS & CATEGORIES (Clean Discovery Pills)       */}
      {/* ======================================================== */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Explore Top Categories
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose from hundreds of structured curriculums taught by industry experts
            </p>
          </div>

          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0078d4] hover:text-blue-800 transition-colors group"
          >
            <span>Browse All Courses</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  isSelected
                    ? "bg-[#5b5fc7] text-white shadow-sm shadow-indigo-500/20"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-500"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. FEATURED COURSES & PROGRAMS (Coursera / Udemy Style)  */}
      {/* ======================================================== */}
      <section className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Popular Courses
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Highest rated courses and cohorts by active learners
              </p>
            </div>
            <Link
              to="/explore"
              className="text-xs font-semibold text-[#0078d4] hover:underline"
            >
              See all ({popularCourses.length})
            </Link>
          </div>

          {displayCourses.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                No courses found in this category
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Explore other categories or view all available programs.
              </p>
              <button
                onClick={() => setSelectedCategory("all")}
                className="mt-4 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#0078d4]"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayCourses.map((course) => {
                const org = organizations.find(
                  (o) => o.id === course.orgId || o.ownerId === course.orgId,
                );

                return (
                  <div
                    key={course.id}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Course Thumbnail */}
                      <div className="relative h-44 bg-slate-100 overflow-hidden">
                        {course.coverImageUrl ? (
                          <img
                            src={course.coverImageUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-50 to-indigo-50 text-[#0078d4]">
                            <BookOpen className="w-12 h-12 stroke-[1.5]" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs capitalize">
                          {course.qualificationType || "All Levels"}
                        </span>
                        {course.qualificationTitle && (
                          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white shadow-xs backdrop-blur-xs">
                            {course.qualificationTitle}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <h3 className="font-bold text-slate-900 group-hover:text-[#0078d4] transition-colors line-clamp-2 text-base">
                          {course.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {course.description ||
                            "Gain hands-on skills, complete milestone assessments, and earn an accredited certificate."}
                        </p>

                        {/* Instructor / Org */}
                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                          <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {org?.logoUrl ? (
                              <img
                                src={org.logoUrl}
                                alt={org.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-100 text-[#0078d4] font-bold text-[9px]">
                                {(org?.name || course.instructorName || "B")[0]}
                              </div>
                            )}
                          </div>
                          <span className="truncate">
                            {org?.name || course.instructorName || "Backpack Academy"}
                          </span>
                        </div>

                        {/* Ratings & Lessons */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>{course.rating || "4.9"}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <span>{course.modules?.length || 8} Modules</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Users className="w-3 h-3" />
                            <span>{course.studentMetrics?.enrolledCount || 120}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer & Price */}
                    <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900">
                        {course.price && course.price > 0
                          ? `${course.currency || "NGN"} ${formatPriceWithDecimals(course.price)}`
                          : "Free"}
                      </div>

                      <Link
                        to={`/course/${course.id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold text-[#0078d4] bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <span>View Program</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. NON-PROFIT VOCATIONAL SPONSORSHIPS (Social Impact)     */}
      {/* ======================================================== */}
      {displayNonProfit.length > 0 && (
        <section className="py-14 sm:py-20 bg-slate-50/80 border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tuition-Free Vocational Education</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Sponsor a Student’s Future
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Through Backpack’s 100% transparent sponsorship pool, individuals and
                  philanthropic partners fund student seats in high-demand technical trades.
                </p>
              </div>

              <Link
                to="/explore"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 self-start md:self-auto"
              >
                View all non-profit tracks →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {displayNonProfit.map((course) => {
                const tuitionCost = course.tuitionCostPerStudent || 50000;
                const targetSeats = course.donationTargetAmount
                  ? Math.max(1, Math.round(course.donationTargetAmount / tuitionCost))
                  : 50;
                const sponsoredSeats = course.totalDonationsReceived
                  ? Math.floor(course.totalDonationsReceived / tuitionCost)
                  : 24;
                const progressPct = Math.min(
                  100,
                  Math.round((sponsoredSeats / targetSeats) * 100),
                );

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          100% Tuition Waived
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Target: {targetSeats} seats
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {course.description ||
                          "Accredited trade program preparing disadvantaged youth with practical certifications and toolkits."}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            {sponsoredSeats} of {targetSeats} seats funded
                          </span>
                          <span className="font-bold text-emerald-600">
                            {progressPct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 mt-6 flex items-center gap-3">
                      <button
                        onClick={() => setDonatingCourse(course)}
                        className="w-full py-2.5 px-4 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>Sponsor A Seat</span>
                      </button>

                      <Link
                        to={`/course/${course.id}`}
                        className="py-2.5 px-4 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 5. BACKPACK FOR SCHOOLS & EDUCATORS (Real Front-End Feat)*/}
      {/* ======================================================== */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            A Complete Learning Suite for Modern Schools
          </h2>
          <p className="text-base text-slate-600">
            Everything your school, university, or independent academy needs to run
            high-impact hybrid classrooms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Live HD Classrooms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0078d4] flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Interactive Live Classrooms
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Host low-latency HD video sessions with integrated screen sharing, interactive
              chat, and instant cloud recordings accessible to all enrolled students.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0078d4]" />
                <span>One-click join without downloading external software</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0078d4]" />
                <span>Multi-speaker layout & automatic noise reduction</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Digital Gradebook & Attendance */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5b5fc7] flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Digital Gradebook & Attendance
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Track student presence automatically during live lectures, grade assignments,
              and generate beautiful term report cards with complete transcript history.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5b5fc7]" />
                <span>Automated roll call and participation tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5b5fc7]" />
                <span>Exportable CSV and PDF report cards</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Seamless Payments & Certifications */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Certifications & Direct Settle
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Issue verifiable digital certificates upon course completion. Receive 100% of
              tuition settled directly into your institutional bank account with automated split logic.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Instant QR-code verifiable certificates</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Split payments settled into your local bank</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. HOW IT WORKS (Simple 3-Step Process)                  */}
      {/* ======================================================== */}
      <section className="py-14 sm:py-20 bg-gradient-to-b from-white via-slate-50/50 to-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How Backpack Works
            </h2>
            <p className="text-sm text-slate-500">
              Get started in three simple steps — whether you are learning or teaching
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0078d4] font-bold flex items-center justify-center text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Choose Your Curriculum
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore our catalog across tech, business, and secondary schooling. Enroll
                with card, bank transfer, or apply for tuition sponsorship.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-[#5b5fc7] font-bold flex items-center justify-center text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Join Interactive Sessions
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Attend scheduled live video classes, collaborate with peers, complete
                practical assignments, and track your progress in real time.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 font-bold flex items-center justify-center text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Graduate & Advance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive verifiable digital certificates, share your credentials on LinkedIn,
                and unlock job opportunities or advance your academic degree.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. TESTIMONIALS (Clean Human Stories)                   */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Loved by Learners & Educators
          </h2>
          <p className="text-sm text-slate-500">
            Hear from students and school leaders using Backpack every day
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &quot;The live classrooms load seamlessly even on moderate mobile data. Being
              able to rewatch lectures and access gradebooks has elevated our school’s
              remote engagement.&quot;
            </p>
            <div className="flex items-center gap-3 pt-2">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face"
                alt="Amara K."
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Amara K.</h4>
                <p className="text-[11px] text-slate-500">Computer Science Student</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &quot;As an academy director, setting up courses and having tuition split
              directly into our corporate bank account without manual delays has saved us
              hundreds of hours of admin work.&quot;
            </p>
            <div className="flex items-center gap-3 pt-2">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face"
                alt="David O."
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Dr. David O.</h4>
                <p className="text-[11px] text-slate-500">Principal, Apex Academy</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &quot;The sponsored vocational program gave me the opportunity to learn solar
              installation at zero cost. I passed my exam, received my certificate, and got hired
              within a month.&quot;
            </p>
            <div className="flex items-center gap-3 pt-2">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face"
                alt="Emmanuel B."
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Emmanuel B.</h4>
                <p className="text-[11px] text-slate-500">Solar Engineering Graduate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. CALL TO ACTION BANNER (Soft Pastel Card)               */}
      {/* ======================================================== */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 rounded-3xl border border-blue-200/60 p-8 sm:p-14 text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Ready to start learning?
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Join thousands of students and top institutions growing their skills on Backpack.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/explore"
              className="px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-[#5b5fc7] hover:bg-[#4d51b3] shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              Explore Courses Free
            </Link>
            <Link
              to="/onboard"
              className="px-8 py-3.5 rounded-full text-sm font-semibold text-[#0078d4] bg-white border border-blue-200 hover:bg-blue-50 transition-all"
            >
              Register Your School
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. FOOTER (Clean 4-Column Layout)                        */}
      {/* ======================================================== */}
      <footer className="border-t border-slate-200 bg-slate-50/60 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#0078d4] text-white flex items-center justify-center font-bold text-sm">
                  B
                </div>
                <span className="font-bold text-slate-900 text-base">Backpack</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Empowering the future of education with live virtual classrooms, accredited
                courses, and unified school management.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
                Learn
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <Link to="/explore" className="hover:text-[#0078d4]">
                    Browse Courses
                  </Link>
                </li>
                <li>
                  <Link to="/explore?category=tech" className="hover:text-[#0078d4]">
                    Coding & Tech
                  </Link>
                </li>
                <li>
                  <Link to="/explore?category=vocational" className="hover:text-[#0078d4]">
                    Vocational Trades
                  </Link>
                </li>
                <li>
                  <Link to="/explore?category=high%20school" className="hover:text-[#0078d4]">
                    K-12 Schooling
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
                Institutions
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <Link to="/onboard" className="hover:text-[#0078d4]">
                    Register School
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-[#0078d4]">
                    School Portal
                  </Link>
                </li>
                <li>
                  <Link to="/upload-course" className="hover:text-[#0078d4]">
                    Course Builder
                  </Link>
                </li>
                <li>
                  <Link to="/live-classes" className="hover:text-[#0078d4]">
                    Live Classrooms
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
                Platform
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <Link to="/about" className="hover:text-[#0078d4]">
                    About Backpack
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-[#0078d4]">
                    Pricing & Plans
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#0078d4]">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 Backpack Education. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-[#0078d4]">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-[#0078d4]">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Donation Modal for Sponsored Vocational Programs */}
      {donatingCourse && (
        <CourseDonationModal
          course={donatingCourse}
          onClose={() => setDonatingCourse(null)}
        />
      )}
    </div>
  );
};

export default Home;
