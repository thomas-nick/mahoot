import { LinkButton, Notice, PageHeader } from "@/app/components/ui";
import { ActiveGroupHero } from "@/app/marketplace/ActiveGroupHero";
import { BrandGroups } from "@/app/marketplace/BrandGroups";
import { FilterSidebar } from "@/app/marketplace/FilterSidebar";
import { ListingCard } from "@/app/marketplace/ListingCard";
import { ListingRow } from "@/app/marketplace/ListingRow";
import { MarketplaceSignInBanner } from "@/app/marketplace/MarketplaceSignInBanner";
import { MarketplaceTrustStrip } from "@/app/marketplace/MarketplaceTrustStrip";
import { SortBar } from "@/app/marketplace/SortBar";
import {
  applyBrowseFilters,
  BRAND_GROUPS,
  computeBrandGroupCounts,
  isBrandGroupId,
  isSortId,
  matchesBrandGroup,
  type BrandGroupId,
  type BrowseFilters,
  type SortId,
} from "@/app/marketplace/lib";
import { getActiveMarketListingsForBrowse, type MarketListing } from "@/lib/strapi";
import { searchActiveListingIds } from "@/lib/typesense-server";

const typesenseHost = process.env.TYPESENSE_HOST;
const typesensePort = process.env.TYPESENSE_PORT ?? "8108";
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL ?? "http";
const typesenseApiKey = process.env.TYPESENSE_API_KEY;

type LoadResult = {
  listings: MarketListing[];
  source: "typesense" | "strapi";
  typesenseConfigured: boolean;
  typesenseUnreachable: boolean;
};

const loadListings = async (): Promise<LoadResult> => {
  const typesenseConfigured = Boolean(typesenseHost && typesenseApiKey);
  // Typesense currently only indexes a subset of fields, and the new browse UI
  // wants the rich data (multi-photo, plastic, weight). Pull from Strapi for
  // now; we can re-introduce Typesense for free-text search later.
  const fromStrapi = await getActiveMarketListingsForBrowse();
  return {
    listings: fromStrapi,
    source: "strapi",
    typesenseConfigured,
    typesenseUnreachable: false,
  };
};

const parseFilters = (search: Record<string, string | string[] | undefined>): BrowseFilters => {
  const get = (key: string) => {
    const value = search[key];
    return Array.isArray(value) ? value[0] : value ?? "";
  };
  const sortRaw = get("sort");
  const sort: SortId = isSortId(sortRaw) ? (sortRaw as SortId) : "newest";
  const priceMin = Number(get("priceMin"));
  const priceMax = Number(get("priceMax"));
  const groupRaw = get("group");
  const group: string = isBrandGroupId(groupRaw) ? groupRaw : "";
  return {
    q: get("q"),
    brand: get("brand"),
    group,
    condition: get("condition"),
    shipping: get("shipping"),
    priceMin: Number.isFinite(priceMin) && priceMin > 0 ? priceMin : null,
    priceMax: Number.isFinite(priceMax) && priceMax > 0 ? priceMax : null,
    negotiable: get("negotiable") === "1",
    sort,
  };
};

