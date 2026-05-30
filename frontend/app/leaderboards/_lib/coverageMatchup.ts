import type { CoveragePlayer, CoveragePlayerResult } from "./coveragePlayerTypes";

export interface MatchupEvent {
  coverage_event_id: string;
  title: string;
  year: string;
  tour_tag: string | null;
  place_a: number;
  place_b: number;
  winner: "a" | "b" | "tie";
  has_coverage: boolean;
}

export interface CoverageMatchupResult {
  player_a: { pdga: number; name: string; division: string };
  player_b: { pdga: number; name: string; division: string };
  shared_events: number;
  a_wins: number;
  b_wins: number;
  ties: number;
  a_avg_place: number | null;
  b_avg_place: number | null;
  events: MatchupEvent[];
  division_mismatch: boolean;
}

function shortEventTitle(title: string): string {
  return title
    .replace(/^20\d{2}\s+/i, "")
    .replace(/^DGPT\+?\s*[-–]?\s*/i, "")
    .replace(/^DGPT\s+(Elite\s+|Silver\s+|Playoffs[-\s]*)?/i, "")
    .replace(/\s+presented by .+$/i, "")
    .replace(/\s+powered by .+$/i, "")
    .trim();
}

export function computeCoverageMatchup(
  playerA: CoveragePlayer,
  playerB: CoveragePlayer,
): CoverageMatchupResult {
  const divisionMismatch = playerA.division !== playerB.division;
  const bByEvent = new Map<string, CoveragePlayerResult>(
    playerB.results.map((r) => [r.coverage_event_id, r]),
  );

  const events: MatchupEvent[] = [];
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let placeSumA = 0;
  let placeSumB = 0;

  for (const ra of playerA.results) {
    const rb = bByEvent.get(ra.coverage_event_id);
    if (!rb) continue;

    let winner: "a" | "b" | "tie";
    if (ra.place < rb.place) {
      aWins += 1;
      winner = "a";
    } else if (rb.place < ra.place) {
      bWins += 1;
      winner = "b";
    } else {
      ties += 1;
      winner = "tie";
    }

    placeSumA += ra.place;
    placeSumB += rb.place;

    events.push({
      coverage_event_id: ra.coverage_event_id,
      title: shortEventTitle(ra.title) || ra.title,
      year: ra.year,
      tour_tag: ra.tour_tag,
      place_a: ra.place,
      place_b: rb.place,
      winner,
      has_coverage: ra.has_coverage || rb.has_coverage,
    });
  }

  events.sort((x, y) => y.year.localeCompare(x.year) || x.place_a - y.place_a);

  const n = events.length;
  return {
    player_a: { pdga: playerA.pdga, name: playerA.name, division: playerA.division },
    player_b: { pdga: playerB.pdga, name: playerB.name, division: playerB.division },
    shared_events: n,
    a_wins: aWins,
    b_wins: bWins,
    ties,
    a_avg_place: n ? Math.round((placeSumA / n) * 10) / 10 : null,
    b_avg_place: n ? Math.round((placeSumB / n) * 10) / 10 : null,
    events,
    division_mismatch: divisionMismatch,
  };
}

export type DivisionFilter = "all" | "MPO" | "FPO";

export function filterByDivision<T extends { division?: string | null }>(
  items: T[],
  division: DivisionFilter,
): T[] {
  if (division === "all") return items;
  return items.filter((item) => item.division === division);
}
