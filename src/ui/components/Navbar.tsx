import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import {
  Briefcase,
  GraduationCap,
  LogOut,
  Moon,
  Sun,
  User,
  Menu,
  X,
  Bell,
  Video,
  CheckCheck,
  Trash2,
  Send,
  ShieldCheck,
  AlertCircle,
  Rocket,
  ChevronDown,
  MoreHorizontal,
  Settings,
  Plus,
  CalendarDays,
  Accessibility,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useTheme } from "../../store/ThemeContext";
import { useAccessibility } from "../../store/AccessibilityContext";
import {
  getNotificationPermission,
  requestPushPermission,
  sendPushNotification,
} from "../../lib/pushNotifications";
import { BlueBackpack3DIcon } from "./BlueBackpack3DIcon";

export const Navbar = () => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useAuth();
  const {
    scheduleEvents,
    courses,
    notifications,
    enrollmentRequests = [],
    orgMembers,
    organizations,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    addNotification,
  } = useAppContext();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { openAccessibilityModal, hasActiveFeatures } = useAccessibility();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    getNotificationPermission(),
  );
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Determine authorized / enrolled course IDs for the current user
  const userEnrolledCourseIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "student") {
      return [
        ...enrollmentRequests
          .filter((req) => req.userId === currentUser.id && req.status === "approved")
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

  // Strictly only show live class alerts for classrooms the user is actually enrolled in or instructing
  const activeLiveCalls = useMemo(() => {
    const active = scheduleEvents.filter(
      (e) => e.isActive && e.courseId && userEnrolledCourseIds.includes(e.courseId),
    );
    const seen = new Set<string>();
    return active.filter((e) => {
      const key = e.courseId || e.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [scheduleEvents, userEnrolledCourseIds]);

  const studentInvites =
    currentUser?.role === "student"
      ? orgMembers.filter(
          (m) =>
            m.email?.toLowerCase() === currentUser?.email?.toLowerCase() &&
            m.status === "invited",
        )
      : [];

  const inviteNotifications = studentInvites.map((invite) => {
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
      title: `Course Invitation 🎓`,
      message: `You have been invited by ${sponsoringOrg?.name || "an organization"} to enroll in "${courseTitle}". Click to accept & join.`,
      type: "info" as const,
      createdAt: invite.joinedAt || "Recently",
      read: false,
      linkUrl: "/dashboard#pending-course-invitations",
    };
  });

  const rawUserNotifications = notifications.filter((n) => {
    // Must belong to this user if userId is specified
    if (n.userId && n.userId !== currentUser?.id) {
      return false;
    }
    // If course-specific notification, only show if user is enrolled or instructor
    if (n.courseId) {
      return userEnrolledCourseIds.includes(n.courseId);
    }
    // If linkUrl points to a specific course /course/:courseId
    if (n.linkUrl && n.linkUrl.startsWith("/course/")) {
      const parts = n.linkUrl.split("?")[0].split("/");
      const urlCourseId = parts[2];
      if (urlCourseId && !userEnrolledCourseIds.includes(urlCourseId)) {
        return false;
      }
    }
    return true;
  });
  const userNotifications = [
    ...inviteNotifications.filter(
      (invNotif) => !rawUserNotifications.some((n) => n.id === invNotif.id),
    ),
    ...rawUserNotifications,
  ];

  const unreadCount =
    userNotifications.filter((n) => !n.read).length + activeLiveCalls.length;

  const handleRequestPush = async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === "granted") {
      sendPushNotification("Push Notifications Enabled! 🎉", {
        body: "You will now receive desktop push alerts for live classes and updates.",
      });
    }
  };

  const handleSendTestPush = () => {
    if (pushPermission !== "granted") {
      handleRequestPush();
      return;
    }
    const notif = sendPushNotification("Backpack LMS Test Alert 🚀", {
      body: "Free browser push notifications are active and operational!",
      linkUrl: "/dashboard",
    });
    if (notif) {
      setTestPushStatus("Test notification sent to system tray!");
      setTimeout(() => setTestPushStatus(null), 3000);
    } else {
      setTestPushStatus("Push notification blocked by browser settings.");
      setTimeout(() => setTestPushStatus(null), 3000);
    }
    // Also add to in-app
    addNotification({
      title: "Test Push Notification Sent 🚀",
      message: "Browser push notifications are active.",
      type: "info",
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLinkStyle = (path: string) =>
    `text-xs lg:text-sm font-medium transition-colors font-body px-2 lg:px-2.5 py-1.5 rounded-lg whitespace-nowrap ${
      pathname === path
        ? "text-[#0078d4] dark:text-[#04a4ec] font-bold bg-[#d6e9f8]/60 dark:bg-[#1a384f]/60"
        : "text-slate-700 dark:text-slate-200 hover:text-[#0078d4] dark:hover:text-[#04a4ec] hover:bg-[#e2f0fb] dark:hover:bg-[#153147]/40"
    }`;

  const getMobileLinkStyle = (path: string) =>
    `flex items-center min-h-[44px] px-4 py-2.5 rounded-xl text-base font-medium transition-colors font-body ${
      pathname === path
        ? "bg-[#d6e9f8] dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] font-bold"
        : "text-slate-700 dark:text-slate-200 hover:bg-[#e2f0fb] dark:hover:bg-[#153147]/50"
    }`;

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => setMobileMenuOpen(false);
  const closeMore = () => setMoreOpen(false);

  const moreActive =
    pathname === "/explore" ||
    pathname === "/upload-course" ||
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/onboard" ||
    pathname === "/events";

  const moreTriggerStyle = `flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors font-heading border whitespace-nowrap ${
    moreActive
      ? "bg-[#d6e9f8] dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] border-[#b8daf4] dark:border-[#254b68] font-bold"
      : "border-transparent text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-[#e2f0fb] dark:hover:bg-[#153147]/40"
  }`;

  const moreItemStyle = (path: string) =>
    `flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors font-body ${
      pathname === path
        ? "bg-[#d6e9f8] dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] font-bold"
        : "text-slate-700 dark:text-slate-200 hover:bg-[#f0f7fd] dark:hover:bg-[#153147]/50"
    }`;

  return (
    <nav className="bg-[#f0f7fd]/95 dark:bg-[#0f2231]/95 backdrop-blur-md border-b border-[#d6e9f8] dark:border-[#1e3a52] sticky top-0 z-50 px-3 sm:px-6 py-3 font-body shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center space-x-2 sm:space-x-3 group shrink-0"
        >
          <div className="flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <BlueBackpack3DIcon className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-md" />
          </div>

          <div className="flex flex-col leading-tight shrink-0">
            <span className="text-sm sm:text-xl font-extrabold tracking-wide text-slate-900 dark:text-white font-heading whitespace-nowrap">
              BACKPACK
            </span>
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[#0078d4] dark:text-[#04a4ec] font-bold font-heading whitespace-nowrap">
              Education Without Borders
            </span>
          </div>
        </Link>

        {/* Global Right Controls (Theme, Notifications, Hamburger) */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1.5 lg:space-x-3 pl-2">
            <Link to="/" className={getLinkStyle("/")}>
              Home
            </Link>

            {currentUser && (
              <Link to="/dashboard" className={getLinkStyle("/dashboard")}>
                Dashboard
              </Link>
            )}

            <Link
              to="/lunch"
              className={`${getLinkStyle("/lunch")} flex items-center space-x-1`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Launch Box</span>
            </Link>

            <Link
              to="/about-us"
              className={`${getLinkStyle("/about-us")} flex items-center space-x-1`}
            >
              <User className="w-3.5 h-3.5" />
              <span>About Us</span>
            </Link>

            {(currentUser?.email?.toLowerCase() === "ekenehq@gmail.com" ||
              currentUser?.role === "super_admin") && (
              <Link
                to="/admin"
                title="Super Admin Portal"
                aria-label="Super Admin Portal"
                className="flex items-center justify-center p-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-xs shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </Link>
            )}

            {!currentUser && (
              <Link
                to="/events"
                className={`${getLinkStyle("/events")} flex items-center space-x-1`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Events</span>
              </Link>
            )}

            {/* More Dropdown (Contains User Profile & All Secondary Options) */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={moreTriggerStyle}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>More</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    moreOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f2231] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-2xl shadow-xl z-50 p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header Card inside Dropdown */}
                  {currentUser ? (
                    <>
                      <Link
                        to={
                          currentUser.role === "super_admin" ||
                          currentUser.email?.toLowerCase() === "ekenehq@gmail.com"
                            ? "/admin"
                            : "/profile"
                        }
                        onClick={closeMore}
                        className="flex items-center space-x-2.5 p-2 rounded-xl bg-[#f0f7fd] dark:bg-[#132838] hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f] border border-[#d6e9f8] dark:border-[#1e3a52] transition mb-1 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0078d4]/10 dark:bg-[#04a4ec]/20 flex items-center justify-center shrink-0">
                          {currentUser.role === "super_admin" ||
                          currentUser.email?.toLowerCase() === "ekenehq@gmail.com" ? (
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                          ) : currentUser.role === "student" ? (
                            <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Briefcase className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate font-heading group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec]">
                            {currentUser.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                            {currentUser.role.replace("_", " ")}
                          </span>
                        </div>
                      </Link>

                      <div className="border-t border-[#d6e9f8] dark:border-[#1e3a52] my-1" />

                      <Link
                        to="/profile"
                        onClick={closeMore}
                        className={moreItemStyle("/profile")}
                      >
                        <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={closeMore}
                        className={moreItemStyle("/settings")}
                      >
                        <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Settings</span>
                      </Link>

                      {currentUser.role === "student" && (
                        <Link
                          to="/explore"
                          onClick={closeMore}
                          className={moreItemStyle("/explore")}
                        >
                          <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                          <span>Explore Orgs</span>
                        </Link>
                      )}

                      {(currentUser.role === "organization" ||
                        currentUser.role === "instructor" ||
                        currentUser.role === "super_admin" ||
                        currentUser.email?.toLowerCase() === "ekenehq@gmail.com") && (
                        <Link
                          to="/upload-course"
                          onClick={closeMore}
                          className={moreItemStyle("/upload-course")}
                        >
                          <Plus className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                          <span>Add Course</span>
                        </Link>
                      )}

                      <Link
                        to="/events"
                        onClick={closeMore}
                        className={moreItemStyle("/events")}
                      >
                        <CalendarDays className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Events</span>
                      </Link>

                      {currentUser.role === "organization" &&
                        currentUser.role !== "super_admin" &&
                        currentUser.email?.toLowerCase() !== "ekenehq@gmail.com" && (
                          <Link
                            to="/onboard"
                            onClick={closeMore}
                            className={moreItemStyle("/onboard")}
                          >
                            <Briefcase className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <span>Organization Setup</span>
                          </Link>
                        )}

                      {(currentUser.email?.toLowerCase() === "ekenehq@gmail.com" ||
                        currentUser.role === "super_admin") && (
                        <Link
                          to="/admin"
                          onClick={closeMore}
                          className={moreItemStyle("/admin")}
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                          <span>Super Admin Portal</span>
                        </Link>
                      )}

                      {/* Divider + Logout */}
                      <div className="my-1 border-t border-[#d6e9f8] dark:border-[#1e3a52]" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={closeMore}
                        className={moreItemStyle("/login")}
                      >
                        <LogIn className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Login</span>
                      </Link>
                      <Link
                        to="/signup"
                        onClick={closeMore}
                        className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-bold bg-[#0078d4] text-white hover:bg-[#006cbd] transition-colors mt-1 justify-center shadow-xs cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Top Navbar Notification Bell for logged in users (Desktop Only) */}
          {currentUser && (
            <div className="hidden md:block">
              <NotificationsBell
                unreadCount={unreadCount}
                userNotifications={userNotifications}
                pushPermission={pushPermission}
                testPushStatus={testPushStatus}
                activeLiveCalls={activeLiveCalls}
                courses={courses}
                onRequestPush={handleRequestPush}
                onSendTestPush={handleSendTestPush}
                onMarkAllRead={markAllNotificationsRead}
                onClearNotifications={clearNotifications}
                onMarkRead={markNotificationRead}
                onNavigate={(to) => {
                  setMobileMenuOpen(false);
                  navigate(to);
                }}
              />
            </div>
          )}

          {/* Accessibility Suite Button — Visible on Desktop view */}
          <button
            onClick={() => openAccessibilityModal()}
            className="hidden md:flex relative min-h-[40px] min-w-[40px] items-center justify-center p-2 rounded-full hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Special Needs & Accessibility Suite (Dyslexia font, color filters, TTS, reading ruler, exam multipliers)"
            aria-label="Open Special Needs and Accessibility Suite"
          >
            <Accessibility className="w-4.5 h-4.5 text-[#0078d4] dark:text-[#04a4ec]" />
            {hasActiveFeatures && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800 animate-pulse" />
            )}
          </button>

          {/* Theme Toggle Button — Visible on Desktop view */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex min-h-[40px] min-w-[40px] items-center justify-center p-2 rounded-full hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-700" />
            )}
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-[#e2f0fb] dark:bg-[#1a384f] text-slate-700 dark:text-slate-200 hover:bg-[#d6e9f8] dark:hover:bg-[#204461] focus:outline-none md:hidden cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#0078d4] dark:text-[#04a4ec]" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[#d6e9f8] dark:border-[#1e3a52] space-y-1.5 animate-in slide-in-from-top-2 max-h-[82vh] overflow-y-auto pb-6 px-1">
          <Link to="/" onClick={closeMenu} className={getMobileLinkStyle("/")}>
            Home
          </Link>

          {currentUser && (
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className={getMobileLinkStyle("/dashboard")}
            >
              Dashboard
            </Link>
          )}

          {(currentUser?.email?.toLowerCase() === "ekenehq@gmail.com" ||
            currentUser?.role === "super_admin") && (
            <Link
              to="/admin"
              onClick={closeMenu}
              className={`${getMobileLinkStyle("/admin")} text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
              <span>Super Admin Portal</span>
            </Link>
          )}

          {currentUser && currentUser.role === "student" && (
            <Link
              to="/explore"
              onClick={closeMenu}
              className={getMobileLinkStyle("/explore")}
            >
              Explore Orgs
            </Link>
          )}

          {currentUser &&
            (currentUser.role === "organization" ||
              currentUser.role === "instructor" ||
              currentUser.role === "super_admin" ||
              currentUser.email?.toLowerCase() === "ekenehq@gmail.com") && (
              <Link
                to="/upload-course"
                onClick={closeMenu}
                className={getMobileLinkStyle("/upload-course")}
              >
                Add Course
              </Link>
            )}

          {currentUser && (
            <>
              <Link
                to="/profile"
                onClick={closeMenu}
                className={getMobileLinkStyle("/profile")}
              >
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={closeMenu}
                className={getMobileLinkStyle("/settings")}
              >
                Settings
              </Link>
            </>
          )}

          <Link
            to="/events"
            onClick={closeMenu}
            className={`${getMobileLinkStyle("/events")} flex items-center space-x-2`}
          >
            <CalendarDays className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
            <span>Events</span>
          </Link>

          <Link
            to="/lunch"
            onClick={closeMenu}
            className={`${getMobileLinkStyle("/lunch")} flex items-center space-x-2`}
          >
            <Rocket className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
            <span>Launch Box</span>
          </Link>

          <Link
            to="/about-us"
            onClick={closeMenu}
            className={`${getMobileLinkStyle("/about-us")} flex items-center space-x-2`}
          >
            <User className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec] shrink-0" />
            <span>About Us</span>
          </Link>

          {currentUser && currentUser.role === "organization" && (
            <Link
              to="/onboard"
              onClick={closeMenu}
              className={getMobileLinkStyle("/onboard")}
            >
              Organization Setup
            </Link>
          )}

          {/* Notifications inside Mobile Drawer */}
          {currentUser && (
            <div className="flex items-center justify-between min-h-[44px] px-4 py-2 rounded-xl bg-[#e2f0fb]/60 dark:bg-[#1a384f]/60 text-slate-700 dark:text-slate-200">
              <span className="text-sm font-semibold font-heading flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                    {unreadCount}
                  </span>
                )}
              </span>
              <NotificationsBell
                unreadCount={unreadCount}
                userNotifications={userNotifications}
                pushPermission={pushPermission}
                testPushStatus={testPushStatus}
                activeLiveCalls={activeLiveCalls}
                courses={courses}
                onRequestPush={handleRequestPush}
                onSendTestPush={handleSendTestPush}
                onMarkAllRead={markAllNotificationsRead}
                onClearNotifications={clearNotifications}
                onMarkRead={markNotificationRead}
                onNavigate={(to) => {
                  setMobileMenuOpen(false);
                  navigate(to);
                }}
              />
            </div>
          )}

          {/* Accessibility & Special Needs Suite inside Mobile Drawer */}
          <button
            onClick={() => {
              closeMenu();
              openAccessibilityModal();
            }}
            className="flex items-center space-x-2.5 w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#d6e9f8] dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] text-sm font-bold transition font-heading cursor-pointer"
          >
            <Accessibility className="w-5 h-5 shrink-0" />
            <span>Accessibility & Special Needs</span>
            {hasActiveFeatures && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-auto" />
            )}
          </button>

          {/* Theme Toggle inside Mobile Drawer */}
          <button
            onClick={() => {
              toggleTheme();
            }}
            className="flex items-center justify-between w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#e2f0fb] dark:bg-[#1a384f] text-slate-700 dark:text-slate-200 text-sm font-medium transition font-heading cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-xs font-semibold text-[#0078d4] dark:text-[#04a4ec]">
              {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            </span>
          </button>

          <div className="pt-3 border-t border-[#d6e9f8] dark:border-[#1e3a52]">
            {currentUser ? (
              <div className="flex flex-col space-y-2.5 p-3 bg-white/60 dark:bg-[#132838]/80 rounded-2xl border border-[#d6e9f8] dark:border-[#1e3a52]">
                <div className="flex items-center space-x-2 text-sm font-medium text-slate-800 dark:text-slate-200 font-heading min-w-0">
                  {currentUser.role === "student" ? (
                    <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate">
                    {currentUser.name} ({currentUser.role})
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center min-h-[44px] w-full px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition cursor-pointer font-heading"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1 font-heading">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center min-h-[44px] text-center py-2.5 rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-white dark:bg-[#132838] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#f0f7fd] dark:hover:bg-[#1a384f] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenu}
                  className="flex items-center justify-center min-h-[44px] text-center py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-semibold shadow-xs transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

/* ============================================================= */
/* Notifications Bell — self-contained, reused on desktop + mobile */
/* ============================================================= */

interface NavNotifItem {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  read?: boolean;
  linkUrl?: string;
  userId?: string;
}

interface NavLiveItem {
  id: string;
  courseId?: string;
  title: string;
}

interface NavCourseItem {
  id: string;
  title?: string;
}

interface NotificationsBellProps {
  unreadCount: number;
  userNotifications: NavNotifItem[];
  pushPermission: NotificationPermission;
  testPushStatus: string | null;
  activeLiveCalls: NavLiveItem[];
  courses: NavCourseItem[];
  onRequestPush: () => void;
  onSendTestPush: () => void;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onMarkRead: (id: string) => void;
  onNavigate: (to: string) => void;
}

const NotificationsBell: React.FC<NotificationsBellProps> = ({
  unreadCount,
  userNotifications,
  pushPermission,
  testPushStatus,
  activeLiveCalls,
  courses,
  onRequestPush,
  onSendTestPush,
  onMarkAllRead,
  onClearNotifications,
  onMarkRead,
  onNavigate,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-full hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f] text-slate-700 dark:text-slate-200 transition-colors relative cursor-pointer"
        title="Notifications & Push Alerts"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[#0078d4] dark:text-[#04a4ec]" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white dark:bg-[#0f2231] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 font-body">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#d6e9f8] dark:border-[#1e3a52] pb-2.5">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0078d4] dark:text-[#04a4ec] border border-blue-200 dark:border-blue-900 font-heading">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {userNotifications.length > 0 && (
              <div className="flex items-center space-x-2 font-heading">
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] text-slate-500 hover:text-[#0078d4] dark:hover:text-[#04a4ec] font-semibold flex items-center cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-0.5" /> Read
                </button>
                <button
                  onClick={onClearNotifications}
                  className="text-[11px] text-slate-400 hover:text-red-500 font-semibold p-1 cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Browser Push Notification Permission Card */}
          <div className="p-3 bg-[#f0f7fd] dark:bg-[#132838] rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                <ShieldCheck className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                <span>Desktop Push Alerts</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-heading ${
                  pushPermission === "granted"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : pushPermission === "denied"
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {pushPermission === "granted"
                  ? "Enabled"
                  : pushPermission === "denied"
                    ? "Blocked"
                    : "Action Required"}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Get real-time browser push notifications for upcoming live
              classes, enrollments, and grading updates.
            </p>

            <div className="flex items-center justify-between gap-2 pt-1 font-heading">
              {pushPermission !== "granted" ? (
                <button
                  onClick={onRequestPush}
                  className="w-full py-2 px-3 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Push Notifications</span>
                </button>
              ) : (
                <button
                  onClick={onSendTestPush}
                  className="w-full py-1.5 px-3 bg-[#e2f0fb] dark:bg-[#1a384f] hover:bg-[#d6e9f8] dark:hover:bg-[#204461] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#04a4ec]" />
                  <span>Send Test Push Notification</span>
                </button>
              )}
            </div>

            {testPushStatus && (
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 text-center animate-pulse">
                {testPushStatus}
              </p>
            )}
          </div>

          {/* Active Live Class Alerts */}
          {activeLiveCalls.length > 0 && (
            <div className="space-y-2 pt-1 font-heading">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
                Active Live Class ({activeLiveCalls.length})
              </div>
              {activeLiveCalls.map((evt) => {
                const course = courses.find((c) => c.id === evt.courseId);
                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {evt.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase">
                          LIVE NOW
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5 font-body">
                        {course?.title || "Classroom Session"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false);
                        if (evt.courseId) {
                          onNavigate(`/course/${evt.courseId}?live=true&eventId=${evt.id}`);
                        }
                      }}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Live Class</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* In-App Notifications List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y divide-[#d6e9f8]/60 dark:divide-[#1e3a52]/60">
            {userNotifications.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  No notifications yet.
                </p>
              </div>
            ) : (
              userNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkRead(notif.id);
                    if (notif.linkUrl) {
                      setOpen(false);
                      if (notif.linkUrl.includes("#")) {
                        const [path, hash] = notif.linkUrl.split("#");
                        onNavigate(path);
                        setTimeout(() => {
                          const el = document.getElementById(hash);
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }, 200);
                      } else {
                        onNavigate(notif.linkUrl);
                      }
                    }
                  }}
                  className={`pt-2 pb-2 px-2 rounded-xl transition cursor-pointer flex items-start space-x-2.5 ${
                    !notif.read
                      ? "bg-[#e8f3fc] dark:bg-[#132838] border border-[#d6e9f8]/60 dark:border-[#1e3a52]/60"
                      : "hover:bg-[#f0f7fd] dark:hover:bg-[#132838]/50"
                  }`}
                >
                  <div className="mt-1">
                    {!notif.read ? (
                      <span className="w-2 h-2 rounded-full bg-[#0078d4] block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5
                        className={`text-xs font-bold truncate ${!notif.read ? "text-[#0078d4] dark:text-blue-300" : "text-slate-800 dark:text-slate-200"}`}
                      >
                        {notif.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1 font-mono">
                        {notif.createdAt}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
