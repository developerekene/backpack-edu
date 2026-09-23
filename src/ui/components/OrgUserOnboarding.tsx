import React, { useState, useEffect } from "react";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { UserPlus, UserCheck, GraduationCap, Briefcase, Trash2, Search, Mail, ShieldCheck, CheckCircle2, Upload, Award, Users, User, X, ArrowRight } from "lucide-react";
import { OrgMember, User as AppUser, Role } from "../../types";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { generateId } from "../../lib/id";

interface OrgUserOnboardingProps {
  courseId?: string;
}

export const OrgUserOnboarding: React.FC<OrgUserOnboardingProps> = ({ courseId }) => {
  const { currentUser } = useAuth();
  const { orgMembers, addOrgMember, deleteOrgMember, updateOrgMember, courses, organizations } = useAppContext();

  const [activeTab, setActiveTab] = useState<'instructors' | 'students'>('instructors');
  const [searchTerm, setSearchTerm] = useState("");

  // Registered App Users state
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false);
  const [showAppUsersModal, setShowAppUsersModal] = useState(false);
  const [appUsersSearch, setAppUsersSearch] = useState("");
  const [selectedAppUserId, setSelectedAppUserId] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || "");
  const [requiresPayment, setRequiresPayment] = useState(true);
  const [requiresDocuments, setRequiresDocuments] = useState(true);
  const [inviteNote, setInviteNote] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch registered users on Backpack from Firestore
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
          
          if (personalInfo && doc.id !== currentUser?.id) {
            usersList.push({
              id: doc.id,
              name: personalInfo.fullname || personalInfo.name || 'User',
              email: personalInfo.email || '',
              role: (personalInfo.role as Role) || 'student',
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

  const handleOnboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    const targetCourseId = selectedCourseId || courseId || "";
    const cleanEmail = email.trim().toLowerCase();

    // Check if target email belongs to an organization account
    const matchedUser = registeredUsers.find(u => u.email?.toLowerCase() === cleanEmail);
    if (matchedUser && matchedUser.role === 'organization') {
      setErrorMsg("Organization users cannot be invited to courses.");
      setIsSubmitting(false);
      return;
    }

    const newMember: OrgMember = {
      id: generateId('member'),
      orgId: currentOrgId,
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

      setSuccessMsg(
        `Successfully sent course invite to ${name} (${cleanEmail})!`
      );
      setName("");
      setEmail("");
      setDepartment("");
      setInviteNote("");
      if (!courseId) setSelectedCourseId("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error inviting member:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectUserAndRedirect = (userToSelect: AppUser) => {
    setName(userToSelect.name || "");
    setEmail(userToSelect.email || "");
    setSelectedAppUserId(userToSelect.id);
    if (userToSelect.role === 'instructor') setActiveTab('instructors');
    else if (userToSelect.role === 'student') setActiveTab('students');
    setShowAppUsersModal(false);
    setTimeout(() => {
      document.getElementById('org-onboarding-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
              setSuccessMsg("");
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'instructors'
                ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Staff Instructors ({orgStaff.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('students');
              setSuccessMsg("");
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Students ({orgStudents.length})</span>
          </button>
        </div>
      </div>

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
            <button
              type="button"
              onClick={() => setShowAppUsersModal(true)}
              className="flex items-center px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" /> Search Registered Users ({registeredUsers.length})
            </button>
            <label className={`cursor-pointer flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> {isSubmitting ? 'Importing...' : 'Bulk Import (CSV)'}
              <input type="file" accept=".csv" onChange={handleBulkImport} className="hidden" disabled={isSubmitting} />
            </label>
          </div>
        </div>

        {/* Pick Existing Registered User Dropdown */}
        {registeredUsers.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Pick Existing Registered User on Backpack
            </label>
            <select
              value={selectedAppUserId}
              onChange={(e) => {
                const uid = e.target.value;
                setSelectedAppUserId(uid);
                const found = registeredUsers.find(u => u.id === uid);
                if (found) {
                  setName(found.name || "");
                  setEmail(found.email || "");
                  if (found.role === 'instructor') setActiveTab('instructors');
                  else if (found.role === 'student') setActiveTab('students');
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose from Registered Users ({registeredUsers.length}) --</option>
              {registeredUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

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
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@organization.edu"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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

      {/* Search Registered Users Modal */}
      {showAppUsersModal && (() => {
        const targetRole = activeTab === 'instructors' ? 'instructor' : 'student';
        const filteredAppUsers = registeredUsers.filter(u => {
          if (u.role === 'organization') return false;
          if (u.role !== targetRole) return false;
          if (appUsersSearch.trim()) {
            const q = appUsersSearch.toLowerCase().trim();
            return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                    <Users className="w-5 h-5 text-indigo-500 mr-2" /> Registered {activeTab === 'instructors' ? 'Instructors' : 'Students'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Directly search and invite registered {activeTab === 'instructors' ? 'instructors' : 'students'} on the platform
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppUsersModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search registered ${activeTab === 'instructors' ? 'instructors' : 'students'} by name or email...`}
                    value={appUsersSearch}
                    onChange={(e) => setAppUsersSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {loadingRegisteredUsers ? (
                  <div className="text-center py-8 text-xs text-slate-500">Loading registered users...</div>
                ) : filteredAppUsers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">No registered {activeTab === 'instructors' ? 'instructors' : 'students'} found matching query</div>
                ) : (
                  filteredAppUsers.map(u => {
                    const isAlreadyMember = orgMembers.some(m => m.email?.toLowerCase() === u.email?.toLowerCase() && (m.orgId === currentOrgId || m.orgId === currentUser.id));

                    return (
                      <div
                        key={u.id}
                        onClick={() => !isAlreadyMember && handleSelectUserAndRedirect(u)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                          isAlreadyMember
                            ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 opacity-60 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">{u.name}</span>
                              <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {u.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>

                        {isAlreadyMember ? (
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Member
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition flex items-center shadow-sm">
                            <span>Select & Invite</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
