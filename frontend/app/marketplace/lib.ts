import type { MarketListing, MarketListingShipping } from "@/lib/strapi";

/**
 * Shared marketplace helpers used by both the browse page (server component)
 * and the listing detail page. Keeping them isolated lets us evolve the
 * marketplace UI without re-implementing formatting in three places.
 */

export const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  "like-new": "Like new",
  used: "Used",
  inked: "Inked",
  unknown: "Unknown",
};

export const SHIPPING_LABEL: Record<MarketListingShipping, string> = {
  "ships-us-only": "Ships in US",
  "ships-international": "Ships internationally",
  "local-pickup": "Local pickup only",
  "ships-and-pickup": "Ships or local pickup",
};

export const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low → high" },
  { id: "price-desc", label: "Price: high → low" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];

export const isSortId = (value: string): value is SortId =>
  SORT_OPTIONS.some((option) => option.id === value);

/**
 * Curated brand-group feeds for marketplace browsing. Each
 * group has a list of aliases used to match listings whose `discDisplayName`
 * (or `plastic`) contains any of the alias substrings (case-insensitive).
 *
 * `theme` drives the active-group hero banner and a few accent chips.
 * Order roughly mirrors brand popularity in the US disc-golf community.
 */
export const BRAND_GROUPS = [
  { id: "innova", label: "Innova", aliases: ["innova"], theme: "rose" },
  { id: "discraft", label: "Discraft", aliases: ["discraft"], theme: "orange" },
  { id: "discmania", label: "Discmania", aliases: ["discmania"], theme: "indigo" },
  { id: "mvp", label: "MVP", aliases: ["mvp"], theme: "violet" },
  { id: "axiom", label: "Axiom", aliases: ["axiom"], theme: "fuchsia" },
  { id: "dynamic-discs", label: "Dynamic Discs", aliases: ["dynamic discs", "dynamic"], theme: "sky" },
  { id: "latitude-64", label: "Latitude 64", aliases: ["latitude 64", "latitude64", "lat 64", "lat64"], theme: "emerald" },
  { id: "westside", label: "Westside", aliases: ["westside"], theme: "amber" },
  { id: "prodigy", label: "Prodigy", aliases: ["prodigy"], theme: "slate" },
  { id: "kastaplast", label: "Kastaplast", aliases: ["kastaplast"], theme: "yellow" },
  { id: "mint", label: "Mint Discs", aliases: ["mint discs", "mint "], theme: "teal" },
  { id: "thought-space", label: "Thought Space", aliases: ["thought space", "thoughtspace"], theme: "purple" },
  { id: "infinite", label: "Infinite Discs", aliases: ["infinite discs", "infinite "], theme: "blue" },
  { id: "lone-star", label: "Lone Star", aliases: ["lone star"], theme: "red" },
  { id: "gateway", label: "Gateway", aliases: ["gateway"], theme: "lime" },
] as const;

export type BrandTheme = (typeof BRAND_GROUPS)[number]["theme"];

