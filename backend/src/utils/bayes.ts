/**
 * Bayesian-smoothed rating used by leaderboards and sort-by-rating views.
 *
 * Mirrors `frontend/lib/rating-score.ts` so server- and client-computed
 * scores stay in lockstep. Tweaks here should land there too.
 */
export const BAYES_C = 2;
export const BAYES_M = 6.5;

export const bayesScore = (
  avg: number | null,
  count: number,
  c: number = BAYES_C,
  m: number = BAYES_M,
): number | null => {
  if (avg === null || !Number.isFinite(avg) || count <= 0) return null;
  const score = (c * m + avg * count) / (c + count);
  return Number(score.toFixed(3));
};
