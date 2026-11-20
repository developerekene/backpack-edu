import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  HelpCircle,
  RotateCcw,
  LogOut,
  Send,
  Bell,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Check,
  Clock,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import { BlueBackpack3DIcon } from "./BlueBackpack3DIcon";

export const SuspendedAccountScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const {
    notifications,
    submitSuspensionQuery,
    requestAccountUnsuspension,
    markNotificationRead,
  } = useAppContext();
  const navigate = useNavigate();

  const [queryText, setQueryText] = useState("");
  const [appealNote, setAppealNote] = useState("");
  const [sendingQuery, setSendingQuery] = useState(false);
  const [sendingAppeal, setSendingAppeal] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(
      (n) => n.userId === currentUser.id || !n.userId,
    );
  }, [notifications, currentUser]);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) {
      setFeedback({
        type: "error",
        text: "Please enter a brief question about your suspension before sending.",
      });
      return;
    }
    setSendingQuery(true);
    setFeedback(null);
    try {
      await submitSuspensionQuery(queryText);
      setQueryText("");
      setFeedback({
        type: "success",
        text: "Your suspension query has been sent directly to the Super Admin. Any reply will appear in your notifications below.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text:
          (err as Error)?.message ||
          "Could not send your query right now. Please try again.",
      });
    } finally {
      setSendingQuery(false);
    }
  };

  const handleUnsuspendRequest = async () => {
    setSendingAppeal(true);
    setFeedback(null);
    try {
      await requestAccountUnsuspension(appealNote);
      setAppealNote("");
      setFeedback({
        type: "success",
        text: "Your request to unsuspend your account has been delivered to the Super Admin.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text:
          (err as Error)?.message ||
          "Could not submit your unsuspension request right now.",
      });
    } finally {
      setSendingAppeal(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0a1824] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Restricted Header Bar (Sign Out Only — No Feature Navigation) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-[#1e3a52] bg-white/95 dark:bg-[#0f2231]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-[#132b3e] border border-sky-100 dark:border-[#1e3a52] flex items-center justify-center p-1">
              <BlueBackpack3DIcon className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                BACKPACK
              </span>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Restricted Account Access
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Suspension Notice Card */}
        <section className="rounded-3xl bg-white dark:bg-[#0f2231] border-2 border-rose-200 dark:border-rose-900/60 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">
                  Your Account Is Suspended
                </h1>
                <p className="text-xs sm:text-sm text-rose-100 mt-0.5">
                  All platform features are locked while your account remains suspended.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 text-xs font-bold self-start sm:self-center">
              <Clock className="w-3.5 h-3.5" />
              {currentUser.suspendedAt
                ? `Suspended ${new Date(currentUser.suspendedAt).toLocaleDateString()}`
                : "Suspended"}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                Suspension Reason Provided
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {currentUser.suspendedReason ||
                  "No specific reason was attached. Use the form below to query the Super Admin."}
              </p>
            </div>

            {feedback && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </div>
        </section>

        {/* Actions Grid: Query Suspension + Request Unsuspension */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Query Why Suspended */}
          <form
            onSubmit={handleQuerySubmit}
            className="rounded-3xl bg-white dark:bg-[#0f2231] border border-slate-200 dark:border-[#1e3a52] p-6 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Query Suspension Reason
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ask the Super Admin why your account was suspended.
                  </p>
                </div>
              </div>

              <textarea
                rows={4}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Write your question for the Super Admin..."
                className="w-full rounded-2xl border border-slate-200 dark:border-[#1e3a52] bg-slate-50 dark:bg-[#0a1824] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={sendingQuery}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-bold transition shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>
                {sendingQuery ? "Sending Query..." : "Query Suspension Reason"}
              </span>
            </button>
          </form>

          {/* Request to Unsuspend */}
          <div className="rounded-3xl bg-white dark:bg-[#0f2231] border border-slate-200 dark:border-[#1e3a52] p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Appeal Suspension
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notify the Super Admin to review and restore your account.
                  </p>
                </div>
              </div>

              <textarea
                rows={4}
                value={appealNote}
                onChange={(e) => setAppealNote(e.target.value)}
                placeholder="Optional note explaining why your account should be unsuspended..."
                className="w-full rounded-2xl border border-slate-200 dark:border-[#1e3a52] bg-slate-50 dark:bg-[#0a1824] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="button"
              onClick={handleUnsuspendRequest}
              disabled={sendingAppeal}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold transition shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {sendingAppeal
                  ? "Submitting Appeal..."
                  : "Request to Unsuspend My Account"}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications & Super Admin Replies */}
        <section className="rounded-3xl bg-white dark:bg-[#0f2231] border border-slate-200 dark:border-[#1e3a52] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1e3a52] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Your Notifications & Admin Replies
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#1e3a52]">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No messages yet. Any reply from the Super Admin will appear here
                automatically.
              </div>
            ) : (
              userNotifications.map((n) => {
                const isAdminReply =
                  n.notificationCategory === "suspension_reply" ||
                  n.senderName === "Super Admin";
                return (
                  <div
                    key={n.id}
                    className={`p-5 flex items-start justify-between gap-4 transition ${
                      !n.read
                        ? "bg-sky-50/70 dark:bg-sky-950/20"
                        : "bg-white dark:bg-[#0f2231]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isAdminReply
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {n.title}
                          </span>
                          {isAdminReply && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                              Super Admin Reply
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {n.createdAt}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                          {n.message}
                        </p>
                      </div>
                    </div>

                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
