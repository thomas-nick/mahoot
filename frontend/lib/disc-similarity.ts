import type { Disc } from "@/lib/strapi";

const FLIGHT_RANGES = {
  speed: 14,
  glide: 7,
  turn: 6,
  fade: 6,
} as const;

const FLIGHT_WEIGHTS = {
  speed: 7.5,
  glide: 1.2,
  turn: 1,
  fade: 1,
} as const;

const normDelta = (a: number | null, b: number | null, range: number) => {
  if (a == null || b == null) {
    return null;
  }
  return Math.abs(a - b) / range;
};

export const getFlightDistanceScore = (source: Disc, candidate: Disc) => {
  const weighted = [
    { value: normDelta(source.speed, candidate.speed, FLIGHT_RANGES.speed), weight: FLIGHT_WEIGHTS.speed },
    { value: normDelta(source.glide, candidate.glide, FLIGHT_RANGES.glide), weight: FLIGHT_WEIGHTS.glide },
    { value: normDelta(source.turn, candidate.turn, FLIGHT_RANGES.turn), weight: FLIGHT_WEIGHTS.turn },
    { value: normDelta(source.fade, candidate.fade, FLIGHT_RANGES.fade), weight: FLIGHT_WEIGHTS.fade },
  ]
    .filter((item) => item.value !== null)
    .map((item) => ({ value: item.value as number, weight: item.weight }));

  if (weighted.length === 0) {
    return null;
  }

  // Weighted Euclidean distance. Speed dominates so 2-speed vs 5/6-speed is penalized heavily.
  const sumWeightedSquares = weighted.reduce((acc, item) => acc + item.weight * item.value ** 2, 0);
  const sumWeights = weighted.reduce((acc, item) => acc + item.weight, 0);
  return Math.sqrt(sumWeightedSquares / sumWeights);
};

export const getCombinedSimilarityScore = (dimensionScore: number, flightDistance: number | null) => {
  if (flightDistance === null) {
    return dimensionScore;
  }
  // Lower is better. Keep dimensions primary, but reward closer flights.
  return dimensionScore + flightDistance * 0.85;
};

export const isWeakSimilarityMatch = (combinedScore: number, flightDistance: number | null) => {
  if (combinedScore > 2.25) {
    return true;
  }
  if (flightDistance !== null && flightDistance > 0.62) {
    return true;
  }
  return false;
};

export type FlightNeighbor = {
  disc: Disc;
  flightDistance: number;
  speedGap: number | null;
};

export const rankFlightOnlyNeighbors = (source: Disc, candidates: Disc[], limit = 5): FlightNeighbor[] => {
  const scored = candidates
    .filter((candidate) => candidate.documentId !== source.documentId)
    .map((candidate) => {
      const flightDistance = getFlightDistanceScore(source, candidate);
      if (flightDistance === null) {
        return null;
      }
      const speedGap =
        source.speed != null && candidate.speed != null ? Math.abs(source.speed - candidate.speed) : null;

      // Hard guard: avoid pairing very different speed classes.
      if (speedGap !== null && speedGap > 2) {
        return null;
      }
      if (flightDistance > 0.62) {
        return null;
      }

      return {
        disc: candidate,
        flightDistance,
        speedGap,
      } satisfies FlightNeighbor;
    })
    .filter((item): item is FlightNeighbor => item !== null)
    .sort((a, b) => a.flightDistance - b.flightDistance);

  return scored.slice(0, limit);
};
