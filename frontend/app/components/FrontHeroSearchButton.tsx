"use client";

import { openGlobalSearch } from "@/app/components/HeaderSearch";

const SearchIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.65" y2="16.65" />
  </svg>
);

/** Big primary CTA on the front-page hero that opens the global search overlay. */
export function FrontHeroSearchButton() {
  return (
    <button
      type="button"
      onClick={() => openGlobalSearch()}
      className="group inline-flex items-center justify-between gap-3 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-300"
    >
      <span className="inline-flex items-center gap-2">
        <SearchIcon />
        Search the catalog
      </span>
      <kbd className="hidden rounded bg-slate-900/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-900/70 group-hover:bg-slate-900/15 sm:inline">
        ⌘ K
      </kbd>
    </button>
  );
}
