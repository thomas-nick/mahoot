export interface PlayerStanding {
  rank: number;
  rank_gain?: number;
  slug: string;
  name: string;
  points: number;
  points_gain: number;
  starts: number;
  wins: number;
  top10s: number;
  cashed: number;
  manufacturer: string | null;
}

export interface TeamStats {
  elite_count: number;
  top50_count: number;
  top100_count: number;
  avg_points: number;
  avg_points_gain: number;
  avg_starts: number;
  total_cashed: number;
  cash_rate: number;
  win_rate: number;
  top10_rate: number;
  momentum: number;
}

export interface BestMover {
  name: string;
  slug: string;
  rank_gain: number;
}

export interface RosterMeta {
  top4_share: number;
  star_gap: number;
  best_mover: BestMover | null;
  market_share: number;
  power_index: number;
}

export interface DivisionMeta {
  affiliated_points_pool: number;
  unmapped_points: number;
  coverage_pct: number;
  brand_count: number;
  avg_roster_size: number;
  total_wins: number;
  total_starts: number;
}

export interface InsightLeader {
  manufacturer: string;
  value: number;
}

export interface RankMover {
  manufacturer: string;
  from: number;
  to: number;
  delta: number;
}

export interface PointsMover {
  manufacturer: string;
  points_delta: number;
}

export interface DivisionInsights {
  top4_leader: { manufacturer: string; points: number; rank: number; points_gain?: number } | null;
  top4_gap: number;
  deepest_roster: InsightLeader | null;
  most_elite: InsightLeader | null;
  hottest_momentum: InsightLeader | null;
  best_efficiency: InsightLeader | null;
  most_top50: InsightLeader | null;
  biggest_movers?: RankMover[];
  points_movers?: PointsMover[];
}

export interface Manufacturer {
  manufacturer: string;
  short: string;
  color: string;
  points: number;
  points_gain: number;
  player_count: number;
  wins: number;
  top10s: number;
  starts: number;
  best_player: string | null;
  best_player_points: number;
  players: PlayerStanding[];
  stats?: TeamStats;
  roster_meta?: RosterMeta;
}

export interface DivisionReport {
  division: string;
  week: string;
  updated_at: string;
  source: string;
  player_count: number;
  mapped_players: number;
  unmapped_players: number;
  meta?: DivisionMeta;
  manufacturers: Manufacturer[];
  insights?: DivisionInsights;
}

export interface ManufacturersCupData {
  title: string;
  description: string;
  updated_at: string;
  divisions: Record<string, DivisionReport>;
}

/** Top 4 elite scorers vs every affiliated player on the roster */
export type ScoringMode = "top4" | "full";

export interface ComputedManufacturer extends Manufacturer {
  rank: number;
  scoringPlayers: PlayerStanding[];
  scoring_count: number;
  roster_count: number;
  scoring_cap: number;
  scoring_mode: ScoringMode;
}

export type Division = "MPO" | "FPO";
