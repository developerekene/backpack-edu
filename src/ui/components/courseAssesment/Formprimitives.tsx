import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const inputClass =
  "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none";

export const checkboxRowClass =
  "flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 font-medium";

export function FormSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
      >
        <span className="flex items-center font-bold text-slate-900 dark:text-white">
          <span className="mr-2 text-indigo-400">{icon}</span>
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-5 pt-1 space-y-4 border-t border-slate-200 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
