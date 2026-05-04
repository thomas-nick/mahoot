import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

type TypesenseHit<T> = {
  document: T;
};

type FacetCountEntry = {
  value?: string | number | boolean;
  count?: number;
};

type TypesenseFacetCount = {
  field_name?: string;
  counts?: FacetCountEntry[];
};

type MultiSearchResult<T> = {
  hits?: TypesenseHit<T>[];
  found?: number;
  facet_counts?: TypesenseFacetCount[];
};

type DiscDoc = {
  id: string;
  externalId?: string;
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

type CourseDoc = {
  id: string;
  externalId?: string;
  name?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  difficulty?: string;
  type?: string;
  pros?: string;
  cons?: string;
  description?: string;
};

type ListingDoc = {
  id: string;
  title?: string;
  description?: string;
  priceUsd?: number;
  currency?: string;
  condition?: string;
  status?: string;
  discId?: string;
  discExternalId?: string;
  discDisplayName?: string;
  sellerId?: string;
  sellerUsername?: string;
  imageUrl?: string;
};

type MultiSearchResponse = {
  results: Array<
    | MultiSearchResult<DiscDoc>
    | MultiSearchResult<CourseDoc>
    | MultiSearchResult<ListingDoc>
  >;
};

type FacetBucket = { value: string; count: number };

const emptyDiscMeta = {
  found: 0,
  facets: {
    brand: [] as FacetBucket[],
    category: [] as FacetBucket[],
    stability: [] as FacetBucket[],
    plastic: [] as FacetBucket[],
    releaseType: [] as FacetBucket[],
  },
};

const strapiUrl = getStrapiServerUrl();
const strapiToken = process.env.STRAPI_API_TOKEN;

const emptyCourseMeta = {
  found: 0,
  facets: {
    state: [] as FacetBucket[],
    city: [] as FacetBucket[],
    difficulty: [] as FacetBucket[],
    type: [] as FacetBucket[],
  },
};

type DiscHit = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  plastic: string | null;
  externalId: string | null;
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

type ListingHit = {
  id: string;
  title: string;
  description: string | null;
  priceUsd: number | null;
  currency: string | null;
  condition: string | null;
  status: string | null;
  discId: string | null;
  discDisplayName: string | null;
  sellerUsername: string | null;
  imageUrl: string | null;
};

type NearbyCourseHit = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  distanceMiles?: number | null;
};

function getTypesenseConfig() {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ?? "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "http";

  if (!host || !apiKey) {
    return null;
  }

  return { host, port, protocol, apiKey };
}

const toFacetBuckets = (facets: TypesenseFacetCount[] | undefined, fieldName: string): FacetBucket[] => {
  const facet = facets?.find((item) => item.field_name === fieldName);
  if (!facet?.counts) {
    return [];
  }

  return facet.counts
    .map((entry) => ({
      value: String(entry.value ?? "").trim(),
      count: Number(entry.count ?? 0),
    }))
    .filter((entry) => entry.value.length > 0)
    .sort((a, b) => b.count - a.count);
};

const parseNumber = (raw: string | null): number | null => {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildStrapiHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (strapiToken) {
    headers.Authorization = `Bearer ${strapiToken}`;
  }
  return headers;
};

/** Match lib/strapi.ts `request`: retry without API token if auth is rejected. */
const strapiGet = async (pathAndQuery: string): Promise<Response> => {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const url = `${strapiUrl}${path}`;
  let response = await fetch(url, {
    headers: buildStrapiHeaders(),
    cache: "no-store",
  });
  if ((response.status === 401 || response.status === 403) && strapiToken) {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  }
  return response;
};

const peelData = (raw: unknown): Record<string, unknown> | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    "attributes" in o &&
    o.attributes &&
    typeof o.attributes === "object" &&
    !Array.isArray(o.attributes)
  ) {
    const attrs = o.attributes as Record<string, unknown>;
    return {
      ...attrs,
      id: o.id,
      documentId: (attrs.documentId ?? o.documentId) as string | undefined,
    };
  }
  return o;
};

const peelRelation = (raw: unknown): Record<string, unknown> | null => {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if ("data" in o && o.data != null) {
    const inner = o.data;
    if (Array.isArray(inner)) {
      return inner.length > 0 ? peelData(inner[0]) : null;
    }
    if (typeof inner === "object") {
      return peelData(inner);
    }
    return null;
  }
  return peelData(raw);
};