/** Tailwind class triplet (gradient bg, accent text, soft chip bg) per brand. */
export const BRAND_THEME_CLASSES: Record<BrandTheme, { hero: string; accent: string; chip: string }> = {
  rose: { hero: "from-rose-500/15 via-rose-500/5 to-white", accent: "text-rose-700", chip: "bg-rose-100 text-rose-800" },
  orange: { hero: "from-orange-500/15 via-orange-500/5 to-white", accent: "text-orange-700", chip: "bg-orange-100 text-orange-800" },
  indigo: { hero: "from-indigo-500/15 via-indigo-500/5 to-white", accent: "text-indigo-700", chip: "bg-indigo-100 text-indigo-800" },
  violet: { hero: "from-violet-500/15 via-violet-500/5 to-white", accent: "text-violet-700", chip: "bg-violet-100 text-violet-800" },
  fuchsia: { hero: "from-fuchsia-500/15 via-fuchsia-500/5 to-white", accent: "text-fuchsia-700", chip: "bg-fuchsia-100 text-fuchsia-800" },
  sky: { hero: "from-sky-500/15 via-sky-500/5 to-white", accent: "text-sky-700", chip: "bg-sky-100 text-sky-800" },
  emerald: { hero: "from-emerald-500/15 via-emerald-500/5 to-white", accent: "text-emerald-700", chip: "bg-emerald-100 text-emerald-800" },
  amber: { hero: "from-amber-500/15 via-amber-500/5 to-white", accent: "text-amber-700", chip: "bg-amber-100 text-amber-800" },
  slate: { hero: "from-slate-500/15 via-slate-500/5 to-white", accent: "text-slate-700", chip: "bg-slate-200 text-slate-800" },
  yellow: { hero: "from-yellow-500/15 via-yellow-500/5 to-white", accent: "text-yellow-700", chip: "bg-yellow-100 text-yellow-800" },
  teal: { hero: "from-teal-500/15 via-teal-500/5 to-white", accent: "text-teal-700", chip: "bg-teal-100 text-teal-800" },
  purple: { hero: "from-purple-500/15 via-purple-500/5 to-white", accent: "text-purple-700", chip: "bg-purple-100 text-purple-800" },
  blue: { hero: "from-blue-500/15 via-blue-500/5 to-white", accent: "text-blue-700", chip: "bg-blue-100 text-blue-800" },
  red: { hero: "from-red-500/15 via-red-500/5 to-white", accent: "text-red-700", chip: "bg-red-100 text-red-800" },
  lime: { hero: "from-lime-500/15 via-lime-500/5 to-white", accent: "text-lime-700", chip: "bg-lime-100 text-lime-800" },
};

export type BrandGroupId = (typeof BRAND_GROUPS)[number]["id"];

export const isBrandGroupId = (value: string): value is BrandGroupId =>
  BRAND_GROUPS.some((group) => group.id === value);

/** Substring match for a listing against a brand group. Uses discDisplayName + plastic. */
export const matchesBrandGroup = (listing: MarketListing, groupId: string): boolean => {
  const group = BRAND_GROUPS.find((entry) => entry.id === groupId);
  if (!group) return false;
  const haystack = [listing.discDisplayName, listing.plastic, listing.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return group.aliases.some((alias) => haystack.includes(alias.toLowerCase()));
};

/** Find the first matching brand group for a listing (for cards/badges). */
export const brandGroupForListing = (
  listing: MarketListing,
): { id: BrandGroupId; label: string; theme: BrandTheme } | null => {
  for (const group of BRAND_GROUPS) {
    if (matchesBrandGroup(listing, group.id)) {
      return { id: group.id, label: group.label, theme: group.theme };
    }
  }
  return null;
};

/** Brand-group lookup by id (returns the curated entry incl. theme). */
export const findBrandGroup = (id: string) =>
  BRAND_GROUPS.find((entry) => entry.id === id) ?? null;

/**
 * Best-effort match for a free-form brand string (e.g. disc.brand from the catalog).
 * Used by the disc detail page to link back to the matching marketplace group.
 */
export const matchBrandGroupByName = (
  brand: string | null | undefined,
): { id: BrandGroupId; label: string; theme: BrandTheme } | null => {
  const haystack = (brand ?? "").trim().toLowerCase();
  if (!haystack) return null;
  for (const group of BRAND_GROUPS) {
    if (group.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      return { id: group.id, label: group.label, theme: group.theme };
    }
  }
  return null;
};

/** How many active listings each brand group has, for badge counts. */
export const computeBrandGroupCounts = (rows: MarketListing[]): Record<BrandGroupId, number> => {
  const counts = Object.fromEntries(BRAND_GROUPS.map((group) => [group.id, 0])) as Record<
    BrandGroupId,
    number
  >;
  for (const row of rows) {
    for (const group of BRAND_GROUPS) {
      if (matchesBrandGroup(row, group.id)) {
        counts[group.id] += 1;
      }
    }
  }
  return counts;
};

export const formatPrice = (priceUsd: number | null | undefined, currency?: string | null) => {
  if (typeof priceUsd !== "number" || !Number.isFinite(priceUsd)) return null;
  const cur = currency && currency !== "USD" ? ` ${currency}` : "";
  // Drop trailing ".00" so "$45.00" → "$45", but keep cents when present.
  const isWhole = Math.abs(priceUsd - Math.round(priceUsd)) < 0.005;
  const formatted = isWhole ? String(Math.round(priceUsd)) : priceUsd.toFixed(2);
  return `$${formatted}${cur}`;
};

export const photoUrlsFor = (listing: MarketListing): string[] => {
  const fromArray = Array.isArray(listing.imageUrls)
    ? listing.imageUrls.filter((url): url is string => typeof url === "string" && url.length > 0)
    : [];
  const primary = listing.imageUrl ? [listing.imageUrl] : [];
  const combined = [...primary, ...fromArray];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const url of combined) {
    if (!seen.has(url)) {
      seen.add(url);
      unique.push(url);
    }
  }
  return unique.slice(0, 6);
};

