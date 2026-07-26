import type { PlayerTourData, PlayerTourEntry } from "./playerTourTypes";
import { loadPlayerTourData } from "./playerTourData";

export { TOP_N } from "./tourPlayerConstants";
import { TOP_N } from "./tourPlayerConstants";

export type TourPlayerBundle = {
  player: PlayerTourEntry;
  division: string;
  week: string | null;
  year: string;
};

function isTopHundred(p: PlayerTourEntry): boolean {
  return (
    (Number.isFinite(p.dgpt_rank) && p.dgpt_rank > 0 && p.dgpt_rank <= TOP_N) ||
    (Number.isFinite(p.tour_rank) && p.tour_rank > 0 && p.tour_rank <= TOP_N)
  );
}

/** Top 100 by DGPT world rank and/or weighted tour rank, both divisions. */
export async function listTopTourPlayers(): Promise<TourPlayerBundle[]> {
  const data = await loadPlayerTourData();
  const out: TourPlayerBundle[] = [];
  for (const [division, report] of Object.entries(data.divisions)) {
    for (const player of report.players) {
      if (!isTopHundred(player)) continue;
      out.push({
        player,
        division,
        week: report.week,
        year: report.year,
      });
    }
  }
  return out;
}

export async function loadTourPlayerBySlug(slug: string): Promise<TourPlayerBundle | null> {
  const data = await loadPlayerTourData();
  for (const [division, report] of Object.entries(data.divisions)) {
    const player = report.players.find((p) => p.slug === slug);
    if (player && isTopHundred(player)) {
      return { player, division, week: report.week, year: report.year };
    }
  }
  return null;
}

export function formLabel(player: PlayerTourEntry): {
  label: string;
  deltaPct: number | null;
  detail: string;
} {
  const results = player.recent_results ?? [];
  if (results.length < 2) {
    return { label: "Form", deltaPct: null, detail: "Not enough finishes to gauge form." };
  }
  const recent = results.slice(0, 3);
  const earlier = results.slice(3);
  const recentAvg =
    recent.reduce((s, r) => s + r.weighted_points, 0) / Math.max(1, recent.length);
  const seasonAvg =
    earlier.length > 0
      ? earlier.reduce((s, r) => s + r.weighted_points, 0) / earlier.length
      : results.reduce((s, r) => s + r.weighted_points, 0) / results.length;
  if (seasonAvg <= 0) {
    return { label: "Form", deltaPct: null, detail: "Form unavailable." };
  }
  const deltaPct = ((recentAvg - seasonAvg) / seasonAvg) * 100;
  const label =
    deltaPct >= 12 ? "Heating" : deltaPct <= -12 ? "Cooling" : "Steady";
  return {
    label,
    deltaPct,
    detail: `Last ${recent.length} finishes avg ${recentAvg.toFixed(0)} weighted pts vs earlier ${seasonAvg.toFixed(0)}.`,
  };
}

export function winRate(player: PlayerTourEntry): number {
  if (!player.tour_starts) return 0;
  return player.wins / player.tour_starts;
}

export function top10Rate(player: PlayerTourEntry): number {
  if (!player.tour_starts) return 0;
  return player.top10 / player.tour_starts;
}

export function avgFinish(player: PlayerTourEntry): number | null {
  const places = (player.recent_results ?? []).map((r) => r.place).filter((p) => p > 0);
  if (!places.length) return null;
  return places.reduce((a, b) => a + b, 0) / places.length;
}

export type { PlayerTourData };
