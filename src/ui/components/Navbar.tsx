
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { Briefcase, GraduationCap, LogOut, Moon, Sun, User, Menu, X, Bell, Video, CheckCheck, Trash2, Send, ShieldCheck, AlertCircle, Rocket } from "lucide-react";
import { useTheme } from "../../store/ThemeContext";
import { getNotificationPermission, requestPushPermission, sendPushNotification } from "../../lib/pushNotifications";
import { BlueBackpack3DIcon } from "./BlueBackpack3DIcon";

export const Navbar = () => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useAuth();
  const { scheduleEvents, courses, notifications, orgMembers, organizations, markNotificationRead, markAllNotificationsRead, clearNotifications, addNotification } = useAppContext();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const activeLiveCalls = scheduleEvents.filter(e => e.isActive);

  const studentInvites = currentUser?.role === 'student'
    ? orgMembers.filter(m => m.email?.toLowerCase() === currentUser?.email?.toLowerCase() && m.status === 'invited')
    : [];

  const inviteNotifications = studentInvites.map(invite => {
    const targetCourse = courses.find(c => invite.courseIds?.includes(c.id)) || courses.find(c => c.orgId === invite.orgId);
    const courseTitle = targetCourse?.title || 'Course';
    const sponsoringOrg = organizations.find(o => o.id === invite.orgId || o.id === targetCourse?.orgId || o.ownerId === invite.orgId);
    return {
      id: `invite_notif_${invite.id}`,
      userId: currentUser?.id,
      title: `Course Invitation 🎓`,
      message: `You have been invited by ${sponsoringOrg?.name || 'an organization'} to enroll in "${courseTitle}". Click to accept & join.`,
      type: 'info' as const,
      createdAt: invite.joinedAt || 'Recently',
      read: false,
      linkUrl: '/dashboard#pending-course-invitations'
    };
  });

  const rawUserNotifications = notifications.filter(n => !n.userId || n.userId === currentUser?.id);
  const userNotifications = [
    ...inviteNotifications.filter(invNotif => !rawUserNotifications.some(n => n.id === invNotif.id)),
    ...rawUserNotifications
  ];

  const unreadCount = userNotifications.filter(n => !n.read).length + activeLiveCalls.length;

  const handleToggleNotifications = () => {
    if (!notificationsOpen) {
      setPushPermission(getNotificationPermission());
    }
    setNotificationsOpen(!notificationsOpen);
  };

  const handleRequestPush = async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      sendPushNotification("Push Notifications Enabled! 🎉", {
        body: "You will now receive desktop push alerts for live classes and updates."
      });
    }
  };

  const handleSendTestPush = () => {
    if (pushPermission !== 'granted') {
      handleRequestPush();
      return;
    }
    const notif = sendPushNotification("Backpack LMS Test Alert 🚀", {
      body: "Free browser push notifications are active and operational!",
      linkUrl: "/dashboard"
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
      type: "info"
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const getLinkStyle = (path: string) =>
    `text-sm font-medium transition-colors ${pathname === path ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
    }`;

  const getMobileLinkStyle = (path: string) =>
    `block px-4 py-2.5 rounded-xl text-base font-medium transition-colors ${pathname === path
      ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold"
      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800"
    }`;

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-50 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" onClick={closeMenu} className="flex items-center space-x-3 group">
          <div className="flex items-center justify-center transition-transform group-hover:scale-105">
            <BlueBackpack3DIcon className="h-10 w-10 drop-shadow-md" />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold tracking-wide text-slate-900 dark:text-white">
              BACKPACK
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-bold">
              Education Without Borders
            </span>
          </div>
        </Link>

        {/* Global Right Controls (Theme, Notifications, Hamburger) */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={handleToggleNotifications}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors relative"
                title="Notifications & Push Alerts"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {userNotifications.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold flex items-center"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5 mr-0.5" /> Read
                        </button>
                        <button
                          onClick={clearNotifications}
                          className="text-[11px] text-slate-400 hover:text-red-500 font-semibold p-1"
                          title="Clear all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Browser Push Notification Permission Card */}
                  <div className="p-3 bg-indigo-50/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Desktop Push Alerts</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${pushPermission === 'granted'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : pushPermission === 'denied'
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                        {pushPermission === 'granted' ? 'Enabled' : pushPermission === 'denied' ? 'Blocked' : 'Action Required'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Get real-time browser push notifications for upcoming live classes, enrollments, and grading updates.
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {pushPermission !== 'granted' ? (
                        <button
                          onClick={handleRequestPush}
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center space-x-1.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Enable Push Notifications</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleSendTestPush}
                          className="w-full py-1.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5"
                        >
                          <Send className="w-3.5 h-3.5 text-indigo-500" />
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
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
                        Active Live Class ({activeLiveCalls.length})
                      </div>
                      {activeLiveCalls.map(evt => {
                        const course = courses.find(c => c.id === evt.courseId);
                        return (
                          <div key={evt.id} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{evt.title}</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase">LIVE NOW</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                {course?.title || 'Classroom Session'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setNotificationsOpen(false);
                                navigate(`/course/${evt.courseId}`);
                              }}
                              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
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
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                    {userNotifications.length === 0 ? (
                      <div className="text-center py-6 space-y-1">
                        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No notifications yet.</p>
                      </div>
                    ) : (
                      userNotifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.linkUrl) {
                              setNotificationsOpen(false);
                              if (notif.linkUrl.includes('#')) {
                                const [path, hash] = notif.linkUrl.split('#');
                                navigate(path);
                                setTimeout(() => {
                                  const el = document.getElementById(hash);
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }, 200);
                              } else {
                                navigate(notif.linkUrl);
                              }
                            }
                          }}
                          className={`pt-2 pb-2 px-2 rounded-xl transition cursor-pointer flex items-start space-x-2.5 ${!notif.read ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                            }`}
                        >
                          <div className="mt-1">
                            {!notif.read ? (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 block" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 block" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className={`text-xs font-bold truncate ${!notif.read ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                {notif.title}
                              </h5>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">{notif.createdAt}</span>
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
          )}

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6 pl-2">
            <Link to="/" className={getLinkStyle("/")}>{currentUser ? "Dashboard" : "Home"}</Link>

            {currentUser && currentUser.role === 'student' && (
              <Link to="/explore" className={getLinkStyle("/explore")}>Explore Orgs</Link>
            )}

            {currentUser && (currentUser.role === 'organization' || currentUser.role === 'instructor') && (
              <Link to="/upload-course" className={getLinkStyle("/upload-course")}>Add Course</Link>
            )}

            {currentUser && (
              <>
                <Link to="/profile" className={getLinkStyle("/profile")}>Profile</Link>
                <Link to="/settings" className={getLinkStyle("/settings")}>Settings</Link>
              </>
            )}

            <Link to="/lunch" className={`${getLinkStyle("/lunch")} flex items-center space-x-1`}>
              <Rocket className="w-3.5 h-3.5" />
              <span>Launch Box</span>
            </Link>

            <Link to="/about-us" className={`${getLinkStyle("/about-us")} flex items-center space-x-1`}>
              <User className="w-3.5 h-3.5" />
              <span>About Us</span>
            </Link>

            {currentUser && currentUser.role === 'organization' && (
              <Link
                to="/onboard"
                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg text-xs font-bold transition duration-200 flex items-center border border-indigo-200 dark:border-indigo-800/60 shadow-sm"
              >
                <Briefcase className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
                <span>Organization Setup</span>
              </Link>
            )}

            {currentUser ? (
              <div className="flex items-center space-x-4 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                <Link to="/profile" className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition">
                  {currentUser.role === 'student' ? <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Briefcase className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                  <span>{currentUser.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 px-3 py-2">Login</Link>
                <Link to="/signup" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none md:hidden"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2 animate-in slide-in-from-top-2">
          <Link to="/" onClick={closeMenu} className={getMobileLinkStyle("/")}>{currentUser ? "Dashboard" : "Home"}</Link>

          {currentUser && currentUser.role === 'student' && (
            <Link to="/explore" onClick={closeMenu} className={getMobileLinkStyle("/explore")}>Explore Orgs</Link>
          )}

          {currentUser && (currentUser.role === 'organization' || currentUser.role === 'instructor') && (
            <Link to="/upload-course" onClick={closeMenu} className={getMobileLinkStyle("/upload-course")}>Add Course</Link>
          )}

          {currentUser && (
            <>
              <Link to="/profile" onClick={closeMenu} className={getMobileLinkStyle("/profile")}>Profile</Link>
              <Link to="/settings" onClick={closeMenu} className={getMobileLinkStyle("/settings")}>Settings</Link>
            </>
          )}

          <Link to="/lunch" onClick={closeMenu} className={`${getMobileLinkStyle("/lunch")} flex items-center space-x-2`}>
            <Rocket className="w-4 h-4 text-indigo-500" />
            <span>Launch Box</span>
          </Link>

          <Link to="/about-us" onClick={closeMenu} className={`${getMobileLinkStyle("/about-us")} flex items-center space-x-2`}>
            <Rocket className="w-4 h-4 text-indigo-500" />
            <span>About Us</span>
          </Link>

          {currentUser && currentUser.role === 'organization' && (
            <Link to="/onboard" onClick={closeMenu} className={getMobileLinkStyle("/onboard")}>
              Organization Setup
            </Link>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700/60">
            {currentUser ? (
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {currentUser.role === 'student' ? <GraduationCap className="w-4 h-4 text-emerald-500" /> : <Briefcase className="w-4 h-4 text-amber-500" />}
                  <span>{currentUser.name} ({currentUser.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-2 pt-2">
                <Link to="/login" onClick={closeMenu} className="text-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200">Login</Link>
                <Link to="/signup" onClick={closeMenu} className="text-center py-2.5 rounded-xl bg-indigo-600 text-slate-900 dark:text-white text-sm font-medium shadow-sm">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
