import { cache } from "react";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

type StrapiListResponse<T> = {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

export type StrapiMedia = {
  url: string;
  alternativeText?: string | null;
};

export type Disc = {
  id: number;
  documentId: string;
  externalId: string;
  name: string;
  brand: string | null;
  category: string | null;
  moldName?: string | null;
  moldExternalId?: string | null;
  plasticName?: string | null;
  plasticExternalId?: string | null;
  plastic?: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
  diameterCm?: number | null;
  heightCm?: number | null;
  rimDepthCm?: number | null;
  rimThicknessCm?: number | null;
  maxWeightGr?: number | null;
  link: string | null;
  imageUrl: string | null;
  color: string | null;
  backgroundColor: string | null;
};

export type DiscMold = {
  id: number;
  documentId: string;
  externalId: string;
  name: string;
  brand: string | null;
  category: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
  diameterCm?: number | null;
  heightCm?: number | null;
  rimDepthCm?: number | null;
  rimThicknessCm?: number | null;
  maxWeightGr?: number | null;
  color: string | null;
  backgroundColor: string | null;
};

type DiscVariant = {
  id: number;
  documentId: string;
  externalId: string;
  displayName: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
  link: string | null;
  imageUrl: string | null;
  mold?: {
    documentId?: string | null;
    externalId?: string | null;
    name?: string | null;
    brand?: string | null;
    category?: string | null;
    speed?: number | null;
    glide?: number | null;
    turn?: number | null;
    fade?: number | null;
    stability?: string | null;
    diameterCm?: number | null;
    heightCm?: number | null;
    rimDepthCm?: number | null;
    rimThicknessCm?: number | null;
    maxWeightGr?: number | null;
    color?: string | null;
    backgroundColor?: string | null;
  } | null;
  plastic?: {
    externalId?: string | null;
    name?: string | null;
  } | null;
};

export type Course = {
  id: number;
  documentId: string;
  externalId: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  difficulty: string | null;
  type: string | null;
  pros: string | null;
  cons: string | null;
  description: string | null;
  videoLinks: string[] | null;
  layouts?: CourseLayout[] | null;
  photos?: StrapiMedia[] | null;
  ratingAverageOverall: number | null;
  ratingAverageLayout: number | null;
  ratingAverageSignage: number | null;
  ratingAverageMaintenance: number | null;
  ratingAverageScenery: number | null;
  ratingCount: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type CourseLayout = {
  name?: string | null;
  holes?: number | null;
  parTotal?: number | null;
  distanceFtTotal?: number | null;
  distanceMTotal?: number | null;
  notes?: string | null;
  holeDetails?: CourseHole[] | null;
};

export type CourseHole = {
  holeNumber?: number | null;
  par?: number | null;
  distanceFt?: number | null;
  distanceM?: number | null;
  notes?: string | null;
};

export type CourseRating = {
  id: number;
  documentId?: string;
  overall: number | null;
  layout: number | null;
  signage: number | null;
  maintenance: number | null;
  scenery: number | null;
  comment: string | null;
  createdAt: string | null;
  submittedBy?: {
    username?: string | null;
    email?: string | null;
  } | null;
};

export type DiscRating = {
  id: number;
  documentId?: string;
  discDocumentId: string;
  discExternalId?: string | null;
  discName?: string | null;
  overall: number | null;
  feelGrip: number | null;
  forgiving: number | null;
  windTrust: number | null;
  shotShaping: number | null;
  distancePotential: number | null;
  consistency: number | null;
  turnDelta: number | null;
  stabilityDelta: number | null;
  armSpeedBand?: string | null;
  throwStyle?: string | null;
  seasonedState?: string | null;
  bestUseCases?: string[] | null;
  conditions?: string[] | null;
  wouldRecommend?: boolean | null;
  comment: string | null;
  createdAt: string | null;
  submittedBy?: {
    username?: string | null;
    email?: string | null;
  } | null;
};

export type DiscRatingSummary = {
  discDocumentId: string;
  ratingAverageOverall: number | null;
  ratingCount: number;
};

export type CollectorRelease = {
  id: number;
  documentId?: string;
  externalId?: string | null;
  discDocumentId: string;
  discExternalId?: string | null;
  discName?: string | null;
  runName: string;
  year: number;
  oopStatus?: "in-production" | "oop" | "limited-run" | "tour-series" | null;
  collectorValue?: number | null;
  rarity?: number | null;
  soughtAfter?: number | null;
  priceLowUsd?: number | null;
  priceHighUsd?: number | null;
  imageUrl?: string | null;
  notes?: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type DiscListResult = {
  items: Disc[];
  pagination: Pagination;
};

export type DiscFacetOptions = {
  brands: string[];
  categories: string[];
  plastics: string[];
  stabilities: string[];
  speedRange: {
    min: number | null;
    max: number | null;
  };
};

export type CourseListResult = {
  items: Course[];
  pagination: Pagination;
};

export type CourseFacetOptions = {
  states: string[];
  stateCounts: Record<string, number>;
  difficulties: string[];
  types: string[];
};

const COURSE_DIFFICULTY_ENUMS = ["championship", "advanced", "intermediate", "easy"];
const COURSE_TYPE_ENUMS = ["championship", "wooded", "park style", "pitch and putt"];
const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const baseUrl = getStrapiServerUrl();
const apiToken = process.env.STRAPI_API_TOKEN;
const typesenseHost = process.env.TYPESENSE_HOST;
const typesenseApiKey = process.env.TYPESENSE_API_KEY;
const typesensePort = process.env.TYPESENSE_PORT ?? "8108";
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL ?? "http";

const defaultPagination: Pagination = {
  page: 1,
  pageSize: 12,
  pageCount: 1,
  total: 0,
};
// Keep pagination at/under Strapi default maxLimit to avoid sparse page jumps.
const STRAPI_SAFE_PAGE_SIZE = 100;

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
};

const numericSpeed = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const deriveMoldExternalIdFromVariant = (externalId: string, plasticName: string | null | undefined) => {
  const plasticSlug = plasticName ? slugify(plasticName) : "";
  if (!plasticSlug) {
    return null;
  }
  const suffix = `-${plasticSlug}`;
  return externalId.endsWith(suffix) ? externalId.slice(0, -suffix.length) : null;
};

const getDiscFromTypesenseById = async (documentId: string): Promise<Disc | null> => {
  if (!typesenseHost || !typesenseApiKey) {
    return null;
  }
  const endpoint = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/discs/documents/${encodeURIComponent(documentId)}`;
  const response = await fetch(endpoint, {
    headers: {
      "X-TYPESENSE-API-KEY": typesenseApiKey,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const doc = (await response.json()) as {
    id?: string;
    externalId?: string;
    name?: string;
    brand?: string;
    category?: string;
    plastic?: string;
    speed?: number;
    glide?: number;
    turn?: number;
    fade?: number;
    stability?: string;
  };
  const resolvedExternalId = doc.externalId ?? documentId;
  const plasticName = doc.plastic ?? null;
  return {
    id: 0,
    documentId,
    externalId: resolvedExternalId,
    name: doc.name ?? resolvedExternalId,
    brand: doc.brand ?? null,
    category: doc.category ?? null,
    moldName: null,
    moldExternalId: deriveMoldExternalIdFromVariant(resolvedExternalId, plasticName),
    plasticName,
    plasticExternalId: null,
    plastic: plasticName,
    speed: numericSpeed(doc.speed),
    glide: numericSpeed(doc.glide),
    turn: numericSpeed(doc.turn),
    fade: numericSpeed(doc.fade),
    stability: doc.stability ?? null,
    diameterCm: null,
    heightCm: null,
    rimDepthCm: null,
    rimThicknessCm: null,
    maxWeightGr: null,
    link: null,
    imageUrl: null,
    color: null,
    backgroundColor: null,
  };
};

const mapLegacyDiscToDisc = (disc: Disc): Disc => {
  const plasticName = disc.plasticName ?? disc.plastic ?? null;
  return {
    ...disc,
    plasticName,
    plasticExternalId: disc.plasticExternalId ?? null,
    plastic: plasticName,
  };
};

const discMatchesListFilters = (
  disc: Disc,
  input: {
    query?: string;
    brand?: string;
    category?: string;
    stability?: string;
    speedMin?: number;
    speedMax?: number;
  },
) => {
  const q = input.query?.trim();
  if (q) {
    const haystack = (disc.name || "").toLowerCase();
    if (!haystack.includes(q.toLowerCase())) {
      return false;
    }
  }
  if (input.brand && disc.brand !== input.brand) {
    return false;
  }
  if (input.category && disc.category !== input.category) {
    return false;
  }
  if (input.stability && disc.stability !== input.stability) {
    return false;
  }
  const speed = numericSpeed(disc.speed);
  if (input.speedMin !== undefined) {
    if (speed === null || speed < input.speedMin) {
      return false;
    }
  }
  if (input.speedMax !== undefined) {
    if (speed === null || speed > input.speedMax) {
      return false;
    }
  }
  return true;
};

const normalizeDiscPagination = (
  meta: Partial<Pagination> | undefined,
  page: number,
  pageSize: number,
  itemCount: number,
): Pagination => {
  const resolvedPageSize = meta?.pageSize ?? pageSize;
  const resolvedTotal = meta?.total ?? itemCount;
  const resolvedPageCount =
    meta?.pageCount ?? Math.max(1, Math.ceil(resolvedTotal / Math.max(1, resolvedPageSize)));
  return {
    page: meta?.page ?? page,
    pageSize: resolvedPageSize,
    pageCount: resolvedPageCount,
    total: resolvedTotal,
  };
};

const LEGACY_DISC_BROWSE_FIELDS = [
  "documentId",
  "externalId",
  "name",
  "brand",
  "category",
  "plastic",
  "speed",
  "glide",
  "turn",
  "fade",
  "stability",
  "link",
  "imageUrl",
  "color",
  "backgroundColor",
] as const;

const getAllLegacyDiscsForBrowse = cache(() =>
  fetchAllEntries<Disc>("/api/discs", [...LEGACY_DISC_BROWSE_FIELDS]),
);

const mapDiscVariantToDisc = (variant: DiscVariant): Disc => {
  const mold = variant.mold ?? null;
  const plastic = variant.plastic ?? null;
  const fallbackName = [mold?.name, plastic?.name].filter(Boolean).join(" ");
  return {
    id: variant.id,
    documentId: variant.documentId,
    externalId: variant.externalId,
    name: variant.displayName || fallbackName || mold?.name || "Unnamed disc variant",
    brand: mold?.brand ?? null,
    category: mold?.category ?? null,
    moldName: mold?.name ?? null,
    moldExternalId: mold?.externalId ?? null,
    plasticName: plastic?.name ?? null,
    plasticExternalId: plastic?.externalId ?? null,
    plastic: plastic?.name ?? null,
    speed: variant.speed ?? mold?.speed ?? null,
    glide: variant.glide ?? mold?.glide ?? null,
    turn: variant.turn ?? mold?.turn ?? null,
    fade: variant.fade ?? mold?.fade ?? null,
    stability: variant.stability ?? mold?.stability ?? null,
    diameterCm: mold?.diameterCm ?? null,
    heightCm: mold?.heightCm ?? null,
    rimDepthCm: mold?.rimDepthCm ?? null,
    rimThicknessCm: mold?.rimThicknessCm ?? null,
    maxWeightGr: mold?.maxWeightGr ?? null,
    link: variant.link ?? null,
    imageUrl: variant.imageUrl ?? null,
    color: mold?.color ?? null,
    backgroundColor: mold?.backgroundColor ?? null,
  };
};

export const toAbsoluteStrapiUrl = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }
  return `${baseUrl}/${url}`;
};

const request = async <T>(path: string): Promise<T> => {
  const buildHeaders = (withAuth: boolean): HeadersInit => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (withAuth && apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }
    return headers;
  };

  let response = await fetch(`${baseUrl}${path}`, {
    headers: buildHeaders(true),
    cache: "no-store",
  });

  // If a stale/invalid or under-permissioned API token is configured, retry as public.
  if ((response.status === 401 || response.status === 403) && apiToken) {
    response = await fetch(`${baseUrl}${path}`, {
      headers: buildHeaders(false),
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(`Strapi request failed: ${response.status} ${response.statusText} (${path})`);
  }

  return response.json();
};

const fetchAllEntries = async <T>(path: string, fields: string[]) => {
  const pageSize = STRAPI_SAFE_PAGE_SIZE;
  const firstPageQuery = toQueryString({
    "pagination[page]": 1,
    "pagination[pageSize]": pageSize,
    ...Object.fromEntries(fields.map((field, index) => [`fields[${index}]`, field])),
    status: "published",
  });

  const firstPayload = await request<StrapiListResponse<T>>(`${path}?${firstPageQuery}`);
  const allItems = [...firstPayload.data];
  const pageCount = firstPayload.meta?.pagination?.pageCount ?? 1;

  for (let page = 2; page <= pageCount; page += 1) {
    const pageQuery = toQueryString({
      "pagination[page]": page,
      "pagination[pageSize]": pageSize,
      ...Object.fromEntries(fields.map((field, index) => [`fields[${index}]`, field])),
      status: "published",
    });
    const payload = await request<StrapiListResponse<T>>(`${path}?${pageQuery}`);
    allItems.push(...payload.data);
  }

  return allItems;
};

export const getDiscs = async (input: {
  page?: number;
  pageSize?: number;
  query?: string;
  brand?: string;
  category?: string;
  plastic?: string;
  stability?: string;
  speedMin?: number;
  speedMax?: number;
}) => {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 12;
  const legacyQuery = toQueryString({
    "pagination[page]": page,
    "pagination[pageSize]": pageSize,
    "sort[0]": "name:asc",
    "filters[name][$containsi]": input.query,
    "filters[brand][$eq]": input.brand,
    "filters[category][$eq]": input.category,
    "filters[stability][$eq]": input.stability,
    "filters[speed][$gte]": input.speedMin,
    "filters[speed][$lte]": input.speedMax,
    status: "published",
  });
  const variantQuery = toQueryString({
    "pagination[page]": page,
    "pagination[pageSize]": pageSize,
    "sort[0]": "displayName:asc",
    "filters[displayName][$containsi]": input.query,
    "filters[mold][brand][$eq]": input.brand,
    "filters[mold][category][$eq]": input.category,
    "filters[plastic][name][$eq]": input.plastic,
    "filters[stability][$eq]": input.stability,
    "filters[speed][$gte]": input.speedMin,
    "filters[speed][$lte]": input.speedMax,
    "populate[mold][fields][0]": "name",
    "populate[mold][fields][1]": "brand",
    "populate[mold][fields][2]": "category",
    "populate[mold][fields][3]": "externalId",
    "populate[mold][fields][4]": "color",
    "populate[mold][fields][5]": "backgroundColor",
    "populate[mold][fields][6]": "speed",
    "populate[mold][fields][7]": "glide",
    "populate[mold][fields][8]": "turn",
    "populate[mold][fields][9]": "fade",
    "populate[mold][fields][10]": "stability",
    "populate[mold][fields][11]": "diameterCm",
    "populate[mold][fields][12]": "heightCm",
    "populate[mold][fields][13]": "rimDepthCm",
    "populate[mold][fields][14]": "rimThicknessCm",
    "populate[mold][fields][15]": "maxWeightGr",
    "populate[plastic][fields][0]": "name",
    "populate[plastic][fields][1]": "externalId",
    status: "published",
  });

  const paginatedVariantThenLegacy = async (): Promise<DiscListResult> => {
    try {
      const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${variantQuery}`);
      const items = payload.data.map(mapDiscVariantToDisc);
      return {
        items,
        pagination: normalizeDiscPagination(payload.meta?.pagination, page, pageSize, items.length),
      } satisfies DiscListResult;
    } catch {
      try {
        const payload = await request<StrapiListResponse<Disc>>(`/api/discs?${legacyQuery}`);
        return {
          items: payload.data.map(mapLegacyDiscToDisc),
          pagination: normalizeDiscPagination(payload.meta?.pagination, page, pageSize, payload.data.length),
        } satisfies DiscListResult;
      } catch {
        return {
          items: [],
          pagination: defaultPagination,
        } satisfies DiscListResult;
      }
    }
  };

  if (input.plastic) {
    try {
      const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${variantQuery}`);
      const items = payload.data.map(mapDiscVariantToDisc);
      return {
        items,
        pagination: normalizeDiscPagination(payload.meta?.pagination, page, pageSize, items.length),
      } satisfies DiscListResult;
    } catch {
      return {
        items: [],
        pagination: { page, pageSize, pageCount: 1, total: 0 },
      } satisfies DiscListResult;
    }
  }

  try {
    const [allVariants, allLegacy] = await Promise.all([getAllDiscVariants(), getAllLegacyDiscsForBrowse()]);
    const moldExternalIds = new Set(
      allVariants.map((v) => v.mold?.externalId).filter((e): e is string => Boolean(e)),
    );
    const legacyOnly = allLegacy.filter((d) => !moldExternalIds.has(d.externalId));
    const combined = [...allVariants.map(mapDiscVariantToDisc), ...legacyOnly];
    const filtered = combined.filter((d) => discMatchesListFilters(d, input));
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const total = filtered.length;
    const resolvedPageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return {
      items,
      pagination: {
        page,
        pageSize,
        pageCount: resolvedPageCount,
        total,
      },
    } satisfies DiscListResult;
  } catch {
    return paginatedVariantThenLegacy();
  }
};

const fetchAllDiscVariantsPages = async () => {
  const variantPageSize = STRAPI_SAFE_PAGE_SIZE;
  const buildQuery = (variantPage: number) =>
    toQueryString({
      "pagination[page]": variantPage,
      "pagination[pageSize]": variantPageSize,
      "populate[mold][fields][0]": "name",
      "populate[mold][fields][1]": "brand",
      "populate[mold][fields][2]": "category",
      "populate[mold][fields][3]": "externalId",
      "populate[mold][fields][4]": "color",
      "populate[mold][fields][5]": "backgroundColor",
    "populate[mold][fields][6]": "speed",
    "populate[mold][fields][7]": "glide",
    "populate[mold][fields][8]": "turn",
    "populate[mold][fields][9]": "fade",
    "populate[mold][fields][10]": "stability",
    "populate[mold][fields][11]": "diameterCm",
    "populate[mold][fields][12]": "heightCm",
    "populate[mold][fields][13]": "rimDepthCm",
    "populate[mold][fields][14]": "rimThicknessCm",
    "populate[mold][fields][15]": "maxWeightGr",
      "populate[plastic][fields][0]": "name",
      "populate[plastic][fields][1]": "externalId",
      status: "published",
    });

  const firstPayload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${buildQuery(1)}`);
  const all = [...firstPayload.data];
  const pageCount = firstPayload.meta?.pagination?.pageCount ?? 1;
  for (let variantPage = 2; variantPage <= pageCount; variantPage += 1) {
    const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${buildQuery(variantPage)}`);
    all.push(...payload.data);
  }
  return all;
};

const getAllDiscVariants = cache(fetchAllDiscVariantsPages);

export const getDiscFacetOptions = async (): Promise<DiscFacetOptions> => {
  try {
    const allVariants = await getAllDiscVariants();
    const brands = new Set<string>();
    const categories = new Set<string>();
    const plastics = new Set<string>();
    const stabilities = new Set<string>();
    const speeds: number[] = [];

    for (const variant of allVariants) {
      if (variant.mold?.brand) brands.add(variant.mold.brand);
      if (variant.mold?.category) categories.add(variant.mold.category);
      if (variant.plastic?.name) plastics.add(variant.plastic.name);
      if (variant.stability) stabilities.add(variant.stability);
      if (typeof variant.speed === "number") speeds.push(variant.speed);
    }

    return {
      brands: Array.from(brands).sort((a, b) => a.localeCompare(b)),
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
      plastics: Array.from(plastics).sort((a, b) => a.localeCompare(b)),
      stabilities: Array.from(stabilities).sort((a, b) => a.localeCompare(b)),
      speedRange: {
        min: speeds.length ? Math.min(...speeds) : null,
        max: speeds.length ? Math.max(...speeds) : null,
      },
    };
  } catch {
    try {
      const allDiscs = await fetchAllEntries<Disc>("/api/discs", [
        "brand",
        "category",
        "stability",
        "speed",
      ]);
      const brands = new Set<string>();
      const categories = new Set<string>();
      const stabilities = new Set<string>();
      const speeds: number[] = [];

      for (const disc of allDiscs) {
        if (disc.brand) brands.add(disc.brand);
        if (disc.category) categories.add(disc.category);
        if (disc.stability) stabilities.add(disc.stability);
        if (typeof disc.speed === "number") speeds.push(disc.speed);
      }

      return {
        brands: Array.from(brands).sort((a, b) => a.localeCompare(b)),
        categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
        plastics: [],
        stabilities: Array.from(stabilities).sort((a, b) => a.localeCompare(b)),
        speedRange: {
          min: speeds.length ? Math.min(...speeds) : null,
          max: speeds.length ? Math.max(...speeds) : null,
        },
      };
    } catch {
      return {
        brands: [],
        categories: [],
        plastics: [],
        stabilities: [],
        speedRange: { min: null, max: null },
      };
    }
  }
};

export const getAllDiscsForSimilarity = async () => {
  try {
    const variants = await getAllDiscVariants();
    return variants.map(mapDiscVariantToDisc);
  } catch {
    try {
      return (
        await fetchAllEntries<Disc>("/api/discs", [
        "documentId",
        "externalId",
        "name",
        "brand",
        "plastic",
        "speed",
        "glide",
        "turn",
        "fade",
        "stability",
        "category",
        "imageUrl",
        "link",
        "color",
        "backgroundColor",
      ])
      ).map(mapLegacyDiscToDisc);
    } catch {
      return [] as Disc[];
    }
  }
};

export const getCourses = async (input: {
  page?: number;
  pageSize?: number;
  query?: string;
  state?: string;
  city?: string;
  difficulty?: string;
  type?: string;
}) => {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 12;
  const query = toQueryString({
    "pagination[page]": page,
    "pagination[pageSize]": pageSize,
    "sort[0]": "name:asc",
    "filters[name][$containsi]": input.query,
    "filters[state][$eq]": input.state,
    "filters[city][$eq]": input.city,
    "filters[difficulty][$eq]": input.difficulty,
    "filters[type][$eq]": input.type,
    status: "published",
  });

  try {
    const payload = await request<StrapiListResponse<Course>>(`/api/courses?${query}`);
    return {
      items: payload.data,
      pagination: payload.meta?.pagination ?? defaultPagination,
    } satisfies CourseListResult;
  } catch {
    return {
      items: [],
      pagination: defaultPagination,
    } satisfies CourseListResult;
  }
};

export const getCourseFacetOptions = async (): Promise<CourseFacetOptions> => {
  try {
    const allCourses = await fetchAllEntries<Course>("/api/courses", [
      "state",
      "difficulty",
      "type",
    ]);
    const states = new Set<string>();
    const stateCounts = new Map<string, number>();
    const difficulties = new Set<string>();
    const types = new Set<string>();

    for (const course of allCourses) {
      if (course.state) {
        states.add(course.state);
        stateCounts.set(course.state, (stateCounts.get(course.state) ?? 0) + 1);
      }
      if (course.difficulty) difficulties.add(course.difficulty);
      if (course.type) types.add(course.type);
    }

    const mergedStates = Array.from(new Set([...US_STATES, ...states])).sort((a, b) => a.localeCompare(b));
    const mergedStateCounts = Object.fromEntries(
      mergedStates.map((state) => [state, stateCounts.get(state) ?? 0]),
    );

    return {
      states: mergedStates,
      stateCounts: mergedStateCounts,
      difficulties: Array.from(new Set([...COURSE_DIFFICULTY_ENUMS, ...difficulties])).sort((a, b) =>
        a.localeCompare(b)
      ),
      types: Array.from(new Set([...COURSE_TYPE_ENUMS, ...types])).sort((a, b) => a.localeCompare(b)),
    };
  } catch {
    return {
      states: [...US_STATES],
      stateCounts: Object.fromEntries(US_STATES.map((state) => [state, 0])),
      difficulties: [...COURSE_DIFFICULTY_ENUMS],
      types: [...COURSE_TYPE_ENUMS],
    };
  }
};

export const getDiscByDocumentId = async (documentId: string) => {
  const variantQuery = toQueryString({
    "filters[documentId][$eq]": documentId,
    "populate[mold][fields][0]": "name",
    "populate[mold][fields][1]": "brand",
    "populate[mold][fields][2]": "category",
    "populate[mold][fields][3]": "externalId",
    "populate[mold][fields][4]": "color",
    "populate[mold][fields][5]": "backgroundColor",
    "populate[mold][fields][6]": "speed",
    "populate[mold][fields][7]": "glide",
    "populate[mold][fields][8]": "turn",
    "populate[mold][fields][9]": "fade",
    "populate[mold][fields][10]": "stability",
    "populate[mold][fields][11]": "diameterCm",
    "populate[mold][fields][12]": "heightCm",
    "populate[mold][fields][13]": "rimDepthCm",
    "populate[mold][fields][14]": "rimThicknessCm",
    "populate[mold][fields][15]": "maxWeightGr",
    "populate[plastic][fields][0]": "name",
    "populate[plastic][fields][1]": "externalId",
    status: "published",
    "pagination[pageSize]": 1,
  });
  try {
    const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${variantQuery}`);
    return payload.data[0] ? mapDiscVariantToDisc(payload.data[0]) : null;
  } catch {
    const legacyQuery = toQueryString({
      "filters[documentId][$eq]": documentId,
      status: "published",
      "pagination[pageSize]": 1,
    });
    try {
      const payload = await request<StrapiListResponse<Disc>>(`/api/discs?${legacyQuery}`);
      if (payload.data[0]) {
        return mapLegacyDiscToDisc(payload.data[0]);
      }
      return await getDiscFromTypesenseById(documentId);
    } catch {
      return await getDiscFromTypesenseById(documentId);
    }
  }
};

