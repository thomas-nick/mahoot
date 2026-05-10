import Link from "next/link";
import { CatalogSearch } from "@/app/components/CatalogSearch";
import { DiscImage } from "@/app/components/DiscImage";
import { FrontAuthPanel } from "@/app/components/FrontAuthPanel";
import { FrontHeroSearchButton } from "@/app/components/FrontHeroSearchButton";
import {
  getDiscs,
  getDiscRatingSummariesByDocumentIds,
  getFeaturedCatalogStats,
} from "@/lib/strapi";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");

const DiscArt = () => (
  <svg
    aria-hidden
    viewBox="0 0 600 600"
    className="absolute inset-0 h-full w-full opacity-[0.18]"
  >
    <defs>
      <radialGradient id="hero-disc-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0" />
      </radialGradient>
      <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hero-grid)" />
    <circle cx="120" cy="500" r="180" fill="url(#hero-disc-grad)" />
    <circle cx="520" cy="120" r="220" fill="url(#hero-disc-grad)" />
  </svg>
);

const ChipLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur transition hover:border-white/50 hover:bg-white/20"
  >
    {label}
    <span aria-hidden>→</span>
  </Link>
);

const FeatureTile = ({
  href,
  eyebrow,
  title,
  description,
  accent,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}) => (
  <Link
    href={href}
    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
  >
    <span className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} aria-hidden />
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {eyebrow}
    </p>
    <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-600">{description}</p>
    <span className="mt-3 inline-flex items-center text-sm font-medium text-slate-900 opacity-80 transition group-hover:opacity-100">
      Explore <span aria-hidden className="ml-1 transition group-hover:translate-x-0.5">→</span>
    </span>
  </Link>
);

export default async function Home() {
  const [stats, featuredDiscs] = await Promise.all([
    getFeaturedCatalogStats(),
    getDiscs({ page: 1, pageSize: 6 }),
  ]);
  const ratingSummaries = await getDiscRatingSummariesByDocumentIds(
    featuredDiscs.items.map((disc) => disc.documentId),
  );
  const topReviewedDiscs = [...featuredDiscs.items]
    .map((disc) => ({
      disc,
      summary: ratingSummaries.get(disc.documentId) ?? null,
    }))
    .filter((item) => (item.summary?.ratingCount ?? 0) > 0)
    .sort((a, b) => {
      const countDelta = (b.summary?.ratingCount ?? 0) - (a.summary?.ratingCount ?? 0);
      if (countDelta !== 0) return countDelta;
      return (b.summary?.ratingAverageOverall ?? 0) - (a.summary?.ratingAverageOverall ?? 0);
    })
    .slice(0, 4);

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white shadow-xl">
        <DiscArt />
        <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:px-14 lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              The disc golf catalog &amp; marketplace
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Find your next disc. <span className="text-emerald-300">In a single search.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
              Reviews, flight ratings, real-world prices, and a P2P marketplace — built by players,
              for players.
            </p>

            <div className="mt-8 w-full max-w-2xl">
              <CatalogSearch variant="homepage" />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <FrontHeroSearchButton />
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                Browse marketplace
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <ChipLink href="/discs" label="All discs" />
              <ChipLink href="/courses" label="Courses" />
              <ChipLink href="/marketplace?group=discmania" label="Discmania" />
              <ChipLink href="/marketplace?group=innova" label="Innova" />
              <ChipLink href="/marketplace?group=discraft" label="Discraft" />
              <ChipLink href="/marketplace?group=mvp" label="MVP" />
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6 text-left">
              <div>
                <dt className="text-xs uppercase tracking-wider text-white/60">Discs</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {numberFormatter.format(stats.discTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-white/60">Courses</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {numberFormatter.format(stats.courseTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-white/60">Reviews</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {numberFormatter.format(stats.reviewTotal ?? 0)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:pl-2">
            <FrontAuthPanel />
          </div>
        </div>
      </section>

      {/* FEATURE TILES */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureTile
          href="/discs"
          eyebrow="Catalog"
          title="Every disc, rated"
          description="Search and compare discs by flight numbers, plastic, and player ratings."
          accent="bg-emerald-500"
        />
        <FeatureTile
          href="/marketplace"
          eyebrow="Marketplace"
          title="Buy &amp; sell directly"
          description="Browse player-listed discs, message sellers, pay with PayPal, Venmo, or cash."
          accent="bg-sky-500"
        />
        <FeatureTile
          href="/courses"
          eyebrow="Courses"
          title="Find a place to play"
          description="Search courses by city, state, and difficulty, with type and amenity tags."
          accent="bg-amber-500"
        />
        <FeatureTile
          href="/collector"
          eyebrow="Collector"
          title="Track rare runs"
          description="Look up out-of-production runs and collector values across the catalog."
          accent="bg-violet-500"
        />
      </section>

      {/* TOP REVIEWED DISCS */}
      {topReviewedDiscs.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Community picks
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Top reviewed discs</h2>
            </div>
            <Link
              href="/discs"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              View all discs <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topReviewedDiscs.map(({ disc, summary }) => (
              <Link
                key={disc.documentId}
                href={`/discs/${disc.documentId}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                  <DiscImage
                    src={disc.imageUrl}
                    alt={`${disc.name} preview`}
                    className="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.03]"
                    fallbackLabel="No image"
                    loading="lazy"
                  />
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    ★ {summary?.ratingAverageOverall?.toFixed(1) ?? "-"}
                    <span className="font-normal text-emerald-50/90">
                      ({summary?.ratingCount ?? 0})
                    </span>
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {disc.brand || "Unknown brand"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-base font-semibold text-slate-900 group-hover:underline">
                    {disc.name}
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-1 text-[11px]">
                    <span className="rounded bg-slate-100 px-1.5 py-1 text-center text-slate-700">
                      <span className="block text-[9px] uppercase text-slate-500">S</span>
                      {disc.speed ?? "-"}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-1 text-center text-slate-700">
                      <span className="block text-[9px] uppercase text-slate-500">G</span>
                      {disc.glide ?? "-"}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-1 text-center text-slate-700">
                      <span className="block text-[9px] uppercase text-slate-500">T</span>
                      {disc.turn ?? "-"}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-1 text-center text-slate-700">
                      <span className="block text-[9px] uppercase text-slate-500">F</span>
                      {disc.fade ?? "-"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* CONTRIBUTE STRIP */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Help the community
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Add what&rsquo;s missing.</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Spotted a gap in the catalog? Submit it in under a minute — we review and publish for
            everyone.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ContributeTile
            href="/submit-disc"
            eyebrow="Catalog"
            title="Submit a disc"
            description="Mold, plastic, flight numbers, weight — we&rsquo;ll review and publish."
            accent="bg-emerald-500"
          />
          <ContributeTile
            href="/submit-course"
            eyebrow="Courses"
            title="Submit a course"
            description="Add a new course with location, holes, difficulty, and amenities."
            accent="bg-amber-500"
          />
          <ContributeTile
            href="/marketplace/new"
            eyebrow="Marketplace"
            title="List a disc"
            description="Sell or trade with other players — accept PayPal, Venmo, or cash."
            accent="bg-sky-500"
          />
        </div>
      </section>
    </div>
  );
}

function ContributeTile({
  href,
  eyebrow,
  title,
  description,
  accent,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} aria-hidden />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <span className="mt-3 inline-flex items-center text-sm font-medium text-slate-900">
        Get started
        <span aria-hidden className="ml-1 transition motion-safe:group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}