type StrapiVariantRow = {
  documentId?: string;
  externalId?: string;
  displayName?: string | null;
  releaseType?: string;
  productionStatus?: string;
  runName?: string | null;
  runYear?: number | null;
  collectorValue?: number | null;
  rarity?: number | null;
  soughtAfter?: number | null;
  priceLowUsd?: number | null;
  priceHighUsd?: number | null;
  imageUrl?: string | null;
  mold?: { name?: string | null; brand?: string | null; category?: string | null };
  plastic?: { name?: string | null } | null;
};

type StrapiLegacyDiscRow = {
  documentId?: string;
  externalId?: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  plastic?: string | null;
};

const normalizeStrapiVariantRows = (json: unknown): StrapiVariantRow[] => {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];
  const rows: StrapiVariantRow[] = [];
  for (const entry of data) {
    const flat = peelData(entry);
    if (!flat) continue;
    const mold = peelRelation(flat.mold) as StrapiVariantRow["mold"];
    const plasticFlat = peelRelation(flat.plastic);
    const plastic =
      plasticFlat && plasticFlat.name != null
        ? { name: String(plasticFlat.name) }
        : null;
    rows.push({
      documentId: flat.documentId as string | undefined,
      externalId: flat.externalId as string | undefined,
      displayName: (flat.displayName as string | null | undefined) ?? null,
      releaseType: flat.releaseType as string | undefined,
      productionStatus: flat.productionStatus as string | undefined,
      runName: (flat.runName as string | null | undefined) ?? null,
      runYear: typeof flat.runYear === "number" ? flat.runYear : null,
      collectorValue: typeof flat.collectorValue === "number" ? flat.collectorValue : null,
      rarity: typeof flat.rarity === "number" ? flat.rarity : null,
      soughtAfter: typeof flat.soughtAfter === "number" ? flat.soughtAfter : null,
      priceLowUsd: typeof flat.priceLowUsd === "number" ? flat.priceLowUsd : null,
      priceHighUsd: typeof flat.priceHighUsd === "number" ? flat.priceHighUsd : null,
      imageUrl: (flat.imageUrl as string | null | undefined) ?? null,
      mold,
      plastic,
    });
  }
  return rows;
};

const normalizeStrapiLegacyRows = (json: unknown): StrapiLegacyDiscRow[] => {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      const flat = peelData(entry);
      if (!flat) return null;
      return {
        documentId: flat.documentId as string | undefined,
        externalId: flat.externalId as string | undefined,
        name: flat.name as string | null | undefined,
        brand: flat.brand as string | null | undefined,
        category: flat.category as string | null | undefined,
        plastic: flat.plastic as string | null | undefined,
      };
    })
    .filter(Boolean) as StrapiLegacyDiscRow[];
};

const enrichDiscHitsWithPlastic = async <T extends { id: string; plastic: string | null }>(
  discs: T[],
): Promise<T[]> => {
  const missing = discs.map((disc) => disc.id).filter((id, index) => !discs[index].plastic);
  if (missing.length === 0) {
    return discs;
  }

  const plasticByDocumentId = new Map<string, string>();
  const fetchByEndpoint = async (endpoint: string, isVariant: boolean) => {
    const params = new URLSearchParams({
      "pagination[page]": "1",
      "pagination[pageSize]": "100",
    });
    if (isVariant) {
      params.set("fields[0]", "documentId");
      params.set("populate[plastic][fields][0]", "name");
    } else {
      params.set("fields[0]", "documentId");
      params.set("fields[1]", "plastic");
    }
    missing.forEach((id, index) => params.set(`filters[documentId][$in][${index}]`, id));

    const response = await strapiGet(`${endpoint}?${params.toString()}`);
    if (!response.ok) return;
    const json = (await response.json()) as { data?: unknown[] };
    for (const raw of json.data ?? []) {
      const row = peelData(raw);
      if (!row) continue;
      const documentId = String(row.documentId ?? "").trim();
      if (!documentId) continue;
      const plasticRel = peelRelation(row.plastic);
      const plastic =
        typeof row.plastic === "string"
          ? row.plastic.trim()
          : plasticRel && plasticRel.name != null
            ? String(plasticRel.name).trim()
            : typeof row.plastic === "object" &&
                row.plastic &&
                "name" in row.plastic &&
                (row.plastic as { name?: string }).name
              ? String((row.plastic as { name?: string }).name).trim()
              : "";
      if (plastic) {
        plasticByDocumentId.set(documentId, plastic);
      }
    }
  };

  await fetchByEndpoint("/api/disc-variants", true);
  await fetchByEndpoint("/api/discs", false);

  return discs.map((disc) => ({
    ...disc,
    plastic: disc.plastic ?? plasticByDocumentId.get(disc.id) ?? null,
  }));
};

