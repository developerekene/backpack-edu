import React, { useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { LiveKitCall } from "../components/LiveKitCall";
import { Copy, Check, ArrowLeft, ShieldOff, Globe } from "lucide-react";
import { useAuth } from "../../store/AuthContext";

export const LiveRoomPage: React.FC = () => {
  const { roomName: paramRoomName } = useParams<{ roomName?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const queryName = searchParams.get("name") || "";
  const queryCourseId = searchParams.get("courseId") || undefined;

  // Resolved clean room name
  const effectiveRoomName = useMemo(() => {
    const raw = paramRoomName || searchParams.get("room") || "backpack-public-classroom";
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "backpack-public-classroom";
  }, [paramRoomName, searchParams]);

  // Initial display name for participant or guest
  const [participantName] = useState<string>(() => {
    if (queryName.trim()) return queryName.trim();
    if (currentUser?.name) return currentUser.name;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `Guest Learner #${randomSuffix}`;
  });

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [roomInput, setRoomInput] = useState<string>(effectiveRoomName);

  // Full shareable direct join URL
  const shareableJoinUrl = useMemo(() => {
    if (typeof window === "undefined") return `/live/${effectiveRoomName}`;
    return `${window.location.origin}/live/${effectiveRoomName}`;
  }, [effectiveRoomName]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableJoinUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const cleaned = roomInput
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    navigate(`/live/${cleaned}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to="/courses"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Live Class: <span className="font-mono text-indigo-600 dark:text-indigo-400">{effectiveRoomName}</span>
              </h1>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap gap-y-1">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldOff className="w-3.5 h-3.5 mr-1" />
                Open Guest Access
              </span>
            </div>
          </div>
        </div>

        {/* Share URL Actions */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={shareableJoinUrl}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono rounded-xl pl-3 pr-20 py-2 text-slate-600 dark:text-slate-300 w-52 sm:w-64 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="absolute right-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          <form onSubmit={handleSwitchRoom} className="hidden lg:flex items-center space-x-1">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Switch room..."
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-900 dark:text-white w-32 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Main Video Call Viewport */}
      <div className="w-full">
        <LiveKitCall
          roomName={effectiveRoomName}
          participantName={participantName}
          userRole={currentUser?.role || "student"}
          courseId={queryCourseId}
          onClose={() => navigate("/courses")}
        />
      </div>

      {/* LiveKit API Info & Direct Access Strip */}
      <div className="p-4 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            <strong>Direct Room URL:</strong> Anyone with this link can join without sign-in or account requirements.
          </span>
        </div>
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <span className="font-mono text-[11px] text-slate-500">
            Room: {effectiveRoomName}
          </span>
          <button
            onClick={handleCopyLink}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
          >
            {copiedUrl ? "Link Copied!" : "Copy Full Invitation Link"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRoomPage;