export const getDiscsByDocumentIds = async (documentIds: string[]) => {
  if (documentIds.length === 0) {
    return [] as Disc[];
  }

  const trimmed = documentIds.map((id) => id.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return [] as Disc[];
  }

  const uniqueIds = Array.from(new Set(trimmed));
  const variantParams: Record<string, string | number> = {
    status: "published",
    "pagination[pageSize]": uniqueIds.length,
    "populate[mold][fields][0]": "name",
    "populate[mold][fields][1]": "brand",
    "populate[mold][fields][2]": "category",
    "populate[mold][fields][3]": "externalId",
    "populate[mold][fields][4]": "color",
    "populate[mold][fields][5]": "backgroundColor",
    "populate[mold][fields][6]": "speed",
    "populate[mold][fields][7]": "glide",
    "populate[mold][fields][8]": "turn",
    "populate[mold][fields][9]": "fade",
    "populate[mold][fields][10]": "stability",
    "populate[mold][fields][11]": "diameterCm",
    "populate[mold][fields][12]": "heightCm",
    "populate[mold][fields][13]": "rimDepthCm",
    "populate[mold][fields][14]": "rimThicknessCm",
    "populate[mold][fields][15]": "maxWeightGr",
    "populate[plastic][fields][0]": "name",
    "populate[plastic][fields][1]": "externalId",
  };
  uniqueIds.forEach((id, index) => {
    variantParams[`filters[documentId][$in][${index}]`] = id;
  });

  const query = toQueryString(variantParams);
  try {
    const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${query}`);
    const mapped = payload.data.map(mapDiscVariantToDisc);
    const byId = new Map(mapped.map((disc) => [disc.documentId, disc]));
    return uniqueIds.map((id) => byId.get(id)).filter((disc): disc is Disc => Boolean(disc));
  } catch {
    const legacyParams: Record<string, string | number> = {
      status: "published",
      "pagination[pageSize]": uniqueIds.length,
    };
    uniqueIds.forEach((id, index) => {
      legacyParams[`filters[documentId][$in][${index}]`] = id;
    });
    const legacyQuery = toQueryString(legacyParams);
    try {
      const payload = await request<StrapiListResponse<Disc>>(`/api/discs?${legacyQuery}`);
      const byId = new Map(payload.data.map((disc) => [disc.documentId, disc]));
      return uniqueIds.map((id) => byId.get(id)).filter((disc): disc is Disc => Boolean(disc));
    } catch {
      return [] as Disc[];
    }
  }
};

export const getDiscsByIds = async (ids: number[]) => {
  if (ids.length === 0) {
    return [] as Disc[];
  }

  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) {
    return [] as Disc[];
  }

  const params: Record<string, string | number> = {
    status: "published",
    "pagination[pageSize]": uniqueIds.length,
    "populate[mold][fields][0]": "name",
    "populate[mold][fields][1]": "brand",
    "populate[mold][fields][2]": "category",
    "populate[mold][fields][3]": "externalId",
    "populate[mold][fields][4]": "color",
    "populate[mold][fields][5]": "backgroundColor",
    "populate[mold][fields][6]": "speed",
    "populate[mold][fields][7]": "glide",
    "populate[mold][fields][8]": "turn",
    "populate[mold][fields][9]": "fade",
    "populate[mold][fields][10]": "stability",
    "populate[mold][fields][11]": "diameterCm",
    "populate[mold][fields][12]": "heightCm",
    "populate[mold][fields][13]": "rimDepthCm",
    "populate[mold][fields][14]": "rimThicknessCm",
    "populate[mold][fields][15]": "maxWeightGr",
    "populate[plastic][fields][0]": "name",
    "populate[plastic][fields][1]": "externalId",
  };
  uniqueIds.forEach((id, index) => {
    params[`filters[id][$in][${index}]`] = id;
  });

  const query = toQueryString(params);
  try {
    const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${query}`);
    const mapped = payload.data.map(mapDiscVariantToDisc);
    const byId = new Map(mapped.map((disc) => [disc.id, disc]));
    return uniqueIds.map((id) => byId.get(id)).filter((disc): disc is Disc => Boolean(disc));
  } catch {
    const legacyParams: Record<string, string | number> = {
      status: "published",
      "pagination[pageSize]": uniqueIds.length,
    };
    uniqueIds.forEach((id, index) => {
      legacyParams[`filters[id][$in][${index}]`] = id;
    });
    const legacyQuery = toQueryString(legacyParams);
    try {
      const payload = await request<StrapiListResponse<Disc>>(`/api/discs?${legacyQuery}`);
      const byId = new Map(payload.data.map((disc) => [disc.id, disc]));
      return uniqueIds.map((id) => byId.get(id)).filter((disc): disc is Disc => Boolean(disc));
    } catch {
      return [] as Disc[];
    }
  }
};

