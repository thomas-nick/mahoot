import type { CoverageTourTagId } from "./coverageTypes";

export const COVERAGE_TOUR_TAG_LABELS: Record<CoverageTourTagId, string> = {
  major: "Major",
  dgpt_elite: "DGPT Elite",
  nt: "PDGA NT",
  jomez_tour: "Jomez Tour",
  go_throw_tour: "Go Throw Tour",
};

export const COVERAGE_TOUR_TAG_ORDER: CoverageTourTagId[] = [
  "major",
  "dgpt_elite",
  "nt",
  "jomez_tour",
  "go_throw_tour",
];
