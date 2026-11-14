import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import {
  Building,
  MapPin,
  Search,
  GraduationCap,
  Award,
  ShieldCheck,
  BookOpen,
  Send,
  User,
  Users,
  Trash2,
  ChevronRight,
  X,
  UserCheck,
  HeartHandshake,
  Briefcase,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EnrollmentModal } from "../components/EnrollmentModal";
import { CourseJoinModal } from "../components/CourseJoinModal";
import { CourseDonationModal } from "../components/CourseDonationModal";
import { CustomAlert } from "../components/CustomAlert";
import { KnowledgeCityBanner } from "../components/instructor/KnowledgeCityBanner";
import { Course, Organization, OrgMember } from "../../types";
import { generateId } from "../../lib/id";
import { getEffectivePrice, formatPriceWithDecimals } from "../../lib/price";

interface ExploreInstructor {
  id: string;
  userId?: string;
  name: string;
  email: string;
  orgIds: string[];
  department?: string;
  headline?: string;
  bio?: string;
  location?: string;
  kycVerified?: boolean;
}

const orgMatchesId = (org: Organization, candidateOrgId?: string) => {
  if (!candidateOrgId) return false;
  return (
    org.id === candidateOrgId ||
    org.ownerId === candidateOrgId ||
    `org_${org.ownerId}` === candidateOrgId ||
    org.id === `org_${candidateOrgId}`
  );
};

