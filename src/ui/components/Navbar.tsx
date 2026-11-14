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
  ShieldCheck,
  Rocket,
  ChevronDown,
  MoreHorizontal,
  Settings,
  Plus,
  Accessibility,
  LayoutDashboard,
  CalendarDays,
  LogIn,
  UserPlus,
  Timer,
  Banknote,
} from "lucide-react";
import { useTheme } from "../../store/ThemeContext";
import { useAccessibility } from "../../store/AccessibilityContext";
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
  } = useAppContext();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { openAccessibilityModal, hasActiveFeatures } = useAccessibility();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
    pathname === "/dashboard" ||
    pathname === "/lunch" ||
    pathname === "/explore" ||
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/onboard" ||
    pathname === "/payroll" ||
    pathname === "/admin";

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

        {/* Global Right Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1.5 lg:space-x-3 pl-2">
            <Link to="/" className={getLinkStyle("/")}>
              Home
            </Link>

            <Link to="/about-us" className={getLinkStyle("/about-us")}>
              About Us
            </Link>

            <Link to="/events" className={getLinkStyle("/events")}>
              Events
            </Link>

            {/* User-Specific: Add Course button */}
            {currentUser &&
              (currentUser.role === "organization" ||
                currentUser.role === "instructor" ||
                currentUser.role === "super_admin" ||
                currentUser.email?.toLowerCase() === "ekenehq@gmail.com") && (
                <Link
                  to="/upload-course"
                  className={`${getLinkStyle("/upload-course")} flex items-center space-x-1.5`}
                >
                  <Plus className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                  <span>Add Course</span>
                </Link>
              )}

            {/* User-Specific: Notifications Bell with live unread counter (navigates directly to /notifications) */}
            {currentUser && (
              <button
                onClick={() => navigate("/notifications")}
                className={`p-2 rounded-full hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f] transition-colors relative cursor-pointer ${
                  pathname === "/notifications"
                    ? "bg-[#d6e9f8] dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec]"
                    : "text-slate-700 dark:text-slate-200"
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-[#0078d4] dark:text-[#04a4ec]" />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* More Dropdown (Contains User Profile & All Other Navigation/Icon Options) */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={moreTriggerStyle}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>More</span>
                {hasActiveFeatures && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    moreOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0f2231] border border-[#d6e9f8] dark:border-[#1e3a52] rounded-2xl shadow-xl z-50 p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
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

                      {/* Dashboard */}
                      <Link
                        to="/dashboard"
                        onClick={closeMore}
                        className={moreItemStyle("/dashboard")}
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Dashboard</span>
                      </Link>

                      {/* Attendance & Engagement Hub */}
                      <Link
                        to="/attendance"
                        onClick={closeMore}
                        className={moreItemStyle("/attendance")}
                      >
                        <Timer className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Attendance</span>
                      </Link>

                      {(currentUser.role === "organization" ||
                        currentUser.role === "org_admin" ||
                        currentUser.role === "super_admin" ||
                        currentUser.email?.toLowerCase() === "ekenehq@gmail.com") && (
                        <Link
                          to="/payroll"
                          onClick={closeMore}
                          className={moreItemStyle("/payroll")}
                        >
                          <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Instructor Payroll</span>
                        </Link>
                      )}

                      {/* Launch Box */}
                      <Link
                        to="/lunch"
                        onClick={closeMore}
                        className={moreItemStyle("/lunch")}
                      >
                        <Rocket className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Launch Box</span>
                      </Link>

                      {/* Profile */}
                      <Link
                        to="/profile"
                        onClick={closeMore}
                        className={moreItemStyle("/profile")}
                      >
                        <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Profile</span>
                      </Link>

                      {/* Notifications */}
                      <Link
                        to="/notifications"
                        onClick={closeMore}
                        className={moreItemStyle("/notifications")}
                      >
                        <Bell className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span className="flex-1">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                            {unreadCount}
                          </span>
                        )}
                      </Link>

                      {/* Settings */}
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

                      <div className="border-t border-[#d6e9f8] dark:border-[#1e3a52] my-1" />

                      {/* Accessibility & Special Needs Suite */}
                      <button
                        type="button"
                        onClick={() => {
                          closeMore();
                          openAccessibilityModal();
                        }}
                        className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#f0f7fd] dark:hover:bg-[#153147]/50 transition-colors cursor-pointer"
                      >
                        <Accessibility className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Accessibility & Special Needs</span>
                        {hasActiveFeatures && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
                        )}
                      </button>

                      {/* Theme Toggle Button */}
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#f0f7fd] dark:hover:bg-[#153147]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          {theme === "dark" ? (
                            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200 shrink-0" />
                          )}
                          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#0078d4] dark:text-[#04a4ec]">
                          {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
                        </span>
                      </button>

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
                      {/* Launch Box for guests */}
                      <Link
                        to="/lunch"
                        onClick={closeMore}
                        className={moreItemStyle("/lunch")}
                      >
                        <Rocket className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Launch Box</span>
                      </Link>

                      {/* Accessibility Suite Button for guests */}
                      <button
                        type="button"
                        onClick={() => {
                          closeMore();
                          openAccessibilityModal();
                        }}
                        className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#f0f7fd] dark:hover:bg-[#153147]/50 transition-colors cursor-pointer"
                      >
                        <Accessibility className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                        <span>Accessibility & Special Needs</span>
                        {hasActiveFeatures && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
                        )}
                      </button>

                      {/* Theme Toggle Button for guests */}
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#f0f7fd] dark:hover:bg-[#153147]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          {theme === "dark" ? (
                            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200 shrink-0" />
                          )}
                          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#0078d4] dark:text-[#04a4ec]">
                          {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
                        </span>
                      </button>

                      <div className="my-1 border-t border-[#d6e9f8] dark:border-[#1e3a52]" />

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

          {currentUser && (
            <Link
              to="/attendance"
              onClick={closeMenu}
              className={getMobileLinkStyle("/attendance")}
            >
              Attendance
            </Link>
          )}

          {currentUser &&
            (currentUser.role === "organization" ||
              currentUser.role === "org_admin" ||
              currentUser.role === "super_admin" ||
              currentUser.email?.toLowerCase() === "ekenehq@gmail.com") && (
              <Link
                to="/payroll"
                onClick={closeMenu}
                className={getMobileLinkStyle("/payroll")}
              >
                Instructor Payroll
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
            <button
              onClick={() => {
                closeMenu();
                navigate("/notifications");
              }}
              className={`flex items-center justify-between w-full min-h-[44px] px-4 py-2.5 rounded-xl transition font-body cursor-pointer ${
                pathname === "/notifications"
                  ? "bg-[#d6e9f8] dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] font-bold"
                  : "bg-[#e2f0fb]/60 dark:bg-[#1a384f]/60 text-slate-700 dark:text-slate-200 hover:bg-[#e2f0fb] dark:hover:bg-[#1a384f]"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Bell className="w-5 h-5 text-[#0078d4] dark:text-[#04a4ec]" />
                <span className="text-sm font-semibold font-heading">Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                  {unreadCount} unread
                </span>
              )}
            </button>
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

