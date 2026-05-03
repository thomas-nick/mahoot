import Link from "next/link";
import { EmptyState, PageHeader, Pagination } from "@/app/components/ui";
import { DiscImage } from "@/app/components/DiscImage";
import { DiscLeaderboardCard } from "@/app/components/DiscLeaderboardCard";
import { LeaderboardRail } from "@/app/components/LeaderboardRail";
import { RatingChip } from "@/app/components/RatingChip";
import { getDiscLeaderboards } from "@/lib/leaderboards";
import { compareByBayes } from "@/lib/rating-score";
import {
  getDiscFacetOptions,
  getDiscRatingSummariesByDocumentIds,
  getDiscs,
} from "@/lib/strapi";

export const dynamic = "force-dynamic";

type DiscsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

const getNumber = (value: string | string[] | undefined) => {
  const stringValue = getString(value);
  if (!stringValue) return undefined;
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getDiscDisplayName = (disc: { name: string; plasticName?: string | null }) => {
  const plastic = (disc.plasticName ?? "").trim();
  if (!plastic) return disc.name;
  const lowerName = disc.name.toLowerCase();
  if (lowerName.includes(plastic.toLowerCase())) return disc.name;
  return `${plastic} ${disc.name}`.trim();
};

const withQuery = (
  baseParams: Record<string, string | undefined>,
  updates: Record<string, string | undefined>
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...baseParams, ...updates })) {
    if (value && value.trim().length > 0) {
      query.set(key, value);
    }
  }
  const raw = query.toString();
  return raw ? `/discs?${raw}` : "/discs";
};