const ExploreOrgs = () => {
  const {
    organizations,
    courses,
    orgMembers,
    enrollmentRequests,
    allUsers,
    isLoadingApp,
    refreshData,
    addEnrollmentRequest,
    deleteOrganization,
  } = useAppContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || searchParams.get("type");

  const [activeTab, setActiveTab] = useState<
    "courses" | "organizations" | "instructors"
  >("courses");

  // Refresh backend catalog & instructor accounts on page visit
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQualType, setSelectedQualType] = useState<string>("all");
  const [onlyAccredited, setOnlyAccredited] = useState(false);
  const [selectedInstructorFilter, setSelectedInstructorFilter] =
    useState<string>("all");
  const [programTypeFilter, setProgramTypeFilter] = useState<
    "all" | "popular" | "non-profit"
  >(
    filterParam === "non-profit"
      ? "non-profit"
      : filterParam === "popular"
        ? "popular"
        : "all",
  );

  // Modal State
  const [enrollModalCourse, setEnrollModalCourse] = useState<Course | null>(
    null,
  );
  const [donatingCourse, setDonatingCourse] = useState<Course | null>(null);
  const [joiningInvite, setJoiningInvite] = useState<{
    course: Course;
    invite: OrgMember;
  } | null>(null);

  const isDonationFundedVocational = (c: Course) => {
    const org = organizations.find((o) => orgMatchesId(o, c.orgId));
    const isVocationalOrg = org ? org.orgType === "vocational" : true;
    return c.fundingModel === "donations_sponsorships" && isVocationalOrg;
  };
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
    type: "info",
  });

  // Active (non-deleted) Organizations
  const activeOrganizations = useMemo(() => {
    return organizations.filter((org) => !org.isDeleted);
  }, [organizations]);

  // Helper to check if a course belongs to an ExploreInstructor
  const courseBelongsToInstructor = (
    course: Course,
    inst: ExploreInstructor,
  ) => {
    const normalizedInstName = inst.name.trim().toLowerCase();
    const courseInstName = course.instructorName?.trim().toLowerCase();

    if (
      course.instructorId &&
      (course.instructorId === inst.id ||
        (inst.userId && course.instructorId === inst.userId))
    ) {
      return true;
    }
    if (courseInstName && courseInstName === normalizedInstName) {
      return true;
    }
    if (Array.isArray(course.instructors)) {
      return course.instructors.some((entry) => {
        const clean = String(entry || "").trim().toLowerCase();
        return (
          clean === inst.id.toLowerCase() ||
          (inst.userId ? clean === inst.userId.toLowerCase() : false) ||
          clean === normalizedInstName ||
          (inst.email ? clean === inst.email.toLowerCase() : false)
        );
      });
    }
    return false;
  };

  // Unified Instructor Directory fetched from backend user accounts (`allUsers`),
  // organization memberships (`orgMembers`), and course instructor assignments (`courses`)
  const activeInstructors = useMemo<ExploreInstructor[]>(() => {
    const instructorMap = new Map<string, ExploreInstructor>();
    const emailToKey = new Map<string, string>();
    const blockedUserIds = new Set<string>();
    const blockedEmails = new Set<string>(["ekenehq@gmail.com"]);

    // Track suspended/deleted or super_admin accounts so they never surface
    allUsers.forEach((u) => {
      const emailLower = (u.email || "").trim().toLowerCase();
      if (
        u.isDeleted ||
        u.isSuspended ||
        u.role === "super_admin" ||
        emailLower === "ekenehq@gmail.com"
      ) {
        if (u.id) blockedUserIds.add(u.id);
        if (emailLower) blockedEmails.add(emailLower);
      }
    });

    // 1. Registered backend instructor accounts from `backpack` collection
    allUsers.forEach((u) => {
      const emailLower = (u.email || "").trim().toLowerCase();
      if (
        u.role !== "instructor" ||
        u.isDeleted ||
        u.isSuspended ||
        emailLower === "ekenehq@gmail.com"
      ) {
        return;
      }
      const key = u.id;
      const entry: ExploreInstructor = {
        id: u.id,
        userId: u.id,
        name: u.name || "Instructor",
        email: u.email || "",
        orgIds: u.orgId ? [u.orgId] : [],
        headline: u.headline,
        bio: u.bio,
        location: u.location,
        kycVerified: u.kycVerified,
      };
      instructorMap.set(key, entry);
      if (emailLower) emailToKey.set(emailLower, key);
    });

    // 2. Organization-onboarded instructors from `orgMembers`
    orgMembers.forEach((m) => {
      if (m.role !== "instructor") return;
      const emailLower = (m.email || "").trim().toLowerCase();
      if (
        blockedEmails.has(emailLower) ||
        blockedUserIds.has(m.id) ||
        (m.userId && blockedUserIds.has(m.userId))
      ) {
        return;
      }

      // Check if linked org is explicitly deleted; keep if linked to active org or standalone
      const isExplicitlyDeletedOrg = organizations.some(
        (o) => o.isDeleted && orgMatchesId(o, m.orgId),
      );
      if (isExplicitlyDeletedOrg) return;

      const existingKey =
        (m.userId && instructorMap.has(m.userId) ? m.userId : undefined) ||
        (instructorMap.has(m.id) ? m.id : undefined) ||
        (emailLower ? emailToKey.get(emailLower) : undefined);

      if (existingKey) {
        const existing = instructorMap.get(existingKey)!;
        if (m.orgId && !existing.orgIds.includes(m.orgId)) {
          existing.orgIds = [...existing.orgIds, m.orgId];
        }
        if (!existing.department && m.department) {
          existing.department = m.department;
        }
      } else {
        const key = m.userId || m.id;
        instructorMap.set(key, {
          id: key,
          userId: m.userId,
          name: m.name || "Instructor",
          email: m.email || "",
          orgIds: m.orgId ? [m.orgId] : [],
          department: m.department,
        });
        if (emailLower) emailToKey.set(emailLower, key);
      }
    });

    // 3. Enrich with course-assigned instructors
    courses.forEach((c) => {
      if (c.instructorId && blockedUserIds.has(c.instructorId)) return;
      if (!c.instructorId && !c.instructorName) return;

      const cleanName = (c.instructorName || "").trim();
      const matchedEntry = Array.from(instructorMap.values()).find(
        (inst) =>
          (c.instructorId &&
            (inst.id === c.instructorId || inst.userId === c.instructorId)) ||
          (cleanName &&
            inst.name.trim().toLowerCase() === cleanName.toLowerCase()),
      );

      if (matchedEntry) {
        if (c.orgId && !matchedEntry.orgIds.includes(c.orgId)) {
          matchedEntry.orgIds = [...matchedEntry.orgIds, c.orgId];
        }
        if (!matchedEntry.headline && c.instructorTitle) {
          matchedEntry.headline = c.instructorTitle;
        }
        if (!matchedEntry.bio && c.instructorBio) {
          matchedEntry.bio = c.instructorBio;
        }
      } else if (cleanName) {
        const key = c.instructorId || `course_inst_${cleanName.toLowerCase()}`;
        instructorMap.set(key, {
          id: key,
          userId: c.instructorId,
          name: cleanName,
          email: "",
          orgIds: c.orgId ? [c.orgId] : [],
          headline: c.instructorTitle,
          bio: c.instructorBio,
        });
      }
    });

    return Array.from(instructorMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [allUsers, orgMembers, organizations, courses]);

  // Filtered Instructors (for Instructors tab search)
  const filteredInstructors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeInstructors;

    return activeInstructors.filter((inst) => {
      const instOrgs = activeOrganizations.filter((o) =>
        inst.orgIds.some((cid) => orgMatchesId(o, cid)),
      );
      const instCourses = courses.filter((c) =>
        courseBelongsToInstructor(c, inst),
      );

      return (
        inst.name.toLowerCase().includes(q) ||
        inst.headline?.toLowerCase().includes(q) ||
        inst.department?.toLowerCase().includes(q) ||
        inst.bio?.toLowerCase().includes(q) ||
        inst.location?.toLowerCase().includes(q) ||
        instOrgs.some((o) => o.name.toLowerCase().includes(q)) ||
        instCourses.some((c) => c.title.toLowerCase().includes(q))
      );
    });
  }, [activeInstructors, activeOrganizations, courses, searchQuery]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    const selectedInst =
      selectedInstructorFilter !== "all"
        ? activeInstructors.find(
            (i) =>
              i.id === selectedInstructorFilter ||
              i.name === selectedInstructorFilter,
          )
        : undefined;

    return courses.filter((course) => {
      // Match org if present
      const org = activeOrganizations.find((o) =>
        orgMatchesId(o, course.orgId),
      );

      // Search query check
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesTitle = course.title.toLowerCase().includes(q);
        const matchesDesc = course.description.toLowerCase().includes(q);
        const matchesQual = course.qualificationTitle
          ?.toLowerCase()
          .includes(q);
        const matchesOrg = org ? org.name.toLowerCase().includes(q) : false;
        const matchesInst = course.instructorName?.toLowerCase().includes(q);
        if (
          !matchesTitle &&
          !matchesDesc &&
          !matchesQual &&
          !matchesOrg &&
          !matchesInst
        ) {
          return false;
        }
      }

      // Qualification Type check
      if (selectedQualType !== "all") {
        if (course.qualificationType !== selectedQualType) return false;
      }

      // Accreditation filter check
      if (onlyAccredited) {
        if (!org?.isAccredited) return false;
      }

      // Instructor filter check
      if (selectedInstructorFilter !== "all") {
        if (selectedInst) {
          if (!courseBelongsToInstructor(course, selectedInst)) return false;
        } else if (
          course.instructorId !== selectedInstructorFilter &&
          course.instructorName !== selectedInstructorFilter
        ) {
          return false;
        }
      }

      // Program Type filter check (Popular vs Non-Profit)
      if (programTypeFilter === "non-profit") {
        const isNonProfitVocational =
          course.fundingModel === "donations_sponsorships" &&
          (org?.orgType === "vocational" || !org);
        if (!isNonProfitVocational) return false;
      } else if (programTypeFilter === "popular") {
        const isNonProfitVocational =
          course.fundingModel === "donations_sponsorships" &&
          (org?.orgType === "vocational" || !org);
        if (isNonProfitVocational) return false;
      }

      return true;
    });
  }, [
    courses,
    activeOrganizations,
    activeInstructors,
    searchQuery,
    selectedQualType,
    onlyAccredited,
    selectedInstructorFilter,
    programTypeFilter,
  ]);

  // Filtered Organizations
  const filteredOrganizations = useMemo(() => {
    return activeOrganizations.filter((org) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = org.name.toLowerCase().includes(q);
        const matchesDesc = org.description.toLowerCase().includes(q);
        const matchesLoc = org.location?.toLowerCase().includes(q);
        const matchesAccr = org.accreditingBody?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLoc && !matchesAccr)
          return false;
      }
      if (onlyAccredited && !org.isAccredited) return false;
      return true;
    });
  }, [activeOrganizations, searchQuery, onlyAccredited]);

  // Enrollment status lookup
  const getEnrollmentStatus = (courseId: string) => {
    if (!currentUser) return null;
    const req = enrollmentRequests.find(
      (r) => r.userId === currentUser.id && r.courseId === courseId,
    );
    return req?.status;
  };

  const handleEnroll = async (
    course: Course,
    paymentMethod?: "one-time" | "installment",
    documents?: Record<string, string>,
    additionalDocs?: Array<{ id: string; name: string; url: string }>,
    notes?: string,
  ) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
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
      appliedAt: new Date().toISOString(),
    });
    setEnrollModalCourse(null);
  };

  const handleDeleteOrg = (
    e: React.MouseEvent,
    orgId: string,
    orgName: string,
  ) => {
    e.stopPropagation();
    setAlertConfig({
      isOpen: true,
      title: "Delete Organization Permanently?",
      message: `Are you sure you want to delete "${orgName}"? Deleted organizations will no longer appear in the catalog.`,
      type: "danger",
      onConfirm: async () => {
        await deleteOrganization(orgId);
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const searchPlaceholder =
    activeTab === "courses"
      ? "Search courses by title, qualification, or instructor..."
      : activeTab === "organizations"
        ? "Search organizations by name, location, or accreditation..."
        : "Search instructors by name, specialty, department, or location...";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10 sm:pb-12">
      {/* Knowledge City Marketplace Banner (Explore button disabled on this page) */}
      {currentUser?.role !== "organization" && (
        <KnowledgeCityBanner
          variant={
            currentUser?.role === "instructor" ? "instructor" : "student"
          }
          disableExploreButton={true}
        />
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1.5 sm:mb-2">
          Explore & Learn
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base lg:text-lg max-w-3xl leading-relaxed">
          Search accredited courses, browse by instructors, and discover top
          educational institutions across Africa.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 border-b border-[#d6e9f8] dark:border-[#1e3a52] pb-4">
        <div className="flex flex-wrap sm:inline-flex items-center gap-1.5 bg-[#f0f7fd] dark:bg-[#132838] p-1.5 rounded-2xl border border-[#d6e9f8] dark:border-[#1e3a52] w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`flex-1 sm:flex-initial flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold font-heading text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "courses"
                ? "bg-[#0078d4] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-[#0078d4] dark:hover:text-[#04a4ec]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span>Courses ({courses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("organizations")}
            className={`flex-1 sm:flex-initial flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold font-heading text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "organizations"
                ? "bg-[#0078d4] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-[#0078d4] dark:hover:text-[#04a4ec]"
            }`}
          >
            <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span>Organizations ({activeOrganizations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("instructors")}
            className={`flex-1 sm:flex-initial flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold font-heading text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "instructors"
                ? "bg-[#0078d4] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-[#0078d4] dark:hover:text-[#04a4ec]"
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span>Instructors ({activeInstructors.length})</span>
          </button>
        </div>

        {/* Filter Count summary */}
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-heading">
          Showing{" "}
          {activeTab === "courses"
            ? filteredCourses.length
            : activeTab === "organizations"
              ? filteredOrganizations.length
              : filteredInstructors.length}{" "}
          items
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-[#0f2231] p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* Primary Search Input */}
          <div
            className={`relative ${
              activeTab === "courses"
                ? "sm:col-span-2 lg:col-span-4"
                : activeTab === "organizations"
                  ? "sm:col-span-2 md:col-span-1 lg:col-span-9"
                  : "sm:col-span-2 lg:col-span-12"
            }`}
          >
            <Search className="absolute left-3.5 top-3 sm:top-3.5 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-[#f8fafd] dark:bg-[#132838] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-3 sm:top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter: Program Model (Courses tab) */}
          {activeTab === "courses" && (
            <div className="sm:col-span-1 lg:col-span-2">
              <select
                value={programTypeFilter}
                onChange={(e) =>
                  setProgramTypeFilter(
                    e.target.value as "all" | "popular" | "non-profit",
                  )
                }
                className="w-full bg-[#f8fafd] dark:bg-[#132838] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-sm font-semibold font-heading"
              >
                <option value="all">All Course Models</option>
                <option value="popular">Popular Courses</option>
                <option value="non-profit">Non-Profit Courses</option>
              </select>
            </div>
          )}

          {/* Filter: Qualification Type (Courses tab) */}
          {activeTab === "courses" && (
            <div
              className={`sm:col-span-1 ${
                activeInstructors.length > 0 ? "lg:col-span-2" : "lg:col-span-3"
              }`}
            >
              <select
                value={selectedQualType}
                onChange={(e) => setSelectedQualType(e.target.value)}
                className="w-full bg-[#f8fafd] dark:bg-[#132838] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-sm"
              >
                <option value="all">All Qualifications</option>
                <option value="bachelors">Bachelor's Degree</option>
                <option value="masters">Master's Degree</option>
                <option value="doctorate">Doctorate Degree</option>
                <option value="diploma">Diploma</option>
                <option value="certificate">Certificate</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          )}

          {/* Filter: Instructors (Courses tab) */}
          {activeTab === "courses" && activeInstructors.length > 0 && (
            <div className="sm:col-span-1 lg:col-span-2">
              <select
                value={selectedInstructorFilter}
                onChange={(e) => setSelectedInstructorFilter(e.target.value)}
                className="w-full bg-[#f8fafd] dark:bg-[#132838] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-sm"
              >
                <option value="all">All Instructors</option>
                {activeInstructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Accreditation Checkbox Toggle (Courses & Organizations tabs) */}
          {activeTab !== "instructors" && (
            <div
              className={`flex items-center ${
                activeTab === "courses"
                  ? activeInstructors.length > 0
                    ? "sm:col-span-1 lg:col-span-2"
                    : "sm:col-span-1 lg:col-span-3"
                  : "sm:col-span-2 md:col-span-1 lg:col-span-3"
              }`}
            >
              <label className="flex items-center space-x-2 cursor-pointer bg-[#f8fafd] dark:bg-[#132838] px-3.5 py-2.5 sm:py-3 rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] w-full justify-center">
                <input
                  type="checkbox"
                  checked={onlyAccredited}
                  onChange={(e) => setOnlyAccredited(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0078d4] focus:ring-[#0078d4] border-slate-300 dark:border-slate-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" />{" "}
                  Accredited Only
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: DIRECT COURSE SEARCH */}
      {activeTab === "courses" && (
        <div>
          {filteredCourses.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                No courses match your search
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Try adjusting your filters or search keywords.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedQualType("all");
                  setOnlyAccredited(false);
                  setSelectedInstructorFilter("all");
                  setProgramTypeFilter("all");
                }}
                className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-sm font-bold transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredCourses.map((course) => {
                const org = activeOrganizations.find((o) =>
                  orgMatchesId(o, course.orgId),
                );
                const status = getEnrollmentStatus(course.id);
                const activeInvite =
                  currentUser?.role === "student"
                    ? orgMembers.find(
                        (m) =>
                          m.email?.toLowerCase() ===
                            currentUser?.email?.toLowerCase() &&
                          m.status === "invited" &&
                          (m.courseIds?.includes(course.id) ||
                            m.orgId === course.orgId),
                      )
                    : null;

                return (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-[#0f2231] rounded-2xl sm:rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] hover:border-[#0078d4] transition shadow-xs p-4 sm:p-6 flex flex-col justify-between group min-w-0"
                  >
                    <div className="min-w-0">
                      {/* Badges Bar */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {course.qualificationTitle ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-[#d6e9f8]/60 dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] rounded-full text-xs font-bold border border-[#b8daf4] dark:border-[#254b68] max-w-full truncate">
                            <GraduationCap className="w-3 h-3 mr-1 shrink-0" />{" "}
                            <span className="truncate">
                              {course.qualificationTitle}
                            </span>
                          </span>
                        ) : course.qualificationType ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-[#d6e9f8]/60 dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] rounded-full text-xs font-bold border border-[#b8daf4] dark:border-[#254b68] uppercase">
                            {course.qualificationType}
                          </span>
                        ) : null}

                        {org?.isAccredited && (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                            <Award className="w-3 h-3 mr-1 text-emerald-500 shrink-0" />{" "}
                            Accredited
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white mb-2 group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition line-clamp-2 cursor-pointer"
                        title="View Course Details"
                      >
                        {course.title}
                      </h3>

                      {/* Institution & Instructor Meta */}
                      <div className="space-y-1 mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {org && (
                          <div className="flex items-center min-w-0">
                            <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                            <span
                              className="hover:underline cursor-pointer font-semibold text-slate-700 dark:text-slate-300 truncate"
                              onClick={() => navigate(`/org/${org.id}`)}
                            >
                              {org.name}
                            </span>
                          </div>
                        )}
                        {course.instructorName && (
                          <div className="flex items-center min-w-0">
                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              Instructor: {course.instructorName}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                        {course.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#d6e9f8] dark:border-[#1e3a52] flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading">
                            {course.price > 0
                              ? `${course.currency} ${formatPriceWithDecimals(getEffectivePrice(course.price))}`
                              : "Free"}
                          </div>
                          {course.paymentTermsAllowed === "installment" ||
                          course.paymentTermsAllowed === "both" ? (
                            <div className="text-[10px] uppercase font-semibold text-[#0078d4] dark:text-[#04a4ec]">
                              Installments Available
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/course/${course.id}`)}
                            className="px-3.5 py-2 bg-[#f0f7fd] hover:bg-[#e2f0fb] dark:bg-[#132838] dark:hover:bg-[#1a384f] text-slate-700 dark:text-slate-200 border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl text-xs font-semibold transition cursor-pointer font-heading"
                            title="View Course Details"
                          >
                            Details
                          </button>
                          {status === "approved" ? (
                            <span className="text-emerald-500 text-xs font-bold flex items-center bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20">
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0" />{" "}
                              Enrolled
                            </span>
                          ) : status === "pending" ? (
                            <span className="text-amber-500 text-xs font-bold px-3.5 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                              Pending Review
                            </span>
                          ) : activeInvite ? (
                            <button
                              type="button"
                              onClick={() =>
                                setJoiningInvite({ course, invite: activeInvite })
                              }
                              className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-xs cursor-pointer font-heading"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1.5 shrink-0" />{" "}
                              Accept & Join
                            </button>
                          ) : (
                            <button
                              type="button"
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
                                setEnrollModalCourse(course);
                              }}
                              className="px-3.5 sm:px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold font-heading transition flex items-center shadow-xs cursor-pointer"
                            >
                              Apply <Send className="w-3.5 h-3.5 ml-1.5 shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Donate / Sponsor Button Placed Below Details & Apply */}
                      {isDonationFundedVocational(course) && (
                        <button
                          type="button"
                          onClick={() => setDonatingCourse(course)}
                          className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition flex flex-wrap items-center justify-center gap-1 shadow-xs cursor-pointer group/btn"
                        >
                          <HeartHandshake className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/btn:scale-110 transition-transform shrink-0" />
                          <span>Donate / Sponsor Students</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            (Non-Profit)
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ORGANIZATIONS (EXCLUDES DELETED) */}
      {activeTab === "organizations" && (
        <div>
          {filteredOrganizations.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
              <Building className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                No organizations found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No active organizations match your search filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredOrganizations.map((org) => {
                const orgCourseCount = courses.filter((c) =>
                  orgMatchesId(org, c.orgId),
                ).length;
                const isOwner = currentUser?.id === org.ownerId;

                return (
                  <div
                    key={org.id}
                    className="bg-white dark:bg-[#0f2231] rounded-2xl sm:rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] hover:border-[#0078d4] hover:ring-2 hover:ring-[#0078d4]/20 transition-all cursor-pointer shadow-xs group p-4 sm:p-6 flex flex-col justify-between min-w-0"
                    onClick={() => navigate(`/org/${org.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#d6e9f8]/60 dark:bg-[#1a384f] rounded-2xl flex items-center justify-center group-hover:bg-[#0078d4] transition-colors shrink-0">
                          <Building className="w-5 h-5 sm:w-6 sm:h-6 text-[#0078d4] dark:text-[#04a4ec] group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex items-center gap-2">
                          {org.isAccredited && (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center">
                              <Award className="w-3.5 h-3.5 mr-1 shrink-0" />{" "}
                              Accredited
                            </span>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDeleteOrg(e, org.id, org.name)
                              }
                              title="Delete Organization"
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white mb-2 group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition line-clamp-2">
                        {org.name}
                      </h3>

                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {org.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center min-w-0">
                        <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span className="truncate">
                          {org.location || "Africa"}
                        </span>
                      </div>
                      <div className="flex items-center text-[#0078d4] dark:text-[#04a4ec] font-bold shrink-0">
                        <span>{orgCourseCount} Courses</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: EXPLORE BY INSTRUCTORS */}
      {activeTab === "instructors" && (
        <div>
          {isLoadingApp && activeInstructors.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-[#0f2231] rounded-2xl sm:rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] p-4 sm:p-6 animate-pulse space-y-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : filteredInstructors.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                {searchQuery.trim()
                  ? "No instructors match your search"
                  : "No instructor accounts available yet"}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                {searchQuery.trim()
                  ? "Try clearing or adjusting your search keywords."
                  : "Registered instructors and teaching staff will appear here."}
              </p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredInstructors.map((inst) => {
                const instOrgs = activeOrganizations.filter((o) =>
                  inst.orgIds.some((cid) => orgMatchesId(o, cid)),
                );
                const primaryOrg = instOrgs[0];
                const instCourses = courses.filter((c) =>
                  courseBelongsToInstructor(c, inst),
                );

                return (
                  <div
                    key={inst.id}
                    className="bg-white dark:bg-[#0f2231] rounded-2xl sm:rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] hover:border-[#0078d4] transition shadow-xs p-4 sm:p-6 flex flex-col justify-between min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3 mb-3 sm:mb-4">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#0078d4] rounded-full flex items-center justify-center font-bold text-white text-base sm:text-lg shrink-0">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-bold font-heading text-base sm:text-lg text-slate-900 dark:text-white truncate">
                              {inst.name}
                            </h3>
                            {inst.kycVerified && (
                              <span
                                title="Verified Instructor"
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0"
                              >
                                <ShieldCheck className="w-3 h-3 mr-0.5" />
                                Verified
                              </span>
                            )}
                          </div>
                          {inst.headline && (
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                              {inst.headline}
                            </p>
                          )}
                          {primaryOrg && (
                            <button
                              type="button"
                              onClick={() => navigate(`/org/${primaryOrg.id}`)}
                              className="text-xs text-[#0078d4] dark:text-[#04a4ec] font-medium flex items-center hover:underline mt-0.5 max-w-full cursor-pointer"
                            >
                              <Building className="w-3 h-3 mr-1 shrink-0" />
                              <span className="truncate">
                                {primaryOrg.name}
                                {instOrgs.length > 1
                                  ? ` +${instOrgs.length - 1}`
                                  : ""}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {(inst.department || inst.location) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {inst.department && (
                            <span className="inline-flex items-center text-xs bg-[#f0f7fd] dark:bg-[#132838] px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-medium border border-[#d6e9f8] dark:border-[#1e3a52] max-w-full">
                              <Briefcase className="w-3 h-3 mr-1 text-[#0078d4] shrink-0" />
                              <span className="truncate">{inst.department}</span>
                            </span>
                          )}
                          {inst.location && (
                            <span className="inline-flex items-center text-xs bg-[#f0f7fd] dark:bg-[#132838] px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-medium border border-[#d6e9f8] dark:border-[#1e3a52] max-w-full">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                              <span className="truncate">{inst.location}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {inst.bio && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                          {inst.bio}
                        </p>
                      )}

                      <div className="mt-3">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                          Courses Taught ({instCourses.length})
                        </h4>
                        {instCourses.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            No courses assigned yet.
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {instCourses.slice(0, 4).map((c) => (
                              <li
                                key={c.id}
                                onClick={() => navigate(`/course/${c.id}`)}
                                className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center hover:text-[#0078d4] dark:hover:text-[#04a4ec] cursor-pointer min-w-0"
                              >
                                <BookOpen className="w-3 h-3 mr-1.5 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
                                <span className="truncate">{c.title}</span>
                              </li>
                            ))}
                            {instCourses.length > 4 && (
                              <li className="text-[11px] font-medium text-slate-400">
                                +{instCourses.length - 4} more courses
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#d6e9f8] dark:border-[#1e3a52] mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInstructorFilter(inst.id);
                          setActiveTab("courses");
                        }}
                        className="w-full py-2.5 px-3 bg-[#f0f7fd] hover:bg-[#e2f0fb] dark:bg-[#132838] dark:hover:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl text-xs font-bold font-heading transition flex items-center justify-center gap-1 cursor-pointer min-w-0"
                      >
                        <span className="truncate">
                          Filter Courses by {inst.name}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ENROLLMENT MODAL */}
      {enrollModalCourse && (
        <EnrollmentModal
          course={enrollModalCourse}
          onClose={() => setEnrollModalCourse(null)}
          onEnroll={(paymentMethod, documents) =>
            handleEnroll(enrollModalCourse, paymentMethod, documents)
          }
        />
      )}

      {/* DONATION MODAL */}
      {donatingCourse && (
        <CourseDonationModal
          course={donatingCourse}
          onClose={() => setDonatingCourse(null)}
        />
      )}

      {/* JOIN INVITATION MODAL */}
      {joiningInvite && (
        <CourseJoinModal
          course={joiningInvite.course}
          invite={joiningInvite.invite}
          onClose={() => setJoiningInvite(null)}
          onJoinSuccess={() => {
            setJoiningInvite(null);
            navigate("/dashboard");
          }}
        />
      )}

      {/* CUSTOM ALERT */}
      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ExploreOrgs;
