import Link from "next/link";
import type { ReactNode } from "react";

export function LeaderboardRail({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  empty?: string;
  children: ReactNode;
}) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const hasChildren = childrenArray.some((child) => Boolean(child));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline sm:text-sm"
          >
            {viewAllLabel ?? "View all"} →
          </Link>
        ) : null}
      </div>
      {hasChildren ? (
        <div
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
          role="list"
        >
          {children}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{empty ?? "Nothing here yet."}</p>
      )}
    </section>
  );
}

export function LeaderboardRank({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-bold ${
        isTop ? "bg-amber-400 text-amber-950" : "bg-slate-900 text-white"
      }`}
      aria-label={`Rank ${rank}`}
    >
      #{rank}
    </span>
  );
}
