import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import {
  getShortLiveCode,
  normalizeLiveRoomName,
  resolveShortLiveCode,
} from "../../lib/liveClass";
import { Loader2, Sparkles } from "lucide-react";

interface ShortLiveRedirectPageProps {
  mode: "speaker" | "attendee";
}

/**
 * Expands a shortened guest speaker link (`/g/:shortCode`) or short join link (`/j/:shortCode`)
 * into the full-length classroom URL (`/live/course-backpack-...?role=speaker&courseId=...`)
 * so the address bar displays the full classroom URL while keeping the shared link ultra-short.
 */
export const ShortLiveRedirectPage: React.FC<ShortLiveRedirectPageProps> = ({
  mode,
}) => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const { courses, scheduleEvents } = useAppContext();

  useEffect(() => {
    let isSubscribed = true;

    async function expandShortUrl() {
      const cleanCode = (shortCode || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      if (!cleanCode) {
        navigate("/live", { replace: true });
        return;
      }

      // 1. Try resolving via cache, loaded courses, or Firestore short_links registry
      const resolvedPath = await resolveShortLiveCode(cleanCode, mode, courses);
      if (!isSubscribed) return;

      if (resolvedPath) {
        navigate(resolvedPath, { replace: true });
        return;
      }

      // 2. Also check active scheduleEvents in case the room was created for an event
      const matchedEvent = scheduleEvents.find(
        (e) =>
          getShortLiveCode(e.meetingUrl, e.courseId) === cleanCode ||
          (e.courseId && getShortLiveCode(undefined, e.courseId) === cleanCode)
      );

      if (matchedEvent) {
        const cleanRoom = normalizeLiveRoomName(
          matchedEvent.meetingUrl,
          matchedEvent.courseId
        );
        const cQuery = matchedEvent.courseId
          ? `&courseId=${encodeURIComponent(matchedEvent.courseId)}`
          : "";
        const target =
          mode === "speaker"
            ? `/live/${cleanRoom}?role=speaker${cQuery}`
            : `/live/${cleanRoom}${
                matchedEvent.courseId
                  ? `?courseId=${encodeURIComponent(matchedEvent.courseId)}`
                  : ""
              }`;
        navigate(target, { replace: true });
        return;
      }

      // 3. Fallback: route directly with the code and preserve speaker role
      const fallbackRoom = normalizeLiveRoomName(`course-backpack-c-${cleanCode}`);
      navigate(
        mode === "speaker"
          ? `/live/${fallbackRoom}?role=speaker&short=${cleanCode}`
          : `/live/${fallbackRoom}?short=${cleanCode}`,
        { replace: true }
      );
    }

    expandShortUrl();

    return () => {
      isSubscribed = false;
    };
  }, [shortCode, mode, courses, scheduleEvents, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-white">
          Opening Live Classroom...
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Expanding short link <span className="font-mono text-purple-300 font-bold">/g/{shortCode}</span> to the full live classroom session.
        </p>
        <div className="flex justify-center pt-2">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      </div>
    </div>
  );
};
