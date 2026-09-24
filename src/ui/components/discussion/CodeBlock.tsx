import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

// Requires: npm install react-markdown remark-gfm react-syntax-highlighter
//           npm install -D @types/react-syntax-highlighter

function CodeBlockRenderer({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied or unsupported -- fail silently, the
      // copy button just won't visibly confirm
    }
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-xs text-slate-300">
        <span className="font-mono">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, fontSize: "0.8rem" }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownMessage({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-slate-700 dark:text-slate-200 mb-1.5 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-200 mb-1.5 space-y-0.5">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 text-sm text-slate-700 dark:text-slate-200 mb-1.5 space-y-0.5">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-bold text-slate-900 dark:text-white">
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-indigo-300 dark:border-indigo-700 pl-3 italic text-slate-600 dark:text-slate-300 my-1.5">
            {children}
          </blockquote>
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code(props: any) {
          const { inline, className, children } = props;
          const match = /language-(\w+)/.exec(className || "");
          if (inline) {
            return (
              <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[0.85em] font-mono">
                {children}
              </code>
            );
          }
          return (
            <CodeBlockRenderer
              language={match?.[1] || ""}
              value={String(children).replace(/\n$/, "")}
            />
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
