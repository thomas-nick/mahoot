import Link from "next/link";
import {
  BRAND_THEME_CLASSES,
  type BrandTheme,
} from "@/app/marketplace/lib";

type Props = {
  label: string;
  theme: BrandTheme;
  count: number;
  newToday: number;
};

/**
 * Hero banner shown above the listings grid when a brand group is active.
 * Uses the brand's curated theme color for a subtle gradient + accent.
 */
export function ActiveGroupHero({ label, theme, count, newToday }: Props) {
  const classes = BRAND_THEME_CLASSES[theme];
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r p-5 shadow-sm ${classes.hero}`}
    >
      <div className="absolute inset-y-0 right-0 hidden items-center pr-5 opacity-10 sm:flex">
        <DiscArt />
      </div>
      <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider ${classes.accent}`}
          >
            Brand group
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {label}
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            <span className="font-semibold">{count.toLocaleString()}</span>{" "}
            active listing{count === 1 ? "" : "s"}
            {newToday > 0 ? (
              <>
                {" · "}
                <span className="font-semibold text-emerald-700">
                  {newToday} new today
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white"
          >
            ← All groups
          </Link>
          <Link
            href="/marketplace/new"
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            + List a {label}
          </Link>
        </div>
      </div>
    </section>
  );
}

function DiscArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 240"
      width="180"
      height="180"
      className="text-slate-900"
    >
      <ellipse cx="120" cy="120" rx="100" ry="36" fill="currentColor" />
      <ellipse cx="120" cy="115" rx="100" ry="36" fill="white" opacity="0.6" />
      <ellipse cx="120" cy="115" rx="60" ry="20" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
