import type { ReactNode } from "react";

/** Soft card surface used on member-focused pages (public profile, account, marketplace band). */
export const memberSectionSurface = [
  "rounded-2xl border border-white/70 bg-gradient-to-br from-sky-50/90 via-white to-violet-50/40",
  "shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)]",
].join(" ");

export function memberActivityCardTint(i: number) {
  return i % 2 === 0 ? "from-sky-50/80 via-white to-white" : "from-amber-50/50 via-white to-white";
}

export function MemberShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative -mx-4 overflow-x-hidden px-4 pb-4 sm:-mx-6 sm:px-6 sm:pb-8 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-sky-100/35 via-slate-50/80 to-violet-100/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 -z-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-48 -z-10 h-64 w-64 rounded-full bg-violet-200/25 blur-3xl"
      />
      {children}
    </div>
  );
}
