import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  CheckCircle2,
  X,
  Loader2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Organization, OrganizationAdmin } from "../../types";
import { useAppContext } from "../../store/AppContext";
import { generateId } from "../../lib/id";

interface StaffManagementProps {
  organization: Organization;
}

const generateTempPassword = () => "pass_" + Math.random().toString(36).substring(2, 10);

export const StaffManagement: React.FC<StaffManagementProps> = ({
  organization,
}) => {
  const { updateOrganization } = useAppContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStaff, setNewStaff] = useState(() => ({
    name: "",
    email: "",
    password: generateTempPassword(),
    role: "staff" as "admin" | "staff",
    permissions: ["attendance_edit", "course_edit"] as string[],
  }));
  const [error, setError] = useState("");
  const [lastAddedStaff, setLastAddedStaff] = useState<OrganizationAdmin | null>(null);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.email.trim()) return;
    
    setIsSubmitting(true);
    setError("");

    try {
      const staffMember: OrganizationAdmin = {
        id: generateId("staff"),
        orgId: organization.id,
        email: newStaff.email.toLowerCase().trim(),
        name: newStaff.name.trim(),
        password: newStaff.password, // Set the temporary password
        role: newStaff.role,
        permissions: newStaff.permissions,
      };

      const updatedAdmins = [...(organization.admins || []), staffMember];
      await updateOrganization(organization.id, { admins: updatedAdmins });
      
      setLastAddedStaff(staffMember);
      // Don't close modal yet so owner can see the password
      setNewStaff({
        name: "",
        email: "",
        password: generateTempPassword(),
        role: "staff",
        permissions: ["attendance_edit", "course_edit"],
      });
    } catch {
      setError("Failed to add staff member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member? They will lose access to the organizational portal.")) return;

    try {
      const updatedAdmins = (organization.admins || []).filter(a => a.id !== staffId);
      await updateOrganization(organization.id, { admins: updatedAdmins });
    } catch {
      alert("Failed to remove staff member.");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
              Administrative Staff
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-body mt-0.5">
              Manage team members who help with organizational administration.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition shadow-md shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="space-y-3">
        {!organization.admins || organization.admins.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No staff accounts added yet.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Set up your first staff account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organization.admins.map((staff) => (
              <div 
                key={staff.id}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xs shrink-0">
                    {(staff.name || staff.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {staff.name || "Unnamed Staff"}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">{staff.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${
                        staff.role === 'admin' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}>
                        {staff.role}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium italic">
                        {staff.permissions.length} permissions
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                   <button 
                    onClick={() => removeStaff(staff.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                    title="Remove staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f2231] rounded-3xl max-w-md w-full border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                    Add Staff Member
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                    Create an administrative account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {lastAddedStaff ? (
              <div className="space-y-5 animate-in zoom-in-95">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Staff Member Added Successfully</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                    Please provide these credentials to <strong className="text-slate-900 dark:text-white">{lastAddedStaff.name}</strong>. They will need them to sign in to the Staff Portal.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organization ID</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-white">{organization.id}</code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(organization.id)} className="text-slate-500 hover:text-white transition"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Staff Email</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-white">{lastAddedStaff.email}</code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(lastAddedStaff.email)} className="text-slate-500 hover:text-white transition"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temporary Password</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-emerald-400 font-bold">{lastAddedStaff.password}</code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(lastAddedStaff.password || "")} className="text-slate-500 hover:text-white transition"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2">
                   <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-body">
                     For security, this password is only shown once. Ensure the staff member changes it upon their first login.
                   </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLastAddedStaff(null);
                    setShowAddModal(false);
                  }}
                  className="w-full py-3 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl transition shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAddStaff} className="space-y-4 font-body">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="e.g. Amaka Okafor"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                        placeholder="staff@academy.edu"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-1">Staff will use their email and organization ID to sign in.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                      Role
                    </label>
                    <div className="flex gap-2">
                      {["staff", "admin"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setNewStaff({ ...newStaff, role: r as "admin" | "staff" })}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition capitalize ${
                            newStaff.role === r
                              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                      Permissions
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { id: "attendance_edit", label: "Manage Attendance" },
                        { id: "course_edit", label: "Edit Courses" },
                        { id: "member_manage", label: "Manage Students" },
                        { id: "domain_manage", label: "Domain & Branding" },
                      ].map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-indigo-500/30 transition"
                        >
                          <input
                            type="checkbox"
                            checked={newStaff.permissions.includes(p.id)}
                            onChange={(e) => {
                              const perms = e.target.checked
                                ? [...newStaff.permissions, p.id]
                                : newStaff.permissions.filter((x) => x !== p.id);
                              setNewStaff({ ...newStaff, permissions: perms });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {p.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2.5 bg-[#e2f0fb] dark:bg-[#1a384f] hover:bg-[#d6e9f8] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition font-heading"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 font-heading shadow-md shadow-indigo-600/20"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Invite Staff</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
