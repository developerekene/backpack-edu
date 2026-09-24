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
  HeartHandshake
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
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading institution profile...</p>
      </div>
    );
  }

  // Not Found / Deleted State
  if (error || !orgData || orgData.isDeleted) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-6 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
          <Building className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Organization Profile Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
          The educational institution profile you requested does not exist or has been modified.
        </p>
        <button
          onClick={() => onBack ? onBack() : navigate('/explore')}
          className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-16 space-y-8 animate-in fade-in duration-300">
      {/* Navigation & Owner Action Bar */}
      <div className="flex items-center justify-between px-2">
        {showBackButton && (
          <button
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="inline-flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        )}

        {isOwner && (
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setIsCustomizing(true)}
              className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition transform active:scale-95"
              style={{ backgroundColor: activeTheme.primary }}
            >
              <Palette className="w-4 h-4 mr-2" /> Customize Webpage Theme
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================================
          1. HEADER BANNER
          ========================================================================================= */}
      <div 
        className="rounded-3xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xl text-center relative"
        style={{
          background: `linear-gradient(135deg, ${activeTheme.primary}ee, #0f172a 90%)`
        }}
      >
        {/* Subtle Decorative Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        <div className="relative z-10 py-12 px-6 sm:px-12 flex flex-col items-center">
          {/* Institutional Crest / Emblem */}
          <div className="relative mb-6">
            <div 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1 shadow-2xl flex items-center justify-center border-2 border-white/20 bg-slate-900/80 backdrop-blur-md transform transition hover:scale-105"
            >
              {orgData.logoUrl ? (
                <img 
                  src={orgData.logoUrl} 
                  alt={`${orgData.name} Crest`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-2xl p-2"
                />
              ) : (
                <div 
                  className="w-full h-full rounded-2xl flex flex-col items-center justify-center text-white"
                  style={{ backgroundColor: `${activeTheme.primary}99` }}
                >
                  <Building className="w-10 h-10 mb-1 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/80">EST. ACADEMY</span>
                </div>
              )}
            </div>

            {orgData.isAccredited && (
              <div 
                className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-900"
                title="Accredited Institution"
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Institutional Name */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase max-w-4xl font-serif">
            {orgData.name}
          </h1>

          {/* Tagline / Motto */}
          {orgData.motto ? (
            <p className="mt-3 text-base sm:text-lg italic text-slate-200/90 font-medium max-w-2xl">
              &ldquo;{orgData.motto}&rdquo;
            </p>
          ) : null}

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              {orgData.orgType === 'higher' ? 'Higher Education' : orgData.orgType === 'vocational' ? 'Vocational Institute' : 'Basic Education Academy'}
            </span>

            {orgData.isAccredited ? (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm">
                <Award className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Accredited {orgData.accreditingBody ? `by ${orgData.accreditingBody}` : 'Institution'}
              </span>
            ) : (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 backdrop-blur-sm">
                Accreditation: {orgData.accreditationStatus || 'Standard'}
              </span>
            )}

            {orgData.location && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-300" />
                {orgData.location}
              </span>
            )}

            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
              <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-300" />
              {orgData.baseCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================================
          2 & 3. TWO-COLUMN CONTENT GRID (Main Column Left + Sidebar Panel Right)
          ========================================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* =========================================================================================
            2. MAIN COLUMN (Left)
            ========================================================================================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* [ ABOUT OUR INSTITUTION ] */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h2 
                className="text-lg sm:text-xl font-bold tracking-wide uppercase flex items-center"
                style={{ color: activeTheme.primary }}
              >
                [ ABOUT OUR INSTITUTION ]
              </h2>
            </div>
            
            {/* Themed Accent Divider */}
            <div 
              className="h-1 w-20 rounded-full my-4"
              style={{ backgroundColor: activeTheme.accent }}
            ></div>

            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 font-normal">
              {orgData.description ? (
                <p>{orgData.description}</p>
              ) : (
                <p className="text-slate-400 italic">No description provided yet.</p>
              )}
            </div>
          </div>

          {/* [ ACADEMIC HIGHLIGHTS ] */}
          {displayHighlights.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <h2 
                  className="text-lg sm:text-xl font-bold tracking-wide uppercase flex items-center"
                  style={{ color: activeTheme.primary }}
                >
                  [ ACADEMIC HIGHLIGHTS ]
                </h2>
              </div>

              {/* Themed Accent Divider */}
              <div 
                className="h-1 w-20 rounded-full my-4"
                style={{ backgroundColor: activeTheme.accent }}
              ></div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {displayHighlights.map((highlight, idx) => (
                  <li 
                    key={idx} 
                    className="flex items-start p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 mt-0.5"
                      style={{ backgroundColor: `${activeTheme.accent}20`, color: activeTheme.accent }}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 sticky top-6">
            
            <div>
              <h2 
                className="text-lg font-bold tracking-wide uppercase"
                style={{ color: activeTheme.primary }}
              >
                [ CAMPUS DIRECTORY ]
              </h2>
              {/* Themed Accent Divider */}
              <div 
                className="h-1 w-16 rounded-full my-3"
                style={{ backgroundColor: activeTheme.accent }}
              ></div>
            </div>

            {/* 📧 Phone, Address, Web Portal */}
            {orgData.phone && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Front Desk Phone
                </span>
                <a 
                  href={`tel:${orgData.phone}`}
                  className="text-sm font-bold text-slate-900 dark:text-white hover:underline"
                >
                  {orgData.phone}
                </a>
              </div>
            )}

            {/* 📍 Campus Address */}
            {orgData.address && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Campus Address
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {orgData.address}
                </p>
                {orgData.location && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {orgData.location}
                  </p>
                )}
              </div>
            )}

            {/* 🌐 Official Web Portal */}
            {orgData.website && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-sky-500" /> Official Web Portal
                </span>
                <a
                  href={orgData.website.startsWith('http') ? orgData.website : `https://${orgData.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-md"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  Visit Official Portal <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </a>
              </div>
            )}

            {/* 🛡️ Verification Proof */}
            {orgData.accreditationDocUrl && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verified Institutional Credential</span>
                </div>
                <a
                  href={orgData.accreditationDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center space-x-3">
              <h2 
                className="text-xl sm:text-2xl font-bold tracking-wide uppercase flex items-center"
                style={{ color: activeTheme.primary }}
              >
                [ 4. COURSES FEED ]
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {courses.length} Available
              </span>
            </div>
            {/* Themed Accent Divider */}
            <div 
              className="h-1 w-20 rounded-full my-2"
              style={{ backgroundColor: activeTheme.accent }}
            ></div>
          </div>

          {/* Search & Qualification Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={selectedQualType}
              onChange={(e) => setSelectedQualType(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
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
          <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              {courses.length === 0 ? "No Courses Currently Published" : "No Matching Courses Found"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {courses.length === 0 
                ? "This institution has not yet listed active courses in its public catalog."
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

              return (
                <div 
                  key={course.id}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between transition hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {course.qualificationTitle ? (
                        <span 
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: `${activeTheme.primary}15`, color: activeTheme.primary }}
                        >
                          <GraduationCap className="w-3.5 h-3.5 mr-1" />
                          {course.qualificationTitle}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Track</span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isOpen
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        }`}>
                          {isOpen ? (
                            <><DoorOpen className="w-3 h-3 mr-1" /> Admission Open ({course.activeSessionName || 'Current'})</>
                          ) : (
                            <><DoorClosed className="w-3 h-3 mr-1" /> Admission Closed</>
                          )}
                        </span>

                        {course.paymentTerms === 'installment' && (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Installments
                          </span>
                        )}
                      </div>
                    </div>

                    <h3
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition line-clamp-2 cursor-pointer"
                      title="View Course Details"
                    >
                      {course.title}
                    </h3>

                    {course.instructorName && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Instructor: <span className="font-semibold text-slate-700 dark:text-slate-300">{course.instructorName}</span>
                      </p>
                    )}

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                      {course.description}
                    </p>

                    {course.requirements && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Prerequisites:</span>
                        <span className="line-clamp-2">{course.requirements}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Tuition Fee</span>
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {course.price > 0 ? `${course.currency || orgData.baseCurrency} ${formatPriceWithDecimals(getEffectivePrice(course.price))}` : "Free Admission"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isDonationFundedVocational(course) && (
                        <button
                          onClick={() => setDonatingCourse(course)}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-white transition shadow-md hover:opacity-90 active:scale-95 bg-emerald-600"
                        >
                          <HeartHandshake className="w-3.5 h-3.5 mr-1" /> Donate/Sponsor
                        </button>
                      )}
                      {currentUser?.role === 'organization' || currentUser?.accountType === 'organization' ? (
                        <button
                          onClick={() => navigate(`/course/${course.id}`)}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md hover:opacity-90 active:scale-95"
                          style={{ backgroundColor: activeTheme.primary }}
                        >
                          {course.orgId === currentUser.id || course.orgId === `org_${currentUser.id}` || isOwner ? (
                            <>View Classroom <BookOpen className="w-3.5 h-3.5 ml-1.5" /></>
                          ) : (
                            <>View Details <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                          )}
                        </button>
                      ) : status === 'approved' ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                          <ShieldCheck className="w-4 h-4 mr-1.5" /> Enrolled
                        </span>
                      ) : status === 'pending' ? (
                        <span className="inline-flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                          Pending Review
                        </span>
                      ) : activeInvite ? (
                        <button
                          onClick={() => setJoiningInvite({ course, invite: activeInvite })}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md hover:opacity-90 active:scale-95 bg-emerald-600"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Accept & Join
                        </button>
                      ) : isRejected ? (
                        isOpen ? (
                          <button
                            onClick={() => {
                              if (!currentUser) {
                                navigate('/login');
                                return;
                              }
                              if (currentUser.role === 'organization' || currentUser.accountType === 'organization') {
                                alert("Only student and instructor accounts can apply for courses.");
                                return;
                              }
                              setEnrollModalCourse(course);
                            }}
                            disabled={isEnrolling}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md hover:opacity-90 active:scale-95 bg-indigo-600"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reapply
                          </button>
                        ) : (
                          <span className="inline-flex items-center text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                            Admissions Closed
                          </span>
                        )
                      ) : !isOpen ? (
                        <button
                          disabled
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 cursor-not-allowed"
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
                            if (currentUser.role === 'organization' || currentUser.accountType === 'organization') {
                              alert("Only student and instructor accounts can apply for courses.");
                              return;
                            }
                            setEnrollModalCourse(course);
                          }}
                          disabled={isEnrolling}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md hover:opacity-90 active:scale-95"
                          style={{ backgroundColor: activeTheme.primary }}
                        >
                          Apply <Send className="w-3.5 h-3.5 ml-1.5" />
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
        className="rounded-3xl border border-slate-200 dark:border-slate-700/80 p-8 text-center text-slate-500 dark:text-slate-400 space-y-4"
        style={{
          borderTop: `4px solid ${activeTheme.primary}`,
          backgroundColor: `${activeTheme.light}10`
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
          <span>© {new Date().getFullYear()} {orgData.name}. All rights reserved.</span>
          <span>•</span>
          <span>{orgData.address || "Main Academic Campus"}</span>
          {orgData.location && (
            <>
              <span>•</span>
              <span>{orgData.location}</span>
            </>
          )}
          {orgData.isAccredited && (
            <>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Officially Accredited Institution
              </span>
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
          Powered by Backpack Pan-African Educational Infrastructure. Verified organization credentials stored on-chain & in decentralized user backpacks.
        </p>
      </footer>

      {/* =========================================================================================
          OWNER THEME CUSTOMIZER DRAWER / MODAL
          ========================================================================================= */}
      {isCustomizing && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customise Webpage Theme</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure your public institutional colors, motto & highlights</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCustomizing(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomizations} className="space-y-5">
              
              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
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
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                          isSelected 
                            ? 'border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/30' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="w-6 h-6 rounded-full shadow-inner border border-white/20"
                            style={{ backgroundColor: theme.primary }}
                          />
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tagline / Motto */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Institutional Motto / Tagline
                </label>
                <input
                  type="text"
                  value={customMotto}
                  onChange={(e) => setCustomMotto(e.target.value)}
                  placeholder="e.g. Excellence in Education, Integrity in Life"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Crest / Logo URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Crest / Logo Image URL
                </label>
                <input
                  type="url"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  placeholder="https://example.com/crest.png"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Campus Directory Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Front Desk Phone
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Web Portal Link
                  </label>
                  <input
                    type="text"
                    value={customWebsite}
                    onChange={(e) => setCustomWebsite(e.target.value)}
                    placeholder="https://portal.stjude.edu"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Academic Highlights */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Highlights (One per line)
                </label>
                <textarea
                  rows={4}
                  value={customHighlights}
                  onChange={(e) => setCustomHighlights(e.target.value)}
                  placeholder="Advanced STEM Track Academy&#10;Accredited International Diploma&#10;Global Mentorship & Practical Labs"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* About Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  About Our Institution Narrative
                </label>
                <textarea
                  rows={3}
                  value={customAbout}
                  onChange={(e) => setCustomAbout(e.target.value)}
                  placeholder="Describe your campus environment, facilities, mentors and vision..."
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {saveSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Webpage Theme and Profile Updated Successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTheme}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition flex items-center disabled:opacity-50"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  {isSavingTheme ? "Saving Changes..." : "Save Webpage Theme"}
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
