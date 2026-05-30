export interface CoveragePlayerMedia {
  rounds: number;
  lead_cards: number;
  chase_cards: number;
  feature_cards: number;
  tournaments: number;
  multi_source_events: number;
  by_source: Record<string, number>;
}

export interface CoveragePlayerStreaks {
  current_win_streak: number;
  current_podium_streak: number;
  current_top10_streak: number;
  winless_streak: number;
  best_win_streak: number;
  best_podium_streak: number;
  form_avg_finish: number | null;
  form_events: number;
}

export interface CoveragePlayerResult {
  coverage_event_id: string;
  title: string;
  year: string;
  tour_tag: string | null;
  tour_tag_label: string | null;
  division: string;
  place: number;
  pdga_points: number;
  rating: number | null;
  prize: string;
  score: string | null;
  has_coverage: boolean;
}

export interface CoveragePlayer extends Partial<CoveragePlayerStreaks> {
  pdga: number;
  name: string;
  name_tag: string;
  division: string;
  rating: number | null;
  events_played: number;
  wins: number;
  podiums: number;
  top10: number;
  pdga_points: number;
  last_event_year: string | null;
  first_event_year: string | null;
  finish_history?: number[];
  media?: CoveragePlayerMedia;
  results: CoveragePlayerResult[];
}

export interface CoveragePlayerSummary {
  pdga: number;
  name: string;
  name_tag: string;
  division: string;
  rating: number | null;
  events_played: number;
  wins: number;
  podiums: number;
  top10: number;
  pdga_points: number;
  last_event_year: string | null;
  current_win_streak?: number;
  current_podium_streak?: number;
  form_avg_finish?: number | null;
  finish_history?: number[];
  media_rounds?: number;
  media_lead_cards?: number;
}

export interface CoverageMediaPlayerSummary {
  name_tag: string;
  name: string;
  pdga: number | null;
  division?: string | null;
  rounds: number;
  lead_cards: number;
  chase_cards: number;
  feature_cards: number;
  tournaments: number;
  multi_source_events: number;
  by_source: Record<string, number>;
}

export interface CoverageMediaStatsIndex {
  updated_at: string;
  player_count: number;
  event_count: number;
  players: CoverageMediaPlayerSummary[];
}

export interface CoveragePlayersIndex {
  updated_at: string;
  player_count: number;
  event_count: number;
  name_index: Record<string, number>;
  players: CoveragePlayerSummary[];
}
