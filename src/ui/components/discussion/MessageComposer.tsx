import React, { useRef, useState } from "react";
import { FileUpload } from "../FileUpload";
import { Bold, Italic, Code, Terminal, Smile, Send, X } from "lucide-react";

const EMOJI_PICKER = ["👍", "🎉", "💡", "🚀", "❤️", "😂", "🙌", "✅"];

export function MessageComposer({
  onSend,
}: {
  onSend: (
    text: string,
    attachmentUrl?: string,
    attachmentType?: "image" | "video" | "document",
  ) => void;
}) {
  const [text, setText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState<
    "image" | "video" | "document" | undefined
  >(undefined);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (marker: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + marker + "text" + marker);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end) || "text";
    const next =
      text.slice(0, start) + marker + selected + marker + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + marker.length;
      el.selectionEnd = start + marker.length + selected.length;
    });
  };

  const insertCodeBlock = () => {
    const insertion = "\n```language\ncode here\n```\n";
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + insertion);
      return;
    }
    const pos = el.selectionStart;
    setText(text.slice(0, pos) + insertion + text.slice(pos));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !attachmentUrl) return;
    onSend(text, attachmentUrl || undefined, attachmentType);
    setText("");
    setAttachmentUrl("");
    setAttachmentType(undefined);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
    >
      {attachmentUrl && (
        <div className="mb-2 flex items-center bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
          <span className="text-xs text-slate-600 dark:text-slate-300 mr-auto truncate">
            Attached: {attachmentType}
          </span>
          <button
            type="button"
            onClick={() => {
              setAttachmentUrl("");
              setAttachmentType(undefined);
            }}
            className="p-1 hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        rows={2}
        placeholder="Type your academic question or contribution (Markdown supported)..."
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 relative">
          <button
            type="button"
            onClick={() => wrapSelection("**")}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("_")}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("`")}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition"
            title="Inline code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertCodeBlock}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition"
            title="Code block"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <FileUpload
            label=""
            onUpload={(url, type) => {
              setAttachmentUrl(url);
              setAttachmentType(type);
            }}
          />
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition"
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-9 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex gap-1 shadow-lg z-10">
              {EMOJI_PICKER.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setText((prev) => prev + e);
                    setShowEmoji(false);
                  }}
                  className="text-lg hover:scale-125 transition"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!text.trim() && !attachmentUrl}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition flex items-center gap-1.5"
        >
          Send <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
