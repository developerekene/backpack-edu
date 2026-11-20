/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { useEventContext, type AppEvent } from "../../store/EventContext";
import type { AppNotification, Course, User } from "../../types";
import {
  getCourseApprovalStatus,
  getEventApprovalStatus,
  isSuperAdminUser,
} from "../../lib/approval";
import { EventDetailsModel } from "../components/EventDetailsModel";
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
  XCircle,
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
  MessageSquare,
  Reply,
  Hourglass,
  ExternalLink,
  Check,
  Radio,
  Lock,
} from "lucide-react";

type AdminTab = "users" | "courses" | "events" | "appeals";
type ApprovalFilter = "all" | "pending" | "approved" | "rejected";

export const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const {
    allPlatformUsers,
    fetchAllUsersFromBackend,
    courses,
    organizations,
    notifications,
    markNotificationRead,
    suspendUser,
    reactivateUser,
    deleteUserAccount,
    replyToSuspensionQuery,
    sendDirectNotification,
    refreshData,
    deletePaystackSubaccount,
    approveCourse,
    rejectCourse,
    deleteCourse,
  } = useAppContext();

  const { events, approveEvent, rejectEvent, deleteEvent } = useEventContext();

  // Access check
  const isSuperAdmin = isSuperAdminUser(currentUser);

  // Active tab derived directly from URL query ?tab=users|courses|events|appeals
  const tabParam = searchParams.get("tab") as AdminTab | null;
  const activeTab: AdminTab =
    tabParam && ["users", "courses", "events", "appeals"].includes(tabParam)
      ? tabParam
      : "users";

  const switchTab = (tab: AdminTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  // Pull fresh backend user accounts when Super Admin opens portal
  const [loadingBackendUsers, setLoadingBackendUsers] = useState(false);
  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoadingBackendUsers(true);
        return fetchAllUsersFromBackend();
      })
      .catch((err) => {
        console.error("Failed loading backend accounts:", err);
      })
      .finally(() => {
        if (active) setLoadingBackendUsers(false);
      });
    return () => {
      active = false;
    };
  }, [isSuperAdmin, fetchAllUsersFromBackend]);

  // Filters: Users
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");

  // Filters: Courses
  const [courseSearch, setCourseSearch] = useState("");
  const [courseApprovalFilter, setCourseApprovalFilter] =
    useState<ApprovalFilter>("all");

  // Filters: Events
  const [eventSearch, setEventSearch] = useState("");
  const [eventApprovalFilter, setEventApprovalFilter] =
    useState<ApprovalFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    "all" | "go_live" | "private"
  >("all");

  // Filters: Appeals
  const [appealSearch, setAppealSearch] = useState("");
  const [appealTypeFilter, setAppealTypeFilter] = useState<
    "all" | "suspension_query" | "unsuspend_request"
  >("all");

  // Selected user drawer & preview modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [previewEvent, setPreviewEvent] = useState<AppEvent | null>(null);

  // User moderation modals
  const [suspendModalUser, setSuspendModalUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Notification modal
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

  // Course / Event moderation modals (Reject reason + Delete confirmation)
  const [rejectCourseTarget, setRejectCourseTarget] = useState<Course | null>(
    null,
  );
  const [rejectCourseReason, setRejectCourseReason] = useState("");
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<Course | null>(
    null,
  );

  const [rejectEventTarget, setRejectEventTarget] = useState<AppEvent | null>(
    null,
  );
  const [rejectEventReason, setRejectEventReason] = useState("");
  const [deleteEventTarget, setDeleteEventTarget] = useState<AppEvent | null>(
    null,
  );

  // Reply to suspension query modal
  const [replyAppealNotif, setReplyAppealNotif] =
    useState<AppNotification | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Busy flags & toast/error banners
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingUserSubaccount, setDeletingUserSubaccount] = useState(false);

  const showFeedback = (msg: string) => {
    setActionError(null);
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4500);
  };

  const showError = (msg: string) => {
    setActionError(msg);
  };

  // Resolve organization display name for courses / events
  const resolveOrgName = useCallback(
    (orgId?: string, fallbackName?: string, createdById?: string) => {
      if (fallbackName && fallbackName.trim()) return fallbackName;
      if (orgId) {
        const org = organizations.find(
          (o) => o.id === orgId || o.ownerId === orgId,
        );
        if (org?.name) return org.name;
        const orgUser = allPlatformUsers.find((u) => u.id === orgId);
        if (orgUser?.name) return orgUser.name;
      }
      if (createdById) {
        const creator = allPlatformUsers.find((u) => u.id === createdById);
        if (creator?.name) return creator.name;
      }
      return "Independent / Organization";
    },
    [organizations, allPlatformUsers],
  );

  const resolveCreatorName = (createdById?: string, fallback?: string) => {
    if (createdById) {
      const user = allPlatformUsers.find((u) => u.id === createdById);
      if (user?.name) return `${user.name} (${user.email})`;
    }
    return fallback || "Unknown creator";
  };

  // Appeal notifications (queries & unsuspend requests sent to Super Admin)
  const appealNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const cat = n.notificationCategory;
      if (cat === "suspension_query" || cat === "unsuspend_request") return true;
      const lowerTitle = (n.title || "").toLowerCase();
      return (
        lowerTitle.includes("suspension query") ||
        lowerTitle.includes("unsuspension request")
      );
    });
  }, [notifications]);

  const filteredAppeals = useMemo(() => {
    return appealNotifications.filter((n) => {
      const cat: "suspension_query" | "unsuspend_request" =
        n.notificationCategory === "unsuspend_request" ||
        (n.title || "").toLowerCase().includes("unsuspension")
          ? "unsuspend_request"
          : "suspension_query";
      if (appealTypeFilter !== "all" && cat !== appealTypeFilter) return false;
      const q = appealSearch.trim().toLowerCase();
      if (q) {
        const match =
          n.senderName?.toLowerCase().includes(q) ||
          n.senderEmail?.toLowerCase().includes(q) ||
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [appealNotifications, appealTypeFilter, appealSearch]);

  // Filtered backend users (allPlatformUsers includes every registered account in Firestore)
  const filteredUsers = useMemo(() => {
    return allPlatformUsers.filter((u) => {
      if (u.isDeleted) return false;

      const search = searchTerm.trim().toLowerCase();
      if (search) {
        const nameMatch = u.name?.toLowerCase().includes(search);
        const emailMatch = u.email?.toLowerCase().includes(search);
        const idMatch = u.id?.toLowerCase().includes(search);
        const regMatch = u.registrationId?.toLowerCase().includes(search);
        const phoneMatch = u.phone?.toLowerCase().includes(search);
        if (
          !nameMatch &&
          !emailMatch &&
          !idMatch &&
          !regMatch &&
          !phoneMatch
        ) {
          return false;
        }
      }

      if (roleFilter !== "all") {
        if (roleFilter === "super_admin") {
          if (
            u.role !== "super_admin" &&
            u.email?.toLowerCase() !== "ekenehq@gmail.com"
          ) {
            return false;
          }
        } else if (u.role !== roleFilter) {
          return false;
        }
      }

      if (statusFilter === "suspended" && !u.isSuspended) return false;
      if (statusFilter === "active" && u.isSuspended) return false;

      if (kycFilter === "verified" && !u.kycVerified) return false;
      if (kycFilter === "unverified" && u.kycVerified) return false;

      return true;
    });
  }, [allPlatformUsers, searchTerm, roleFilter, statusFilter, kycFilter]);

  // Filtered courses (ALL platform courses)
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const status = getCourseApprovalStatus(c);
      if (courseApprovalFilter !== "all" && status !== courseApprovalFilter) {
        return false;
      }
      const q = courseSearch.trim().toLowerCase();
      if (q) {
        const orgName = resolveOrgName(c.orgId, undefined, c.createdBy);
        const match =
          c.title?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.instructor?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q) ||
          orgName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
    }, [courses, courseApprovalFilter, courseSearch, resolveOrgName]);

  // Filtered events (ALL platform events)
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const status = getEventApprovalStatus(evt);
      if (eventApprovalFilter !== "all" && status !== eventApprovalFilter) {
        return false;
      }
      if (eventTypeFilter !== "all" && evt.eventType !== eventTypeFilter) {
        return false;
      }
      const q = eventSearch.trim().toLowerCase();
      if (q) {
        const orgName = resolveOrgName(
          evt.orgId,
          evt.orgName,
          evt.createdBy?.id,
        );
        const match =
          evt.title?.toLowerCase().includes(q) ||
          evt.subject?.toLowerCase().includes(q) ||
          evt.facilitatorName?.toLowerCase().includes(q) ||
          evt.location?.toLowerCase().includes(q) ||
          evt.id?.toLowerCase().includes(q) ||
          orgName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    events,
    eventApprovalFilter,
    eventTypeFilter,
    eventSearch,
    resolveOrgName,
  ]);

  // Metrics
  const metrics = useMemo(() => {
    const activeAccounts = allPlatformUsers.filter((u) => !u.isDeleted);
    const total = activeAccounts.length;
    const students = activeAccounts.filter(
      (u) =>
        u.role === "student" &&
        u.email?.toLowerCase() !== "ekenehq@gmail.com",
    ).length;
    const instructors = activeAccounts.filter(
      (u) => u.role === "instructor",
    ).length;
    const orgs = activeAccounts.filter(
      (u) => u.role === "organization",
    ).length;
    const suspended = activeAccounts.filter((u) => u.isSuspended).length;

    const pendingCourses = courses.filter(
      (c) => getCourseApprovalStatus(c) === "pending",
    ).length;
    const pendingEvents = events.filter(
      (e) => getEventApprovalStatus(e) === "pending",
    ).length;
    const unreadAppeals = appealNotifications.filter((n) => !n.read).length;

    return {
      total,
      students,
      instructors,
      orgs,
      suspended,
      totalCourses: courses.length,
      pendingCourses,
      totalEvents: events.length,
      pendingEvents,
      totalAppeals: appealNotifications.length,
      unreadAppeals,
    };
  }, [allPlatformUsers, courses, events, appealNotifications]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshData(), fetchAllUsersFromBackend()]);
      showFeedback("Platform accounts, courses, and events synced from backend.");
    } catch (err: any) {
      showError(err?.message || "Failed to refresh platform records.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    setIsSubmittingSuspend(true);
    try {
      await suspendUser(suspendModalUser.id, suspendReason);
      await fetchAllUsersFromBackend();
      showFeedback(`Account for ${suspendModalUser.name} has been suspended.`);
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
      setSuspendModalUser(null);
      setSuspendReason("");
    } catch (err: any) {
      showError("Failed to suspend account: " + (err?.message || "Unknown error"));
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleConfirmReactivate = async (u: User) => {
    setBusyActionId(u.id);
    try {
      await reactivateUser(u.id);
      await fetchAllUsersFromBackend();
      await sendDirectNotification(
        u.id,
        "Account Reactivated",
        "Your Backpack account suspension has been lifted by a Super Admin. All platform features are now accessible.",
        "info",
      );
      showFeedback(`Account for ${u.name} has been unsuspended.`);
      if (selectedUser?.id === u.id) {
        setSelectedUser((prev) =>
          prev ? { ...prev, isSuspended: false, suspendedReason: undefined } : null,
        );
      }
    } catch (err: any) {
      showError("Failed to reactivate user: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsSubmittingDelete(true);
    try {
      await deleteUserAccount(deleteModalUser.id);
      showFeedback(
        `Account ${deleteModalUser.name} and all associated courses, events, and records have been permanently deleted.`,
      );
      if (selectedUser?.id === deleteModalUser.id) {
        setSelectedUser(null);
      }
      setDeleteModalUser(null);
    } catch (err: any) {
      showError("Failed to delete user account: " + (err?.message || "Unknown error"));
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
      showError("Failed to send notification: " + (err?.message || "Unknown error"));
    } finally {
      setIsSubmittingNotif(false);
    }
  };

  // Course Governance handlers
  const handleApproveCourse = async (course: Course) => {
    setBusyActionId(course.id);
    try {
      await approveCourse(course.id);
      showFeedback(`Approved course "${course.title}" for platform visibility.`);
      if (previewCourse?.id === course.id) {
        setPreviewCourse((prev) =>
          prev ? { ...prev, approvalStatus: "approved" } : null,
        );
      }
    } catch (err: any) {
      showError("Failed to approve course: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleConfirmRejectCourse = async () => {
    if (!rejectCourseTarget) return;
    setBusyActionId(rejectCourseTarget.id);
    try {
      await rejectCourse(
        rejectCourseTarget.id,
        rejectCourseReason.trim() || undefined,
      );
      showFeedback(`Declined course "${rejectCourseTarget.title}".`);
      if (previewCourse?.id === rejectCourseTarget.id) {
        setPreviewCourse((prev) =>
          prev
            ? {
                ...prev,
                approvalStatus: "rejected",
                rejectionReason: rejectCourseReason.trim() || undefined,
              }
            : null,
        );
      }
      setRejectCourseTarget(null);
      setRejectCourseReason("");
    } catch (err: any) {
      showError("Failed to decline course: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleConfirmDeleteCourse = async () => {
    if (!deleteCourseTarget) return;
    setBusyActionId(deleteCourseTarget.id);
    try {
      await deleteCourse(deleteCourseTarget.id);
      showFeedback(
        `Course "${deleteCourseTarget.title}" and all linked enrollments & materials deleted.`,
      );
      if (previewCourse?.id === deleteCourseTarget.id) {
        setPreviewCourse(null);
      }
      setDeleteCourseTarget(null);
    } catch (err: any) {
      showError("Failed to delete course: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  // Event Governance handlers
  const handleApproveEvent = async (evt: AppEvent) => {
    setBusyActionId(evt.id);
    try {
      await approveEvent(evt.id);
      showFeedback(`Approved event "${evt.title}" for platform participation.`);
    } catch (err: any) {
      showError("Failed to approve event: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleConfirmRejectEvent = async () => {
    if (!rejectEventTarget) return;
    setBusyActionId(rejectEventTarget.id);
    try {
      await rejectEvent(
        rejectEventTarget.id,
        rejectEventReason.trim() || undefined,
      );
      showFeedback(`Declined event "${rejectEventTarget.title}".`);
      setRejectEventTarget(null);
      setRejectEventReason("");
    } catch (err: any) {
      showError("Failed to decline event: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    setBusyActionId(deleteEventTarget.id);
    try {
      await deleteEvent(deleteEventTarget.id);
      showFeedback(`Event "${deleteEventTarget.title}" permanently deleted.`);
      if (previewEvent?.id === deleteEventTarget.id) {
        setPreviewEvent(null);
      }
      setDeleteEventTarget(null);
    } catch (err: any) {
      showError("Failed to delete event: " + (err?.message || "Unknown error"));
    } finally {
      setBusyActionId(null);
    }
  };

  // Suspension Query Reply handler
  const handleSubmitAppealReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyAppealNotif?.senderId || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await replyToSuspensionQuery(
        replyAppealNotif.senderId,
        replyText.trim(),
        replyAppealNotif.id,
      );
      showFeedback(
        `Reply delivered to ${replyAppealNotif.senderName || "user"}'s notifications.`,
      );
      setReplyAppealNotif(null);
      setReplyText("");
    } catch (err: any) {
      showError("Failed to send reply: " + (err?.message || "Unknown error"));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Restricted Access
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You must be logged in with an authorized platform administrator account
          to access user management and platform control tools.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Success Toast */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
      {actionError && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs font-medium">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-sky-900/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Backpack Platform Governance
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Complete backend account directory, cascade deletions, suspension
            appeals, and course &amp; event approval gate.
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
            disabled={refreshing || loadingBackendUsers}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing || loadingBackendUsers ? "animate-spin text-sky-400" : ""
              }`}
            />
            <span>Sync Backend</span>
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

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            switchTab("users");
            setRoleFilter("all");
            setStatusFilter("all");
            setKycFilter("all");
            setSearchTerm("");
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            activeTab === "users" &&
            roleFilter === "all" &&
            statusFilter === "all" &&
            kycFilter === "all"
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
            {metrics.students}S · {metrics.instructors}I · {metrics.orgs}O
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            switchTab("users");
            setRoleFilter("all");
            setStatusFilter("suspended");
            setKycFilter("all");
            setSearchTerm("");
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            activeTab === "users" && statusFilter === "suspended"
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
          <p className="text-[11px] text-slate-500 mt-0.5">Restricted Portal</p>
        </button>

        <button
          type="button"
          onClick={() => {
            switchTab("appeals");
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            activeTab === "appeals"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Appeals &amp; Queries</span>
            <MessageSquare className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.totalAppeals}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {metrics.unreadAppeals > 0
              ? `${metrics.unreadAppeals} unread`
              : "Suspension Inbox"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            switchTab("courses");
            setCourseApprovalFilter(
              metrics.pendingCourses > 0 ? "pending" : "all",
            );
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            activeTab === "courses" && courseApprovalFilter === "pending"
              ? "bg-orange-50 dark:bg-orange-950/40 border-orange-400 dark:border-orange-500 ring-2 ring-orange-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-orange-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending Courses</span>
            <Hourglass className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {metrics.pendingCourses}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            of {metrics.totalCourses} total courses
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            switchTab("events");
            setEventApprovalFilter(
              metrics.pendingEvents > 0 ? "pending" : "all",
            );
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            activeTab === "events" && eventApprovalFilter === "pending"
              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/30"
              : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending Events</span>
            <CalendarDays className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {metrics.pendingEvents}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            of {metrics.totalEvents} total events
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            switchTab("courses");
            setCourseApprovalFilter("all");
          }}
          className="text-left p-4 rounded-2xl border bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Platform Catalog</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.totalCourses + metrics.totalEvents}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Courses &amp; Events
          </p>
        </button>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => switchTab("users")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "users"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Accounts ({metrics.total})</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("courses")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "courses"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses ({metrics.totalCourses})</span>
          {metrics.pendingCourses > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
              {metrics.pendingCourses} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab("events")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "events"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Events ({metrics.totalEvents})</span>
          {metrics.pendingEvents > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
              {metrics.pendingEvents} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab("appeals")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "appeals"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Suspension Appeals ({metrics.totalAppeals})</span>
          {metrics.unreadAppeals > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
              {metrics.unreadAppeals} new
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: REGISTERED USERS DIRECTORY                            */}
      {/* ============================================================ */}
      {activeTab === "users" && (
        <div
          id="users-table"
          className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden"
        >
          {/* Search & Filters Bar */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search backend accounts by name, email, user ID, phone, or registration ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>

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
                  <th className="px-4 py-3.5">Verification &amp; KYC</th>
                  <th className="px-4 py-3.5">Bank Payout Account</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                {loadingBackendUsers && filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <RefreshCw className="w-8 h-8 mx-auto text-sky-500 animate-spin mb-2" />
                      <p className="font-medium text-sm">
                        Pulling registered accounts from backend...
                      </p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
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
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${
                          u.isSuspended
                            ? "bg-rose-50/30 dark:bg-rose-950/10"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm uppercase">
                              {u.name?.charAt(0) || u.email?.charAt(0) || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                                  {u.name || "Unnamed User"}
                                </p>
                                {isSuper && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                                    SUPER
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                {u.email || "No email"}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {u.id.substring(0, 12)}
                              </span>
                            </div>
                          </div>
                        </td>

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

                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </td>

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

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => setSelectedUser(u)}
                              title="View Full Profile Details"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-300 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setNotifModalUser(u)}
                              title="Send In-App Notification"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            >
                              <Mail className="w-4 h-4" />
                            </button>

                            {!isSuper && !isSelf && (
                              <>
                                {u.isSuspended ? (
                                  <button
                                    onClick={() => handleConfirmReactivate(u)}
                                    disabled={busyActionId === u.id}
                                    title="Reactivate / Unsuspend Account"
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setSuspendModalUser(u)}
                                    title="Suspend User Account"
                                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  onClick={() => setDeleteModalUser(u)}
                                  title="Delete User Account & All Associated Data"
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
      )}

      {/* ============================================================ */}
      {/* TAB 2: COURSES GOVERNANCE & APPROVAL GATE                    */}
      {/* ============================================================ */}
      {activeTab === "courses" && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search all platform courses by title, organization, instructor, or category..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pending", "approved", "rejected"] as ApprovalFilter[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCourseApprovalFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                      courseApprovalFilter === st
                        ? "bg-sky-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {st === "pending"
                      ? `Pending (${metrics.pendingCourses})`
                      : st}
                  </button>
                ),
              )}
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-base">
                No courses match your current filter
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Courses created by organizations and instructors across the
                platform appear here for review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-700/80">
                  <tr>
                    <th className="px-4 py-3.5">Course</th>
                    <th className="px-4 py-3.5">Organization &amp; Creator</th>
                    <th className="px-4 py-3.5">Curriculum &amp; Fee</th>
                    <th className="px-4 py-3.5">Approval Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                  {filteredCourses.map((course) => {
                    const status = getCourseApprovalStatus(course);
                    const orgName = resolveOrgName(
                      course.orgId,
                      undefined,
                      course.createdBy,
                    );
                    const isBusy = busyActionId === course.id;

                    return (
                      <tr
                        key={course.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {course.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {course.category || "General"}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {course.id}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {orgName}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                            Instructor: {course.instructor || "Unassigned"}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {course.modules?.length || 0} module
                            {(course.modules?.length || 0) === 1 ? "" : "s"}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {Number(course.price || 0) > 0
                              ? `${course.currency || "NGN"} ${Number(
                                  course.price,
                                ).toLocaleString()}`
                              : "Free / Open"}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          {status === "approved" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          )}
                          {status === "pending" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                              <Hourglass className="w-3.5 h-3.5" />
                              <span>Pending Approval</span>
                            </span>
                          )}
                          {status === "rejected" && (
                            <div>
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold border border-rose-300 dark:border-rose-800">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Declined</span>
                              </span>
                              {course.rejectionReason && (
                                <p className="text-[11px] text-rose-500 mt-1 max-w-[180px] line-clamp-2">
                                  {course.rejectionReason}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewCourse(course)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 transition inline-flex items-center space-x-1 cursor-pointer"
                              title="Inspect Course Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {status !== "approved" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApproveCourse(course)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                title="Approve Course for Platform"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {status === "pending" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setRejectCourseTarget(course);
                                  setRejectCourseReason("");
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                title="Decline Course"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDeleteCourseTarget(course)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                              title="Delete Course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: EVENTS GOVERNANCE & APPROVAL GATE                     */}
      {/* ============================================================ */}
      {activeTab === "events" && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search all platform events by title, organization, subject, facilitator, or location..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as any)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Event Types</option>
                <option value="go_live">Go Live Events</option>
                <option value="private">Private Org Events</option>
              </select>

              {(["all", "pending", "approved", "rejected"] as ApprovalFilter[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEventApprovalFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                      eventApprovalFilter === st
                        ? "bg-sky-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {st === "pending"
                      ? `Pending (${metrics.pendingEvents})`
                      : st}
                  </button>
                ),
              )}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <CalendarDays className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-base">
                No events match your current filter
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Go Live and Private events created by organizations across the
                platform appear here for review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-700/80">
                  <tr>
                    <th className="px-4 py-3.5">Event</th>
                    <th className="px-4 py-3.5">Organization &amp; Host</th>
                    <th className="px-4 py-3.5">Schedule &amp; Mode</th>
                    <th className="px-4 py-3.5">Approval Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                  {filteredEvents.map((evt) => {
                    const status = getEventApprovalStatus(evt);
                    const orgName = resolveOrgName(
                      evt.orgId,
                      evt.orgName,
                      evt.createdBy?.id,
                    );
                    const isBusy = busyActionId === evt.id;

                    return (
                      <tr
                        key={evt.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {evt.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                evt.eventType === "private"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                              }`}
                            >
                              {evt.eventType === "private" ? (
                                <Lock className="w-2.5 h-2.5" />
                              ) : (
                                <Radio className="w-2.5 h-2.5" />
                              )}
                              <span>
                                {evt.eventType === "private"
                                  ? "Private"
                                  : "Go Live"}
                              </span>
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                              {evt.subject}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {orgName}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                            Creator: {evt.createdBy?.name || "Organization"}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {evt.date} · {evt.time}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 capitalize">
                            {evt.mode} · {evt.attendees?.length || 0} attendees
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          {status === "approved" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          )}
                          {status === "pending" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                              <Hourglass className="w-3.5 h-3.5" />
                              <span>Pending Approval</span>
                            </span>
                          )}
                          {status === "rejected" && (
                            <div>
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold border border-rose-300 dark:border-rose-800">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Declined</span>
                              </span>
                              {evt.rejectionReason && (
                                <p className="text-[11px] text-rose-500 mt-1 max-w-[180px] line-clamp-2">
                                  {evt.rejectionReason}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewEvent(evt)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 transition inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {status !== "approved" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApproveEvent(evt)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {status === "pending" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setRejectEventTarget(evt);
                                  setRejectEventReason("");
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDeleteEventTarget(evt)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                              title="Delete Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: SUSPENSION QUERIES & UNSUSPEND REQUESTS               */}
      {/* ============================================================ */}
      {activeTab === "appeals" && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search queries or unsuspend requests by user name, email, or message..."
                value={appealSearch}
                onChange={(e) => setAppealSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "all", label: "All Appeals" },
                  { id: "suspension_query", label: "Suspension Queries" },
                  { id: "unsuspend_request", label: "Unsuspend Requests" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAppealTypeFilter(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    appealTypeFilter === item.id
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAppeals.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-base">
                No suspension queries or unsuspend requests yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                When suspended users submit a reason query or request to
                unsuspend their account, it arrives here directly.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
              {filteredAppeals.map((appeal) => {
                const isUnsuspendRequest =
                  appeal.notificationCategory === "unsuspend_request" ||
                  (appeal.title || "").toLowerCase().includes("unsuspension");
                const senderUser = allPlatformUsers.find(
                  (u) => u.id === appeal.senderId,
                );

                return (
                  <div
                    key={appeal.id}
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      !appeal.read
                        ? "bg-amber-50/40 dark:bg-amber-950/15"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isUnsuspendRequest
                              ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                              : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {isUnsuspendRequest
                            ? "Unsuspend Request"
                            : "Suspension Query"}
                        </span>

                        {appeal.replied && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Replied
                          </span>
                        )}

                        {senderUser && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              senderUser.isSuspended
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}
                          >
                            {senderUser.isSuspended
                              ? "Currently Suspended"
                              : "Now Active"}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {appeal.createdAt}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {appeal.senderName || appeal.title}{" "}
                        {appeal.senderEmail && (
                          <span className="font-normal text-xs text-slate-500 dark:text-slate-400">
                            ({appeal.senderEmail})
                          </span>
                        )}
                      </h4>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                        {appeal.message}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {appeal.senderId && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyAppealNotif(appeal);
                            setReplyText("");
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center space-x-1.5 transition cursor-pointer"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>Reply to User</span>
                        </button>
                      )}

                      {senderUser?.isSuspended && (
                        <button
                          type="button"
                          disabled={busyActionId === senderUser.id}
                          onClick={() => handleConfirmReactivate(senderUser)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Unsuspend Account</span>
                        </button>
                      )}

                      {!appeal.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(appeal.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          Mark Read
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

      {/* ============================================================ */}
      {/* USER DETAILS DRAWER                                          */}
      {/* ============================================================ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col overflow-y-auto border-l border-slate-200 dark:border-slate-700">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center uppercase shadow-md">
                  {selectedUser.name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-slate-300">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-sm text-slate-700 dark:text-slate-200">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
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
                      <span>ACTIVE &amp; OPERATIONAL</span>
                    </div>
                  )}
                  {selectedUser.suspendedReason && (
                    <p className="text-xs text-rose-500 mt-1">
                      Reason: {selectedUser.suspendedReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setNotifModalUser(selectedUser)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>

                  {!isSuperAdminUser(selectedUser) &&
                    selectedUser.id !== currentUser?.id && (
                      <>
                        {selectedUser.isSuspended ? (
                          <button
                            onClick={() => handleConfirmReactivate(selectedUser)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendModalUser(selectedUser)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                      </>
                    )}
                </div>
              </div>

              {/* Recent Appeals from this user */}
              {appealNotifications.some((a) => a.senderId === selectedUser.id) && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Suspension Queries &amp; Appeals</span>
                  </h4>
                  <div className="space-y-2">
                    {appealNotifications
                      .filter((a) => a.senderId === selectedUser.id)
                      .map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <span>{a.title}</span>
                            <span>{a.createdAt}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">
                            {a.message}
                          </p>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyAppealNotif(a);
                                setReplyText("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Reply className="w-3 h-3" />
                              <span>Reply</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* General Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  User Identification &amp; Role
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block mb-0.5">User ID</span>
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
                      className={`font-semibold ${
                        selectedUser.kycVerified
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {selectedUser.kycVerified
                        ? "Verified"
                        : "Unverified / Pending"}
                    </span>
                  </div>
                </div>
              </div>

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

              {(selectedUser.role === "organization" ||
                selectedUser.registrationId ||
                selectedUser.accreditationStatus) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Organization &amp; Accreditation Details</span>
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

              {/* Bank Payout Account Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Direct Bank Payout Account</span>
                </h4>
                {selectedUser.paystackSubaccount?.subaccount_code ? (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Account Reference:</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
                        {selectedUser.paystackSubaccount.subaccount_code}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Business Name:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedUser.paystackSubaccount.business_name || "N/A"}
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
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                      <button
                        type="button"
                        disabled={deletingUserSubaccount}
                        onClick={async () => {
                          const code =
                            selectedUser.paystackSubaccount?.subaccount_code;
                          if (!code) return;
                          setDeletingUserSubaccount(true);
                          try {
                            const res = await deletePaystackSubaccount(
                              code,
                              selectedUser.id,
                            );
                            setSelectedUser((prev) => {
                              if (!prev) return null;
                              const copy = { ...prev };
                              delete copy.paystackSubaccount;
                              return copy;
                            });
                            showFeedback(res.message);
                          } finally {
                            setDeletingUserSubaccount(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {deletingUserSubaccount
                            ? "Removing & Deactivating..."
                            : "Deactivate & Delete Subaccount"}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    No bank payout account has been linked to this user account
                    yet.
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
                    <span>Attached Documents &amp; Links</span>
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

      {/* ============================================================ */}
      {/* COURSE PREVIEW / INSPECTION MODAL                            */}
      {/* ============================================================ */}
      {previewCourse && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewCourse(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    {previewCourse.category || "General"}
                  </span>
                  {getCourseApprovalStatus(previewCourse) === "pending" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Pending Approval
                    </span>
                  )}
                  {getCourseApprovalStatus(previewCourse) === "approved" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Approved
                    </span>
                  )}
                  {getCourseApprovalStatus(previewCourse) === "rejected" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      Declined
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {previewCourse.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Organization:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {resolveOrgName(
                      previewCourse.orgId,
                      undefined,
                      previewCourse.createdBy,
                    )}
                  </strong>{" "}
                  · Creator:{" "}
                  {resolveCreatorName(
                    previewCourse.createdBy,
                    previewCourse.instructor,
                  )}
                </p>
              </div>
              <button
                onClick={() => setPreviewCourse(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {previewCourse.description || "No description provided."}
              </p>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Tuition Fee</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Number(previewCourse.price || 0) > 0
                      ? `${previewCourse.currency || "NGN"} ${Number(
                          previewCourse.price,
                        ).toLocaleString()}`
                      : "Free"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Instructor</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {previewCourse.instructor || "Unassigned"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Modules</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {previewCourse.modules?.length || 0} modules
                  </span>
                </div>
              </div>

              {previewCourse.modules && previewCourse.modules.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Syllabus Overview
                  </h4>
                  <div className="space-y-1.5">
                    {previewCourse.modules.map((mod, idx) => (
                      <div
                        key={mod.id || idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {mod.title || "Untitled Module"}
                        </span>
                        <span className="text-slate-400">
                          {mod.items?.length || 0} item(s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const id = previewCourse.id;
                  setPreviewCourse(null);
                  navigate(`/course/${id}`);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-600/20 inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Course Page</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {getCourseApprovalStatus(previewCourse) !== "approved" && (
                  <button
                    type="button"
                    disabled={busyActionId === previewCourse.id}
                    onClick={() => handleApproveCourse(previewCourse)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Course</span>
                  </button>
                )}

                {getCourseApprovalStatus(previewCourse) === "pending" && (
                  <button
                    type="button"
                    disabled={busyActionId === previewCourse.id}
                    onClick={() => {
                      setRejectCourseTarget(previewCourse);
                      setRejectCourseReason("");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-pointer"
                  >
                    Decline
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDeleteCourseTarget(previewCourse)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Course</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {previewEvent && (
        <EventDetailsModel
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
        />
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

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Suspending this account allows the user to sign in, but locks out
              all application features and routes. From the suspension portal,
              they can query why their account was suspended or submit a request
              to unsuspend it.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Suspension
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSubmittingSuspend}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-all shadow-md shadow-amber-900/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
                  Permanently Delete Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deleteModalUser.name} ({deleteModalUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 leading-relaxed">
              Warning: This action permanently deletes this account from the
              backend and cascades across the platform to remove all courses,
              events, enrollments, memberships, assessments, payroll records,
              and subaccounts associated with it.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-md shadow-rose-900/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDelete && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Delete Everything Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT COURSE MODAL */}
      {rejectCourseTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Decline Course Submission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rejectCourseTarget.title}
            </p>
            <textarea
              rows={3}
              placeholder="Optional feedback or reason for declining..."
              value={rejectCourseReason}
              onChange={(e) => setRejectCourseReason(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:text-white"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectCourseTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectCourse}
                disabled={busyActionId === rejectCourseTarget.id}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE COURSE MODAL */}
      {deleteCourseTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete Course
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deleteCourseTarget.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
              This will permanently delete the course and cascade-clean its
              enrollments, materials, assessments, submissions, attendance, and
              schedule sessions across the platform.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteCourseTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                disabled={busyActionId === deleteCourseTarget.id}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50"
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT EVENT MODAL */}
      {rejectEventTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Decline Event Submission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rejectEventTarget.title}
            </p>
            <textarea
              rows={3}
              placeholder="Optional feedback or reason for declining..."
              value={rejectEventReason}
              onChange={(e) => setRejectEventReason(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:text-white"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectEventTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectEvent}
                disabled={busyActionId === rejectEventTarget.id}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EVENT MODAL */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete Event
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deleteEventTarget.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
              This will permanently remove this event from the backend and all
              platform listings.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteEventTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
                disabled={busyActionId === deleteEventTarget.id}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLY TO SUSPENSION QUERY MODAL */}
      {replyAppealNotif && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400">
                <Reply className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Reply to Suspended User
                </h3>
              </div>
              <button
                onClick={() => setReplyAppealNotif(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {replyAppealNotif.senderName} ({replyAppealNotif.senderEmail})
              </p>
              <p className="text-slate-600 dark:text-slate-400 italic">
                &ldquo;{replyAppealNotif.message}&rdquo;
              </p>
            </div>

            <form onSubmit={handleSubmitAppealReply} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Response (drops directly into user&apos;s notifications)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the suspension details or next steps..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReplyAppealNotif(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReply || !replyText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReply ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send Reply</span>
                </button>
              </div>
            </form>
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      notifModalUser === "all"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    All Users (Broadcast)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (notifModalUser === "all") {
                        const firstUser =
                          allPlatformUsers.find((u) => !u.isDeleted) || null;
                        setNotifModalUser(firstUser);
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      notifModalUser !== "all"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    Particular User
                  </button>
                </div>

                {notifModalUser !== "all" ? (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Select User (Student, Instructor, Organization)
                    </label>
                    <select
                      value={
                        typeof notifModalUser === "object" && notifModalUser
                          ? notifModalUser.id
                          : ""
                      }
                      onChange={(e) => {
                        const found = allPlatformUsers.find(
                          (u) => u.id === e.target.value,
                        );
                        if (found) setNotifModalUser(found);
                      }}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white"
                    >
                      {allPlatformUsers
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
                    Message will be delivered to ALL registered Backpack users.
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNotif}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-all shadow-md shadow-sky-900/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
