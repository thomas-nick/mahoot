"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DiscHit = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  plastic?: string | null;
  releaseType?: string | null;
  productionStatus?: string | null;
  runName?: string | null;
  runYear?: number | null;
  ratingAverageOverall?: number | null;
  ratingCount?: number;
};

const RELEASE_TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  "limited-edition": "Limited edition",
  "tour-series": "Tour series",
  "money-run": "Money run",
  "tournament-run": "Tournament run",
};

const formatReleaseType = (value: string | null | undefined) => {
  if (!value) return null;
  return RELEASE_TYPE_LABELS[value] ?? value.replace(/-/g, " ");
};

type CourseHit = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  difficulty: string | null;
  type: string | null;
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

type SearchResponse = {
  configured?: boolean;
  discs: DiscHit[];
  courses: CourseHit[];
  nearbyCourses?: CourseHit[];
  listings?: ListingHit[];
  error?: string;
  discsMeta?: {
    found: number;
    facets: {
      brand: Array<{ value: string; count: number }>;
      category: Array<{ value: string; count: number }>;
      stability: Array<{ value: string; count: number }>;
      plastic: Array<{ value: string; count: number }>;
      releaseType: Array<{ value: string; count: number }>;
    };
  };
  coursesMeta?: {
    found: number;
    facets: {
      state: Array<{ value: string; count: number }>;
      city: Array<{ value: string; count: number }>;
      difficulty: Array<{ value: string; count: number }>;
      type: Array<{ value: string; count: number }>;
    };
  };
};

type HeaderFacetFilters = {
  discCategory?: string;
  discBrand?: string;
  discPlastic?: string;
  discReleaseType?: string;
  courseState?: string;
  courseCity?: string;
  courseDifficulty?: string;
  courseType?: string;
};

type NavResult = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
};

const buildSearchUrl = (query: string, filters: HeaderFacetFilters) => {
  const params = new URLSearchParams();
  params.set("q", query.trim());
  if (filters.discCategory) params.set("discCategory", filters.discCategory);
  if (filters.discBrand) params.set("discBrand", filters.discBrand);
  if (filters.discPlastic) params.set("discPlastic", filters.discPlastic);
  if (filters.discReleaseType) params.set("discReleaseType", filters.discReleaseType);
  if (filters.courseState) params.set("courseState", filters.courseState);
  if (filters.courseCity) params.set("courseCity", filters.courseCity);
  if (filters.courseDifficulty) params.set("courseDifficulty", filters.courseDifficulty);
  if (filters.courseType) params.set("courseType", filters.courseType);
  return `/api/search?${params.toString()}`;
};

const getDiscDisplayName = (disc: DiscHit) => {
  const plastic = (disc.plastic ?? "").trim();
  if (!plastic) return disc.name;
  const lowerName = disc.name.toLowerCase();
  const lowerPlastic = plastic.toLowerCase();
  if (lowerName.includes(lowerPlastic)) return disc.name;
  return `${plastic} ${disc.name}`.trim();
};

