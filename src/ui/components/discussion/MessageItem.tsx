import React from "react";
import { DiscussionMessage } from "../../../types";
import { MarkdownMessage } from "./CodeBlock";
import {
  Paperclip,
  ShieldCheck,
  Pin,
  ChevronDown,
  ChevronUp,
  Bookmark,
  ExternalLink,
} from "lucide-react";

const REACTION_CHOICES = ["👍", "🎉", "💡", "🚀", "❤️"];

export function MessageItem({
  msg,
  isReply,
  isMe,
  isStudent,
  isExpanded,
  replyCount,
  isSaved,
  onToggleExpand,
  onReact,
  onTogglePin,
  onToggleVerified,
  onToggleSave,
  children,
}: {
  msg: DiscussionMessage;
  isReply: boolean;
  isMe: boolean;
  isStudent: boolean;
  isExpanded?: boolean;
  replyCount?: number;
  isSaved?: boolean;
  onToggleExpand?: () => void;
  onReact: (emoji: string) => void;
  onTogglePin?: () => void;
  onToggleVerified: () => void;
  onToggleSave?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`${isReply ? "ml-8 mt-2" : "mt-4"} ${
        msg.verified
          ? "border-2 border-emerald-400/60 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/10"
          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
      } p-4 rounded-xl`}
    >
      {msg.pinned && !isReply && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-2">
          <Pin className="w-3 h-3" /> Pinned
        </div>
      )}
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {isMe ? "You" : msg.senderName}
          </span>
          {msg.senderRole && msg.senderRole !== "student" && (
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-500/20 uppercase">
              {msg.senderRole}
            </span>
          )}
          {msg.verified && (
            <span className="flex items-center px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3 mr-1" /> Endorsed Solution
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">
          {new Date(msg.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {msg.text && <MarkdownMessage text={msg.text} />}

      {msg.links && msg.links.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {msg.links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {l.label} <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      )}

      {msg.fileUrl && (
        <div className="mt-2">
          {msg.fileType === "image" ? (
            <img
              src={msg.fileUrl}
              alt="attachment"
              className="max-w-xs rounded-lg max-h-48 object-cover"
            />
          ) : msg.fileType === "video" ? (
            <video
              src={msg.fileUrl}
              controls
              className="max-w-xs rounded-lg max-h-48"
            />
          ) : (
            <a
              href={msg.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center text-sm text-indigo-500 hover:underline"
            >
              <Paperclip className="w-4 h-4 mr-1" /> View Document
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {REACTION_CHOICES.map((emoji) => {
            const count = msg.reactions?.[emoji]?.length || 0;
            if (count === 0) return null;
            return (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition"
              >
                {emoji} {count}
              </button>
            );
          })}
          <div className="relative group">
            <button className="px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition">
              +
            </button>
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 gap-1 shadow-lg z-10">
              {REACTION_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="text-base hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onToggleSave && (
            <button
              onClick={onToggleSave}
              title={isSaved ? "Unsave" : "Save"}
              className={`text-xs ${isSaved ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
            >
              <Bookmark
                className="w-3.5 h-3.5"
                fill={isSaved ? "currentColor" : "none"}
              />
            </button>
          )}
          {!isStudent && onTogglePin && (
            <button
              onClick={onTogglePin}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center"
            >
              <Pin className="w-3.5 h-3.5 mr-1" />{" "}
              {msg.pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {!isStudent && (
            <button
              onClick={onToggleVerified}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {msg.verified ? "Unverify" : "Endorse"}
            </button>
          )}
          {!isReply && onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline flex items-center"
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
              )}
              {replyCount || 0} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
