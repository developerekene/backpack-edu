import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../store/AppContext";
import { useAuth } from "../../../store/AuthContext";
import {
  DiscussionChannel,
  DiscussionMessage,
  DiscussionPoll,
} from "../../../types";
import { generateId } from "../../../lib/id";
import { ChannelSidebar } from "./ChannelSideBar";
import { ChannelInfoPanel } from "./ChannelInfoPanel";
import { MessageItem } from "./MessageItem";
import { MessageComposer } from "./MessageComposer";
import { PollCard } from "./PollCard";
import {
  getLastRead,
  markChannelRead,
  getSavedMessageIds,
  toggleSavedMessage,
} from "./DisscussionUtils";
import { Search, Bookmark, Bell, BellOff, Users, X } from "lucide-react";

const POLL_INTERVAL_MS = 20_000;
const PRESENCE_PING_MS = 45_000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

type FilterTab = "all" | "unresolved" | "verified" | "pinned" | "saved";

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
    discussionPolls,
    coursePresence,
    orgMembers,
    addDiscussionChannel,
    addDiscussionMessage,
    toggleMessageReaction,
    setMessageVerified,
    togglePinMessage,
    toggleChannelSubscription,
    addPoll,
    voteOnPoll,
    pingPresence,
    refreshData,
  } = useAppContext();
  const { currentUser } = useAuth();

  const courseChannels = discussionChannels
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const activeChannel =
    courseChannels.find((c) => c.id === selectedChannelId) || courseChannels[0];
  const activeChannelId = activeChannel?.id ?? null;
  const setActiveChannelId = setSelectedChannelId;

  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>(
    currentUser ? getSavedMessageIds(currentUser.id) : [],
  );
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [now, setNow] = useState(() => Date.now());

  // Provision a default channel once, if this course has none yet.
  useEffect(() => {
    if (courseChannels.length === 0) {
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

  // Mark the active channel as read (for the unread badge) whenever it
  // changes or new messages land in it while it's open.
  const activeChannelMessages = useMemo(
    () => discussionMessages.filter((m) => m.channelId === activeChannelId),
    [discussionMessages, activeChannelId],
  );
  useEffect(() => {
    if (!activeChannelId || !currentUser) return;
    markChannelRead(courseId, activeChannelId, currentUser.id);
  }, [activeChannelId, activeChannelMessages.length, courseId, currentUser]);

  const unreadCounts = useMemo(() => {
    if (!currentUser) return {};
    const counts: Record<string, number> = {};
    courseChannels.forEach((c) => {
      const lastRead = getLastRead(courseId, c.id, currentUser.id);
      counts[c.id] = discussionMessages.filter(
        (m) => m.channelId === c.id && !m.parentId && m.createdAt > lastRead,
      ).length;
    });
    return counts;
  }, [courseChannels, discussionMessages, courseId, currentUser]);

  // Polling refresh -- no real-time listeners in this storage pattern, so
  // pick up other participants' activity every 20s while the tab is
  // visible instead.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
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

  // Presence heartbeat.
  useEffect(() => {
    if (!currentUser) return;
    const ping = () => {
      if (document.visibilityState === "visible") {
        pingPresence(
          courseId,
          currentUser.id,
          currentUser.name,
          isStudent ? "student" : "instructor",
        );
      }
    };
    ping();
    const interval = setInterval(ping, PRESENCE_PING_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.id]);

  const onlinePeople = useMemo(() => {
    const cutoff = now - ONLINE_WINDOW_MS;
    const seen = new Set<string>();
    return coursePresence
      .filter((p) => p.courseId === courseId && p.lastActiveAt > cutoff)
      .filter((p) => {
        if (seen.has(p.userId)) return false;
        seen.add(p.userId);
        return true;
      })
      .map((p) => ({ userId: p.userId, userName: p.userName, role: p.role }));
  }, [coursePresence, courseId, now]);

  const faculty = useMemo(() => {
    const onlineIds = new Set(onlinePeople.map((p) => p.userId));
    const seen = new Set<string>();
    return orgMembers
      .filter((m) => m.role === "instructor" && m.courseIds?.includes(courseId))
      .filter((m) => {
        const key = m.userId || m.email;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m) => ({
        userId: m.userId || m.id,
        name: m.name,
        role: "instructor",
        online: onlineIds.has(m.userId || m.id),
      }));
  }, [orgMembers, courseId, onlinePeople]);

  const repliesFor = (messageId: string) =>
    discussionMessages
      .filter((m) => m.parentId === messageId)
      .sort((a, b) => a.createdAt - b.createdAt);

  const isVerifiedThread = (msg: DiscussionMessage) =>
    msg.verified || repliesFor(msg.id).some((r) => r.verified);

  const visibleTopLevel = useMemo(() => {
    let list = discussionMessages
      .filter((m) => m.channelId === activeChannelId && !m.parentId)
      .sort((a, b) => a.createdAt - b.createdAt);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          repliesFor(m.id).some((r) => r.text.toLowerCase().includes(q)),
      );
    }

    if (filterTab === "unresolved")
      list = list.filter((m) => !isVerifiedThread(m));
    if (filterTab === "verified")
      list = list.filter((m) => isVerifiedThread(m));
    if (filterTab === "pinned") list = list.filter((m) => m.pinned);
    if (filterTab === "saved")
      list = list.filter((m) => savedIds.includes(m.id));

    // Pinned messages float to the top within the visible set.
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discussionMessages, activeChannelId, searchQuery, filterTab, savedIds]);

  const activePolls = discussionPolls
    .filter((p) => p.channelId === activeChannelId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleSend = useCallback(
    async (
      text: string,
      attachmentUrl?: string,
      attachmentType?: "image" | "video" | "document",
    ) => {
      if (!currentUser || !activeChannelId) return;
      const msg: DiscussionMessage = {
        id: generateId("dmsg"),
        channelId: activeChannelId,
        courseId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: isStudent ? "student" : "instructor",
        text,
        fileUrl: attachmentUrl,
        fileType: attachmentType,
        createdAt: Date.now(),
      };
      await addDiscussionMessage(msg);
    },
    [currentUser, activeChannelId, courseId, isStudent, addDiscussionMessage],
  );

  const handleReply = useCallback(
    async (parentId: string) => {
      if (!currentUser || !activeChannelId) return;
      const draft = replyDrafts[parentId]?.trim();
      if (!draft) return;
      const reply: DiscussionMessage = {
        id: generateId("dmsg"),
        channelId: activeChannelId,
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
    },
    [
      currentUser,
      activeChannelId,
      replyDrafts,
      courseId,
      isStudent,
      addDiscussionMessage,
    ],
  );

  const handleToggleSave = (messageId: string) => {
    if (!currentUser) return;
    setSavedIds(toggleSavedMessage(currentUser.id, messageId));
  };

  const handleCreatePoll = useCallback(async () => {
    if (!currentUser || !activeChannelId) return;
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) return;
    const poll: DiscussionPoll = {
      id: generateId("poll"),
      channelId: activeChannelId,
      courseId,
      question: pollQuestion.trim(),
      options: cleanOptions.map((label) => ({
        id: generateId("popt"),
        label,
        votes: [],
      })),
      closesAt: Date.now() + 4 * 60 * 60 * 1000,
      createdAt: Date.now(),
    };
    await addPoll(poll);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowPollForm(false);
  }, [
    currentUser,
    activeChannelId,
    pollOptions,
    pollQuestion,
    courseId,
    addPoll,
  ]);

  const isSubscribed =
    !!currentUser && !!activeChannel?.subscriberIds?.includes(currentUser.id);

  if (!activeChannel) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Setting up discussions for this course...
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {onlinePeople.length} Peer{onlinePeople.length === 1 ? "" : "s"}{" "}
            Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setFilterTab(filterTab === "saved" ? "all" : "saved")
            }
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
              filterTab === "saved"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Saved Threads
          </button>
          {currentUser && (
            <button
              onClick={() =>
                toggleChannelSubscription(activeChannel.id, currentUser.id)
              }
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                isSubscribed
                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
              }`}
            >
              {isSubscribed ? (
                <Bell className="w-3.5 h-3.5" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <ChannelSidebar
          channels={courseChannels}
          activeChannelId={activeChannelId}
          unreadCounts={unreadCounts}
          onSelect={setActiveChannelId}
          onAddChannel={() => {
            const name = window.prompt(
              "New channel name (e.g. project-groups-collab)",
            );
            if (!name?.trim()) return;
            addDiscussionChannel({
              id: generateId("dchan"),
              courseId,
              name: name.trim().toLowerCase().replace(/\s+/g, "-"),
              order: courseChannels.length,
              createdAt: new Date().toISOString(),
            });
          }}
          isStudent={isStudent}
          faculty={faculty}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header + search/filter */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                # {activeChannel.name}
              </h3>
              {activeChannel.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeChannel.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages, code tags, or @..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  ["all", "unresolved", "verified", "pinned"] as FilterTab[]
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize transition ${
                      filterTab === tab
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tab === "verified" ? "Instructor Verified" : tab}
                  </button>
                ))}
              </div>
              {!isStudent && (
                <button
                  onClick={() => setShowPollForm((s) => !s)}
                  className="ml-auto px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition"
                >
                  + Poll
                </button>
              )}
            </div>

            {showPollForm && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Poll question"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      setPollOptions((prev) =>
                        prev.map((o, idx) => (idx === i ? e.target.value : o)),
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ))}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    + Add option
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePoll}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
                  >
                    Publish Poll
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feed */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
            {activePolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                currentUserId={currentUser?.id}
                onVote={(optionId) =>
                  currentUser && voteOnPoll(poll.id, optionId, currentUser.id)
                }
              />
            ))}

            {visibleTopLevel.length === 0 ? (
              <p className="text-center text-slate-500 mt-10 text-sm">
                {searchQuery || filterTab !== "all"
                  ? "No messages match this filter."
                  : "Start the conversation!"}
              </p>
            ) : (
              visibleTopLevel.map((msg) => {
                const replies = repliesFor(msg.id);
                const isExpanded = expandedThreadId === msg.id;
                return (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    isReply={false}
                    isMe={msg.senderId === currentUser?.id}
                    isStudent={isStudent}
                    isExpanded={isExpanded}
                    replyCount={msg.replyCount || replies.length}
                    isSaved={savedIds.includes(msg.id)}
                    onToggleExpand={() =>
                      setExpandedThreadId(isExpanded ? null : msg.id)
                    }
                    onReact={(emoji) =>
                      currentUser &&
                      toggleMessageReaction(msg.id, emoji, currentUser.id)
                    }
                    onTogglePin={
                      !isStudent
                        ? () => togglePinMessage(msg.id, !msg.pinned)
                        : undefined
                    }
                    onToggleVerified={() =>
                      setMessageVerified(msg.id, !msg.verified)
                    }
                    onToggleSave={() => handleToggleSave(msg.id)}
                  >
                    {isExpanded && (
                      <div className="mt-2">
                        {replies.map((r) => (
                          <MessageItem
                            key={r.id}
                            msg={r}
                            isReply
                            isMe={r.senderId === currentUser?.id}
                            isStudent={isStudent}
                            isSaved={savedIds.includes(r.id)}
                            onReact={(emoji) =>
                              currentUser &&
                              toggleMessageReaction(r.id, emoji, currentUser.id)
                            }
                            onToggleVerified={() =>
                              setMessageVerified(r.id, !r.verified)
                            }
                            onToggleSave={() => handleToggleSave(r.id)}
                          />
                        ))}
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
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  </MessageItem>
                );
              })
            )}
          </div>

          <MessageComposer onSend={handleSend} />
        </div>

        <ChannelInfoPanel
          channel={activeChannel}
          channelMessages={activeChannelMessages.filter((m) => !m.parentId)}
          onlinePeople={onlinePeople}
        />
      </div>
    </div>
  );
}
