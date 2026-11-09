import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { Course, Organization, OrgMember } from "../../types";
import { EnrollmentModal } from "./EnrollmentModal";
import { CourseJoinModal } from "./CourseJoinModal";
import { CourseDonationModal } from "./CourseDonationModal";
import { getEffectivePrice, formatPriceWithDecimals } from "../../lib/price";
import { 
  Building, MapPin, Phone, Globe, Award, ShieldCheck, 
  BookOpen, Send, GraduationCap, ArrowLeft, Palette, 
  CheckCircle2, ExternalLink, FileText, Search, 
  DollarSign, Check, X, RotateCcw, DoorOpen, DoorClosed, UserCheck,
  HeartHandshake, ArrowRight
} from "lucide-react";

export interface OrgPublicProfileProps {
  orgUserId: string;
  initialOrg?: Organization;
  initialCourses?: Course[];
  showBackButton?: boolean;
  onBack?: () => void;
}

const PRESET_THEMES = [
  { id: "navy", name: "Academic Navy", primary: "#1e3a8a", accent: "#3b82f6", light: "#eff6ff" },
  { id: "burgundy", name: "Crimson Ivy", primary: "#881337", accent: "#e11d48", light: "#fff1f2" },
  { id: "emerald", name: "Forest Emerald", primary: "#065f46", accent: "#10b981", light: "#ecfdf5" },
  { id: "indigo", name: "Royal Indigo", primary: "#3730a3", accent: "#6366f1", light: "#eef2ff" },
  { id: "slate", name: "Classic Slate", primary: "#1e293b", accent: "#64748b", light: "#f8fafc" },
  { id: "purple", name: "Imperial Purple", primary: "#581c87", accent: "#a855f7", light: "#faf5ff" },
  { id: "amber", name: "Terracotta Gold", primary: "#92400e", accent: "#f59e0b", light: "#fffbeb" },
  { id: "teal", name: "Ocean Teal", primary: "#115e59", accent: "#14b8a6", light: "#f0fdf4" }
];

