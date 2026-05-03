"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS, isSortId, type SortId } from "@/app/marketplace/lib";

type Props = { count: number };

const ViewIcon = ({ kind }: { kind: "grid" | "list" }) =>
  kind === "grid" ? (
    <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ) : (
    <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="4" cy="18" r="1.5" />
    </svg>
  );

export function SortBar({ count }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const current: SortId = isSortId(params.get("sort") ?? "")
    ? (params.get("sort") as SortId)
    : "newest";
  const view = params.get("view") === "list" ? "list" : "grid";

  const setParam = (key: string, value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value) {
      sp.set(key, value);
    } else {
      sp.delete(key);
    }
    router.replace(`/marketplace?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="px-1 text-sm text-slate-600">
        <span className="text-base font-semibold text-slate-900">
          {count.toLocaleString()}
        </span>{" "}
        {count === 1 ? "listing" : "listings"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Sort"
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={current === option.id}
              onClick={() => setParam("sort", option.id === "newest" ? "" : option.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                current === option.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div
          role="radiogroup"
          aria-label="View"
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1"
        >
          {(["grid", "list"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={view === kind}
              aria-label={kind === "grid" ? "Grid view" : "List view"}
              onClick={() => setParam("view", kind === "grid" ? "" : "list")}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                view === kind
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ViewIcon kind={kind} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
