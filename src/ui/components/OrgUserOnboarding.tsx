import React, { useState, useEffect } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { UserPlus, UserCheck, GraduationCap, Briefcase, Trash2, Search, Mail, ShieldCheck, CheckCircle2, Upload, Award, X, ArrowRight, XCircle, Loader2 } from "lucide-react";
import { OrgMember, User as AppUser, Role } from "../../types";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { generateId } from "../../lib/id";

interface OrgUserOnboardingProps {
  courseId?: string;
}

export const OrgUserOnboarding: React.FC<OrgUserOnboardingProps> = ({ courseId }) => {
  const { currentUser } = useAuth();
  const { orgMembers, addOrgMember, deleteOrgMember, updateOrgMember, courses, organizations, updateCourse } = useAppContext();

  const [activeTab, setActiveTab] = useState<'instructors' | 'students'>('instructors');
  const [searchTerm, setSearchTerm] = useState("");

  // Registered App Users state (email-based privacy-preserving search)
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const [selectedAppUserId, setSelectedAppUserId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    status: boolean;
    user?: AppUser;
    email: string;
  } | null>(null);

  // Form State
  const ONBOARDING_DRAFT_KEY = "bp_draft_org_onboarding";

  const getOnboardingDraft = () => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
      }
    } catch (e) {
      console.error("Error reading onboarding draft", e);
    }
    return null;
  };

  const initialDraft = getOnboardingDraft();
  const [name, setName] = useState(() => initialDraft?.name || "");
  const [email, setEmail] = useState(() => initialDraft?.email || "");
  const [department, setDepartment] = useState(() => initialDraft?.department || "");
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || "");
  const [requiresPayment, setRequiresPayment] = useState(true);
  const [requiresDocuments, setRequiresDocuments] = useState(true);
  const [inviteNote, setInviteNote] = useState(() => initialDraft?.inviteNote || "");
  const [inviteError, setInviteError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save onboarding draft
  useEffect(() => {
    if (name.trim() || email.trim() || department.trim() || inviteNote.trim()) {
      localStorage.setItem(
        ONBOARDING_DRAFT_KEY,
        JSON.stringify({ name, email, department, inviteNote }),
      );
    }
  }, [name, email, department, inviteNote]);

  // Fetch registered users on Backpack from Firestore (excluding Super Admin & Organizations)
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      setLoadingRegisteredUsers(true);
      try {
        const snap = await getDocs(collection(db, 'backpack'));
        const usersList: AppUser[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          const userObj = Array.isArray(data.user) ? data.user[0] : data.user;
          const personalInfo = userObj?.personalInformation;
          const uEmail = String(personalInfo?.email || '').trim();
          const rawRole = String(personalInfo?.role || 'student').toLowerCase();
          const isSuperAdminAccount =
            rawRole === 'super_admin' || uEmail.toLowerCase() === 'ekenehq@gmail.com';
          const isOrgAccount = rawRole === 'organization' || rawRole === 'org_admin';

          if (personalInfo && doc.id !== currentUser?.id && !isSuperAdminAccount && !isOrgAccount) {
            usersList.push({
              id: doc.id,
              name: personalInfo.fullname || personalInfo.name || 'User',
              email: uEmail,
              role: (rawRole === 'instructor' ? 'instructor' : 'student') as Role,
              createdAt: personalInfo.createdAt || ''
            });
          }
        });
        setRegisteredUsers(usersList);
      } catch (err) {
        console.error("Error fetching registered users:", err);
      } finally {
        setLoadingRegisteredUsers(false);
      }
    };

    fetchRegisteredUsers();
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const currentOrgId = currentUser.role === 'organization' ? `org_${currentUser.id}` : 
    (orgMembers.find(m => m.email?.toLowerCase() === currentUser.email?.toLowerCase())?.orgId || "");
  
  const myOrg = organizations.find(o => o.id === currentOrgId || o.ownerId === currentUser.id);
  const orgType = myOrg?.orgType || 'basic';
  const classOrCourseText = orgType === 'basic' ? 'Class' : 'Course';

  // Filter members belonging to this org
  const orgStaff = orgMembers.filter(
    (m) => (m.orgId === currentOrgId || m.orgId === currentUser.id) && m.role === 'instructor'
  );

  const orgStudents = orgMembers.filter(
    (m) => (m.orgId === currentOrgId || m.orgId === currentUser.id) && m.role === 'student'
  );

  const myCourses = currentUser.role === 'organization' 
    ? courses.filter(c => c.orgId === currentUser.id || c.orgId === currentOrgId)
    : courses.filter(c => orgMembers.some(m => m.email?.toLowerCase() === currentUser.email?.toLowerCase() && m.courseIds?.includes(c.id)));

  // Search Platform Users by Email: Returns TRUE (if account found) or FALSE (if not found)
  // Only executed when the user explicitly clicks the Search button or presses Enter
  const handleSearchEmail = (queryToUse?: string) => {
    const raw = (queryToUse !== undefined ? queryToUse : emailSearchQuery).trim().toLowerCase();
    if (!raw) return;
    setInviteError("");
    setIsSearching(true);

    setTimeout(() => {
      // Prevent searching super admin or organization accounts
      if (raw === "ekenehq@gmail.com") {
        setSearchResult({ status: false, email: raw });
        setIsSearching(false);
        return;
      }

      const matched = registeredUsers.find(
        (u) =>
          u.email?.toLowerCase() === raw &&
          u.role !== "super_admin" &&
          u.role !== "organization" &&
          u.email?.toLowerCase() !== "ekenehq@gmail.com"
      );

      if (matched) {
        setSearchResult({
          status: true,
          user: matched,
          email: raw,
        });
      } else {
        // Check partial match if not exact match
        const partialMatched = registeredUsers.find(
          (u) =>
            u.email?.toLowerCase().includes(raw) &&
            u.role !== "super_admin" &&
            u.role !== "organization" &&
            u.email?.toLowerCase() !== "ekenehq@gmail.com"
        );
        if (partialMatched) {
          setSearchResult({
            status: true,
            user: partialMatched,
            email: raw,
          });
        } else {
          setSearchResult({
            status: false,
            email: raw,
          });
        }
      }
      setIsSearching(false);
    }, 150);
  };

  const handleOnboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setInviteError("");
    setIsSubmitting(true);
    const targetCourseId = selectedCourseId || courseId || "";
    const cleanEmail = email.trim().toLowerCase();

    // Prevent inviting super admin or organization accounts
    const matchedUser = registeredUsers.find(u => u.email?.toLowerCase() === cleanEmail);
    if (cleanEmail === 'ekenehq@gmail.com' || (matchedUser && (matchedUser.role === 'organization' || matchedUser.role === 'super_admin'))) {
      setInviteError("This account type cannot be invited to courses.");
      setIsSubmitting(false);
      return;
    }

    const resolvedUserId = selectedAppUserId || matchedUser?.id || undefined;

    const newMember: OrgMember = {
      id: generateId('member'),
      orgId: currentOrgId,
      userId: resolvedUserId,
      name: name.trim(),
      email: cleanEmail,
      role: activeTab === 'instructors' ? 'instructor' : 'student',
      department: department.trim() || (activeTab === 'instructors' ? 'General Faculty' : 'General Program'),
      courseIds: targetCourseId ? [targetCourseId] : [],
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'invited',
      requiresPayment: activeTab === 'students' ? requiresPayment : false,
      requiresDocuments: activeTab === 'students' ? requiresDocuments : false,
      inviteNote: inviteNote.trim() || undefined,
    };

    try {
      await addOrgMember(newMember);

      // If inviting an instructor to a specific course, automatically link the instructor to the course
      if (activeTab === 'instructors' && targetCourseId && updateCourse) {
        const targetCourse = courses.find((c) => c.id === targetCourseId);
        if (targetCourse) {
          const updates: Partial<typeof targetCourse> = {};
          if (!targetCourse.instructorName) {
            updates.instructorName = name.trim();
          }
          if (!targetCourse.instructorId && resolvedUserId) {
            updates.instructorId = resolvedUserId;
          }
          const prevInstructors = targetCourse.instructors || [];
          if (resolvedUserId && !prevInstructors.includes(resolvedUserId)) {
            updates.instructors = [...prevInstructors, resolvedUserId];
          }
          if (Object.keys(updates).length > 0) {
            await updateCourse(targetCourseId, updates);
          }
        }
      }

      setSuccessMsg(
        `Successfully sent course invite to ${name} (${cleanEmail})!`
      );
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      setName("");
      setEmail("");
      setDepartment("");
      setInviteNote("");
      setSelectedAppUserId("");
      if (!courseId) setSelectedCourseId("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error inviting member:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setIsSubmitting(false);
        return;
      }

      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let count = 0;
      const targetCourseId = selectedCourseId || courseId || "";

      for (const line of lines) {
        if (line.toLowerCase().includes('name,email')) continue;

        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const email = parts[1].trim().toLowerCase();

          const newMember: OrgMember = {
            id: generateId('member'),
            orgId: currentOrgId,
            name,
            email,
            role: activeTab === 'instructors' ? 'instructor' : 'student',
            department: activeTab === 'instructors' ? 'General Faculty' : 'General Program',
            courseIds: targetCourseId ? [targetCourseId] : [],
            joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'invited',
            requiresPayment: activeTab === 'students' ? requiresPayment : false,
            requiresDocuments: activeTab === 'students' ? requiresDocuments : false,
          };
          await addOrgMember(newMember);
          count++;
        }
      }
      setIsSubmitting(false);
      setSuccessMsg(`Successfully imported and invited ${count} users!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    };
    reader.onerror = () => {
      console.error("Error reading file");
      setIsSubmitting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredStaff = orgStaff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredStudents = orgStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-1">
            <UserPlus className="w-4 h-4" />
            <span>Organization Management</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Onboarding Portal</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Invite instructors as staff members or enroll students into your organization's learning ecosystem.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('instructors');
              setSelectedAppUserId("");
              setEmailSearchQuery("");
              setInviteError("");
              setSuccessMsg("");
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'instructors'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Staff Instructors ({orgStaff.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('students');
              setSelectedAppUserId("");
              setEmailSearchQuery("");
              setInviteError("");
              setSuccessMsg("");
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Students ({orgStudents.length})</span>
          </button>
        </div>
      </div>

      {inviteError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center justify-between text-sm font-medium animate-in fade-in">
          <span>{inviteError}</span>
          <button type="button" onClick={() => setInviteError("")} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center space-x-3 text-sm font-medium animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Onboarding Form */}
      <form id="org-onboarding-form" onSubmit={handleOnboardUser} className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
            <UserPlus className="w-4 h-4 mr-2 text-indigo-500" />
            {activeTab === 'instructors' ? 'Invite New Instructor Staff' : 'Invite New Student User'}
          </h3>
          <div className="flex items-center space-x-2">
            <label className={`cursor-pointer flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> {isSubmitting ? 'Importing...' : 'Bulk Import (CSV)'}
              <input type="file" accept=".csv" onChange={handleBulkImport} className="hidden" disabled={isSubmitting} />
            </label>
          </div>
        </div>

        {/* Email-Based Search for Registered Platform Users (Returns TRUE if found, FALSE if not) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-2 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
              <Search className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              Verify & Search Platform User by Email
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Check if an account exists on Backpack before inviting (Returns TRUE or FALSE)
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                value={emailSearchQuery}
                onChange={(e) => {
                  setEmailSearchQuery(e.target.value);
                  if (searchResult) {
                    setSearchResult(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchEmail();
                  }
                }}
                placeholder="Enter user email to check platform status (e.g. user@gmail.com)..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              {emailSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setEmailSearchQuery("");
                    setSearchResult(null);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSearchEmail()}
              disabled={!emailSearchQuery.trim() || isSearching}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center shrink-0 cursor-pointer shadow-sm"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          {/* Search Result (Explicit TRUE / FALSE Indicator) */}
          {searchResult && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              {searchResult.status && searchResult.user ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2.5 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Result: TRUE
                      </span>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Account Registered on Platform
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] uppercase font-extrabold rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                      Platform Role: {searchResult.user.role}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{searchResult.user.name}</p>
                      <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{searchResult.user.email}</p>
                      {searchResult.user.role !== (activeTab === 'instructors' ? 'instructor' : 'student') && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                          ℹ️ Registered as a {searchResult.user.role}. You can appoint them as {activeTab === 'instructors' ? 'Staff Instructor' : 'Student'} in your organization.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {searchResult.user.role !== (activeTab === 'instructors' ? 'instructor' : 'student') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(searchResult.user!.role === 'instructor' ? 'instructors' : 'students');
                            setName(searchResult.user!.name || "");
                            setEmail(searchResult.user!.email || "");
                            setSelectedAppUserId(searchResult.user!.id);
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Switch to {searchResult.user.role === 'instructor' ? 'Staff' : 'Students'} Tab
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setName(searchResult.user!.name || "");
                          setEmail(searchResult.user!.email || "");
                          setSelectedAppUserId(searchResult.user!.id);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
                      >
                        Select & Auto-fill Form <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 space-y-2 animate-in fade-in">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-amber-600 text-white shadow-xs">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Result: FALSE
                    </span>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Account Not Found on Backpack
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                    <p className="text-xs text-amber-950 dark:text-amber-300">
                      No platform account found with email <strong className="font-mono">{searchResult.email}</strong>. You can enter their details below to send a registration invitation.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(searchResult.email);
                        setSelectedAppUserId("");
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Use Email in Form Below
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={activeTab === 'instructors' ? 'e.g. Dr. Amara Okafor' : 'e.g. Kwame Mensah'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (selectedAppUserId) {
                    setSelectedAppUserId("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setEmailSearchQuery(email);
                    handleSearchEmail(email);
                  }
                }}
                placeholder="e.g. user@organization.edu"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  setEmailSearchQuery(email);
                  handleSearchEmail(email);
                }}
                title="Search this email across Backpack (Returns TRUE / FALSE)"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {selectedAppUserId && (
              <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Verified Platform User Selected: <strong>{name}</strong></span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {activeTab === 'instructors' ? 'Department / Subject' : 'Grade / Program Track'}
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={activeTab === 'instructors' ? 'e.g. Computer Science' : 'e.g. Full-Stack Cohort 1'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {myCourses.length > 0 && !courseId && (
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign to {classOrCourseText} (Optional)
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full sm:w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No Initial Assignment --</option>
              {myCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Student Invitation Requirement Overrides & Note */}
        {activeTab === 'students' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Student Invitation Requirements
            </label>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-800 dark:text-slate-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresPayment}
                  onChange={(e) => setRequiresPayment(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Require Tuition Fee Payment (if course has fee)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresDocuments}
                  onChange={(e) => setRequiresDocuments(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Require Document Submission</span>
              </label>
            </div>

            <div>
              <input
                type="text"
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
                placeholder="Optional invitation note/instructions for student..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !email.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Inviting...' : activeTab === 'instructors' ? 'Invite Staff' : 'Invite Student'}</span>
          </button>
        </div>
      </form>

      {/* Directory Search & List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            {activeTab === 'instructors' ? 'Staff Instructors Roster' : 'Student Directory'}
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {activeTab === 'instructors' ? (
          filteredStaff.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <p className="text-slate-500 dark:text-slate-400 text-sm">No invited staff instructors found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/70 p-4 rounded-xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-300 dark:border-slate-600 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{member.name}</h4>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center">
                          <ShieldCheck className="w-3 h-3 mr-0.5" /> Staff
                        </span>
                        {member.status === 'invited' && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full">
                            Invited
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                        <Mail className="w-3 h-3 mr-1" /> {member.email}
                      </p>
                      {member.department && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                          Faculty: {member.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteOrgMember(member.id)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 transition"
                    title="Remove Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No invited student users found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map((member) => (
              <div
                key={member.id}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/70 p-4 rounded-xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-300 dark:border-slate-600 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{member.name}</h4>
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full">
                        Student
                      </span>
                      {member.status === 'invited' && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full">
                          Invited
                        </span>
                      )}
                      {member.status === 'graduated' && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center">
                          <Award className="w-3 h-3 mr-0.5" /> Graduated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                      <Mail className="w-3 h-3 mr-1" /> {member.email}
                    </p>
                    {member.department && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        Track: {member.department}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {member.status !== 'graduated' && (
                    <button
                      onClick={() => updateOrgMember(member.id, { status: 'graduated' })}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 transition"
                      title="Graduate student"
                    >
                      <Award className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteOrgMember(member.id)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 transition"
                    title="Remove student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
