import Link from "next/link";
import Image from "next/image";

type CollectorRelease = {
  id: string;
  discId?: string | null;
  discExternalId?: string | null;
  discName?: string | null;
  runName?: string;
  year?: number | null;
  oopStatus?: string | null;
  collectorValue?: number | null;
  rarity?: number | null;
  soughtAfter?: number | null;
  priceLowUsd?: number | null;
  priceHighUsd?: number | null;
  imageUrl?: string | null;
};

type TypesenseSearchResponse = {
  hits?: Array<{
    document: {
      id?: string;
      discId?: string;
      discExternalId?: string;
      discName?: string;
      runName?: string;
      year?: number;
      oopStatus?: string;
      collectorValue?: number;
      rarity?: number;
      soughtAfter?: number;
      priceLowUsd?: number;
      priceHighUsd?: number;
      imageUrl?: string;
    };
  }>;
};

const typesenseHost = process.env.TYPESENSE_HOST;
const typesensePort = process.env.TYPESENSE_PORT ?? "8108";
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL ?? "http";
const typesenseApiKey = process.env.TYPESENSE_API_KEY;

async function fetchCollectorReleases(): Promise<CollectorRelease[]> {
  if (!typesenseHost || !typesenseApiKey) {
    return [];
  }

  const params = new URLSearchParams({
    q: "*",
    query_by: "runName",
    per_page: "100",
    sort_by: "year:desc",
  });

  const url = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/collector_releases/documents/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "X-TYPESENSE-API-KEY": typesenseApiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as TypesenseSearchResponse;
  return (
    json.hits?.map((hit) => {
      const doc = hit.document;
      return {
        id: String(doc.id ?? ""),
        discId: doc.discId ?? null,
        discExternalId: doc.discExternalId ?? null,
        discName: doc.discName ?? null,
        runName: doc.runName,
        year: typeof doc.year === "number" ? doc.year : null,
        oopStatus: doc.oopStatus ?? null,
        collectorValue: typeof doc.collectorValue === "number" ? doc.collectorValue : null,
        rarity: typeof doc.rarity === "number" ? doc.rarity : null,
        soughtAfter: typeof doc.soughtAfter === "number" ? doc.soughtAfter : null,
        priceLowUsd: typeof doc.priceLowUsd === "number" ? doc.priceLowUsd : null,
        priceHighUsd: typeof doc.priceHighUsd === "number" ? doc.priceHighUsd : null,
        imageUrl: doc.imageUrl ?? null,
      } satisfies CollectorRelease;
    }) ?? []
  );
}

function formatRange(low?: number | null, high?: number | null): string | null {
  if (typeof low !== "number" && typeof high !== "number") return null;
  if (typeof low === "number" && typeof high === "number") {
    return `$${low.toFixed(0)}–$${high.toFixed(0)}`;
  }
  if (typeof low === "number") return `$${low.toFixed(0)}+`;
  return `up to $${(high as number).toFixed(0)}`;
}

export default async function CollectorIndexPage() {
  const releases = await fetchCollectorReleases();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Collector runs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Only out-of-production and tour-series collector runs — not current stock discs.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {releases.length === 0 ? "No collector runs yet." : `${releases.length} runs indexed`}
        </p>
      </div>

      {releases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Once you add collector runs to discs, they will show up here automatically.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {releases.map((release) => {
            const href = release.discId
              ? `/discs/${release.discId}?tab=collector`
              : release.discExternalId
                ? `/discs/${release.discExternalId}?tab=collector`
                : "#";
            const label = release.runName ?? release.discName ?? "Collector run";
            const year =
              typeof release.year === "number" && Number.isFinite(release.year) ? release.year : null;
            const price = formatRange(release.priceLowUsd, release.priceHighUsd);
            const value =
              typeof release.collectorValue === "number" ? `Value ${release.collectorValue}/10` : null;
            const rarity =
              typeof release.rarity === "number" ? `Rarity ${release.rarity}/10` : null;
            const hype =
              typeof release.soughtAfter === "number" ? `Hype ${release.soughtAfter}/10` : null;

            return (
              <Link
                key={release.id}
                href={href}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
              >
                <div className="relative h-32 w-full bg-slate-100">
                  {release.imageUrl ? (
                    <Image
                      src={release.imageUrl}
                      alt={label}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 px-3 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                      {year ? `${year} ${label}` : label}
                    </h2>
                    {release.oopStatus && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
                        {release.oopStatus.replace(/-/g, " ")}
                      </span>
                    )}
                  </div>
                  {price && (
                    <p className="text-xs text-slate-600">
                      Estimated range: <span className="font-medium text-slate-900">{price}</span>
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {[value, rarity, hype].filter(Boolean).join(" · ") || "Collector run details"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-900 group-hover:text-slate-700">
                    View disc collector history →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

