import type {
  ComputedManufacturer,
  Manufacturer,
  PlayerStanding,
  ScoringMode,
} from "./types";

export const TOP4_CAP = 4;

function sum(players: PlayerStanding[], key: keyof PlayerStanding): number {
  return players.reduce((total, player) => total + Number(player[key] ?? 0), 0);
}

export function computeStandings(
  manufacturers: Manufacturer[],
  mode: ScoringMode,
  options: { excludeUnknown?: boolean } = {},
): ComputedManufacturer[] {
  const { excludeUnknown = true } = options;

  let teams = manufacturers;
  if (excludeUnknown) {
    teams = teams.filter((team) => team.manufacturer !== "Unknown");
  }

  const computed = teams.map((team) => {
    const sorted = [...team.players].sort((a, b) => b.points - a.points);
    const scoringPlayers =
      mode === "full" ? sorted : sorted.slice(0, TOP4_CAP);

    return {
      ...team,
      scoringPlayers,
      scoring_count: scoringPlayers.length,
      roster_count: team.players.length,
      scoring_cap: mode === "full" ? team.players.length : TOP4_CAP,
      scoring_mode: mode,
      points: sum(scoringPlayers, "points"),
      points_gain: sum(scoringPlayers, "points_gain"),
      wins: sum(scoringPlayers, "wins"),
      top10s: sum(scoringPlayers, "top10s"),
      starts: sum(scoringPlayers, "starts"),
      best_player: scoringPlayers[0]?.name ?? team.best_player,
      best_player_points: scoringPlayers[0]?.points ?? team.best_player_points,
    };
  });

  computed.sort((a, b) => b.points - a.points);

  return computed.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}

export function scoringModeLabel(mode: ScoringMode): string {
  return mode === "top4" ? "Top 4" : "Full team";
}

export function scoringModeLabelJa(mode: ScoringMode): string {
  return mode === "top4" ? "四名" : "全員";
}

export function compareModeLabel(current: ScoringMode): string {
  return current === "top4" ? "full team" : "top 4";
}

/** Positive delta = ranks higher (better) in `current` vs `compare` */
export function rankDelta(
  compareStandings: ComputedManufacturer[],
  currentStandings: ComputedManufacturer[],
  manufacturer: string,
): number {
  const compareRank = compareStandings.find(
    (team) => team.manufacturer === manufacturer,
  )?.rank;
  const currentRank = currentStandings.find(
    (team) => team.manufacturer === manufacturer,
  )?.rank;
  if (compareRank === undefined || currentRank === undefined) return 0;
  return compareRank - currentRank;
}

export function formatPoints(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
