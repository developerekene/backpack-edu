import React from "react";
import { DiscussionPoll } from "../../../types";

export function PollCard({
  poll,
  currentUserId,
  onVote,
}: {
  poll: DiscussionPoll;
  currentUserId: string | undefined;
  onVote: (optionId: string) => void;
}) {
  const totalVotes = poll.options.reduce((acc, o) => acc + o.votes.length, 0);
  const isClosed = Date.now() > poll.closesAt;
  const myVote = poll.options.find(
    (o) => currentUserId && o.votes.includes(currentUserId),
  );
  const hoursLeft = Math.max(
    0,
    Math.ceil((poll.closesAt - Date.now()) / (1000 * 60 * 60)),
  );

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Cohort Consensus Poll
        </span>
        <span className="text-xs text-slate-400">
          {isClosed ? "Closed" : `Closes in ${hoursLeft}h`}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">
        {poll.question}
      </p>
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct =
            totalVotes > 0
              ? Math.round((opt.votes.length / totalVotes) * 100)
              : 0;
          const isMine = myVote?.id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={isClosed}
              onClick={() => onVote(opt.id)}
              className="w-full text-left disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={`font-medium ${isMine ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {isMine && "● "}
                  {opt.label}
                </span>
                <span className="font-bold text-slate-500">
                  {pct}% ({opt.votes.length})
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${isMine ? "bg-indigo-600" : "bg-slate-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        {totalVotes} student{totalVotes === 1 ? "" : "s"} participated
      </p>
    </div>
  );
}
