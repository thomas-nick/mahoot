export type TourLevel = "major" | "elite" | "a_tier";

export interface LevelStats {
  starts: number;
  wins: number;
  podiums: number;
  top10: number;
  points: number;
}

export interface PlayerTourResult {
  event_key: string;
  event: string;
  month: string;
  place: number;
  level: TourLevel;
  weighted_points: number;
}

export interface PlayerTourEntry {
  slug: string;
  name: string;
  dgpt_rank: number;
  tour_rank: number;
  manufacturer: string;
  dgpt_points: number;
  dgpt_points_gain: number;
  tour_weighted_points: number;
  wins: number;
  podiums: number;
  top10: number;
  tour_starts: number;
  by_level: Record<TourLevel, LevelStats>;
  recent_results: PlayerTourResult[];
}

export interface TourEvent {
  id: string;
  name: string;
  tier: string;
  tour: string;
  month: string;
  level: TourLevel;
  multiplier: number;
  entries: number;
  winner: {
    slug: string;
    name: string;
    manufacturer: string;
    place: number;
    weighted_points: number;
  } | null;
  top_finishes: Array<{
    slug: string;
    name: string;
    manufacturer: string;
    place: number;
    weighted_points: number;
  }>;
}

export interface PlayerTourDivision {
  division: string;
  week: string | null;
  year: string;
  player_count: number;
  tour_player_count: number;
  event_count: number;
  events_by_level: Record<string, number>;
  players: PlayerTourEntry[];
  events: TourEvent[];
  insights: {
    leader: PlayerTourEntry | null;
    most_wins: PlayerTourEntry | null;
    recent_events: TourEvent[];
  };
}

export interface PlayerTourScoring {
  levels: TourLevel[];
  tier_multipliers: Record<string, number>;
  finish_base: Record<string, number>;
  formula: string;
  notes: string;
  benchmarks?: {
    elite_win: number;
    elite_t10: number;
    a_tier_win: number;
    major_win: number;
  };
}

export interface PlayerTourData {
  title: string;
  description: string;
  scoring: PlayerTourScoring;
  updated_at: string;
  divisions: Record<string, PlayerTourDivision>;
}