const collectBrands = (rows: MarketListing[]): string[] => {
  const set = new Set<string>();
  for (const row of rows) {
    const name = (row.discDisplayName ?? "").trim();
    if (!name) continue;
    // Take the first token as the "brand-ish" label; this is a heuristic until
    // listings are linked to disc records with proper brand data.
    const candidate = name.split(/\s+/)[0];
    if (candidate) set.add(candidate);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ONE_DAY_MS = 86_400_000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

const isoOlderThan = (iso: string | null | undefined, ms: number) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < ms;
};

export default async function MarketplacePage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { listings, typesenseConfigured } = await loadListings();
  const brands = collectBrands(listings);
  const groupCounts = computeBrandGroupCounts(listings) as Partial<Record<BrandGroupId, number>>;

  const searchHits = filters.q.trim().length >= 2
    ? await searchActiveListingIds(filters.q)
    : null;
  const filtered = applyBrowseFilters(listings, filters, {
    searchMatchIds: searchHits?.ids ?? null,
    searchOrder: searchHits?.order ?? null,
  });
  const searchUsedTypesense = Boolean(searchHits);
  const activeGroup = filters.group
    ? BRAND_GROUPS.find((entry) => entry.id === filters.group) ?? null
    : null;

  const newToday = listings.filter((row) => isoOlderThan(row.createdAt, ONE_DAY_MS)).length;
  const newThisWeek = listings.filter((row) => isoOlderThan(row.createdAt, SEVEN_DAYS_MS)).length;
  const activeGroupsCount = Object.values(groupCounts).filter(
    (count) => (count ?? 0) > 0,
  ).length;

  const view: "grid" | "list" =
    (Array.isArray(params.view) ? params.view[0] : params.view) === "list" ? "list" : "grid";

  const groupNewToday = activeGroup
    ? listings.filter(
        (row) =>
          matchesBrandGroup(row, activeGroup.id) && isoOlderThan(row.createdAt, ONE_DAY_MS),
      ).length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Peer-to-peer disc listings from the community. Browsing is open; signing in lets you save listings, send offers, and message sellers."
        action={
          <LinkButton href="/marketplace/new">
            <span aria-hidden>+</span> List a disc
          </LinkButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Active listings" value={listings.length} accent="indigo" />
        <StatTile label="New today" value={newToday} accent="emerald" hint={`${newThisWeek} in the last 7 days`} />
        <StatTile
          label="Brand groups live"
          value={activeGroupsCount}
          accent="amber"
          hint={`Out of ${BRAND_GROUPS.length} curated groups`}
        />
      </div>

      {!typesenseConfigured && listings.length > 0 ? (
        <Notice variant="info">
          Showing live listings from Strapi. (Typesense isn&apos;t configured yet — set{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">TYPESENSE_HOST</code> and{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">TYPESENSE_API_KEY</code> if you want
          search-backed results across the whole catalog.)
        </Notice>
      ) : null}

      {filters.q.trim() ? (
        <p className="text-sm text-slate-600">
          {searchUsedTypesense ? (
            <>
              <span className="font-medium text-slate-900">{filtered.length}</span> result
              {filtered.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-slate-900">&ldquo;{filters.q.trim()}&rdquo;</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                ⚡ Typesense
              </span>
            </>
          ) : (
            <>
              Showing matches for{" "}
              <span className="font-medium text-slate-900">&ldquo;{filters.q.trim()}&rdquo;</span>
            </>
          )}
        </p>
      ) : null}

      <MarketplaceSignInBanner />

      <BrandGroups totalCount={listings.length} counts={groupCounts} />

      {activeGroup ? (
        <ActiveGroupHero
          label={activeGroup.label}
          theme={activeGroup.theme}
          count={filtered.length}
          newToday={groupNewToday}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <FilterSidebar brands={brands} />
        </aside>
        <div className="space-y-4">
          <SortBar count={filtered.length} />
          {filtered.length === 0 ? (
            <EmptyMarketplace hasListings={listings.length > 0} />
          ) : view === "list" ? (
            <div className="space-y-3">
              {filtered.map((listing) => (
                <ListingRow
                  key={listing.documentId ?? String(listing.id)}
                  listing={listing}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((listing) => (
                <ListingCard
                  key={listing.documentId ?? String(listing.id)}
                  listing={listing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MarketplaceTrustStrip />
    </div>
  );
}

const accentClasses = {
  indigo: "from-indigo-50 to-white text-indigo-700 ring-indigo-100",
  emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
  amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
} as const;

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: keyof typeof accentClasses;
}) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-4 ring-1 ring-inset ${accentClasses[accent]}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function EmptyMarketplace({ hasListings }: { hasListings: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-500"
        >
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="6" ry="2.4" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">
        {hasListings ? "Nothing matches these filters." : "No listings yet."}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {hasListings
          ? "Try widening your search or pick a different brand group above."
          : "Be the first to post — tap “List a disc” at the top of the page."}
      </p>
    </div>
  );
}