export const OrgPublicProfile: React.FC<OrgPublicProfileProps> = ({
  orgUserId,
  initialOrg,
  initialCourses,
  showBackButton = true,
  onBack
}) => {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuth();
  const { 
    organizations, 
    courses: allGlobalCourses, 
    enrollmentRequests, 
    orgMembers,
    addEnrollmentRequest, 
    updateOrganization 
  } = useAppContext();

  const [loading, setLoading] = useState<boolean>(!initialOrg);
  const [error, setError] = useState<string | null>(null);
  
  // Organization profile & courses fetched directly from backpack/{orgUserId}
  const [orgData, setOrgData] = useState<Organization | null>(initialOrg || null);
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  
  // Interaction states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQualType, setSelectedQualType] = useState<string>("all");
  const [enrollModalCourse, setEnrollModalCourse] = useState<Course | null>(null);
  const [donatingCourse, setDonatingCourse] = useState<Course | null>(null);
  const [joiningInvite, setJoiningInvite] = useState<{ course: Course; invite: OrgMember } | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  const isDonationFundedVocational = (c: Course) => {
    const isVocationalOrg = orgData ? orgData.orgType === "vocational" : true;
    return c.fundingModel === "donations_sponsorships" && isVocationalOrg;
  };

  // Customizer Drawer State (for org owner)
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customThemeId, setCustomThemeId] = useState<string>("navy");
  const [customMotto, setCustomMotto] = useState<string>("");
  const [customPhone, setCustomPhone] = useState<string>("");
  const [customWebsite, setCustomWebsite] = useState<string>("");
  const [customHighlights, setCustomHighlights] = useState<string>("");
  const [customAbout, setCustomAbout] = useState<string>("");
  const [customLogoUrl, setCustomLogoUrl] = useState<string>("");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  // Check if current user is the owner of this organization
  const isOwner = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.id === orgUserId || 
      currentUser.id === orgData?.ownerId || 
      currentUser.id === orgData?.id ||
      orgUserId === `org_${currentUser.id}` ||
      orgData?.id === `org_${currentUser.id}`
    );
  }, [currentUser, orgUserId, orgData]);

  // Real-time synchronization from Firestore backpack/{orgUserId}
  useEffect(() => {
    if (!orgUserId) return;
    
    // Resolve target UID if it has prefix 'org_'
    const actualUid = orgUserId.startsWith('org_') ? orgUserId.replace('org_', '') : orgUserId;
    const docRef = doc(db, "backpack", actualUid);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const rawData = docSnap.data();
          const userObj = Array.isArray(rawData.user) ? rawData.user[0] : (rawData.user || {});
          const personalInfo = (userObj.personalInformation as Record<string, unknown>) || {};

          const resolvedOrg: Organization = {
            id: (personalInfo.id as string) || docSnap.id,
            name: (personalInfo.fullname as string) || (personalInfo.name as string) || "Academic Institution",
            description: (personalInfo.description as string) || "",
            logoUrl: (personalInfo.logoUrl as string) || "",
            ownerId: (personalInfo.ownerId as string) || docSnap.id,
            baseCurrency: (personalInfo.baseCurrency as string) || "USD",
            location: (personalInfo.location as string) || "",
            orgType: (personalInfo.orgType as 'basic' | 'higher' | 'vocational') || "higher",
            kycVerified: (personalInfo.kycVerified as boolean) ?? false,
            kycDocumentUrl: (personalInfo.kycDocumentUrl as string) || "",
            address: (personalInfo.address as string) || "",
            registrationId: (personalInfo.registrationId as string) || "",
            isAccredited: (personalInfo.isAccredited as boolean) ?? false,
            accreditingBody: (personalInfo.accreditingBody as string) || "",
            accreditationStatus: (personalInfo.accreditationStatus as 'accredited' | 'pending' | 'unaccredited') || "unaccredited",
            accreditationDocUrl: (personalInfo.accreditationDocUrl as string) || "",
            motto: (personalInfo.motto as string) || "",
            phone: (personalInfo.phone as string) || "",
            website: (personalInfo.website as string) || "",
            themeColor: (personalInfo.themeColor as string) || "navy",
            academicHighlights: (personalInfo.academicHighlights as string[]) || [],
            isDeleted: (personalInfo.isDeleted as boolean) ?? false,
            paystackSubaccount: personalInfo.paystackSubaccount as Organization['paystackSubaccount']
          };

          const resolvedCourses: Course[] = Array.isArray(userObj.courses) ? userObj.courses : [];

          setOrgData(resolvedOrg);
          setCourses(resolvedCourses);

          // Populate customizer state
          setCustomThemeId(resolvedOrg.themeColor || "navy");
          setCustomMotto(resolvedOrg.motto || "");
          setCustomPhone(resolvedOrg.phone || "");
          setCustomWebsite(resolvedOrg.website || "");
          setCustomAbout(resolvedOrg.description || "");
          setCustomLogoUrl(resolvedOrg.logoUrl || "");
          setCustomHighlights(
            Array.isArray(resolvedOrg.academicHighlights) && resolvedOrg.academicHighlights.length > 0
              ? resolvedOrg.academicHighlights.join("\n")
              : ""
          );
          setError(null);
        } else {
          // Fallback check in AppContext state
          const matchInState = organizations.find(o => o.id === orgUserId || o.ownerId === orgUserId || o.id === actualUid);
          if (matchInState) {
            setOrgData(matchInState);
            const matchingCourses = allGlobalCourses.filter(c => c.orgId === matchInState.id || c.orgId === matchInState.ownerId);
            setCourses(matchingCourses);
            setCustomThemeId(matchInState.themeColor || "navy");
          } else {
            setError("Institution profile not found");
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching organization backpack data:", err);
        setError("Failed to load organization profile");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgUserId, organizations, allGlobalCourses]);

  // Selected Theme Color Scheme
  const activeTheme = useMemo(() => {
    const selected = PRESET_THEMES.find(t => t.id === (orgData?.themeColor || "navy"));
    return selected || PRESET_THEMES[0];
  }, [orgData?.themeColor]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.qualificationTitle?.toLowerCase().includes(q) ||
        course.instructorName?.toLowerCase().includes(q)
      );

      const matchesQual = selectedQualType === "all" || course.qualificationType === selectedQualType;
      return matchesSearch && matchesQual;
    });
  }, [courses, searchQuery, selectedQualType]);

  // Handle Enrollment
  const handleEnroll = async (
    courseId: string, 
    courseTitle: string, 
    paymentMethod?: 'one-time' | 'installment', 
    documents?: Record<string, string>
  ) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!orgData) return;

    setEnrollingCourseId(courseId);
    try {
      const reqId = `req_${Math.random().toString(36).substring(2, 15)}`;
      await addEnrollmentRequest({
        id: reqId,
        userId: currentUser.id,
        userName: currentUser.name,
        orgId: orgData.id || orgData.ownerId,
        courseId,
        courseTitle,
        status: 'pending',
        paymentMethod,
        documents
      });
    } finally {
      setEnrollingCourseId(null);
      setEnrollModalCourse(null);
    }
  };

  const getRequestStatus = (courseId: string) => {
    if (!currentUser) return null;
    const req = enrollmentRequests.find(r => r.userId === currentUser.id && r.courseId === courseId);
    return req?.status;
  };

  // Save Theme & Customizations to backpack/{orgUserId} -> user.personalInformation
  const handleSaveCustomizations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !orgData) return;
    setIsSavingTheme(true);

    try {
      const highlightsArray = customHighlights
        .split("\n")
        .map(h => h.trim().replace(/^[•\-*]\s*/, ""))
        .filter(Boolean);

      const updatesPayload: Partial<Organization> = {
        themeColor: customThemeId,
        motto: customMotto.trim(),
        phone: customPhone.trim(),
        website: customWebsite.trim(),
        description: customAbout.trim(),
        logoUrl: customLogoUrl.trim(),
        academicHighlights: highlightsArray
      };

      await updateOrganization(orgData.id, updatesPayload);
      
      if (currentUser?.id === orgData.ownerId || currentUser?.id === orgData.id) {
        await updateCurrentUser(updatesPayload);
      }

      setOrgData(prev => prev ? { ...prev, ...updatesPayload } : null);
      setSaveSuccessMessage(true);
      setTimeout(() => {
        setSaveSuccessMessage(false);
        setIsCustomizing(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to save organization webpage theme:", err);
      alert("Failed to save customizations. Please try again.");
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Academic Highlights (leave empty if not specified by organization)
  const displayHighlights = useMemo(() => {
    if (orgData?.academicHighlights && orgData.academicHighlights.length > 0) {
      return orgData.academicHighlights;
    }
    return [];
  }, [orgData]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4 font-body">
        <div className="w-10 h-10 border-4 border-[#0078d4] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading institution profile...</p>
      </div>
    );
  }

  // Not Found / Deleted State
  if (error || !orgData || orgData.isDeleted) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-6 text-center font-body">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-5 text-slate-400">
          <Building className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-heading">Organization Profile Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
          The educational institution profile you requested does not exist or has been modified.
        </p>
        <button
          onClick={() => onBack ? onBack() : navigate('/explore')}
          className="inline-flex items-center px-6 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition shadow-xs font-heading cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Navigation & Owner Action Bar */}
      <div className="flex items-center justify-between px-2 font-heading">
        {showBackButton && (
          <button
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="inline-flex items-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        )}

        {isOwner && (
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setIsCustomizing(true)}
              className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition cursor-pointer"
              style={{ backgroundColor: activeTheme.primary }}
            >
              <Palette className="w-4 h-4 mr-2" /> Customize Brand Profile
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================================
          1. HEADER BANNER
          ========================================================================================= */}
      <div 
        className="rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs text-center relative"
        style={{ backgroundColor: activeTheme.primary }}
      >
        <div className="relative z-10 py-12 px-6 sm:px-12 flex flex-col items-center">
          {/* Institutional Crest / Emblem */}
          <div className="relative mb-6">
            <div 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center border-4 border-white/20 bg-white shadow-md overflow-hidden"
            >
              {orgData.logoUrl ? (
                <img 
                  src={orgData.logoUrl} 
                  alt={`${orgData.name} Crest`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Building className="w-10 h-10 mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-widest font-heading">Academy</span>
                </div>
              )}
            </div>
            
            {orgData.isAccredited && (
              <div 
                className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-md border-2 border-white"
                title="Accredited Institution"
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Institutional Name */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight max-w-4xl font-heading">
            {orgData.name}
          </h1>

          {/* Tagline / Motto */}
          {orgData.motto ? (
            <p className="mt-3 text-sm sm:text-base italic text-white/90 font-medium max-w-2xl font-body">
              &ldquo;{orgData.motto}&rdquo;
            </p>
          ) : null}

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 font-heading">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              {orgData.orgType === 'higher' ? 'Higher Education' : orgData.orgType === 'vocational' ? 'Vocational Institute' : 'Basic Education Academy'}
            </span>

            {orgData.isAccredited ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/30 text-white backdrop-blur-md uppercase tracking-wider border border-emerald-400/30">
                <Award className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                Accredited {orgData.accreditingBody ? `by ${orgData.accreditingBody}` : 'Institution'}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Accreditation: {orgData.accreditationStatus || 'Standard'}
              </span>
            )}

            {orgData.location && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-300" />
                {orgData.location}
              </span>
            )}

            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-300" />
              {orgData.baseCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================================
          2 & 3. TWO-COLUMN CONTENT GRID (Main Column Left + Sidebar Panel Right)
          ========================================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* =========================================================================================
            2. MAIN COLUMN (Left)
            ========================================================================================= */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          
          {/* ABOUT OUR INSTITUTION */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xs">
            <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">
              About {orgData.name}
            </h2>
            
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-body">
              {orgData.description ? (
                <p>{orgData.description}</p>
              ) : (
                <p className="text-slate-400 italic">No description provided yet.</p>
              )}
            </div>
          </div>

          {/* ACADEMIC HIGHLIGHTS */}
          {displayHighlights.length > 0 && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xs">
              <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">
                Academic Highlights
              </h2>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayHighlights.map((highlight, idx) => (
                  <li 
                    key={idx} 
                    className="flex items-start p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-2xs font-body"
                  >
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center mr-3 shrink-0 mt-0.5"
                      style={{ backgroundColor: `${activeTheme.primary}20`, color: activeTheme.primary }}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* =========================================================================================
            3. SIDEBAR PANEL (Right)
            ========================================================================================= */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5 sticky top-6">
            
            <h2 className="text-base font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3">
              Campus Directory
            </h2>

            {/* Phone */}
            {orgData.phone && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 font-body">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-heading flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Front Desk Phone
                </span>
                <a 
                  href={`tel:${orgData.phone}`}
                  className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#0078d4] dark:hover:text-[#04a4ec] transition-colors"
                >
                  {orgData.phone}
                </a>
              </div>
            )}

            {/* Address */}
            {orgData.address && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 font-body">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-heading flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Campus Address
                </span>
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                  {orgData.address}
                </p>
                {orgData.location && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-bold">
                    {orgData.location}
                  </p>
                )}
              </div>
            )}

            {/* Website */}
            {orgData.website && (
              <div className="pt-2">
                <a
                  href={orgData.website.startsWith('http') ? orgData.website : `https://${orgData.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm hover:opacity-90 font-heading cursor-pointer"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  Visit Official Web Portal <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </a>
              </div>
            )}

            {/* Accreditation Doc */}
            {orgData.accreditationDocUrl && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 mt-4">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1.5 font-heading">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Verified Credentials</span>
                </div>
                <a
                  href={orgData.accreditationDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline font-heading"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> View Accreditation License
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================================
          4. COURSES FEED
          ========================================================================================= */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center">
              Program Catalog
              <span className="ml-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {courses.length} Available
              </span>
            </h2>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-slate-900 dark:text-white font-body shadow-2xs min-w-[200px]"
              />
            </div>

            <select
              value={selectedQualType}
              onChange={(e) => setSelectedQualType(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] font-body shadow-2xs appearance-none cursor-pointer"
            >
              <option value="all">All Qualifications</option>
              <option value="bachelors">Bachelors Degree</option>
              <option value="masters">Masters Degree</option>
              <option value="diploma">Diploma</option>
              <option value="certificate">Certificate</option>
              <option value="professional">Professional</option>
            </select>
          </div>
        </div>

        {/* Courses Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 font-heading">
              {courses.length === 0 ? "No Programs Available" : "No Matching Programs Found"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-body">
              {courses.length === 0 
                ? "This institution has not yet listed active programs in its public catalog."
                : "Try adjusting your search terms or qualification filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const status = getRequestStatus(course.id);
              const isEnrolling = enrollingCourseId === course.id;
              const activeInvite = currentUser?.role === 'student'
                ? orgMembers.find(m => 
                    m.email?.toLowerCase() === currentUser?.email?.toLowerCase() && 
                    m.status === 'invited' && 
                    (m.courseIds?.includes(course.id) || m.orgId === course.orgId || m.orgId === orgData?.id)
                  )
                : null;

              const isOpen = course.admissionStatus !== 'closed';
              const isRejected = status === 'rejected';
              const isNonProfit = isDonationFundedVocational(course);

              return (
                <div 
                  key={course.id}
                  className="group relative bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 opacity-90 transition-opacity" style={{ backgroundColor: activeTheme.primary }} />

                  <div className="p-5 flex flex-col flex-1 gap-4">
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        {course.qualificationTitle ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-heading bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {course.qualificationTitle}
                          </span>
                        ) : course.qualificationType ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-heading bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {course.qualificationType}
                          </span>
                        ) : null}

                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider font-heading px-2 py-0.5 rounded-md border ${
                          isOpen
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60'
                        }`}>
                          {isOpen ? (
                            <><DoorOpen className="w-3 h-3 mr-1" /> Open ({course.activeSessionName || 'Current'})</>
                          ) : (
                            <><DoorClosed className="w-3 h-3 mr-1" /> Closed</>
                          )}
                        </span>
                      </div>

                      <h3
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="text-lg font-bold text-slate-900 dark:text-white transition-colors line-clamp-2 cursor-pointer font-heading leading-snug"
                        style={{ ":hover": { color: activeTheme.primary } } as React.CSSProperties}
                        title="View Course Details"
                      >
                        {course.title}
                      </h3>

                      {course.instructorName && (
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 font-body">
                          Lead: <span className="font-bold text-slate-700 dark:text-slate-300">{course.instructorName}</span>
                        </p>
                      )}

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mt-3 font-body leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                    <div>
                      <div className="text-lg font-extrabold text-slate-900 dark:text-white font-heading truncate">
                        {course.price > 0 ? `${course.currency || orgData.baseCurrency} ${formatPriceWithDecimals(getEffectivePrice(course.price))}` : "Free Admission"}
                      </div>
                      {course.paymentTermsAllowed === 'installment' || course.paymentTermsAllowed === 'both' ? (
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-0.5 font-heading">
                          Installments Available
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="flex-1 min-w-[100px] px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold font-heading transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                        title="View Course Details"
                      >
                        Details
                      </button>
                      
                      {isNonProfit && (
                        <button
                          onClick={() => setDonatingCourse(course)}
                          className="flex-1 min-w-[100px] px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-heading transition flex items-center justify-center shadow-2xs shrink-0 cursor-pointer"
                        >
                          <HeartHandshake className="w-3.5 h-3.5 mr-1" /> Sponsor
                        </button>
                      )}

                      {currentUser?.role === 'organization' ? (
                        <button
                          onClick={() => navigate(`/course/${course.id}`)}
                          className="flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-bold text-white transition flex items-center justify-center shadow-2xs shrink-0 cursor-pointer"
                          style={{ backgroundColor: activeTheme.primary }}
                        >
                          {course.orgId === currentUser.id || course.orgId === `org_${currentUser.id}` || isOwner ? (
                            <>Classroom <BookOpen className="w-3.5 h-3.5 ml-1.5" /></>
                          ) : (
                            <>View <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                          )}
                        </button>
                      ) : status === 'approved' ? (
                        <span className="flex-1 min-w-[100px] text-emerald-600 dark:text-emerald-400 text-xs font-bold font-heading flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Enrolled
                        </span>
                      ) : status === 'pending' ? (
                        <span className="flex-1 min-w-[100px] text-amber-600 dark:text-amber-400 text-xs font-bold font-heading px-3 py-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-center">
                          Pending
                        </span>
                      ) : activeInvite ? (
                        <button
                          onClick={() => setJoiningInvite({ course, invite: activeInvite })}
                          className="flex-1 min-w-[100px] px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-heading transition flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Accept
                        </button>
                      ) : isRejected ? (
                        isOpen ? (
                          <button
                            onClick={() => {
                              if (!currentUser) {
                                navigate('/login');
                                return;
                              }
                              setEnrollModalCourse(course);
                            }}
                            disabled={isEnrolling}
                            className="flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-bold text-white transition flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                            style={{ backgroundColor: activeTheme.primary }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reapply
                          </button>
                        ) : (
                          <span className="flex-1 min-w-[100px] text-red-600 dark:text-red-400 text-[11px] font-bold font-heading px-3 py-2 bg-red-50 dark:bg-red-950/60 rounded-xl border border-red-200 dark:border-red-800/60 flex items-center justify-center uppercase tracking-wider">
                            Closed
                          </span>
                        )
                      ) : !isOpen ? (
                        <button
                          disabled
                          className="flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center font-heading"
                        >
                          <DoorClosed className="w-3.5 h-3.5 mr-1.5" /> Closed
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!currentUser) {
                              navigate('/login');
                              return;
                            }
                            setEnrollModalCourse(course);
                          }}
                          disabled={isEnrolling}
                          className="flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-bold text-white transition flex items-center justify-center shadow-2xs cursor-pointer shrink-0 font-heading"
                          style={{ backgroundColor: activeTheme.primary }}
                        >
                          Apply <Send className="w-3 h-3 ml-1.5" />
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

      {/* =========================================================================================
          5. FOOTER
          ========================================================================================= */}
      <footer 
        className="rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400 space-y-3 font-body shadow-xs bg-white dark:bg-slate-800/50"
        style={{ borderTop: `4px solid ${activeTheme.primary}` }}
      >
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-bold text-slate-600 dark:text-slate-300 font-heading">
          <span>© {new Date().getFullYear()} {orgData.name}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span>{orgData.address || "Main Academic Campus"}</span>
          {orgData.location && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{orgData.location}</span>
            </>
          )}
          {orgData.isAccredited && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Accredited Institution
              </span>
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
          Powered by Backpack Pan-African Educational Infrastructure. Verified organization credentials.
        </p>
      </footer>

      {/* =========================================================================================
          OWNER THEME CUSTOMIZER DRAWER / MODAL
          ========================================================================================= */}
      {isCustomizing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6 font-body">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Customize Brand Profile</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure your public institutional colors, motto & highlights</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCustomizing(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomizations} className="space-y-5">
              
              {/* Color Theme Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                  Select Brand Color Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_THEMES.map((theme) => {
                    const isSelected = customThemeId === theme.id;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setCustomThemeId(theme.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                          isSelected 
                            ? 'border-[#0078d4] dark:border-[#04a4ec] ring-2 ring-[#0078d4]/20 bg-[#d6e9f8]/30 dark:bg-[#0078d4]/10' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="w-5 h-5 rounded-full shadow-inner border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: theme.primary }}
                          />
                          {isSelected && <Check className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />}
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight font-heading">
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tagline / Motto */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                  Institutional Motto / Tagline
                </label>
                <input
                  type="text"
                  value={customMotto}
                  onChange={(e) => setCustomMotto(e.target.value)}
                  placeholder="e.g. Excellence in Education, Integrity in Life"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition"
                />
              </div>

              {/* Crest / Logo URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                  Crest / Logo Image URL
                </label>
                <input
                  type="url"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  placeholder="https://example.com/crest.png"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition"
                />
              </div>

              {/* Campus Directory Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                    Front Desk Phone
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                    Official Web Portal Link
                  </label>
                  <input
                    type="text"
                    value={customWebsite}
                    onChange={(e) => setCustomWebsite(e.target.value)}
                    placeholder="https://portal.stjude.edu"
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition"
                  />
                </div>
              </div>

              {/* Academic Highlights */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                  Academic Highlights (One per line)
                </label>
                <textarea
                  rows={4}
                  value={customHighlights}
                  onChange={(e) => setCustomHighlights(e.target.value)}
                  placeholder="Advanced STEM Track Academy&#10;Accredited International Diploma&#10;Global Mentorship & Practical Labs"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition resize-none"
                />
              </div>

              {/* About Text */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                  About Our Institution Narrative
                </label>
                <textarea
                  rows={3}
                  value={customAbout}
                  onChange={(e) => setCustomAbout(e.target.value)}
                  placeholder="Describe your campus environment, facilities, mentors and vision..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition resize-none"
                />
              </div>

              {saveSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center space-x-2 font-heading">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile Updated Successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTheme}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition flex items-center cursor-pointer disabled:opacity-50 font-heading"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  {isSavingTheme ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {enrollModalCourse && (
        <EnrollmentModal 
          course={enrollModalCourse} 
          onClose={() => setEnrollModalCourse(null)} 
          onEnroll={(paymentMethod, documents) => handleEnroll(enrollModalCourse.id, enrollModalCourse.title, paymentMethod, documents)} 
        />
      )}

      {/* Course Donation Modal */}
      {donatingCourse && (
        <CourseDonationModal
          course={donatingCourse}
          onClose={() => setDonatingCourse(null)}
        />
      )}

      {/* Join Invitation Modal */}
      {joiningInvite && (
        <CourseJoinModal
          course={joiningInvite.course}
          invite={joiningInvite.invite}
          onClose={() => setJoiningInvite(null)}
          onJoinSuccess={() => {
            setJoiningInvite(null);
            navigate('/dashboard');
          }}
        />
      )}
    </div>
  );
};