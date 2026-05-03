/**
 * Shared rating helpers.
 *
 * Uses a Bayesian-smoothed average so a single 10/10 doesn't dominate a
 * 9.4 with hundreds of reviews. Tunable per use case.
 */

export type RatingInputs = {
  /** Raw average rating, 1-10. */
  avg: number | null | undefined;
  /** Number of ratings that produced the average. */
  count: number | null | undefined;
};

export type BayesOptions = {
  /** Prior weight (how many "imaginary" votes at the global mean). Lower = trust real data sooner. */
  c?: number;
  /** Global mean rating to fall back on. */
  m?: number;
};

const DEFAULT_C = 2;
const DEFAULT_M = 6.5;

/**
 * Bayesian-smoothed score on the same 1-10 scale as the raw average.
 * Returns null when the disc/course has zero ratings.
 */
export function bayesScore(
  { avg, count }: RatingInputs,
  options: BayesOptions = {},
): number | null {
  const c = options.c ?? DEFAULT_C;
  const m = options.m ?? DEFAULT_M;
  const n = typeof count === "number" && Number.isFinite(count) ? count : 0;
  const a = typeof avg === "number" && Number.isFinite(avg) ? avg : null;
  if (a === null || n <= 0) return null;
  return (c * m + a * n) / (c + n);
}

/** Convenience for sorting: items with no ratings sink to the bottom. */
export function bayesSortKey(inputs: RatingInputs, options?: BayesOptions): number {
  const score = bayesScore(inputs, options);
  return score ?? -Infinity;
}

/** Stable comparator (highest score first; ties broken by raw count, then avg). */
export function compareByBayes<T>(
  getInputs: (item: T) => RatingInputs,
  options?: BayesOptions,
): (a: T, b: T) => number {
  return (a, b) => {
    const ai = getInputs(a);
    const bi = getInputs(b);
    const sb = bayesScore(bi, options) ?? -Infinity;
    const sa = bayesScore(ai, options) ?? -Infinity;
    if (sb !== sa) return sb - sa;
    const cb = bi.count ?? 0;
    const ca = ai.count ?? 0;
    if (cb !== ca) return cb - ca;
    return (bi.avg ?? 0) - (ai.avg ?? 0);
  };
}

/** Format an average to one decimal, or "—". */
export function formatRating(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}