export const getDiscsByExternalIds = async (externalIds: string[]) => {
  if (externalIds.length === 0) {
    return [] as Disc[];
  }

  const uniqueIds = Array.from(new Set(externalIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [] as Disc[];
  }

  const params: Record<string, string | number> = {
    status: "published",
    "pagination[pageSize]": uniqueIds.length,
    "populate[mold][fields][0]": "name",
    "populate[mold][fields][1]": "brand",
    "populate[mold][fields][2]": "category",
    "populate[mold][fields][3]": "externalId",
    "populate[mold][fields][4]": "color",
    "populate[mold][fields][5]": "backgroundColor",
    "populate[mold][fields][6]": "speed",
    "populate[mold][fields][7]": "glide",
    "populate[mold][fields][8]": "turn",
    "populate[mold][fields][9]": "fade",
    "populate[mold][fields][10]": "stability",
    "populate[mold][fields][11]": "diameterCm",
    "populate[mold][fields][12]": "heightCm",
    "populate[mold][fields][13]": "rimDepthCm",
    "populate[mold][fields][14]": "rimThicknessCm",
    "populate[mold][fields][15]": "maxWeightGr",
    "populate[plastic][fields][0]": "name",
    "populate[plastic][fields][1]": "externalId",
  };
  uniqueIds.forEach((id, index) => {
    params[`filters[externalId][$in][${index}]`] = id;
  });

  const query = toQueryString(params);
  try {
    const payload = await request<StrapiListResponse<DiscVariant>>(`/api/disc-variants?${query}`);
    const mapped = payload.data.map(mapDiscVariantToDisc);
    const byExternalId = new Map(mapped.map((disc) => [disc.externalId, disc]));
    return uniqueIds
      .map((externalId) => byExternalId.get(externalId))
      .filter((disc): disc is Disc => Boolean(disc));
  } catch {
    const legacyParams: Record<string, string | number> = {
      status: "published",
      "pagination[pageSize]": uniqueIds.length,
    };
    uniqueIds.forEach((id, index) => {
      legacyParams[`filters[externalId][$in][${index}]`] = id;
    });
    const legacyQuery = toQueryString(legacyParams);
    try {
      const payload = await request<StrapiListResponse<Disc>>(`/api/discs?${legacyQuery}`);
      const byExternalId = new Map(payload.data.map((disc) => [disc.externalId, disc]));
      return uniqueIds
        .map((externalId) => byExternalId.get(externalId))
        .filter((disc): disc is Disc => Boolean(disc))
        .map(mapLegacyDiscToDisc);
    } catch {
      return [] as Disc[];
    }
  }
};

export const getCourseByDocumentId = async (documentId: string) => {
  const query = toQueryString({
    "filters[documentId][$eq]": documentId,
    status: "published",
    "pagination[pageSize]": 1,
    "populate[photos][fields][0]": "url",
    "populate[photos][fields][1]": "alternativeText",
  });
  try {
    const payload = await request<StrapiListResponse<Course>>(`/api/courses?${query}`);
    return payload.data[0] ?? null;
  } catch {
    return null;
  }
};

export const getDiscMoldByExternalId = async (externalId: string) => {
  const query = toQueryString({
    "filters[externalId][$eq]": externalId,
    status: "published",
    "pagination[pageSize]": 1,
  });
  try {
    const payload = await request<StrapiListResponse<DiscMold>>(`/api/disc-molds?${query}`);
    return payload.data[0] ?? null;
  } catch {
    return null;
  }
};

export const getFeaturedCatalogStats = async () => {
  try {
    const [discs, courses] = await Promise.all([
      request<StrapiListResponse<DiscVariant>>(
        "/api/disc-variants?pagination%5BpageSize%5D=1&status=published"
      ),
      request<StrapiListResponse<Course>>(
        "/api/courses?pagination%5BpageSize%5D=1&status=published"
      ),
    ]);

    return {
      discTotal: discs.meta?.pagination?.total ?? 0,
      courseTotal: courses.meta?.pagination?.total ?? 0,
    };
  } catch {
    try {
      const [discs, courses] = await Promise.all([
        request<StrapiListResponse<Disc>>("/api/discs?pagination%5BpageSize%5D=1&status=published"),
        request<StrapiListResponse<Course>>("/api/courses?pagination%5BpageSize%5D=1&status=published"),
      ]);
      return {
        discTotal: discs.meta?.pagination?.total ?? 0,
        courseTotal: courses.meta?.pagination?.total ?? 0,
      };
    } catch {
      return {
        discTotal: 0,
        courseTotal: 0,
      };
    }
  }
};

export const getCourseRatingsByDocumentId = async (documentId: string) => {
  const query = toQueryString({
    "filters[course][documentId][$eq]": documentId,
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": 25,
    "populate[submittedBy][fields][0]": "username",
    "populate[submittedBy][fields][1]": "email",
  });

  try {
    const payload = await request<StrapiListResponse<CourseRating>>(`/api/course-ratings?${query}`);
    return payload.data ?? [];
  } catch {
    return [] as CourseRating[];
  }
};

export const getDiscRatingsByDocumentId = async (documentId: string) => {
  const query = toQueryString({
    "filters[discDocumentId][$eq]": documentId,
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": 50,
    "populate[submittedBy][fields][0]": "username",
    "populate[submittedBy][fields][1]": "email",
  });

  try {
    const payload = await request<StrapiListResponse<DiscRating>>(`/api/disc-ratings?${query}`);
    return payload.data ?? [];
  } catch {
    return [] as DiscRating[];
  }
};

export const getDiscRatingSummariesByDocumentIds = async (documentIds: string[]) => {
  const ids = Array.from(new Set(documentIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) {
    return new Map<string, DiscRatingSummary>();
  }

  const params: Record<string, string | number> = {
    "pagination[page]": 1,
    "pagination[pageSize]": STRAPI_SAFE_PAGE_SIZE,
    "fields[0]": "discDocumentId",
    "fields[1]": "overall",
  };
  ids.forEach((id, index) => {
    params[`filters[discDocumentId][$in][${index}]`] = id;
  });

  const aggregate = new Map<string, { total: number; count: number }>();
  try {
    const firstQuery = toQueryString(params);
    const firstPayload = await request<StrapiListResponse<Pick<DiscRating, "discDocumentId" | "overall">>>(
      `/api/disc-ratings?${firstQuery}`,
    );
    const pageCount = firstPayload.meta?.pagination?.pageCount ?? 1;
    const apply = (rows: Array<Pick<DiscRating, "discDocumentId" | "overall">>) => {
      for (const row of rows) {
        const key = row.discDocumentId;
        if (!key) continue;
        const overall = typeof row.overall === "number" ? row.overall : null;
        if (overall === null) continue;
        const current = aggregate.get(key) ?? { total: 0, count: 0 };
        current.total += overall;
        current.count += 1;
        aggregate.set(key, current);
      }
    };
    apply(firstPayload.data ?? []);

    for (let page = 2; page <= pageCount; page += 1) {
      const query = toQueryString({
        ...params,
        "pagination[page]": page,
      });
      const payload = await request<StrapiListResponse<Pick<DiscRating, "discDocumentId" | "overall">>>(
        `/api/disc-ratings?${query}`,
      );
      apply(payload.data ?? []);
    }
  } catch {
    return new Map<string, DiscRatingSummary>();
  }

  return new Map(
    ids.map((id) => {
      const stats = aggregate.get(id);
      if (!stats || stats.count === 0) {
        return [id, { discDocumentId: id, ratingAverageOverall: null, ratingCount: 0 } satisfies DiscRatingSummary];
      }
      return [
        id,
        {
          discDocumentId: id,
          ratingAverageOverall: Number((stats.total / stats.count).toFixed(2)),
          ratingCount: stats.count,
        } satisfies DiscRatingSummary,
      ];
    }),
  );
};

export const getCollectorReleasesByDiscDocumentId = async (discDocumentId: string) => {
  const query = toQueryString({
    "filters[discDocumentId][$eq]": discDocumentId,
    "sort[0]": "year:asc",
    "sort[1]": "runName:asc",
    "pagination[pageSize]": 100,
    status: "published",
  });

  try {
    const payload = await request<StrapiListResponse<CollectorRelease>>(`/api/collector-releases?${query}`);
    return payload.data ?? [];
  } catch {
    return [] as CollectorRelease[];
  }
};