export default async function DiscsPage({ searchParams }: DiscsPageProps) {
  const params = await searchParams;
  const page = Number(getString(params.page) ?? "1");
  const q = getString(params.q);
  const brand = getString(params.brand);
  const category = getString(params.category);
  const plastic = getString(params.plastic);
  const stability = getString(params.stability);
  const speedMin = getNumber(params.speedMin);
  const speedMax = getNumber(params.speedMax);

  const hasActiveFilter = Boolean(q || brand || category || plastic || stability || speedMin || speedMax);

  const currentParams: Record<string, string | undefined> = {
    q,
    brand,
    category,
    plastic,
    stability,
    speedMin: speedMin?.toString(),
    speedMax: speedMax?.toString(),
  };

  const buildHref = (nextPage: number) =>
    withQuery(currentParams, {
      page: String(nextPage),
    });

  const activeFilters = [
    { key: "q", label: `Query: ${q}`, value: q },
    { key: "brand", label: `Brand: ${brand}`, value: brand },
    { key: "category", label: `Category: ${category}`, value: category },
    { key: "plastic", label: `Plastic: ${plastic}`, value: plastic },
    { key: "stability", label: `Stability: ${stability}`, value: stability },
    { key: "speedMin", label: `Speed ≥ ${speedMin}`, value: speedMin?.toString() },
    { key: "speedMax", label: `Speed ≤ ${speedMax}`, value: speedMax?.toString() },
  ].filter((item) => item.value);

  const facetOptions = await getDiscFacetOptions();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Discs"
        description="The community's top-rated molds — ranked, not alphabetical."
      />

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-7">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:col-span-2"
        />
        <select
          name="brand"
          defaultValue={brand ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="">All brands</option>
          {facetOptions.brands.map((brandOption) => (
            <option key={brandOption} value={brandOption}>
              {brandOption}
            </option>
          ))}
        </select>
        <input
          name="category"
          defaultValue={category}
          placeholder="Category"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <select
          name="plastic"
          defaultValue={plastic ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="">All plastics</option>
          {facetOptions.plastics.map((plasticOption) => (
            <option key={plasticOption} value={plasticOption}>
              {plasticOption}
            </option>
          ))}
        </select>
        <input
          name="stability"
          defaultValue={stability}
          placeholder="Stability"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Apply</button>
        <input
          type="number"
          name="speedMin"
          min={facetOptions.speedRange.min ?? undefined}
          max={facetOptions.speedRange.max ?? undefined}
          defaultValue={speedMin}
          placeholder={`Speed min (${facetOptions.speedRange.min ?? "-"})`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          type="number"
          name="speedMax"
          min={facetOptions.speedRange.min ?? undefined}
          max={facetOptions.speedRange.max ?? undefined}
          defaultValue={speedMax}
          placeholder={`Speed max (${facetOptions.speedRange.max ?? "-"})`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </form>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          {activeFilters.map((filter) => (
            <Link
              key={filter.key}
              href={withQuery(currentParams, { [filter.key]: undefined, page: undefined })}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
            >
              {filter.label} ×
            </Link>
          ))}
          <Link href="/discs" className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
            Clear all
          </Link>
        </div>
      )}

      {hasActiveFilter ? (
        <FilteredDiscList
          page={page}
          pageSize={12}
          query={q}
          brand={brand}
          category={category}
          plastic={plastic}
          stability={stability}
          speedMin={speedMin}
          speedMax={speedMax}
          buildHref={buildHref}
        />
      ) : (
        <DiscLeaderboardSection />
      )}
    </div>
  );
}

async function DiscLeaderboardSection() {
  const leaderboards = await getDiscLeaderboards({ limit: 8, minRatings: 1 });

  if (
    leaderboards.rails.every((entry) => entry.items.length === 0) &&
    leaderboards.mostReviewed.length === 0
  ) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No reviews yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Be the first to rate a disc — leaderboards fill in as the community starts reviewing.
        </p>
        <Link
          href="/discs?q=a"
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Browse the catalog
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {leaderboards.rails.map(({ rail, items }) => (
        <LeaderboardRail
          key={rail.id}
          title={rail.label}
          subtitle="Ranked by Bayesian-smoothed community score."
          viewAllHref={`/leaderboards#${rail.id}`}
        >
          {items.map((item, index) => (
            <DiscLeaderboardCard key={item.disc.documentId} item={item} rank={index + 1} />
          ))}
        </LeaderboardRail>
      ))}

      {leaderboards.mostReviewed.length > 0 ? (
        <LeaderboardRail
          title="Most reviewed discs"
          subtitle="Volume leaderboard — most player ratings, regardless of score."
          viewAllHref="/leaderboards#most-reviewed-discs"
        >
          {leaderboards.mostReviewed.map((item, index) => (
            <DiscLeaderboardCard key={`mr-${item.disc.documentId}`} item={item} rank={index + 1} />
          ))}
        </LeaderboardRail>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Looking for a specific disc? Use the filters above, or{" "}
        <Link className="font-medium text-slate-900 underline" href="/discs?q=a">
          browse the full catalog
        </Link>
        .
      </div>
    </div>
  );
}

async function FilteredDiscList({
  page,
  pageSize,
  query,
  brand,
  category,
  plastic,
  stability,
  speedMin,
  speedMax,
  buildHref,
}: {
  page: number;
  pageSize: number;
  query?: string;
  brand?: string;
  category?: string;
  plastic?: string;
  stability?: string;
  speedMin?: number;
  speedMax?: number;
  buildHref: (nextPage: number) => string;
}) {
  const result = await getDiscs({ page, pageSize, query, brand, category, plastic, stability, speedMin, speedMax });
  const ratingSummaries = await getDiscRatingSummariesByDocumentIds(
    result.items.map((disc) => disc.documentId),
  );

  // Re-sort the current page by Bayesian score so even filtered views read like a leaderboard.
  const ranked = [...result.items].sort(
    compareByBayes((disc) => {
      const summary = ratingSummaries.get(disc.documentId);
      return { avg: summary?.ratingAverageOverall ?? null, count: summary?.ratingCount ?? 0 };
    }),
  );

  if (ranked.length === 0) {
    return <EmptyState label="No discs match those filters." />;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Filtered results</h2>
        <p className="text-xs text-slate-500">Sorted by community score, highest first.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((disc, index) => {
          const summary = ratingSummaries.get(disc.documentId);
          return (
            <Link
              key={disc.documentId}
              href={`/discs/${disc.documentId}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <DiscImage
                  src={disc.imageUrl}
                  alt={`${disc.name} preview`}
                  className="h-40 w-full object-cover"
                  fallbackLabel="No image"
                  loading="lazy"
                />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {disc.brand || "Unknown brand"}
                  </p>
                  <h3 className="mt-0.5 line-clamp-1 text-lg font-semibold text-slate-900">
                    {getDiscDisplayName(disc)}
                  </h3>
                </div>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                  #{(page - 1) * pageSize + index + 1}
                </span>
              </div>
              <div className="mt-3">
                <RatingChip
                  average={summary?.ratingAverageOverall ?? null}
                  count={summary?.ratingCount ?? 0}
                  emphasis="headline"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-600">
                {disc.category ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{disc.category}</span>
                ) : null}
                {disc.plasticName ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{disc.plasticName}</span>
                ) : null}
                <span className="rounded bg-slate-100 px-2 py-1">S {disc.speed ?? "-"}</span>
                <span className="rounded bg-slate-100 px-2 py-1">G {disc.glide ?? "-"}</span>
                <span className="rounded bg-slate-100 px-2 py-1">T {disc.turn ?? "-"}</span>
                <span className="rounded bg-slate-100 px-2 py-1">F {disc.fade ?? "-"}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <Pagination page={result.pagination.page} pageCount={result.pagination.pageCount} buildHref={buildHref} />
    </section>
  );
}