const variantSearchPopulate = (): URLSearchParams => {
  const p = new URLSearchParams({
    status: "published",
    "pagination[pageSize]": "12",
    "pagination[page]": "1",
    "fields[0]": "documentId",
    "fields[1]": "externalId",
    "fields[2]": "displayName",
    "fields[3]": "releaseType",
    "fields[4]": "productionStatus",
    "fields[5]": "runName",
    "fields[6]": "runYear",
    "fields[7]": "collectorValue",
    "fields[8]": "rarity",
    "fields[9]": "soughtAfter",
    "fields[10]": "priceLowUsd",
    "fields[11]": "priceHighUsd",
    "fields[12]": "imageUrl",
    "populate[mold][fields][0]": "name",
    "populate[mold][fields][1]": "brand",
    "populate[mold][fields][2]": "category",
    "populate[plastic][fields][0]": "name",
  });
  return p;
};

const legacyDiscFields = (): URLSearchParams =>
  new URLSearchParams({
    status: "published",
    "pagination[pageSize]": "12",
    "pagination[page]": "1",
    "fields[0]": "documentId",
    "fields[1]": "externalId",
    "fields[2]": "name",
    "fields[3]": "brand",
    "fields[4]": "category",
    "fields[5]": "plastic",
  });

/**
 * Catalog search when Typesense is unavailable: query published disc-variants + legacy discs via Strapi.
 * Matches how the reindex job builds the discs collection (variants + legacy rows).
 */
