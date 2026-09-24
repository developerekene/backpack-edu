import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../../store/AppContext";
import { useAuth } from "../../../store/AuthContext";
import { DiscussionChannel, DiscussionMessage } from "../../../types";
import { generateId } from "../../../lib/id";
import { FileUpload } from "../FileUpload";
import {
  Hash,
  Send,
  Paperclip,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const REACTION_CHOICES = ["👍", "🎉", "💡", "❤️"];
const POLL_INTERVAL_MS = 20_000;

export function CourseDiscussions({
  courseId,
  isStudent,
}: {
  courseId: string;
  isStudent: boolean;
}) {
  const {
    discussionChannels,
    discussionMessages,
    addDiscussionChannel,
    addDiscussionMessage,
    toggleMessageReaction,
    setMessageVerified,
    refreshData,
  } = useAppContext();
  const { currentUser } = useAuth();

  const courseChannels = discussionChannels
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState<
    "image" | "video" | "document" | undefined
  >(undefined);
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const provisionedRef = useRef(false);

  const effectiveChannelId = activeChannelId ?? courseChannels[0]?.id ?? null;

  useEffect(() => {
    if (provisionedRef.current) return;
    if (courseChannels.length === 0) {
      provisionedRef.current = true;
      const defaultChannel: DiscussionChannel = {
        id: `dchan_general_${courseId}`,
        courseId,
        name: "general-discussion",
        description: "Course-wide discussion",
        pinned: true,
        order: 0,
        createdAt: new Date().toISOString(),
      };
      addDiscussionChannel(defaultChannel);
    }
  }, [courseId, courseChannels.length, addDiscussionChannel]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        refreshData();
      }
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshData]);

  const activeMessages = discussionMessages
    .filter((m) => m.channelId === effectiveChannelId && !m.parentId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const repliesFor = (messageId: string) =>
    discussionMessages
      .filter((m) => m.parentId === messageId)
      .sort((a, b) => a.createdAt - b.createdAt);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !effectiveChannelId) return;
    if (!messageText.trim() && !attachmentUrl) return;

    const msg: DiscussionMessage = {
      id: generateId("dmsg"),
      channelId: effectiveChannelId,
      courseId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: isStudent ? "student" : "instructor",
      text: messageText,
      fileUrl: attachmentUrl || undefined,
      fileType: attachmentType,
      createdAt: Date.now(),
    };
    await addDiscussionMessage(msg);
    setMessageText("");
    setAttachmentUrl("");
    setAttachmentType(undefined);
  };

  const handleReply = async (parentId: string) => {
    if (!currentUser || !effectiveChannelId) return;
    const draft = replyDrafts[parentId]?.trim();
    if (!draft) return;

    const reply: DiscussionMessage = {
      id: generateId("dmsg"),
      channelId: effectiveChannelId,
      courseId,
      parentId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: isStudent ? "student" : "instructor",
      text: draft,
      createdAt: Date.now(),
    };
    await addDiscussionMessage(reply);
    setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
  };

  const handleReact = (message: DiscussionMessage, emoji: string) => {
    if (!currentUser) return;
    toggleMessageReaction(message.id, emoji, currentUser.id);
  };

  const renderMessage = (msg: DiscussionMessage, isReply = false) => {
    const isMe = msg.senderId === currentUser?.id;
    const replies = isReply ? [] : repliesFor(msg.id);
    const isExpanded = expandedThreadId === msg.id;

    return (
      <div
        key={msg.id}
        className={`${isReply ? "ml-8 mt-2" : "mt-4"} p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
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
                <ShieldCheck className="w-3 h-3 mr-1" /> Verified
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {new Date(msg.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {msg.text && (
          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {msg.text}
          </p>
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

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            {REACTION_CHOICES.map((emoji) => {
              const count = msg.reactions?.[emoji]?.length || 0;
              const reacted = currentUser
                ? (msg.reactions?.[emoji] || []).includes(currentUser.id)
                : false;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(msg, emoji)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                    reacted
                      ? "bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                      : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300"
                  }`}
                >
                  {emoji} {count > 0 && count}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {!isStudent && (
              <button
                onClick={() => setMessageVerified(msg.id, !msg.verified)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                {msg.verified ? "Unverify" : "Mark Verified"}
              </button>
            )}
            {!isReply && (
              <button
                onClick={() => setExpandedThreadId(isExpanded ? null : msg.id)}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline flex items-center"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                )}
                {msg.replyCount || replies.length || 0} replies
              </button>
            )}
          </div>
        </div>

        {!isReply && isExpanded && (
          <div className="mt-2">
            {replies.map((r) => renderMessage(r, true))}
            <div className="ml-8 mt-2 flex items-center gap-2">
              <input
                type="text"
                value={replyDrafts[msg.id] || ""}
                onChange={(e) =>
                  setReplyDrafts((prev) => ({
                    ...prev,
                    [msg.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleReply(msg.id);
                  }
                }}
                placeholder="Reply..."
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleReply(msg.id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] border-t border-slate-200 dark:border-slate-700">
      {/* Channel sidebar */}
      <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
          Channels
        </p>
        {courseChannels.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveChannelId(c.id)}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition text-left ${
              effectiveChannelId === c.id
                ? "bg-indigo-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Hash className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>

      {/* Message feed */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
          {activeMessages.length === 0 ? (
            <p className="text-center text-slate-500 mt-10 text-sm">
              Start the conversation!
            </p>
          ) : (
            activeMessages.map((m) => renderMessage(m))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {attachmentUrl && (
            <div className="mb-3 flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
              <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
                Attached: {attachmentType}
              </span>
              <button
                onClick={() => {
                  setAttachmentUrl("");
                  setAttachmentType(undefined);
                }}
                className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex space-x-2">
            <FileUpload
              label=""
              onUpload={(url, type) => {
                setAttachmentUrl(url);
                setAttachmentType(type);
              }}
            />
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!messageText.trim() && !attachmentUrl}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
