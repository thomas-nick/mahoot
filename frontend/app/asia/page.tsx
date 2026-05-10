import Link from "next/link";
import type { Metadata } from "next";
import { AsiaHubFlagHero } from "@/app/asia/AsiaHubFlagHero";
import { MemberShell, memberSectionSurface } from "@/app/components/MemberShell";
import { Card, CardHeader } from "@/app/components/ui";
import { ASIA_COUNTRY_PAGES, ASIA_HUB_INTRO } from "@/lib/asia-regions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Asia disc golf spotlight",
  description:
    "Regional hub for disc golf in Southeast and East Asia — courses, community, and Mahoot reviewer activity.",
};

export default function AsiaHubPage() {
  return (
    <MemberShell className="space-y-8">
      <AsiaHubFlagHero countries={ASIA_COUNTRY_PAGES} />

      <Card className={`border-white/60 ${memberSectionSurface}`}>
        <CardHeader
          title="Why this hub exists"
          description="Editorial framing — not inferred from rankings we do not yet source."
        />
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          {ASIA_HUB_INTRO.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Countries</h2>
        <p className="text-sm text-slate-600">
          Open a country for course lists, public member directory, reviewer activity on Mahoot, and hand-picked links.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ASIA_COUNTRY_PAGES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/asia/${c.slug}`}
                className="block rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                <span className="text-base font-semibold text-slate-900">{c.name}</span>
                {c.iso2 ? (
                  <span className="ml-2 text-xs font-medium text-slate-400">{c.iso2}</span>
                ) : null}
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600">{c.narrative[0]}</p>
                <span className="mt-2 inline-flex items-center text-sm font-medium text-sky-800">
                  View hub <span className="ml-1" aria-hidden>→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </MemberShell>
  );
}