export const sellerHandle = (listing: MarketListing) =>
  listing.seller?.username?.trim() || null;

export const locationLabel = (listing: MarketListing) =>
  [listing.city, listing.country].filter(Boolean).join(", ") || null;

/** Apply browse-page filtering + sorting in memory. Cheap for ≤ a few thousand listings. */
export type BrowseFilters = {
  q: string;
  brand: string;
  group: string;
  condition: string;
  shipping: string;
  priceMin: number | null;
  priceMax: number | null;
  negotiable: boolean;
  sort: SortId;
};

export type ApplyBrowseFiltersOptions = {
  /**
   * When provided (typically from a server-side Typesense lookup), only rows
   * whose `documentId` (or `id`) appears in this set pass the q-filter; the
   * `filters.q` substring fallback is bypassed entirely.
   */
  searchMatchIds?: Set<string> | null;
  /**
   * When provided alongside `searchMatchIds`, the final ordering matches the
   * Typesense relevance order (rows not present fall to the bottom). Only
   * applied when `filters.sort === "newest"`.
   */
  searchOrder?: string[] | null;
};

const rowKey = (row: MarketListing): string =>
  String(row.documentId ?? row.id ?? "");

export const applyBrowseFilters = (
  rows: MarketListing[],
  filters: BrowseFilters,
  options: ApplyBrowseFiltersOptions = {},
): MarketListing[] => {
  const q = filters.q.trim().toLowerCase();
  const useTypesenseIds = Boolean(q && options.searchMatchIds);

  let filtered = rows.filter((row) => {
    if (q) {
      if (useTypesenseIds) {
        if (!options.searchMatchIds!.has(rowKey(row))) return false;
      } else {
        const haystack = [
          row.title,
          row.description,
          row.discDisplayName,
          row.plastic,
          row.colorStamp,
          row.seller?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
    }
    if (filters.group && !matchesBrandGroup(row, filters.group)) return false;
    if (filters.brand && !row.discDisplayName?.toLowerCase().includes(filters.brand.toLowerCase())) {
      return false;
    }
    if (filters.condition && row.condition !== filters.condition) return false;
    if (filters.shipping && row.shipping !== filters.shipping) return false;
    if (typeof filters.priceMin === "number" && row.priceUsd < filters.priceMin) return false;
    if (typeof filters.priceMax === "number" && row.priceUsd > filters.priceMax) return false;
    if (filters.negotiable && !row.negotiable) return false;
    return true;
  });

  if (filters.sort === "price-asc") {
    filtered = [...filtered].sort((a, b) => a.priceUsd - b.priceUsd);
  } else if (filters.sort === "price-desc") {
    filtered = [...filtered].sort((a, b) => b.priceUsd - a.priceUsd);
  } else if (useTypesenseIds && options.searchOrder && options.searchOrder.length > 0) {
    const positions = new Map<string, number>();
    options.searchOrder.forEach((id, idx) => positions.set(id, idx));
    filtered = [...filtered].sort((a, b) => {
      const ai = positions.get(rowKey(a)) ?? Number.POSITIVE_INFINITY;
      const bi = positions.get(rowKey(b)) ?? Number.POSITIVE_INFINITY;
      return ai - bi;
    });
  } else {
    filtered = [...filtered].sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    );
  }
  return filtered;
};
