import React, { useState } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Globe,
  Info,
} from "lucide-react";

/* ============================================================= */
/* Draft types & sample data                                     */
/* ============================================================= */

type EventMode = "live" | "online" | "hybrid";

interface DraftEvent {
  id: string;
  title: string;
  description: string;
  day: string;
  month: string;
  dateLabel: string;
  time: string;
  location: string;
  mode: EventMode;
  attendees: number;
  host: string;
  course?: string;
}

/* Draft sample data — replace with real data later (e.g. scheduleEvents) */
const DRAFT_EVENTS: DraftEvent[] = [
  {
    id: "evt-1",
    title: "Orientation & Platform Tour",
    description:
      "A guided walkthrough of Backpack for new students, instructors, and organizations joining this semester.",
    day: "12",
    month: "SEP",
    dateLabel: "Today",
    time: "10:00 AM",
    location: "Main Auditorium / Zoom",
    mode: "hybrid",
    attendees: 128,
    host: "Backpack Learning Team",
    course: "Welcome Series",
  },
  {
    id: "evt-2",
    title: "Live Class: Introduction to Data Science",
    description:
      "Instructor-led live session covering core data science concepts, tools, and a hands-on walkthrough.",
    day: "15",
    month: "SEP",
    dateLabel: "Upcoming",
    time: "02:00 PM",
    location: "Online (LiveKit)",
    mode: "online",
    attendees: 84,
    host: "Dr. Ada Okafor",
    course: "Data Science 101",
  },
  {
    id: "evt-3",
    title: "End of Term Project Showcase",
    description:
      "Students present their term projects. Instructors and partner organizations are invited to join as judges.",
    day: "22",
    month: "SEP",
    dateLabel: "Upcoming",
    time: "11:00 AM",
    location: "Academy Hall",
    mode: "live",
    attendees: 210,
    host: "Lagos STEM Academy",
  },
  {
    id: "evt-4",
    title: "Instructor Workshop: Engaging Remote Learners",
    description:
      "A practical workshop for instructors on keeping remote and hybrid learners engaged through the platform.",
    day: "28",
    month: "SEP",
    dateLabel: "Upcoming",
    time: "03:00 PM",
    location: "Online (LiveKit)",
    mode: "online",
    attendees: 46,
    host: "Backpack Educator Network",
  },
];

const modeStyles: Record<EventMode, string> = {
  live: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  online:
    "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
  hybrid:
    "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
};

/* ============================================================= */
/* Component                                                     */
/* ============================================================= */

const Events: React.FC = () => {
  const [filter, setFilter] = useState<"all" | EventMode>("all");

  const visibleEvents =
    filter === "all"
      ? DRAFT_EVENTS
      : DRAFT_EVENTS.filter((e) => e.mode === filter);

  return (
    <div className="pb-12">
      {/* ========================================== */}
      {/* HERO */}
      {/* ========================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <CalendarDays className="w-4 h-4" />
            Events
          </span>

          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Events &amp; Live Sessions{" "}
            <span className="text-indigo-400">— Draft</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
            A draft page for scheduling live classes, orientations, workshops,
            and institutional events. Students, instructors, and organizations
            can find and join everything happening on Backpack.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              {DRAFT_EVENTS.length} events shown
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              Live + Online + Hybrid
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              For all roles
            </span>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* TOOLBAR: Filter + Create (draft)           */}
      {/* ========================================== */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filter chips */}
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
          {[
            { key: "all" as const, label: "All Events" },
            { key: "live" as const, label: "Live" },
            { key: "online" as const, label: "Online" },
            { key: "hybrid" as const, label: "Hybrid" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === t.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Create button (draft placeholder) */}
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm opacity-80 cursor-not-allowed"
          title="Coming soon"
          disabled
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* ========================================== */}
      {/* EVENTS GRID                                */}
      {/* ========================================== */}
      {visibleEvents.length === 0 ? (
        <div className="mt-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 py-16 px-6">
          <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            No events in this view yet
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try a different filter, or check back soon for scheduled sessions.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleEvents.map((evt) => (
            <article
              key={evt.id}
              className="group bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Top accent strip */}
              <div className="h-1.5 bg-linear-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-60" />

              <div className="p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  {/* Date block */}
                  <div className="shrink-0 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-center py-3">
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                      {evt.day}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400/80">
                      {evt.month}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${modeStyles[evt.mode]}`}
                      >
                        {evt.mode === "live" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {evt.mode}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {evt.dateLabel}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {evt.title}
                    </h3>
                    {evt.course && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        <GraduationCap className="w-3 h-3" />
                        {evt.course}
                      </p>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {evt.description}
                </p>

                {/* Meta */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.attendees} attending
                  </span>
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    {evt.host}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-sm"
                    title="Draft — connects to live session / calendar later"
                  >
                    <Video className="w-4 h-4" />
                    Join Event
                  </button>
                  <button className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition">
                    Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* DRAFT NOTE                                */}
      {/* ========================================== */}
      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 p-5 text-sky-700 dark:text-sky-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold">Draft scaffold</p>
          <p className="mt-1 text-sm leading-relaxed">
            This is a working draft using sample event data. Next steps: hook it
            up to live scheduled sessions (e.g.{" "}
            <code className="font-mono text-xs">scheduleEvents</code>), add
            event creation for organizations &amp; instructors, notifications,
            and RSVP / join handling.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Events;
