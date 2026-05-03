"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BRAND_GROUPS, type BrandGroupId } from "@/app/marketplace/lib";

type Props = {
  totalCount: number;
  /** Active count keyed by group id (passed from server). */
  counts: Partial<Record<BrandGroupId, number>>;
};

export function BrandGroups({ totalCount, counts }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("group") ?? "";

  const navigate = (groupId: string) => {
    const sp = new URLSearchParams(params.toString());
    if (groupId) {
      sp.set("group", groupId);
    } else {
      sp.delete("group");
    }
    router.replace(`/marketplace?${sp.toString()}`, { scroll: false });
  };

  const visibleGroups = useMemo(
    () =>
      BRAND_GROUPS.filter((group) => {
        const count = counts[group.id] ?? 0;
        return count > 0 || active === group.id;
      }),
    [counts, active],
  );

  return (
    <div className="sticky top-0 z-20 -mx-4 rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:mx-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Groups</p>
        <p className="hidden text-xs text-slate-500 sm:block">
          Tap a brand to filter — like a dedicated group feed.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <GroupChip
          label="All brands"
          count={totalCount}
          isActive={!active}
          onSelect={() => navigate("")}
          tone="dark"
        />
        {visibleGroups.map((group) => (
          <GroupChip
            key={group.id}
            label={group.label}
            count={counts[group.id] ?? 0}
            isActive={active === group.id}
            onSelect={() => navigate(group.id)}
          />
        ))}
        {visibleGroups.length === 0 ? (
          <p className="self-center text-xs text-slate-500">
            No brand groups have listings yet — be the first to post.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function GroupChip({
  label,
  count,
  isActive,
  onSelect,
  tone = "default",
}: {
  label: string;
  count: number;
  isActive: boolean;
  onSelect: () => void;
  tone?: "default" | "dark";
}) {
  const base = isActive
    ? tone === "dark"
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-slate-900 text-white border-slate-900"
    : tone === "dark"
      ? "bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100"
      : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${base}`}
    >
      <span className="font-medium">{label}</span>
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
