import { cache } from "react";
import { compareByBayes } from "@/lib/rating-score";
import {
  getAllDiscRatingSummaries,
  getAllDiscsForSimilarity,
  getMostReviewedCourses,
  getTopRatedCourses,
  type Course,
  type Disc,
  type DiscRatingSummary,
} from "@/lib/strapi";

export type DiscLeaderboardItem = {
  disc: Disc;
  summary: DiscRatingSummary | null;
};

export type CategoryRail = {
  id: string;
  label: string;
  /** Substring match against the disc category, case-insensitive. */
  matches: string[];
};

export const DISC_CATEGORY_RAILS: CategoryRail[] = [
  { id: "putters", label: "Top Putters", matches: ["putt"] },
  { id: "midranges", label: "Top Midranges", matches: ["mid"] },
  { id: "fairways", label: "Top Fairway Drivers", matches: ["fairway", "control"] },
  { id: "drivers", label: "Top Distance Drivers", matches: ["distance", "driver"] },
];

export type DiscLeaderboardOptions = {
  limit?: number;
  /** Minimum number of ratings required to appear (default 1). */
  minRatings?: number;
};

/**
 * Build a ranked list of discs whose category text matches one of `matches`.
 * Excludes anything that also matches a stricter rail (e.g. "fairway driver"
 * shouldn't appear under generic "drivers"). Sorted by Bayesian score.
 */
const buildDiscRail = (
  rail: CategoryRail,
  allDiscs: Disc[],
  ratings: Map<string, DiscRatingSummary>,
  options: DiscLeaderboardOptions = {},
): DiscLeaderboardItem[] => {
  const limit = options.limit ?? 6;
  const minRatings = options.minRatings ?? 1;
  const matched = allDiscs.filter((disc) => discMatchesCategory(disc, rail));
  const items = matched
    .map((disc) => ({ disc, summary: ratings.get(disc.documentId) ?? null }))
    .filter((item) => (item.summary?.ratingCount ?? 0) >= minRatings)
    .sort(
      compareByBayes((item) => ({
        avg: item.summary?.ratingAverageOverall ?? null,
        count: item.summary?.ratingCount ?? 0,
      })),
    );

  return dedupeByMold(items).slice(0, limit);
};

/** Avoid showing the same mold multiple times across plastic variants. */
const dedupeByMold = (items: DiscLeaderboardItem[]): DiscLeaderboardItem[] => {
  const seen = new Set<string>();
  const out: DiscLeaderboardItem[] = [];
  for (const item of items) {
    const key = item.disc.moldExternalId ?? item.disc.externalId ?? item.disc.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

/** Stricter category buckets: "fairway driver" only goes to fairways, not drivers. */
const DRIVER_FORBIDDEN_TOKENS = ["fairway", "control"];
const discMatchesCategory = (disc: Disc, rail: CategoryRail): boolean => {
  const cat = (disc.category ?? "").toLowerCase();
  if (!cat) return false;
  const isHit = rail.matches.some((token) => cat.includes(token));
  if (!isHit) return false;
  if (rail.id === "drivers") {
    if (DRIVER_FORBIDDEN_TOKENS.some((token) => cat.includes(token))) return false;
  }
  if (rail.id === "midranges" && cat.includes("midrange")) return true;
  return true;
};

export type DiscLeaderboards = {
  rails: Array<{ rail: CategoryRail; items: DiscLeaderboardItem[] }>;
  mostReviewed: DiscLeaderboardItem[];
  totalRatedDiscs: number;
};

export const getDiscLeaderboards = cache(async (
  options: DiscLeaderboardOptions = {},
): Promise<DiscLeaderboards> => {
  const limit = options.limit ?? 6;
  const minRatings = options.minRatings ?? 1;
  const [allDiscs, ratings] = await Promise.all([
    getAllDiscsForSimilarity(),
    getAllDiscRatingSummaries(),
  ]);

  const rails = DISC_CATEGORY_RAILS.map((rail) => ({
    rail,
    items: buildDiscRail(rail, allDiscs, ratings, { limit, minRatings }),
  })).filter((entry) => entry.items.length > 0);

  const mostReviewed = dedupeByMold(
    allDiscs
      .map((disc) => ({ disc, summary: ratings.get(disc.documentId) ?? null }))
      .filter((item) => (item.summary?.ratingCount ?? 0) >= minRatings)
      .sort((a, b) => (b.summary?.ratingCount ?? 0) - (a.summary?.ratingCount ?? 0)),
  ).slice(0, limit);

  return {
    rails,
    mostReviewed,
    totalRatedDiscs: ratings.size,
  };
});

export type CourseLeaderboardItem = Course;

export type CourseLeaderboards = {
  topOverall: CourseLeaderboardItem[];
  mostReviewed: CourseLeaderboardItem[];
  topByState: Array<{ state: string; courses: CourseLeaderboardItem[] }>;
};

export type CourseLeaderboardOptions = {
  limit?: number;
  state?: string;
  /** States to feature in the "Top by state" rails. Defaults to a small starter set. */
  featuredStates?: string[];
};

const DEFAULT_FEATURED_STATES = ["California", "Texas", "Minnesota", "North Carolina"];

export const getCourseLeaderboards = cache(async (
  options: CourseLeaderboardOptions = {},
): Promise<CourseLeaderboards> => {
  const limit = options.limit ?? 6;
  const featuredStates = options.featuredStates ?? DEFAULT_FEATURED_STATES;

  const [topOverall, mostReviewed, ...stateLists] = await Promise.all([
    getTopRatedCourses({ limit, state: options.state, minRatings: 1 }),
    getMostReviewedCourses({ limit, state: options.state }),
    ...featuredStates.map((state) => getTopRatedCourses({ limit: 4, state, minRatings: 1 })),
  ]);

  const topByState = featuredStates
    .map((state, index) => ({ state, courses: stateLists[index] ?? [] }))
    .filter((entry) => entry.courses.length > 0);

  return { topOverall, mostReviewed, topByState };
});
