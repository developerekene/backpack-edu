import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import {
  Bell,
  CheckCheck,
  Trash2,
  Video,
  GraduationCap,
  Award,
  FileText,
  Info,
  Search,
  ShieldCheck,
  Send,
  ExternalLink,
  X,
  Clock,
  ArrowRight,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { AppNotification } from "../../types";
import {
  getNotificationPermission,
  requestPushPermission,
  sendPushNotification,
  playNotificationChime,
} from "../../lib/pushNotifications";

export const Notifications: React.FC = () => {
  const {
    notifications,
    scheduleEvents,
    courses,
    enrollmentRequests = [],
    orgMembers = [],
    organizations = [],
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    deleteNotification,
    addNotification,
  } = useAppContext();

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Tab & Filters state
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "live_class" | "enrollment" | "grade" | "material" | "info"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for viewing full notification
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);

  // Push Permission State
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    getNotificationPermission(),
  );
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  // Determine authorized / enrolled course IDs for current user
  const userEnrolledCourseIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "student") {
      return [
        ...enrollmentRequests
          .filter(
            (req) => req.userId === currentUser.id && req.status === "approved",
          )
          .map((req) => req.courseId),
        ...orgMembers
          .filter(
            (m) =>
              (m.id === currentUser.id ||
                m.email?.toLowerCase() === currentUser.email?.toLowerCase()) &&
              m.status === "active",
          )
          .flatMap((m) => m.courseIds || []),
      ];
    }
    return [
      ...courses
        .filter(
          (c) =>
            c.createdBy === currentUser.id ||
            c.orgId === currentUser.id ||
            (currentUser.orgId && c.orgId === currentUser.orgId),
        )
        .map((c) => c.id),
      ...orgMembers
        .filter(
          (m) =>
            m.id === currentUser.id ||
            m.email?.toLowerCase() === currentUser.email?.toLowerCase(),
        )
        .flatMap((m) => m.courseIds || []),
    ];
  }, [currentUser, enrollmentRequests, orgMembers, courses]);

  // Active live class sessions for this user's enrolled/instructed courses
  const activeLiveCalls = useMemo(() => {
    const active = scheduleEvents.filter(
      (e) =>
        e.isActive && e.courseId && userEnrolledCourseIds.includes(e.courseId),
    );
    const seen = new Set<string>();
    return active.filter((e) => {
      const key = e.courseId || e.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [scheduleEvents, userEnrolledCourseIds]);

  // Synthesize student invites into notification format
  const studentInvites = useMemo(() => {
    if (currentUser?.role !== "student") return [];
    return orgMembers.filter(
      (m) =>
        m.email?.toLowerCase() === currentUser?.email?.toLowerCase() &&
        m.status === "invited",
    );
  }, [currentUser, orgMembers]);

  const inviteNotifications: AppNotification[] = useMemo(() => {
    return studentInvites.map((invite) => {
      const targetCourse =
        courses.find((c) => invite.courseIds?.includes(c.id)) ||
        courses.find((c) => c.orgId === invite.orgId);
      const courseTitle = targetCourse?.title || "Course";
      const sponsoringOrg = organizations.find(
        (o) =>
          o.id === invite.orgId ||
          o.id === targetCourse?.orgId ||
          o.ownerId === invite.orgId,
      );
      return {
        id: `invite_notif_${invite.id}`,
        userId: currentUser?.id,
        title: "Course Invitation 🎓",
        message: `You have been invited by ${sponsoringOrg?.name || "an organization"} to enroll in "${courseTitle}". Click to view and join this cohort.`,
        type: "enrollment" as const,
        createdAt: invite.joinedAt || "Recently",
        read: false,
        linkUrl: "/dashboard#pending-course-invitations",
        courseId: targetCourse?.id,
      };
    });
  }, [studentInvites, courses, organizations, currentUser?.id]);

  // Combine user notifications with invites, avoiding duplicates
  const allUserNotifications: AppNotification[] = useMemo(() => {
    const raw = notifications.filter((n) => {
      if (n.userId && n.userId !== currentUser?.id) return false;
      if (n.courseId && !userEnrolledCourseIds.includes(n.courseId)) return false;
      if (n.linkUrl && n.linkUrl.startsWith("/course/")) {
        const parts = n.linkUrl.split("?")[0].split("/");
        const urlCourseId = parts[2];
        if (urlCourseId && !userEnrolledCourseIds.includes(urlCourseId)) {
          return false;
        }
      }
      return true;
    });

    const combined = [
      ...inviteNotifications.filter(
        (invNotif) => !raw.some((n) => n.id === invNotif.id),
      ),
      ...raw,
    ];

    // Deduplicate by ID
    const seen = new Set<string>();
    return combined.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [notifications, currentUser?.id, userEnrolledCourseIds, inviteNotifications]);

  // Filtered list based on active tab, category, and search query
  const filteredNotifications = useMemo(() => {
    return allUserNotifications.filter((n) => {
      // 1. Tab filter (all / unread / read)
      if (activeTab === "unread" && n.read) return false;
      if (activeTab === "read" && !n.read) return false;

      // 2. Category filter
      if (categoryFilter !== "all" && n.type !== categoryFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title.toLowerCase().includes(q);
        const msgMatch = n.message.toLowerCase().includes(q);
        return titleMatch || msgMatch;
      }

      return true;
    });
  }, [allUserNotifications, activeTab, categoryFilter, searchQuery]);

  const unreadCount = useMemo(() => {
    return allUserNotifications.filter((n) => !n.read).length;
  }, [allUserNotifications]);

  const readCount = useMemo(() => {
    return allUserNotifications.filter((n) => n.read).length;
  }, [allUserNotifications]);

  // Handlers
  const handleOpenNotification = async (notif: AppNotification) => {
    setSelectedNotification(notif);
    // Mark as read immediately on backend and state
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
  };

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await deleteNotification(id);
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const handleRequestPush = async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === "granted") {
      playNotificationChime();
      sendPushNotification("Push Notifications Enabled! 🎉", {
        body: "You will now receive desktop push alerts and class reminders from Backpack.",
        linkUrl: "/notifications",
      });
    }
  };

  const handleSendTestPush = () => {
    if (pushPermission !== "granted") {
      handleRequestPush();
      return;
    }
    playNotificationChime();
    const notif = sendPushNotification("Backpack Browser Alert 🚀", {
      body: "Browser push notifications are active! You will receive timely reminders for live sessions and coursework.",
      linkUrl: "/notifications",
    });

    if (notif) {
      setTestPushStatus("Push notification sent to system tray!");
      setTimeout(() => setTestPushStatus(null), 3500);
    } else {
      setTestPushStatus("Push notification blocked by browser settings.");
      setTimeout(() => setTestPushStatus(null), 3500);
    }

    // Also add to in-app notification list
    addNotification({
      title: "Test Browser Notification 🚀",
      message: "Browser push notifications and audio reminders are fully configured and functional.",
      type: "info",
      linkUrl: "/notifications",
    });
  };

  // Helper for type icons and colors
  const getCategoryDetails = (type: AppNotification["type"]) => {
    switch (type) {
      case "live_class":
        return {
          icon: Video,
          label: "Live Class",
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-100 dark:bg-purple-900/40",
          borderColor: "border-purple-200 dark:border-purple-800",
        };
      case "enrollment":
        return {
          icon: GraduationCap,
          label: "Admission & Enrollment",
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
          borderColor: "border-emerald-200 dark:border-emerald-800",
        };
      case "grade":
        return {
          icon: Award,
          label: "Grade & Assessment",
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-100 dark:bg-amber-900/40",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
      case "material":
        return {
          icon: FileText,
          label: "Course Material",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-100 dark:bg-blue-900/40",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "info":
      default:
        return {
          icon: Info,
          label: "Announcement",
          color: "text-[#0078d4] dark:text-[#04a4ec]",
          bgColor: "bg-[#e2f0fb] dark:bg-[#1a384f]/60",
          borderColor: "border-[#b8daf4] dark:border-[#254b68]",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-body">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0f2231] rounded-3xl p-5 sm:p-7 border border-[#d6e9f8] dark:border-[#1e3a52] shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0078d4]/10 dark:bg-[#04a4ec]/20 flex items-center justify-center text-[#0078d4] dark:text-[#04a4ec] shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
                  Notification Center
                </h1>
              </div>
              {unreadCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-black shadow-xs animate-pulse">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pt-1">
              Stay up to date with class reminders, enrollment approvals, live sessions, and institution announcements.
            </p>
          </div>

          {/* Quick Global Actions */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {allUserNotifications.length > 0 && (
              <>
                <button
                  onClick={markAllNotificationsRead}
                  className="px-3.5 py-2 bg-[#f0f7fd] dark:bg-[#153147] hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl text-xs font-bold transition flex items-center cursor-pointer font-heading"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  <span>Mark All Read</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all your notifications?")) {
                      clearNotifications();
                    }
                  }}
                  className="px-3 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-xl text-xs font-bold transition flex items-center cursor-pointer font-heading"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Clear All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Browser Push Notifications Permission & Reminder Management Card */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#f0f7fd] to-[#e8f3fc] dark:from-[#132838] dark:to-[#0f2231] border border-[#b8daf4] dark:border-[#1e3a52] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#0a1824] shadow-xs text-[#0078d4] dark:text-[#04a4ec] shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-heading">
                  Browser Push Notifications & Reminders
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider font-heading ${
                    pushPermission === "granted"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : pushPermission === "denied"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {pushPermission === "granted"
                    ? "Active & Enabled"
                    : pushPermission === "denied"
                    ? "Blocked in Browser"
                    : "Permission Required"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Receive instant pop-ups on your desktop or phone browser whenever live classes start, grades are released, or course materials are uploaded.
              </p>
              {testPushStatus && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {testPushStatus}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
            {pushPermission !== "granted" ? (
              <button
                onClick={handleRequestPush}
                className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center cursor-pointer font-heading"
              >
                <Bell className="w-4 h-4 mr-1.5" />
                <span>Enable Browser Alerts</span>
              </button>
            ) : (
              <button
                onClick={handleSendTestPush}
                className="px-3.5 py-2 bg-white dark:bg-[#1a384f] hover:bg-slate-50 dark:hover:bg-[#204461] text-slate-800 dark:text-slate-200 border border-[#b8daf4] dark:border-[#254b68] rounded-xl text-xs font-bold transition shadow-xs flex items-center cursor-pointer font-heading"
              >
                <Send className="w-3.5 h-3.5 mr-1.5 text-[#0078d4] dark:text-[#04a4ec]" />
                <span>Send Test Browser Alert</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Live Class Sessions Banner */}
      {activeLiveCalls.length > 0 && (
        <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-heading">
                Live Class In Progress ({activeLiveCalls.length})
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Happening Now
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeLiveCalls.map((call) => {
              const targetCourse = courses.find((c) => c.id === call.courseId);
              return (
                <div
                  key={call.id}
                  className="bg-white dark:bg-[#0f2231] rounded-2xl p-3.5 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate font-heading">
                        {call.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {targetCourse?.title || "Enrolled Course"}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (call.courseId) {
                        navigate(
                          `/course/${call.courseId}?live=true&eventId=${call.id}`,
                        );
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center shrink-0 cursor-pointer shadow-xs font-heading"
                  >
                    <Video className="w-3.5 h-3.5 mr-1.5" />
                    <span>Join Class</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tabs, Search & Filters Bar */}
      <div className="bg-white dark:bg-[#0f2231] rounded-2xl p-3 sm:p-4 border border-[#d6e9f8] dark:border-[#1e3a52] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Read / Unread Tabs */}
        <div className="flex items-center bg-[#f0f7fd] dark:bg-[#132838] p-1 rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] self-start sm:self-auto shrink-0 font-heading">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-white dark:bg-[#0f2231] text-[#0078d4] dark:text-[#04a4ec] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All ({allUserNotifications.length})
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === "unread"
                ? "bg-white dark:bg-[#0f2231] text-[#0078d4] dark:text-[#04a4ec] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-extrabold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("read")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "read"
                ? "bg-white dark:bg-[#0f2231] text-[#0078d4] dark:text-[#04a4ec] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Read ({readCount})
          </button>
        </div>

        {/* Category Filter and Search Box */}
        <div className="flex items-center space-x-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#f0f7fd]/60 dark:bg-[#132838] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0078d4]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(
                e.target.value as
                  | "all"
                  | "live_class"
                  | "enrollment"
                  | "grade"
                  | "material"
                  | "info",
              )
            }
            aria-label="Filter notifications by category"
            className="px-2.5 py-1.5 bg-[#f0f7fd]/60 dark:bg-[#132838] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="live_class">Live Classes</option>
            <option value="enrollment">Admissions</option>
            <option value="grade">Grades</option>
            <option value="material">Materials</option>
            <option value="info">Announcements</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-[#0f2231] rounded-3xl p-12 text-center border border-dashed border-[#d6e9f8] dark:border-[#1e3a52] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f0f7fd] dark:bg-[#132838] flex items-center justify-center mx-auto text-slate-400">
              <Bell className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 font-heading">
              {activeTab === "unread"
                ? "You're All Caught Up!"
                : activeTab === "read"
                ? "No Read Notifications"
                : "No Notifications Found"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? "No notifications matched your search query. Try clearing your search or choosing another filter."
                : activeTab === "unread"
                ? "There are no unread notifications right now. Check the 'All' tab to review previous updates."
                : "Notifications regarding your courses, enrolled classes, grades, and live sessions will appear here."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const cat = getCategoryDetails(notif.type);
            const Icon = cat.icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotification(notif)}
                className={`p-4 sm:p-5 rounded-2xl transition-all duration-150 border cursor-pointer select-none group relative ${
                  !notif.read
                    ? "bg-white dark:bg-[#0f2231] border-[#0078d4]/40 dark:border-[#04a4ec]/40 shadow-xs hover:border-[#0078d4]"
                    : "bg-[#f8fafd] dark:bg-[#0a1824]/60 border-[#e2f0fb] dark:border-[#1e3a52] hover:bg-white dark:hover:bg-[#0f2231]"
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  {/* Category Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${cat.bgColor} ${cat.borderColor} ${cat.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-heading ${cat.bgColor} ${cat.color}`}
                      >
                        {cat.label}
                      </span>

                      {!notif.read ? (
                        <span className="flex items-center text-[10px] font-black text-[#0078d4] dark:text-[#04a4ec] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4] dark:bg-[#04a4ec] mr-1.5 animate-pulse" />
                          Unread
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center">
                          <CheckCheck className="w-3 h-3 mr-1 text-slate-400" />
                          Read
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 ml-auto font-mono flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {notif.createdAt}
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-bold font-heading truncate ${
                        !notif.read
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {notif.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center space-x-1.5 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNotification(notif);
                      }}
                      className="px-3 py-1.5 bg-[#f0f7fd] hover:bg-[#e2f0fb] dark:bg-[#153147] dark:hover:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] rounded-xl text-xs font-bold transition hidden sm:flex items-center font-heading"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(notif.id, e)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      title="Delete this notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#0f2231] rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#d6e9f8] dark:border-[#1e3a52] pb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    getCategoryDetails(selectedNotification.type).bgColor
                  } ${
                    getCategoryDetails(selectedNotification.type).borderColor
                  } ${getCategoryDetails(selectedNotification.type).color}`}
                >
                  {React.createElement(
                    getCategoryDetails(selectedNotification.type).icon,
                    { className: "w-5 h-5" },
                  )}
                </div>
                <div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-heading ${
                      getCategoryDetails(selectedNotification.type).bgColor
                    } ${getCategoryDetails(selectedNotification.type).color}`}
                  >
                    {getCategoryDetails(selectedNotification.type).label}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading mt-1 leading-snug">
                    {selectedNotification.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotification(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Metadata Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-[#f0f7fd]/80 dark:bg-[#132838] px-3.5 py-2 rounded-xl">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Received: {selectedNotification.createdAt}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marked as Read</span>
              </div>
            </div>

            {/* Notification Message Body */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a1824]/60 border border-slate-100 dark:border-[#1e3a52] text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-body whitespace-pre-line">
              {selectedNotification.message}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 font-heading">
              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteNotification(selectedNotification.id)}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-xl text-xs font-bold transition flex items-center cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>Delete Notification</span>
              </button>

              <div className="flex items-center space-x-2">
                {selectedNotification.linkUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedNotification.linkUrl!;
                      setSelectedNotification(null);
                      if (url.includes("#")) {
                        const [path, hash] = url.split("#");
                        navigate(path);
                        setTimeout(() => {
                          const el = document.getElementById(hash);
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }, 200);
                      } else {
                        navigate(url);
                      }
                    }}
                    className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold transition flex items-center cursor-pointer shadow-xs"
                  >
                    <span>Go to Destination</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
