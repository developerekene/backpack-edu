/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { User } from "../../types";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Mail,
  Send,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Building2,
  GraduationCap,
  BookOpen,
  DollarSign,
  FileText,
  Clock,
  RefreshCw,
  X,
  Megaphone,
  Plus,
  CalendarDays,
} from "lucide-react";

export const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    allUsers,
    courses,
    organizations,
    suspendUser,
    reactivateUser,
    deleteUserAccount,
    sendDirectNotification,
    refreshData,
  } = useAppContext();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");

  // Selected user for details drawer
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Modals state
  const [suspendModalUser, setSuspendModalUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [notifModalUser, setNotifModalUser] = useState<User | "all" | null>(
    null,
  );
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<
    "live_class" | "enrollment" | "grade" | "material" | "info"
  >("info");
  const [notifLinkUrl, setNotifLinkUrl] = useState("");
  const [isSubmittingNotif, setIsSubmittingNotif] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Access check
  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com" ||
    currentUser?.role === "super_admin";

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (u.isDeleted) return false;

      // Search
      const search = searchTerm.trim().toLowerCase();
      if (search) {
        const nameMatch = u.name?.toLowerCase().includes(search);
        const emailMatch = u.email?.toLowerCase().includes(search);
        const idMatch = u.id?.toLowerCase().includes(search);
        const regMatch = u.registrationId?.toLowerCase().includes(search);
        const phoneMatch = u.phone?.toLowerCase().includes(search);
        if (!nameMatch && !emailMatch && !idMatch && !regMatch && !phoneMatch) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== "all") {
        if (roleFilter === "super_admin") {
          if (
            u.role !== "super_admin" &&
            u.email?.toLowerCase() !== "ekenehq@gmail.com"
          )
            return false;
        } else if (u.role !== roleFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "suspended" && !u.isSuspended) return false;
      if (statusFilter === "active" && u.isSuspended) return false;

      // KYC filter
      if (kycFilter === "verified" && !u.kycVerified) return false;
      if (kycFilter === "unverified" && u.kycVerified) return false;

      return true;
    });
  }, [allUsers, searchTerm, roleFilter, statusFilter, kycFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = allUsers.filter((u) => !u.isDeleted).length;
    const students = allUsers.filter(
      (u) =>
        !u.isDeleted &&
        u.role === "student" &&
        u.email?.toLowerCase() !== "ekenehq@gmail.com",
    ).length;
    const instructors = allUsers.filter(
      (u) => !u.isDeleted && u.role === "instructor",
    ).length;
    const orgs = allUsers.filter(
      (u) => !u.isDeleted && u.role === "organization",
    ).length;
    const suspended = allUsers.filter(
      (u) => !u.isDeleted && u.isSuspended,
    ).length;
    const kycVerifiedCount = allUsers.filter(
      (u) => !u.isDeleted && u.kycVerified,
    ).length;

    return {
      total,
      students,
      instructors,
      orgs,
      suspended,
      kycVerifiedCount,
      totalCourses: courses.length,
      totalOrganizations: organizations.length,
    };
  }, [allUsers, courses, organizations]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
    showFeedback("Platform user records refreshed!");
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    setIsSubmittingSuspend(true);
    try {
      await suspendUser(suspendModalUser.id, suspendReason);
      showFeedback(`Account for ${suspendModalUser.name} has been suspended.`);
      setSuspendModalUser(null);
      setSuspendReason("");
      if (selectedUser?.id === suspendModalUser.id) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                isSuspended: true,
                suspendedReason: suspendReason || "Suspended by admin",
              }
            : null,
        );
      }
    } catch (err: any) {
      alert("Failed to suspend account: " + err.message);
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleConfirmReactivate = async (u: User) => {
    try {
      await reactivateUser(u.id);
      showFeedback(`Account for ${u.name} has been reactivated.`);
      if (selectedUser?.id === u.id) {
        setSelectedUser((prev) =>
          prev ? { ...prev, isSuspended: false } : null,
        );
      }
    } catch (err: any) {
      alert("Failed to reactivate user: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setIsSubmittingDelete(true);
    try {
      await deleteUserAccount(deleteModalUser.id);
      showFeedback(`User account ${deleteModalUser.name} has been deleted.`);
      if (selectedUser?.id === deleteModalUser.id) {
        setSelectedUser(null);
      }
      setDeleteModalUser(null);
    } catch (err: any) {
      alert("Failed to delete user account: " + err.message);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifModalUser || !notifTitle.trim() || !notifMessage.trim()) return;
    setIsSubmittingNotif(true);
    try {
      const targetId = notifModalUser === "all" ? "all" : notifModalUser.id;
      await sendDirectNotification(
        targetId,
        notifTitle.trim(),
        notifMessage.trim(),
        notifType,
        notifLinkUrl.trim() || undefined,
      );
      showFeedback(
        notifModalUser === "all"
          ? "Broadcast notification sent to ALL registered users!"
          : `Notification sent to ${notifModalUser.name}.`,
      );
      setNotifModalUser(null);
      setNotifTitle("");
      setNotifMessage("");
      setNotifLinkUrl("");
    } catch (err: any) {
      alert("Failed to send notification: " + err.message);
    } finally {
      setIsSubmittingNotif(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Super Admin Access Restricted
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You must be logged in as the designated Super Admin (
          <code className="text-sky-600 dark:text-sky-400 font-mono">
            ekenehq@gmail.com
          </code>
          ) to access backend user management and platform control tools.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Feedback Toast */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-sky-900/40">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-xs text-slate-400 font-mono">
              ekenehq@gmail.com
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Backpack Platform Governance
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Complete database oversight, user management, suspension controls,
            and in-app direct messaging.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate("/upload-course")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>

          <button
            onClick={() => navigate("/events")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Create Event</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-sky-400" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setNotifModalUser("all")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>Broadcast Msg</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Overview (Clickable Filter Buttons) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setRoleFilter("all");
            setStatusFilter("all");
            setKycFilter("all");
            setSearchTerm("");
            document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            roleFilter === "all" && statusFilter === "all" && kycFilter === "all"
              ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 ring-2 ring-sky-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Accounts</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.total}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registered on Backpack
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter("student");
            setStatusFilter("all");
            setKycFilter("all");
            setSearchTerm("");
            document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            roleFilter === "student"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Students</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.students}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active Learners</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter("instructor");
            setStatusFilter("all");
            setKycFilter("all");
            setSearchTerm("");
            document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            roleFilter === "instructor"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Instructors</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.instructors}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Educators</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter("organization");
            setStatusFilter("all");
            setKycFilter("all");
            setSearchTerm("");
            document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            roleFilter === "organization"
              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {metrics.orgs}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Schools & Academies</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter("all");
            setStatusFilter("suspended");
            setKycFilter("all");
            setSearchTerm("");
            document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            statusFilter === "suspended"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500 ring-2 ring-rose-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Suspended</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {metrics.suspended}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Blocked Access</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter("all");
            setStatusFilter("all");
            setKycFilter("verified");
            setSearchTerm("");
            document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            kycFilter === "verified"
              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 ring-2 ring-blue-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">KYC Verified</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {metrics.kycVerifiedCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Verified Profiles</p>
        </button>
      </div>

      {/* User Directory Table & Controls */}
      <div id="users-table" className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name, email, user ID, phone, or registration ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="organization">Organization</option>
              <option value="super_admin">Super Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>

            {/* KYC Filter */}
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="all">All KYC</option>
              <option value="verified">KYC Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-700/80">
              <tr>
                <th className="px-4 py-3.5">User Account</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5">Verification & KYC</th>
                <th className="px-4 py-3.5">Paystack Split Subaccount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-base">
                      No user accounts found
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your search criteria or role filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuper =
                    u.role === "super_admin" ||
                    u.email?.toLowerCase() === "ekenehq@gmail.com";

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${
                        u.isSuspended
                          ? "bg-rose-50/30 dark:bg-rose-950/10"
                          : ""
                      }`}
                    >
                      {/* User Avatar & Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm uppercase">
                            {u.name?.charAt(0) || u.email?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                                {u.name}
                              </p>
                              {isSuper && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                                  SUPER
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              {u.email}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {u.id.substring(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isSuper
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/50"
                              : u.role === "organization"
                                ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700/50"
                                : u.role === "instructor"
                                  ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700/50"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/50"
                          }`}
                        >
                          {u.role === "organization" && (
                            <Building2 className="w-3 h-3" />
                          )}
                          {u.role === "instructor" && (
                            <BookOpen className="w-3 h-3" />
                          )}
                          {u.role === "student" && (
                            <GraduationCap className="w-3 h-3" />
                          )}
                          {isSuper && <ShieldCheck className="w-3 h-3" />}
                          <span className="capitalize">
                            {isSuper ? "Super Admin" : u.role}
                          </span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </td>

                      {/* Verification & KYC */}
                      <td className="px-4 py-3.5 text-xs">
                        {u.kycVerified ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Unverified</span>
                          </span>
                        )}
                        {u.registrationId && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Reg: {u.registrationId}
                          </div>
                        )}
                      </td>

                      {/* Paystack Subaccount */}
                      <td className="px-4 py-3.5 text-xs">
                        {u.paystackSubaccount?.subaccount_code ? (
                          <div>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {u.paystackSubaccount.subaccount_code}
                            </span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {u.paystackSubaccount.business_name ||
                                u.paystackSubaccount.account_name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Not configured
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-xs">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[11px] border border-rose-300 dark:border-rose-800">
                            <UserX className="w-3 h-3" />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-300 dark:border-emerald-800">
                            <UserCheck className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedUser(u)}
                            title="View Full Profile Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-300 dark:hover:bg-sky-950/40 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Send direct notification */}
                          <button
                            onClick={() => setNotifModalUser(u)}
                            title="Send In-App Notification"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/40 transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          {/* Suspend or Reactivate (Disabled for super admin itself) */}
                          {!isSuper && (
                            <>
                              {u.isSuspended ? (
                                <button
                                  onClick={() => handleConfirmReactivate(u)}
                                  title="Reactivate Account"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSuspendModalUser(u)}
                                  title="Suspend User Account"
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => setDeleteModalUser(u)}
                                title="Delete User Account"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER DETAILS DRAWER / MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col overflow-y-auto border-l border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center uppercase shadow-md">
                  {selectedUser.name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1 text-sm text-slate-700 dark:text-slate-200">
              {/* Account Status Badge */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                    Account Status
                  </span>
                  {selectedUser.isSuspended ? (
                    <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-1.5">
                      <UserX className="w-4 h-4" />
                      <span>SUSPENDED</span>
                    </div>
                  ) : (
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>ACTIVE & OPERATIONAL</span>
                    </div>
                  )}
                  {selectedUser.suspendedReason && (
                    <p className="text-xs text-rose-500 mt-1">
                      Reason: {selectedUser.suspendedReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setNotifModalUser(selectedUser);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-colors flex items-center space-x-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>

                  {selectedUser.email?.toLowerCase() !==
                    "ekenehq@gmail.com" && (
                    <>
                      {selectedUser.isSuspended ? (
                        <button
                          onClick={() => handleConfirmReactivate(selectedUser)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSuspendModalUser(selectedUser);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* General Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  User Identification & Role
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block mb-0.5">
                      User ID
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-medium break-all">
                      {selectedUser.id}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block mb-0.5">Role</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {selectedUser.role}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block mb-0.5">
                      Registration Date
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block mb-0.5">
                      KYC Status
                    </span>
                    <span
                      className={`font-semibold ${selectedUser.kycVerified ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {selectedUser.kycVerified
                        ? "Verified"
                        : "Unverified / Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio & Headline */}
              {(selectedUser.headline || selectedUser.bio) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Profile Bio
                  </h4>
                  {selectedUser.headline && (
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {selectedUser.headline}
                    </p>
                  )}
                  {selectedUser.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      {selectedUser.bio}
                    </p>
                  )}
                </div>
              )}

              {/* Organization Metadata if Org */}
              {(selectedUser.role === "organization" ||
                selectedUser.registrationId ||
                selectedUser.accreditationStatus) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Organization & Accreditation Details</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {selectedUser.orgType && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-slate-400 block mb-0.5">
                          Org Type
                        </span>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300 capitalize">
                          {selectedUser.orgType} School
                        </span>
                      </div>
                    )}
                    {selectedUser.registrationId && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-slate-400 block mb-0.5">
                          Registration ID
                        </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {selectedUser.registrationId}
                        </span>
                      </div>
                    )}
                    {selectedUser.accreditationStatus && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-slate-400 block mb-0.5">
                          Accreditation Status
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {selectedUser.accreditationStatus}
                        </span>
                      </div>
                    )}
                    {selectedUser.accreditingBody && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-slate-400 block mb-0.5">
                          Accrediting Body
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {selectedUser.accreditingBody}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Paystack Split Subaccount Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Paystack Direct Split Subaccount</span>
                </h4>
                {selectedUser.paystackSubaccount?.subaccount_code ? (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Subaccount Code:</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
                        {selectedUser.paystackSubaccount.subaccount_code}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Business Name:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedUser.paystackSubaccount.business_name ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {selectedUser.paystackSubaccount.account_number} (
                        {selectedUser.paystackSubaccount.bank_name ||
                          selectedUser.paystackSubaccount.bank_code}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Provider Share:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {selectedUser.paystackSubaccount.percentage_charge}% to
                        provider / 15% platform fee
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    No Paystack split payment subaccount has been linked to
                    this user account yet.
                  </p>
                )}
              </div>

              {/* Documents & Links */}
              {(selectedUser.cvUrl ||
                selectedUser.kycDocumentUrl ||
                selectedUser.accreditationDocUrl ||
                (selectedUser.userDocuments &&
                  selectedUser.userDocuments.length > 0)) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                    <span>Attached Documents & Links</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.cvUrl && (
                      <a
                        href={selectedUser.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors text-xs text-sky-600 dark:text-sky-400 font-medium"
                      >
                        <span>Curriculum Vitae (CV)</span>
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedUser.kycDocumentUrl && (
                      <a
                        href={selectedUser.kycDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors text-xs text-sky-600 dark:text-sky-400 font-medium"
                      >
                        <span>KYC Identity Verification Document</span>
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedUser.accreditationDocUrl && (
                      <a
                        href={selectedUser.accreditationDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors text-xs text-indigo-600 dark:text-indigo-400 font-medium"
                      >
                        <span>School Accreditation Document</span>
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND USER MODAL */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Suspend User Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {suspendModalUser.name} ({suspendModalUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Suspending this account will immediately revoke access and block
              the user from logging into Backpack until reactivated by an
              administrator.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Suspension (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Violation of platform guidelines, unpaid fees, or administrative review..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSubmittingSuspend}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-all shadow-md shadow-amber-900/30 flex items-center space-x-1.5"
              >
                {isSubmittingSuspend && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirm Suspension</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete User Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deleteModalUser.name} ({deleteModalUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
              Warning: This action will mark this user account as deleted and
              permanently remove their privileges from Backpack.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-md shadow-rose-900/30 flex items-center space-x-1.5"
              >
                {isSubmittingDelete && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND NOTIFICATION MODAL */}
      {notifModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-sky-600 dark:text-sky-400">
                <Mail className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Send Notification
                </h3>
              </div>
              <button
                onClick={() => setNotifModalUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Recipient
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNotifModalUser("all")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      notifModalUser === "all"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    📢 All Users (Broadcast)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (notifModalUser === "all") {
                        const firstUser = allUsers.find((u) => !u.isDeleted) || null;
                        setNotifModalUser(firstUser);
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      notifModalUser !== "all"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    👤 Particular User
                  </button>
                </div>

                {notifModalUser !== "all" ? (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Select User (Student, Instructor, Organization)
                    </label>
                    <select
                      value={typeof notifModalUser === "object" && notifModalUser ? notifModalUser.id : ""}
                      onChange={(e) => {
                        const found = allUsers.find((u) => u.id === e.target.value);
                        if (found) setNotifModalUser(found);
                      }}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                    >
                      {allUsers
                        .filter((u) => !u.isDeleted)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role.toUpperCase()}) - {u.email}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs bg-sky-50 dark:bg-sky-950/40 p-2.5 rounded-xl text-sky-800 dark:text-sky-200 font-medium border border-sky-200 dark:border-sky-800">
                    📢 Message will be delivered to ALL registered Backpack users.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform Notice from Backpack Admin"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message Type
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                >
                  <option value="info">General Information</option>
                  <option value="live_class">Live Class Alert</option>
                  <option value="enrollment">Enrollment Notice</option>
                  <option value="grade">Grade Update</option>
                  <option value="material">Study Material</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write message details here..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action Link URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /dashboard or /explore"
                  value={notifLinkUrl}
                  onChange={(e) => setNotifLinkUrl(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNotifModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNotif}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-all shadow-md shadow-sky-900/30 flex items-center space-x-1.5"
                >
                  {isSubmittingNotif ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send Notification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
