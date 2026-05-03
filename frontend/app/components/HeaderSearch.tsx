"use client";

import { useEffect, useState } from "react";
import { CatalogSearch } from "@/app/components/CatalogSearch";

export const OPEN_SEARCH_EVENT = "mahoot:open-search";

/** Anywhere in the app can dispatch this to open the global search modal. */
export const openGlobalSearch = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
};

const SearchIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="14"
    height="14"
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

const isMacLike = () => {
  if (typeof window === "undefined") return false;
  return /Mac|iPad|iPhone|iPod/.test(window.navigator.platform);
};

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState<string>("Ctrl K");

  useEffect(() => {
    setShortcutLabel(isMacLike() ? "⌘ K" : "Ctrl K");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "/" && !isMeta) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the catalog"
        className="group inline-flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 sm:w-64"
      >
        <SearchIcon />
        <span className="flex-1 truncate text-left">Search discs, courses…</span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 group-hover:border-slate-300 sm:inline">
          {shortcutLabel}
        </kbd>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4 backdrop-blur-sm sm:pt-[14vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-200 sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2 px-1 text-xs text-slate-500">
              <SearchIcon />
              <span className="flex-1">
                Search discs, courses, marketplace listings, and collector runs.
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                aria-label="Close search"
              >
                Esc
              </button>
            </div>
            <CatalogSearch variant="hero" />
            <p className="mt-2 px-1 text-[11px] text-slate-400">
              Tip: facet chips in the dropdown narrow results instantly.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
