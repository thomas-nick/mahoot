import Link from "next/link";
import Image from "next/image";

type CollectorDisc = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  plastic: string | null;
  releaseType: string;
  productionStatus: string;
  runName: string | null;
  runYear: number | null;
  collectorValue: number | null;
  rarity: number | null;
  soughtAfter: number | null;
  priceLowUsd: number | null;
  priceHighUsd: number | null;
  imageUrl: string | null;
};

type TypesenseDoc = {
  id?: string;
  name?: string;
  brand?: string;
  category?: string;
  plastic?: string;
  releaseType?: string;
  productionStatus?: string;
  runName?: string;
  runYear?: number;
  collectorValue?: number;
  rarity?: number;
  soughtAfter?: number;
  priceLowUsd?: number;
  priceHighUsd?: number;
  imageUrl?: string;
};

type TypesenseSearchResponse = {
  hits?: Array<{ document: TypesenseDoc }>;
};

const RELEASE_TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  "limited-edition": "Limited edition",
  "tour-series": "Tour series",
  "money-run": "Money run",
  "tournament-run": "Tournament run",
};

const COLLECTOR_RELEASE_TYPES = ["limited-edition", "tour-series", "money-run", "tournament-run"];

const formatReleaseType = (value: string | null | undefined) => {
  if (!value) return "Stock";
  return RELEASE_TYPE_LABELS[value] ?? value.replace(/-/g, " ");
};

const formatRange = (low: number | null, high: number | null): string | null => {
  if (low == null && high == null) return null;
  if (low != null && high != null) return `$${low.toFixed(0)}–$${high.toFixed(0)}`;
  if (low != null) return `$${low.toFixed(0)}+`;
  return `up to $${(high as number).toFixed(0)}`;
};

const typesenseHost = process.env.TYPESENSE_HOST;
const typesensePort = process.env.TYPESENSE_PORT ?? "8108";
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL ?? "http";
const typesenseApiKey = process.env.TYPESENSE_API_KEY;

async function fetchCollectorDiscs(): Promise<CollectorDisc[]> {
  if (!typesenseHost || !typesenseApiKey) {
    return [];
  }

  const filter = `releaseType:[${COLLECTOR_RELEASE_TYPES.join(",")}]`;
  const params = new URLSearchParams({
    q: "*",
    query_by: "name,brand,runName",
    per_page: "100",
    sort_by: "runYear:desc,collectorValue:desc",
    filter_by: filter,
  });

  const url = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/discs/documents/search?${params.toString()}`;

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
        name: doc.name ?? "Unnamed disc",
        brand: doc.brand ?? null,
        category: doc.category ?? null,
        plastic: doc.plastic ?? null,
        releaseType: doc.releaseType ?? "stock",
        productionStatus: doc.productionStatus ?? "in-production",
        runName: doc.runName ?? null,
        runYear: typeof doc.runYear === "number" ? doc.runYear : null,
        collectorValue: typeof doc.collectorValue === "number" ? doc.collectorValue : null,
        rarity: typeof doc.rarity === "number" ? doc.rarity : null,
        soughtAfter: typeof doc.soughtAfter === "number" ? doc.soughtAfter : null,
        priceLowUsd: typeof doc.priceLowUsd === "number" ? doc.priceLowUsd : null,
        priceHighUsd: typeof doc.priceHighUsd === "number" ? doc.priceHighUsd : null,
        imageUrl: doc.imageUrl ?? null,
      } satisfies CollectorDisc;
    }) ?? []
  );
}

export default async function CollectorIndexPage() {
  const discs = await fetchCollectorDiscs();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Collector runs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tour series, limited editions, money runs, and tournament runs across the catalog.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {discs.length === 0 ? "No collector runs yet." : `${discs.length} runs indexed`}
        </p>
      </div>

      {discs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Mark a disc variant as <code className="rounded bg-white px-1">tour-series</code>,{" "}
          <code className="rounded bg-white px-1">limited-edition</code>,{" "}
          <code className="rounded bg-white px-1">money-run</code>, or{" "}
          <code className="rounded bg-white px-1">tournament-run</code> in Strapi to see it here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discs.map((disc) => {
            const href = `/discs/${disc.id}?tab=releases`;
            const yearLabel =
              typeof disc.runYear === "number" && Number.isFinite(disc.runYear) ? disc.runYear : null;
            const price = formatRange(disc.priceLowUsd, disc.priceHighUsd);
            const titleParts = [yearLabel, disc.runName].filter(Boolean).join(" ");
            const title = titleParts || disc.name;
            const value =
              typeof disc.collectorValue === "number" ? `Value ${disc.collectorValue}/10` : null;
            const rarity = typeof disc.rarity === "number" ? `Rarity ${disc.rarity}/10` : null;
            const hype =
              typeof disc.soughtAfter === "number" ? `Hype ${disc.soughtAfter}/10` : null;

            return (
              <Link
                key={disc.id}
                href={href}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
              >
                <div className="relative h-32 w-full bg-slate-100">
                  {disc.imageUrl ? (
                    <Image
                      src={disc.imageUrl}
                      alt={title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                  <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
                    {formatReleaseType(disc.releaseType)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 px-3 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
                    {disc.productionStatus === "oop" ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        OOP
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {[disc.brand, disc.plastic, disc.category].filter(Boolean).join(" · ") || disc.name}
                  </p>
                  {price && (
                    <p className="text-xs text-slate-600">
                      Estimated range: <span className="font-medium text-slate-900">{price}</span>
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {[value, rarity, hype].filter(Boolean).join(" · ") || "Collector run details"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-900 group-hover:text-slate-700">
                    View release →
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
