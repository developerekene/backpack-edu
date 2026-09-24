import React from "react";
import { DiscussionChannel } from "../../../types";
import { Hash, Plus, Circle } from "lucide-react";

interface FacultyEntry {
  userId: string;
  name: string;
  role: string;
  online: boolean;
}

export function ChannelSidebar({
  channels,
  activeChannelId,
  unreadCounts,
  onSelect,
  onAddChannel,
  isStudent,
  faculty,
}: {
  channels: DiscussionChannel[];
  activeChannelId: string | null;
  unreadCounts: Record<string, number>;
  onSelect: (id: string) => void;
  onAddChannel: () => void;
  isStudent: boolean;
  faculty: FacultyEntry[];
}) {
  return (
    <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 p-3 space-y-4 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Forums & Channels
          </p>
          {!isStudent && (
            <button
              onClick={onAddChannel}
              className="text-slate-400 hover:text-indigo-600 transition"
              title="New channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-1">
          {channels.map((c) => {
            const unread = unreadCounts[c.id] || 0;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition text-left ${
                  activeChannelId === c.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center min-w-0">
                  <Hash className="w-4 h-4 mr-1.5 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </span>
                {unread > 0 && activeChannelId !== c.id && (
                  <span className="ml-2 shrink-0 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {faculty.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Faculty & TAs
          </p>
          <div className="space-y-2 px-1">
            {faculty.map((f) => (
              <div key={f.userId} className="flex items-center gap-2">
                <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-[10px] font-bold shrink-0">
                  {f.name.charAt(0).toUpperCase()}
                  {f.online && (
                    <Circle className="w-2 h-2 text-emerald-500 fill-emerald-500 absolute -bottom-0.5 -right-0.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {f.name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {f.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-1 pt-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Share logic and pseudocode freely. No direct assessment solution
          dumping.
        </p>
      </div>
    </div>
  );
}
