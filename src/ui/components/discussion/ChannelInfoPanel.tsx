import React from "react";
import { DiscussionChannel, DiscussionMessage } from "../../../types";
import { bucketActivity } from "./DisscussionUtils";
import { ActivitySparkline } from "./ActivitySparkLine";
import { FileText, Download, Circle } from "lucide-react";

interface OnlinePerson {
  userId: string;
  userName: string;
  role?: string;
}

export function ChannelInfoPanel({
  channel,
  channelMessages,
  onlinePeople,
}: {
  channel: DiscussionChannel;
  channelMessages: DiscussionMessage[];
  onlinePeople: OnlinePerson[];
}) {
  const activity = bucketActivity(
    channelMessages.map((m) => m.createdAt),
    7,
  );
  const todayCount = activity[activity.length - 1]?.count || 0;
  const weekTotal = activity.reduce((a, b) => a + b.count, 0);

  return (
    <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 p-4 space-y-5 overflow-y-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Channel Focus
        </p>
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {channel.name.replace(/-/g, " ")}
          </p>
          {channel.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      {channel.resources && channel.resources.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Channel Resources
          </p>
          <div className="space-y-2">
            {channel.resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs text-slate-700 dark:text-slate-200 truncate">
                    {r.name}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {r.sizeLabel && (
                    <span className="text-[10px] text-slate-400">
                      {r.sizeLabel}
                    </span>
                  )}
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Faculty & Cohort Online
        </p>
        {onlinePeople.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No one else is online right now.
          </p>
        ) : (
          <div className="space-y-2">
            {onlinePeople.map((p) => (
              <div key={p.userId} className="flex items-center gap-2">
                <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-bold shrink-0">
                  {p.userName.charAt(0).toUpperCase()}
                  <Circle className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500 absolute -bottom-0.5 -right-0.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {p.userName}
                  </p>
                  {p.role && p.role !== "student" && (
                    <p className="text-[10px] text-slate-400 capitalize">
                      {p.role}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Channel Activity
          </p>
          {weekTotal > 0 && (
            <span className="text-[10px] font-bold text-emerald-500">
              {weekTotal} this week
            </span>
          )}
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {todayCount}
          </p>
          <p className="text-[10px] text-slate-400 mb-2">messages today</p>
          <ActivitySparkline data={activity} />
        </div>
      </div>
    </div>
  );
}
