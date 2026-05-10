import Link from "next/link";

export const ASIA_COUNTRY_TABS = [
  { id: "overview", label: "Overview" },
  { id: "courses", label: "Courses" },
  { id: "community", label: "Community" },
  { id: "media", label: "Media" },
  { id: "pdga", label: "PDGA history" },
  { id: "events", label: "Events" },
] as const;

export type AsiaCountryTabId = (typeof ASIA_COUNTRY_TABS)[number]["id"];

export function normalizeAsiaCountryTab(raw: string | string[] | undefined): AsiaCountryTabId {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const t = (typeof v === "string" ? v : "overview").trim().toLowerCase();
  if (ASIA_COUNTRY_TABS.some((x) => x.id === t)) return t as AsiaCountryTabId;
  return "overview";
}

export function AsiaCountryTabNav({ slug, active }: { slug: string; active: AsiaCountryTabId }) {
  const base = `/asia/${slug}`;
  return (
    <nav
      aria-label="Country hub sections"
      className="-mx-1 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm sm:flex-nowrap sm:overflow-x-auto"
    >
      {ASIA_COUNTRY_TABS.map((tab) => {
        const href = tab.id === "overview" ? base : `${base}?tab=${tab.id}`;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            scroll={false}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
