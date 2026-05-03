/**
 * Reviewer badge logic.
 *
 * Badges are computed from a user's review activity (counts, category mix,
 * helpful-vote totals received). They're cheap to derive and don't need
 * persistence yet — we recompute on profile load.
 */

export type Badge = {
  id: string;
  label: string;
  description: string;
  /** A short emoji-free glyph rendered alongside the badge text. */
  glyph: string;
  /** Tailwind palette tokens. */
  palette: BadgePalette;
};

export type BadgePalette = "amber" | "emerald" | "indigo" | "rose" | "slate" | "sky" | "violet";

export type ReviewerActivity = {
  /** Total disc reviews submitted. */
  discReviewCount: number;
  /** Total course reviews submitted. */
  courseReviewCount: number;
  /** Disc reviews grouped by lower-cased category bucket (putt/mid/fairway/distance). */
  discReviewsByCategory: {
    putters: number;
    midranges: number;
    fairways: number;
    drivers: number;
  };
  /** Sum of helpful votes received across all of this user's reviews. */
  helpfulVotesReceived: number;
};

const palette = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", chip: "bg-emerald-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", chip: "bg-amber-600" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", chip: "bg-indigo-600" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", chip: "bg-rose-600" },
  slate: { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-800", chip: "bg-slate-700" },
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", chip: "bg-sky-600" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", chip: "bg-violet-600" },
} as const;

export const PALETTE_TOKENS = palette;

const CATEGORY_BADGE_THRESHOLD = 5;

export const computeReviewerBadges = (activity: ReviewerActivity): Badge[] => {
  const badges: Badge[] = [];
  const totalReviews = activity.discReviewCount + activity.courseReviewCount;

  if (totalReviews >= 1) {
    badges.push({
      id: "first-review",
      label: "First review",
      description: "Wrote a review.",
      glyph: "✶",
      palette: "slate",
    });
  }
  if (totalReviews >= 5) {
    badges.push({
      id: "rookie-reviewer",
      label: "Rookie reviewer",
      description: "5+ total reviews.",
      glyph: "5",
      palette: "sky",
    });
  }
  if (totalReviews >= 25) {
    badges.push({
      id: "regular-reviewer",
      label: "Regular reviewer",
      description: "25+ total reviews.",
      glyph: "25",
      palette: "indigo",
    });
  }
  if (totalReviews >= 100) {
    badges.push({
      id: "century-club",
      label: "Century club",
      description: "100+ total reviews.",
      glyph: "100",
      palette: "violet",
    });
  }

  const cats = activity.discReviewsByCategory;
  if (cats.putters >= CATEGORY_BADGE_THRESHOLD) {
    badges.push({
      id: "putter-pro",
      label: "Putter pro",
      description: `${CATEGORY_BADGE_THRESHOLD}+ putter reviews.`,
      glyph: "P",
      palette: "emerald",
    });
  }
  if (cats.midranges >= CATEGORY_BADGE_THRESHOLD) {
    badges.push({
      id: "mid-master",
      label: "Mid master",
      description: `${CATEGORY_BADGE_THRESHOLD}+ midrange reviews.`,
      glyph: "M",
      palette: "sky",
    });
  }
  if (cats.fairways >= CATEGORY_BADGE_THRESHOLD) {
    badges.push({
      id: "fairway-friend",
      label: "Fairway friend",
      description: `${CATEGORY_BADGE_THRESHOLD}+ fairway driver reviews.`,
      glyph: "F",
      palette: "indigo",
    });
  }
  if (cats.drivers >= CATEGORY_BADGE_THRESHOLD) {
    badges.push({
      id: "driver-devotee",
      label: "Driver devotee",
      description: `${CATEGORY_BADGE_THRESHOLD}+ distance driver reviews.`,
      glyph: "D",
      palette: "rose",
    });
  }
  const categoriesCovered = (Object.values(cats) as number[]).filter(
    (count) => count >= CATEGORY_BADGE_THRESHOLD,
  ).length;
  if (categoriesCovered >= 4) {
    badges.push({
      id: "all-rounder",
      label: "All-rounder",
      description: "5+ reviews across every disc category.",
      glyph: "★",
      palette: "amber",
    });
  }

  if (activity.courseReviewCount >= CATEGORY_BADGE_THRESHOLD) {
    badges.push({
      id: "course-critic",
      label: "Course critic",
      description: `${CATEGORY_BADGE_THRESHOLD}+ course reviews.`,
      glyph: "C",
      palette: "emerald",
    });
  }

  if (activity.helpfulVotesReceived >= 10) {
    badges.push({
      id: "trusted-voice",
      label: "Trusted voice",
      description: "10+ helpful votes received.",
      glyph: "♥",
      palette: "rose",
    });
  }

  return badges;
};

const matchesCategory = (
  category: string | null | undefined,
  bucket: keyof ReviewerActivity["discReviewsByCategory"],
): boolean => {
  const text = (category ?? "").toLowerCase();
  if (!text) return false;
  if (bucket === "putters") return text.includes("putt");
  if (bucket === "midranges") return text.includes("mid");
  if (bucket === "fairways") return text.includes("fairway") || text.includes("control");
  if (bucket === "drivers") {
    if (!text.includes("driver") && !text.includes("distance")) return false;
    return !text.includes("fairway") && !text.includes("control");
  }
  return false;
};

export const tallyDiscReviewCategories = (
  reviews: Array<{ category?: string | null }>,
): ReviewerActivity["discReviewsByCategory"] => {
  const tally = { putters: 0, midranges: 0, fairways: 0, drivers: 0 };
  for (const review of reviews) {
    if (matchesCategory(review.category, "putters")) tally.putters += 1;
    if (matchesCategory(review.category, "midranges")) tally.midranges += 1;
    if (matchesCategory(review.category, "fairways")) tally.fairways += 1;
    if (matchesCategory(review.category, "drivers")) tally.drivers += 1;
  }
  return tally;
};