const searchDiscsViaStrapi = async (query: string): Promise<DiscHit[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const variantByDisplay = variantSearchPopulate();
  variantByDisplay.set("filters[$or][0][displayName][$containsi]", trimmed);
  variantByDisplay.set("filters[$or][1][externalId][$containsi]", trimmed);

  const variantByMold = variantSearchPopulate();
  variantByMold.set("filters[mold][name][$containsi]", trimmed);

  const variantByMoldBrand = variantSearchPopulate();
  variantByMoldBrand.set("filters[mold][brand][$containsi]", trimmed);

  const legacyParams = legacyDiscFields();
  legacyParams.set("filters[$or][0][name][$containsi]", trimmed);
  legacyParams.set("filters[$or][1][brand][$containsi]", trimmed);
  legacyParams.set("filters[$or][2][externalId][$containsi]", trimmed);

  const parseVariant = (row: StrapiVariantRow): DiscHit | null => {
    const id = (row.documentId ?? "").trim();
    if (!id) return null;
    const mold = row.mold ?? {};
    const plasticName =
      row.plastic && typeof row.plastic === "object" && row.plastic.name
        ? String(row.plastic.name).trim() || null
        : null;
    const name =
      (row.displayName ?? "").trim() ||
      (mold.name ?? "").trim() ||
      [mold.brand, plasticName].filter(Boolean).join(" ").trim() ||
      "Disc";
    const ext = (row.externalId ?? "").trim();
    return {
      id,
      name,
      brand: mold.brand ? String(mold.brand) : null,
      category: mold.category ? String(mold.category) : null,
      plastic: plasticName,
      externalId: ext || null,
      releaseType: row.releaseType ?? "stock",
      productionStatus: row.productionStatus ?? "in-production",
      runName: row.runName ?? null,
      runYear: typeof row.runYear === "number" ? row.runYear : null,
      collectorValue: typeof row.collectorValue === "number" ? row.collectorValue : null,
      rarity: typeof row.rarity === "number" ? row.rarity : null,
      soughtAfter: typeof row.soughtAfter === "number" ? row.soughtAfter : null,
      priceLowUsd: typeof row.priceLowUsd === "number" ? row.priceLowUsd : null,
      priceHighUsd: typeof row.priceHighUsd === "number" ? row.priceHighUsd : null,
      imageUrl: row.imageUrl ?? null,
    };
  };

  const parseLegacy = (row: StrapiLegacyDiscRow): DiscHit | null => {
    const id = (row.documentId ?? "").trim();
    if (!id) return null;
    const plastic = typeof row.plastic === "string" ? row.plastic.trim() || null : null;
    const ext = (row.externalId ?? "").trim();
    return {
      id,
      name: (row.name ?? "").trim() || "Disc",
      brand: row.brand ?? null,
      category: row.category ?? null,
      plastic,
      externalId: ext || null,
      releaseType: "stock",
      productionStatus: "in-production",
      runName: null,
      runYear: null,
      collectorValue: null,
      rarity: null,
      soughtAfter: null,
      priceLowUsd: null,
      priceHighUsd: null,
      imageUrl: null,
    };
  };

  const fetches = await Promise.all([
    strapiGet(`/api/disc-variants?${variantByDisplay.toString()}`),
    strapiGet(`/api/disc-variants?${variantByMold.toString()}`),
    strapiGet(`/api/disc-variants?${variantByMoldBrand.toString()}`),
    strapiGet(`/api/discs?${legacyParams.toString()}`),
  ]);

  const jsonResults = await Promise.all(
    fetches.map(async (res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
  );

  const byId = new Map<string, DiscHit>();
  for (let i = 0; i < 3; i += 1) {
    const rows = normalizeStrapiVariantRows(jsonResults[i]);
    for (const row of rows) {
      const hit = parseVariant(row);
      if (hit) byId.set(hit.id, hit);
    }
  }
  const legacyRows = normalizeStrapiLegacyRows(jsonResults[3]);
  for (const row of legacyRows) {
    const hit = parseLegacy(row);
    if (hit && !byId.has(hit.id)) byId.set(hit.id, hit);
  }

  const list = Array.from(byId.values()).slice(0, 12);
  return enrichDiscHitsWithPlastic(list);
};

const getDiscRatingSummaryByDocumentIds = async (documentIds: string[]) => {
  const ids = Array.from(new Set(documentIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) {
    return new Map<string, { avg: number | null; count: number }>();
  }

  const perPage = 100;
  const params = new URLSearchParams({
    "pagination[page]": "1",
    "pagination[pageSize]": String(perPage),
    "fields[0]": "discDocumentId",
    "fields[1]": "overall",
  });
  ids.forEach((id, index) => params.set(`filters[discDocumentId][$in][${index}]`, id));

  const aggregate = new Map<string, { total: number; count: number }>();
  const applyRows = (rows: Array<{ discDocumentId?: string; overall?: number | null }>) => {
    for (const row of rows) {
      const key = (row.discDocumentId ?? "").trim();
      const score = typeof row.overall === "number" ? row.overall : null;
      if (!key || score === null) continue;
      const stats = aggregate.get(key) ?? { total: 0, count: 0 };
      stats.total += score;
      stats.count += 1;
      aggregate.set(key, stats);
    }
  };

  const first = await strapiGet(`/api/disc-ratings?${params.toString()}`);
  if (!first.ok) {
    return new Map<string, { avg: number | null; count: number }>();
  }
  const firstJson = (await first.json()) as {
    data?: Array<{ discDocumentId?: string; overall?: number | null }>;
    meta?: { pagination?: { pageCount?: number } };
  };
  applyRows(firstJson.data ?? []);
  const pageCount = firstJson.meta?.pagination?.pageCount ?? 1;

  for (let page = 2; page <= pageCount; page += 1) {
    params.set("pagination[page]", String(page));
    const response = await strapiGet(`/api/disc-ratings?${params.toString()}`);
    if (!response.ok) break;
    const json = (await response.json()) as {
      data?: Array<{ discDocumentId?: string; overall?: number | null }>;
    };
    applyRows(json.data ?? []);
  }

  return new Map<string, { avg: number | null; count: number }>(
    ids.map((id) => {
      const stats = aggregate.get(id);
      if (!stats || stats.count === 0) {
        return [id, { avg: null, count: 0 }] as const;
      }
      return [id, { avg: Number((stats.total / stats.count).toFixed(2)), count: stats.count }] as const;
    }),
  );
};

const discsWithRatingsPayload = async (discs: DiscHit[]) => {
  const discRatingsById = await getDiscRatingSummaryByDocumentIds(discs.map((disc) => disc.id));
  return discs.map((disc) => ({
    ...disc,
    ratingAverageOverall: discRatingsById.get(disc.id)?.avg ?? null,
    ratingCount: discRatingsById.get(disc.id)?.count ?? 0,
  }));
};

const buildDiscFilterBy = (searchParams: URLSearchParams) => {
  const filters: string[] = [];
  const brand = (searchParams.get("discBrand") ?? "").trim();
  const category = (searchParams.get("discCategory") ?? "").trim();
  const stability = (searchParams.get("discStability") ?? "").trim();
  const plastic = (searchParams.get("discPlastic") ?? "").trim();
  const releaseType = (searchParams.get("discReleaseType") ?? "").trim();
  const productionStatus = (searchParams.get("discProductionStatus") ?? "").trim();
  const speedMin = parseNumber(searchParams.get("discSpeedMin"));
  const speedMax = parseNumber(searchParams.get("discSpeedMax"));

  if (brand) {
    filters.push(`brand:=${JSON.stringify(brand)}`);
  }
  if (category) {
    filters.push(`category:=${JSON.stringify(category)}`);
  }
  if (stability) {
    filters.push(`stability:=${JSON.stringify(stability)}`);
  }
  if (plastic) {
    filters.push(`plastic:=${JSON.stringify(plastic)}`);
  }
  if (releaseType) {
    filters.push(`releaseType:=${JSON.stringify(releaseType)}`);
  }
  if (productionStatus) {
    filters.push(`productionStatus:=${JSON.stringify(productionStatus)}`);
  }
  if (speedMin !== null) {
    filters.push(`speed:>=${speedMin}`);
  }
  if (speedMax !== null) {
    filters.push(`speed:<=${speedMax}`);
  }

  return filters.join(" && ");
};

const buildCourseFilterBy = (searchParams: URLSearchParams) => {
  const filters: string[] = [];
  const state = (searchParams.get("courseState") ?? "").trim();
  const city = (searchParams.get("courseCity") ?? "").trim();

  if (state) {
    filters.push(`state:=${JSON.stringify(state)}`);
  }
  if (city) {
    filters.push(`city:=${JSON.stringify(city)}`);
  }

  return filters.join(" && ");
};

const buildListingFilterBy = (searchParams: URLSearchParams) => {
  const filters: string[] = [];
  const condition = (searchParams.get("listingCondition") ?? "").trim();
  const status = (searchParams.get("listingStatus") ?? "").trim();
  const discId = (searchParams.get("listingDiscId") ?? "").trim();

  if (condition) {
    filters.push(`condition:=${JSON.stringify(condition)}`);
  }
  if (status) {
    filters.push(`status:=${JSON.stringify(status)}`);
  } else {
    filters.push(`status:=${JSON.stringify("active")}`);
  }
  if (discId) {
    filters.push(`discId:=${JSON.stringify(discId)}`);
  }

  return filters.join(" && ");
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const discFilterBy = buildDiscFilterBy(searchParams);
  const courseFilterBy = buildCourseFilterBy(searchParams);
  const listingFilterBy = buildListingFilterBy(searchParams);

  if (q.length < 2) {
    return NextResponse.json({
      configured: Boolean(getTypesenseConfig()),
      discs: [] as DiscHit[],
      courses: [],
      listings: [] as ListingHit[],
      nearbyCourses: [] as NearbyCourseHit[],
      discsMeta: emptyDiscMeta,
      coursesMeta: emptyCourseMeta,
    });
  }

  const config = getTypesenseConfig();
  if (!config) {
    const discsBase = await searchDiscsViaStrapi(q);
    const discs = await discsWithRatingsPayload(discsBase);
    return NextResponse.json({
      configured: true,
      discSearchSource: "strapi",
      discs,
      courses: [],
      listings: [] as ListingHit[],
      nearbyCourses: [] as NearbyCourseHit[],
      discsMeta: {
        found: discs.length,
        facets: emptyDiscMeta.facets,
      },
      coursesMeta: emptyCourseMeta,
    });
  }

  const { host, port, protocol, apiKey } = config;
  const url = `${protocol}://${host}:${port}/multi_search`;

  const body = {
    searches: [
      {
        collection: "discs",
        q,
        query_by: "name,brand,category,plastic,stability,runName,externalId",
        per_page: 8,
        prefix: true,
        facet_by: "brand,category,stability,plastic,releaseType",
        max_facet_values: 20,
        ...(discFilterBy ? { filter_by: discFilterBy } : {}),
      },
      {
        collection: "courses",
        q,
        query_by: "name,city,state,externalId",
        per_page: 8,
        prefix: true,
        facet_by: "state,city",
        max_facet_values: 20,
        ...(courseFilterBy ? { filter_by: courseFilterBy } : {}),
      },
      {
        collection: "listings",
        q,
        query_by: "title,description,discDisplayName,sellerUsername",
        per_page: 6,
        prefix: true,
        facet_by: "condition,status,currency",
        max_facet_values: 20,
        ...(listingFilterBy ? { filter_by: listingFilterBy } : {}),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      const fallbackDiscsBase = await searchDiscsViaStrapi(q);
      const fallbackDiscs = await discsWithRatingsPayload(fallbackDiscsBase);
      if (fallbackDiscs.length > 0) {
        return NextResponse.json({
          configured: true,
          discSearchSource: "strapi",
          error: `Typesense error ${res.status}; discs loaded from the catalog instead.`,
          detail: text.slice(0, 200),
          discs: fallbackDiscs,
          courses: [],
          listings: [] as ListingHit[],
          nearbyCourses: [] as NearbyCourseHit[],
          discsMeta: {
            found: fallbackDiscs.length,
            facets: emptyDiscMeta.facets,
          },
          coursesMeta: emptyCourseMeta,
        });
      }
      return NextResponse.json(
        {
          configured: true,
          error: `Typesense error: ${res.status}`,
          detail: text.slice(0, 200),
          discs: [] as DiscHit[],
          courses: [],
          listings: [] as ListingHit[],
          nearbyCourses: [] as NearbyCourseHit[],
          discsMeta: emptyDiscMeta,
          coursesMeta: emptyCourseMeta,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as MultiSearchResponse;
    const discResults = data.results?.[0] as MultiSearchResult<DiscDoc> | undefined;
    const courseResults = data.results?.[1] as MultiSearchResult<CourseDoc> | undefined;
    const listingResults = data.results?.[2] as MultiSearchResult<ListingDoc> | undefined;

    const discs: DiscHit[] =
      discResults?.hits?.map((h) => {
        const doc = h.document;
        return {
          id: String(doc.id ?? ""),
          name: doc.name ?? "",
          brand: doc.brand ?? null,
          category: doc.category ?? null,
          plastic: doc.plastic ?? null,
          externalId: doc.externalId ? String(doc.externalId) : null,
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
        };
      }) ?? [];
    const discsWithPlastic = await enrichDiscHitsWithPlastic(discs);
    let discsWithRatings = await discsWithRatingsPayload(discsWithPlastic);
    if (discsWithRatings.length === 0) {
      const strapiDiscs = await searchDiscsViaStrapi(q);
      if (strapiDiscs.length > 0) {
        discsWithRatings = await discsWithRatingsPayload(strapiDiscs);
      }
    }

    const courses =
      courseResults?.hits?.map((h) => {
        const doc = h.document;
        return {
          id: String(doc.id ?? ""),
          name: doc.name ?? "",
          city: doc.city ?? null,
          state: doc.state ?? null,
          country: doc.country ?? null,
          difficulty: doc.difficulty ?? null,
          type: doc.type ?? null,
        };
      }) ?? [];

    const listings: ListingHit[] =
      listingResults?.hits?.map((h) => {
        const doc = h.document;
        return {
          id: String(doc.id ?? ""),
          title: doc.title ?? "",
          description: doc.description ?? null,
          priceUsd: typeof doc.priceUsd === "number" ? doc.priceUsd : null,
          currency: doc.currency ?? null,
          condition: doc.condition ?? null,
          status: doc.status ?? null,
          discId: doc.discId ?? null,
          discDisplayName: doc.discDisplayName ?? null,
          sellerUsername: doc.sellerUsername ?? null,
          imageUrl: doc.imageUrl ?? null,
        };
      }) ?? [];

    let nearbyCourses: NearbyCourseHit[] = [];
    const anchorCourse = (courseResults?.hits?.[0]?.document ?? null) as CourseDoc | null;
    const anchorLat = Number(anchorCourse?.latitude);
    const anchorLng = Number(anchorCourse?.longitude);
    const anchorId = String(anchorCourse?.id ?? "");
    const hasAnchorLocation = Number.isFinite(anchorLat) && Number.isFinite(anchorLng) && anchorId.length > 0;

    if (hasAnchorLocation) {
      try {
        const nearbyParams = new URLSearchParams({
          q: "*",
          query_by: "name",
          per_page: "12",
          filter_by: `location:(${anchorLat},${anchorLng},25 mi) && id:!=${anchorId}`,
        });
        const nearbyResponse = await fetch(
          `${protocol}://${host}:${port}/collections/courses/documents/search?${nearbyParams.toString()}`,
          {
            method: "GET",
            headers: {
              "X-TYPESENSE-API-KEY": apiKey,
            },
            next: { revalidate: 0 },
          }
        );

        if (nearbyResponse.ok) {
          const nearbyJson = (await nearbyResponse.json()) as MultiSearchResult<CourseDoc>;
          nearbyCourses =
            nearbyJson.hits?.map((hit) => {
              const maybeGeoDistance = (hit as { geo_distance_meters?: Record<string, number> }).geo_distance_meters;
              const firstGeoDistanceMeters =
                maybeGeoDistance && typeof maybeGeoDistance === "object"
                  ? Object.values(maybeGeoDistance)[0]
                  : undefined;
              const distanceMiles =
                typeof firstGeoDistanceMeters === "number" && Number.isFinite(firstGeoDistanceMeters)
                  ? Number((firstGeoDistanceMeters / 1609.344).toFixed(1))
                  : null;
              return {
                id: String(hit.document.id ?? ""),
                name: hit.document.name ?? "",
                city: hit.document.city ?? null,
                state: hit.document.state ?? null,
                distanceMiles,
              };
            }) ?? [];
        }
      } catch {
        nearbyCourses = [];
      }
    }

    return NextResponse.json({
      configured: true,
      discs: discsWithRatings,
      courses,
      listings,
      nearbyCourses,
      discsMeta: {
        found: discResults?.found ?? 0,
        facets: {
          brand: toFacetBuckets(discResults?.facet_counts, "brand"),
          category: toFacetBuckets(discResults?.facet_counts, "category"),
          stability: toFacetBuckets(discResults?.facet_counts, "stability"),
          plastic: toFacetBuckets(discResults?.facet_counts, "plastic"),
          releaseType: toFacetBuckets(discResults?.facet_counts, "releaseType"),
        },
      },
      coursesMeta: {
        found: courseResults?.found ?? 0,
        facets: {
          state: toFacetBuckets(courseResults?.facet_counts, "state"),
          city: toFacetBuckets(courseResults?.facet_counts, "city"),
          difficulty: toFacetBuckets(courseResults?.facet_counts, "difficulty"),
          type: toFacetBuckets(courseResults?.facet_counts, "type"),
        },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    try {
      const fallbackDiscsBase = await searchDiscsViaStrapi(q);
      const fallbackDiscs = await discsWithRatingsPayload(fallbackDiscsBase);
      if (fallbackDiscs.length > 0) {
        return NextResponse.json({
          configured: true,
          discSearchSource: "strapi",
          error: `${message} — discs loaded from the catalog instead.`,
          discs: fallbackDiscs,
          courses: [],
          listings: [] as ListingHit[],
          nearbyCourses: [] as NearbyCourseHit[],
          discsMeta: {
            found: fallbackDiscs.length,
            facets: emptyDiscMeta.facets,
          },
          coursesMeta: emptyCourseMeta,
        });
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      {
        configured: true,
        error: message,
        discs: [] as DiscHit[],
        courses: [],
        listings: [] as ListingHit[],
        nearbyCourses: [] as NearbyCourseHit[],
        discsMeta: emptyDiscMeta,
        coursesMeta: emptyCourseMeta,
      },
      { status: 502 }
    );
  }
}
