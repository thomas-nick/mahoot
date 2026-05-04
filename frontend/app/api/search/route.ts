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

    const response = await fetch(`${strapiUrl}${endpoint}?${params.toString()}`, {
      headers: buildStrapiHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return;
    const json = (await response.json()) as {
      data?: Array<{
        documentId?: string;
        plastic?: string | { name?: string | null } | null;
      }>;
    };
    for (const row of json.data ?? []) {
      const documentId = (row.documentId ?? "").trim();
      if (!documentId) continue;
      const plastic =
        typeof row.plastic === "string"
          ? row.plastic.trim()
          : typeof row.plastic === "object" && row.plastic?.name
            ? row.plastic.name.trim()
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

  const first = await fetch(`${strapiUrl}/api/disc-ratings?${params.toString()}`, {
    headers: buildStrapiHeaders(),
    cache: "no-store",
  });
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
    const response = await fetch(`${strapiUrl}/api/disc-ratings?${params.toString()}`, {
      headers: buildStrapiHeaders(),
      cache: "no-store",
    });
    if (!response.ok) break;
    const json = (await response.json()) as {
      data?: Array<{ discDocumentId?: string; overall?: number | null }>;
    };
    applyRows(json.data ?? []);
  }

  return new Map(
    ids.map((id) => {
      const stats = aggregate.get(id);
      if (!stats || stats.count === 0) {
        return [id, { avg: null, count: 0 }];
      }
      return [id, { avg: Number((stats.total / stats.count).toFixed(2)), count: stats.count }];
    }),
  );
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
    return NextResponse.json(
      {
        configured: false,
        error: "Typesense is not configured on the server.",
        discs: [] as DiscHit[],
        courses: [],
        listings: [] as ListingHit[],
        nearbyCourses: [] as NearbyCourseHit[],
        discsMeta: emptyDiscMeta,
        coursesMeta: emptyCourseMeta,
      },
      { status: 503 }
    );
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
    const discRatingsById = await getDiscRatingSummaryByDocumentIds(discsWithPlastic.map((disc) => disc.id));
    const discsWithRatings = discsWithPlastic.map((disc) => ({
      ...disc,
      ratingAverageOverall: discRatingsById.get(disc.id)?.avg ?? null,
      ratingCount: discRatingsById.get(disc.id)?.count ?? 0,
    }));

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
