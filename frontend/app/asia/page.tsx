import Image from "next/image";
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
                className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                {c.iso2 ? (
                  <div className="relative mt-0.5 h-8 w-12 shrink-0 overflow-hidden rounded border border-slate-200/80 shadow-sm">
                    <Image
                      src={`https://flagcdn.com/w160/${c.iso2.toLowerCase()}.png`}
                      alt={`Flag of ${c.name}`}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <span className="text-base font-semibold text-slate-900">{c.name}</span>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600">{c.narrative[0]}</p>
                  <span className="mt-2 inline-flex items-center text-sm font-medium text-sky-800">
                    View hub <span className="ml-1" aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </MemberShell>
  );
}
