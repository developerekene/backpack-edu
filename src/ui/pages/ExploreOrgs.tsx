import { useState, useMemo } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EnrollmentModal } from "../components/EnrollmentModal";
import { CourseJoinModal } from "../components/CourseJoinModal";
import { KnowledgeCityBanner } from "../components/instructor/KnowledgeCityBanner";
import { Course, OrgMember } from "../../types";
import { generateId } from "../../lib/id";

const ExploreOrgs = () => {
  const {
    organizations,
    courses,
    orgMembers,
    enrollmentRequests,
    addEnrollmentRequest,
    deleteOrganization,
  } = useAppContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "courses" | "organizations" | "instructors"
  >("courses");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQualType, setSelectedQualType] = useState<string>("all");
  const [onlyAccredited, setOnlyAccredited] = useState(false);
  const [selectedInstructorFilter, setSelectedInstructorFilter] =
    useState<string>("all");

  // Modal State
  const [enrollModalCourse, setEnrollModalCourse] = useState<Course | null>(
    null,
  );
  const [joiningInvite, setJoiningInvite] = useState<{
    course: Course;
    invite: OrgMember;
  } | null>(null);

  // Active (non-deleted) Organizations
  const activeOrganizations = useMemo(() => {
    return organizations.filter((org) => !org.isDeleted);
  }, [organizations]);

  // Instructors across active organizations
  const activeInstructors = useMemo(() => {
    const activeOrgIds = new Set(activeOrganizations.map((o) => o.id));
    return orgMembers.filter(
      (m) => m.role === "instructor" && activeOrgIds.has(m.orgId),
    );
  }, [orgMembers, activeOrganizations]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Must belong to an active org
      const org = activeOrganizations.find(
        (o) => o.id === course.orgId || o.ownerId === course.orgId,
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
        if (
          course.instructorId !== selectedInstructorFilter &&
          course.instructorName !== selectedInstructorFilter
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    courses,
    activeOrganizations,
    searchQuery,
    selectedQualType,
    onlyAccredited,
    selectedInstructorFilter,
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

  const handleDeleteOrg = async (
    e: React.MouseEvent,
    orgId: string,
    orgName: string,
  ) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete "${orgName}"? Deleted organizations will no longer appear in the catalog.`,
      )
    ) {
      await deleteOrganization(orgId);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
      {/* Knowledge City Marketplace Banner */}
      {currentUser?.role !== "organization" && (
        <KnowledgeCityBanner
          variant={
            currentUser?.role === "instructor" ? "instructor" : "student"
          }
        />
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Explore & Learn
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Search accredited courses, browse by instructors, and discover top
          educational institutions across Africa.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex items-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "courses"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Search Courses (
            {courses.length})
          </button>
          <button
            onClick={() => setActiveTab("organizations")}
            className={`flex items-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "organizations"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building className="w-4 h-4 mr-2" /> Organizations (
            {activeOrganizations.length})
          </button>
          <button
            onClick={() => setActiveTab("instructors")}
            className={`flex items-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "instructors"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 mr-2" /> Instructors (
            {activeInstructors.length})
          </button>
        </div>

        {/* Filter Count summary */}
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing{" "}
          {activeTab === "courses"
            ? filteredCourses.length
            : activeTab === "organizations"
              ? filteredOrganizations.length
              : activeInstructors.length}{" "}
          items
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Primary Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "courses"
                  ? "Search courses by title, qualification, or instructor..."
                  : "Search organizations by name, location, or accreditation..."
              }
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-10 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter: Qualification Type (Courses tab) */}
          {activeTab === "courses" && (
            <div className="md:col-span-3">
              <select
                value={selectedQualType}
                onChange={(e) => setSelectedQualType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
            <div className="md:col-span-2">
              <select
                value={selectedInstructorFilter}
                onChange={(e) => setSelectedInstructorFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All Instructors</option>
                {activeInstructors.map((inst) => (
                  <option key={inst.id} value={inst.name}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Accreditation Checkbox Toggle */}
          <div className="md:col-span-2 flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900 px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 w-full justify-center">
              <input
                type="checkbox"
                checked={onlyAccredited}
                onChange={(e) => setOnlyAccredited(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
                <Award className="w-3.5 h-3.5 mr-1 text-emerald-500" />{" "}
                Accredited Only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* TAB CONTENT 1: DIRECT COURSE SEARCH */}
      {activeTab === "courses" && (
        <div>
          {filteredCourses.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No courses match your search
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Try adjusting your filters or search keywords.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedQualType("all");
                  setOnlyAccredited(false);
                  setSelectedInstructorFilter("all");
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-lg text-sm font-bold transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const org = activeOrganizations.find(
                  (o) => o.id === course.orgId || o.ownerId === course.orgId,
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
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition shadow-sm p-6 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Badges Bar */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {course.qualificationTitle ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20">
                            <GraduationCap className="w-3 h-3 mr-1" />{" "}
                            {course.qualificationTitle}
                          </span>
                        ) : course.qualificationType ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20 uppercase">
                            {course.qualificationType}
                          </span>
                        ) : null}

                        {org?.isAccredited && (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                            <Award className="w-3 h-3 mr-1 text-emerald-500" />{" "}
                            Accredited
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-500 transition line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Institution & Instructor Meta */}
                      <div className="space-y-1 mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {org && (
                          <div className="flex items-center">
                            <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            <span
                              className="hover:underline cursor-pointer font-semibold text-slate-700 dark:text-slate-300"
                              onClick={() => navigate(`/org/${org.id}`)}
                            >
                              {org.name}
                            </span>
                          </div>
                        )}
                        {course.instructorName && (
                          <div className="flex items-center">
                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            <span>Instructor: {course.instructorName}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                        {course.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {course.price > 0
                            ? `${course.currency} ${course.price}`
                            : "Free"}
                        </div>
                        {course.paymentTermsAllowed === "installment" ||
                        course.paymentTermsAllowed === "both" ? (
                          <div className="text-[10px] uppercase font-semibold text-indigo-500">
                            Installments Available
                          </div>
                        ) : null}
                      </div>

                      <div>
                        {status === "approved" ? (
                          <span className="text-emerald-500 text-xs font-bold flex items-center bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />{" "}
                            Enrolled
                          </span>
                        ) : status === "pending" ? (
                          <span className="text-amber-500 text-xs font-bold px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            Pending Review
                          </span>
                        ) : activeInvite ? (
                          <button
                            onClick={() =>
                              setJoiningInvite({ course, invite: activeInvite })
                            }
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center shadow-sm"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Accept
                            & Join
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (!currentUser) navigate("/login");
                              else setEnrollModalCourse(course);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition flex items-center shadow-sm"
                          >
                            Apply / Enroll{" "}
                            <Send className="w-3.5 h-3.5 ml-1.5" />
                          </button>
                        )}
                      </div>
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
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <Building className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No organizations found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No active organizations match your search filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrganizations.map((org) => {
                const orgCourseCount = courses.filter(
                  (c) => c.orgId === org.id || c.orgId === org.ownerId,
                ).length;
                const isOwner = currentUser?.id === org.ownerId;

                return (
                  <div
                    key={org.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all cursor-pointer shadow-sm group p-6 flex flex-col justify-between"
                    onClick={() => navigate(`/org/${org.id}`)}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                          <Building className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-slate-900 dark:text-white transition-colors" />
                        </div>
                        <div className="flex items-center space-x-2">
                          {org.isAccredited && (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center">
                              <Award className="w-3.5 h-3.5 mr-1" /> Accredited
                            </span>
                          )}
                          {isOwner && (
                            <button
                              onClick={(e) =>
                                handleDeleteOrg(e, org.id, org.name)
                              }
                              title="Delete Organization"
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-500 transition">
                        {org.name}
                      </h3>

                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {org.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1" />{" "}
                        {org.location || "Africa"}
                      </div>
                      <div className="flex items-center text-indigo-500 font-bold">
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
          {activeInstructors.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No instructors onboarded yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Instructors will appear here when onboarded to institutions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeInstructors.map((inst) => {
                const org = activeOrganizations.find(
                  (o) => o.id === inst.orgId,
                );
                const instCourses = courses.filter(
                  (c) =>
                    c.instructorId === inst.id ||
                    c.instructorName === inst.name,
                );

                return (
                  <div
                    key={inst.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-slate-900 dark:text-white text-lg">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {inst.name}
                          </h3>
                          {org && (
                            <div className="text-xs text-indigo-500 font-medium flex items-center">
                              <Building className="w-3 h-3 mr-1" /> {org.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {inst.department && (
                        <div className="text-xs bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 font-medium mb-3">
                          Department: {inst.department}
                        </div>
                      )}

                      <div className="mt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                          Courses Taught ({instCourses.length})
                        </h4>
                        {instCourses.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            No courses assigned yet.
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {instCourses.map((c) => (
                              <li
                                key={c.id}
                                className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center"
                              >
                                <BookOpen className="w-3 h-3 mr-1.5 text-indigo-400 flex-shrink-0" />
                                <span className="truncate">{c.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4">
                      <button
                        onClick={() => {
                          setSelectedInstructorFilter(inst.name);
                          setActiveTab("courses");
                        }}
                        className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition flex items-center justify-center"
                      >
                        Filter Courses by {inst.name}{" "}
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
    </div>
  );
};

export default ExploreOrgs;