export function CatalogSearch({ variant = "default" }: { variant?: "default" | "hero" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [filters, setFilters] = useState<HeaderFacetFilters>({});
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string, activeFilters: HeaderFacetFilters) => {
    if (q.trim().length < 2) {
      setData(null);
      setUnavailable(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(buildSearchUrl(q, activeFilters));
      const json = (await res.json()) as SearchResponse;
      if (res.status === 503) {
        setUnavailable(true);
        setData(null);
        return;
      }
      setUnavailable(false);
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(query, filters);
    }, 280);
    return () => clearTimeout(t);
  }, [query, filters, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const hasResults = data && (data.discs.length > 0 || data.courses.length > 0);
  const listings = data?.listings ?? [];
  const hasAnyResults =
    data && (data.discs.length > 0 || data.courses.length > 0 || listings.length > 0);
  const topDiscCategories = data?.discsMeta?.facets.category.slice(0, 6) ?? [];
  const topDiscBrands = data?.discsMeta?.facets.brand.slice(0, 6) ?? [];
  const topDiscPlastics = data?.discsMeta?.facets.plastic.slice(0, 6) ?? [];
  const topDiscReleaseTypes =
    data?.discsMeta?.facets.releaseType?.filter((bucket) => bucket.value !== "stock").slice(0, 6) ?? [];
  const topCourseStates = data?.coursesMeta?.facets.state.slice(0, 6) ?? [];
  const topCourseCities = data?.coursesMeta?.facets.city.slice(0, 6) ?? [];
  const topCourseDifficulties = data?.coursesMeta?.facets.difficulty.slice(0, 6) ?? [];
  const topCourseTypes = data?.coursesMeta?.facets.type.slice(0, 6) ?? [];
  const nearbyCourses = data?.nearbyCourses ?? [];

  const activeFilterList = useMemo(
    () =>
      [
        { key: "discCategory", label: `Disc category: ${filters.discCategory}` },
        { key: "discBrand", label: `Disc brand: ${filters.discBrand}` },
        { key: "discPlastic", label: `Disc plastic: ${filters.discPlastic}` },
        {
          key: "discReleaseType",
          label: `Release: ${formatReleaseType(filters.discReleaseType) ?? filters.discReleaseType}`,
        },
        { key: "courseState", label: `Course state: ${filters.courseState}` },
        { key: "courseCity", label: `Course city: ${filters.courseCity}` },
        { key: "courseDifficulty", label: `Course difficulty: ${filters.courseDifficulty}` },
        { key: "courseType", label: `Course type: ${filters.courseType}` },
      ].filter((item) => item.label && !item.label.endsWith(": undefined")),
    [filters]
  );

  const navResults = useMemo<NavResult[]>(() => {
    const discs =
      data?.discs.map((d) => {
        const release = formatReleaseType(d.releaseType);
        const subtitle =
          [d.brand, d.category, release].filter(Boolean).join(" · ") || "Disc";
        return {
          key: `d-${d.id}`,
          href: `/discs/${d.id}`,
          title: getDiscDisplayName(d),
          subtitle,
        };
      }) ?? [];
    const courses =
      data?.courses.map((c) => ({
        key: `c-${c.id}`,
        href: `/courses/${c.id}`,
        title: c.name,
        subtitle: [c.city, c.state].filter(Boolean).join(", ") || "Course",
      })) ?? [];
    const listingsNav =
      data?.listings?.map((l) => ({
        key: `l-${l.id}`,
        href: l.discId ? `/discs/${l.discId}?tab=marketplace` : "/marketplace",
        title: l.title,
        subtitle: [
          typeof l.priceUsd === "number" ? `$${l.priceUsd.toFixed(2)}` : null,
          l.discDisplayName,
          l.sellerUsername ? `@${l.sellerUsername}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })) ?? [];
    const nearby =
      data?.nearbyCourses?.map((c) => ({
        key: `n-${c.id}`,
        href: `/courses/${c.id}`,
        title: c.name,
        subtitle: [c.city, c.state].filter(Boolean).join(", ") || "Nearby course",
      })) ?? [];
    return [...discs, ...listingsNav, ...courses, ...nearby];
  }, [data]);

  useEffect(() => {
    if (navResults.length === 0) {
      setHighlightedIndex(-1);
    } else if (highlightedIndex >= navResults.length) {
      setHighlightedIndex(0);
    }
  }, [navResults, highlightedIndex]);

  const clearFacetKey = (key: keyof HeaderFacetFilters) => {
    setFilters((prev) => ({ ...prev, [key]: undefined }));
  };

  const clearAllFacets = () => setFilters({});

  const resetAndClose = () => {
    setOpen(false);
    setQuery("");
    setFilters({});
    setHighlightedIndex(-1);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || navResults.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % navResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? navResults.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      const target = navResults[highlightedIndex];
      if (target) {
        router.push(target.href);
        resetAndClose();
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const isHero = variant === "hero";

  return (
    <div
      ref={rootRef}
      className={`relative w-full min-w-0 flex-1 ${
        isHero ? "max-w-3xl" : "max-w-md sm:max-w-sm"
      }`}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Search discs and courses
      </label>
      <div className="relative">
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          aria-activedescendant={highlightedIndex >= 0 ? navResults[highlightedIndex]?.key : undefined}
          placeholder="Search discs, courses & marketplace…"
          autoComplete="off"
          className={`w-full rounded-xl border border-slate-300 bg-slate-50 pr-14 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:bg-white ${
            isHero ? "px-4 py-3 text-base" : "px-3 py-2 text-sm"
          }`}
        />
        {activeFilterList.length > 0 && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-white">
            {activeFilterList.length}
          </span>
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg ${
            isHero ? "max-h-[min(70vh,460px)]" : "max-h-[min(70vh,380px)]"
          }`}
        >
          {activeFilterList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {activeFilterList.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                  onClick={() => clearFacetKey(item.key as keyof HeaderFacetFilters)}
                >
                  {item.label} ×
                </button>
              ))}
              <button
                type="button"
                className="rounded-full bg-slate-900 px-2 py-1 text-xs text-white"
                onClick={clearAllFacets}
              >
                Clear
              </button>
            </div>
          )}

          {loading && <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>}
          {!loading && unavailable && (
            <p className="px-3 py-2 text-sm text-amber-800">
              Instant search needs Typesense. Set{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">TYPESENSE_HOST</code> and{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">TYPESENSE_API_KEY</code> in{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">.env.local</code>.
            </p>
          )}
          {!loading && !unavailable && data?.error && (
            <p className="px-3 py-2 text-sm text-red-600">{data.error}</p>
          )}
          {!loading && !unavailable && data && !hasAnyResults && (
            <p className="px-3 py-2 text-sm text-slate-500">No matches.</p>
          )}
          {!loading && hasAnyResults && (
            <div className="space-y-3" role="listbox" aria-label="Search results">
              {data.discs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 pb-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Discs</p>
                    <p className="text-xs text-slate-400">
                      {data.discsMeta?.found ?? data.discs.length} found
                    </p>
                  </div>
                  <ul>
                    {data.discs.map((d) => {
                      const navIndex = navResults.findIndex((item) => item.key === `d-${d.id}`);
                      const active = highlightedIndex === navIndex;
                      const releaseLabel = formatReleaseType(d.releaseType);
                      const isCollector = (d.releaseType ?? "stock") !== "stock";
                      return (
                        <li key={`d-${d.id}`} id={`d-${d.id}`} role="option" aria-selected={active}>
                          <Link
                            href={`/discs/${d.id}`}
                            className={`block px-3 py-2 text-sm ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                            onMouseEnter={() => setHighlightedIndex(navIndex)}
                            onClick={resetAndClose}
                          >
                            <span className="font-medium text-slate-900">{getDiscDisplayName(d)}</span>
                            {isCollector && releaseLabel ? (
                              <span className="ml-2 inline-flex items-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                                {releaseLabel}
                              </span>
                            ) : null}
                            <span className="ml-2 text-slate-500">
                              {[d.brand, d.category].filter(Boolean).join(" · ") || "Disc"}
                              {typeof d.ratingAverageOverall === "number" && (d.ratingCount ?? 0) > 0
                                ? ` · ${d.ratingAverageOverall}/10 (${d.ratingCount})`
                                : ""}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  {(topDiscCategories.length > 0 || topDiscBrands.length > 0 || topDiscPlastics.length > 0) && (
                    <div className="space-y-2 px-3 pt-2">
                      {topDiscCategories.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                            Categories
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {topDiscCategories.map((item) => {
                              const active = filters.discCategory === item.value;
                              return (
                                <button
                                  key={`facet-disc-category-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      discCategory: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {topDiscBrands.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Brands</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topDiscBrands.map((item) => {
                              const active = filters.discBrand === item.value;
                              return (
                                <button
                                  key={`facet-disc-brand-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      discBrand: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {topDiscPlastics.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Plastics</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topDiscPlastics.map((item) => {
                              const active = filters.discPlastic === item.value;
                              return (
                                <button
                                  key={`facet-disc-plastic-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      discPlastic: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {topDiscReleaseTypes.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                            Release type
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {topDiscReleaseTypes.map((item) => {
                              const active = filters.discReleaseType === item.value;
                              return (
                                <button
                                  key={`facet-disc-release-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      discReleaseType: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {formatReleaseType(item.value) ?? item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {listings.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 pb-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Marketplace</p>
                    <p className="text-xs text-slate-400">{listings.length}</p>
                  </div>
                  <ul>
                    {listings.map((l) => {
                      const navIndex = navResults.findIndex((item) => item.key === `l-${l.id}`);
                      const active = highlightedIndex === navIndex;
                      const href = l.discId ? `/discs/${l.discId}?tab=marketplace` : "/marketplace";
                      const price =
                        typeof l.priceUsd === "number"
                          ? `$${l.priceUsd.toFixed(2)}${l.currency && l.currency !== "USD" ? ` ${l.currency}` : ""}`
                          : null;
                      return (
                        <li key={`l-${l.id}`} id={`l-${l.id}`} role="option" aria-selected={active}>
                          <Link
                            href={href}
                            className={`block px-3 py-2 text-sm ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                            onMouseEnter={() => setHighlightedIndex(navIndex)}
                            onClick={resetAndClose}
                          >
                            <span className="font-medium text-slate-900">{l.title}</span>
                            <span className="ml-2 text-slate-500">
                              {[price, l.discDisplayName, l.sellerUsername ? `@${l.sellerUsername}` : null]
                                .filter(Boolean)
                                .join(" · ") || "Listing"}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {data.courses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 pb-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Courses</p>
                    <p className="text-xs text-slate-400">
                      {data.coursesMeta?.found ?? data.courses.length} found
                    </p>
                  </div>
                  <ul>
                    {data.courses.map((c) => {
                      const navIndex = navResults.findIndex((item) => item.key === `c-${c.id}`);
                      const active = highlightedIndex === navIndex;
                      return (
                        <li key={`c-${c.id}`} id={`c-${c.id}`} role="option" aria-selected={active}>
                          <Link
                            href={`/courses/${c.id}`}
                            className={`block px-3 py-2 text-sm ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                            onMouseEnter={() => setHighlightedIndex(navIndex)}
                            onClick={resetAndClose}
                          >
                            <span className="font-medium text-slate-900">{c.name}</span>
                            <span className="ml-2 text-slate-500">
                              {[c.city, c.state, c.difficulty, c.type]
                                .filter(Boolean)
                                .join(" · ") || "Course"}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between px-3 pb-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Nearby (25 miles)
                      </p>
                      <p className="text-xs text-slate-400">{nearbyCourses.length}</p>
                    </div>

                    {nearbyCourses.length === 0 ? (
                      <p className="px-3 py-1 text-xs text-slate-500">
                        No nearby courses found within 25 miles.
                      </p>
                    ) : (
                      <ul>
                        {nearbyCourses.map((c) => {
                          const navIndex = navResults.findIndex((item) => item.key === `n-${c.id}`);
                          const active = highlightedIndex === navIndex;
                          return (
                            <li key={`nearby-c-${c.id}`} id={`n-${c.id}`} role="option" aria-selected={active}>
                              <Link
                                href={`/courses/${c.id}`}
                                className={`block px-3 py-2 text-sm ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                                onMouseEnter={() => setHighlightedIndex(navIndex)}
                                onClick={resetAndClose}
                              >
                                <span className="font-medium text-slate-900">{c.name}</span>
                                <span className="ml-2 text-slate-500">
                                  {[c.city, c.state].filter(Boolean).join(", ") || "Course"}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {(topCourseStates.length > 0 ||
                    topCourseCities.length > 0 ||
                    topCourseDifficulties.length > 0 ||
                    topCourseTypes.length > 0) && (
                    <div className="space-y-2 px-3 pt-2">
                      {topCourseStates.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                            States
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {topCourseStates.map((item) => {
                              const active = filters.courseState === item.value;
                              return (
                                <button
                                  key={`facet-course-state-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      courseState: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {topCourseCities.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Cities</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topCourseCities.map((item) => {
                              const active = filters.courseCity === item.value;
                              return (
                                <button
                                  key={`facet-course-city-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      courseCity: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {topCourseDifficulties.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                            Difficulties
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {topCourseDifficulties.map((item) => {
                              const active = filters.courseDifficulty === item.value;
                              return (
                                <button
                                  key={`facet-course-difficulty-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      courseDifficulty: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {topCourseTypes.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Types</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topCourseTypes.map((item) => {
                              const active = filters.courseType === item.value;
                              return (
                                <button
                                  key={`facet-course-type-${item.value}`}
                                  type="button"
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  onClick={() =>
                                    setFilters((prev) => ({
                                      ...prev,
                                      courseType: active ? undefined : item.value,
                                    }))
                                  }
                                >
                                  {item.value} ({item.count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
