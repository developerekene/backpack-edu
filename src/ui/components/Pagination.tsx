import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = "items",
  className = "",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, totalItems);

  const buildPageNumbers = (): Array<number | "ellipsis"> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: Array<number | "ellipsis"> = [1];
    if (safePage > 3) pages.push("ellipsis");
    const windowStart = Math.max(2, safePage - 1);
    const windowEnd = Math.min(totalPages - 1, safePage + 1);
    for (let p = windowStart; p <= windowEnd; p++) {
      pages.push(p);
    }
    if (safePage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = buildPageNumbers();

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 ${className}`}
    >
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
        Showing <span className="font-bold text-slate-900 dark:text-white">{startIdx}</span>–
        <span className="font-bold text-slate-900 dark:text-white">{endIdx}</span> of{" "}
        <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex items-center flex-wrap justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0078d4] hover:text-[#0078d4] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer whitespace-nowrap"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {pageNumbers.map((entry, idx) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis_${idx}`}
              className="px-2 py-1 text-xs font-semibold text-slate-400 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === safePage ? "page" : undefined}
              className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-bold tabular-nums transition cursor-pointer ${
                entry === safePage
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0078d4] hover:text-[#0078d4]"
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0078d4] hover:text-[#0078d4] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer whitespace-nowrap"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
