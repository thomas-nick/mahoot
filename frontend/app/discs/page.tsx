import Link from "next/link";
import { EmptyState, PageHeader, Pagination } from "@/app/components/ui";
import { DiscImage } from "@/app/components/DiscImage";
import {
  getDiscFacetOptions,
  getDiscs,
  getDiscRatingSummariesByDocumentIds,
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

const getDiscDisplayName = (disc: {
  name: string;
  plasticName?: string | null;
}) => {
  const plastic = (disc.plasticName ?? "").trim();
  if (!plastic) {
    return disc.name;
  }
  const lowerName = disc.name.toLowerCase();
  const lowerPlastic = plastic.toLowerCase();
  if (lowerName.includes(lowerPlastic)) {
    return disc.name;
  }
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

  const [result, facetOptions] = await Promise.all([
    getDiscs({ page, query: q, brand, category, plastic, stability, speedMin, speedMax }),
    getDiscFacetOptions(),
  ]);
  const ratingSummaries = await getDiscRatingSummariesByDocumentIds(
    result.items.map((disc) => disc.documentId),
  );

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
    {
      key: "speedMin",
      label: `Speed ≥ ${speedMin}`,
      value: speedMin?.toString(),
    },
    {
      key: "speedMax",
      label: `Speed ≤ ${speedMax}`,
      value: speedMax?.toString(),
    },
  ].filter((item) => item.value);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Discs"
        description="Browse and filter disc catalog entries with facet-style controls."
      />

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-7">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name"
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

      <div className="grid gap-4 lg:grid-cols-4">
        <aside className="space-y-4 lg:col-span-1">
          <FacetGroup title="Brand" values={facetOptions.brands} paramKey="brand" current={currentParams} />
          <FacetGroup
            title="Category"
            values={facetOptions.categories}
            paramKey="category"
            current={currentParams}
          />
          <FacetGroup
            title="Plastic"
            values={facetOptions.plastics}
            paramKey="plastic"
            current={currentParams}
          />
          <FacetGroup
            title="Stability"
            values={facetOptions.stabilities}
            paramKey="stability"
            current={currentParams}
          />
        </aside>

        <section className="space-y-4 lg:col-span-3">
          {result.items.length === 0 ? (
            <EmptyState label="No discs found for this filter." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {result.items.map((disc) => (
                <Link
                  key={disc.documentId}
                  href={`/discs/${disc.documentId}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
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
                  <p className="text-sm text-slate-500">{disc.brand || "Unknown brand"}</p>
                  <h2 className="mt-1 text-lg font-semibold">{getDiscDisplayName(disc)}</h2>
                  <div className="mt-2">
                    {disc.category ? (
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {disc.category}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600">No category</span>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 text-xs text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-1">S {disc.speed ?? "-"}</span>
                    <span className="rounded bg-slate-100 px-2 py-1">G {disc.glide ?? "-"}</span>
                    <span className="rounded bg-slate-100 px-2 py-1">T {disc.turn ?? "-"}</span>
                    <span className="rounded bg-slate-100 px-2 py-1">F {disc.fade ?? "-"}</span>
                    {(() => {
                      const summary = ratingSummaries.get(disc.documentId);
                      if (!summary || summary.ratingCount === 0 || summary.ratingAverageOverall === null) {
                        return null;
                      }
                      return (
                        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                          {summary.ratingAverageOverall}/10 ({summary.ratingCount})
                        </span>
                      );
                    })()}
                  </div>
                  {disc.category && (
                    <div className="mt-4">
                      <span className="text-xs text-slate-500">Category: {disc.category}</span>
                    </div>
                  )}
                  {disc.plasticName && (
                    <div className="mt-1">
                      <span className="text-xs text-slate-500">Plastic: {disc.plasticName}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          <Pagination
            page={result.pagination.page}
            pageCount={result.pagination.pageCount}
            buildHref={buildHref}
          />
        </section>
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  values,
  paramKey,
  current,
}: {
  title: string;
  values: string[];
  paramKey: "brand" | "category" | "plastic" | "stability";
  current: Record<string, string | undefined>;
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => {
          const isActive = current[paramKey] === value;
          return (
            <Link
              key={`${paramKey}-${value}`}
              href={withQuery(current, {
                [paramKey]: isActive ? undefined : value,
                page: undefined,
              })}
              className={`rounded-full px-2.5 py-1 text-xs ${
                isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {value}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
