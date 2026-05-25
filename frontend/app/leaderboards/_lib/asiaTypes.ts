export type AsiaLevel = "major" | "elite" | "asia_tour" | "a_tier" | "b_tier" | "c_tier";

export interface AsiaLevelStats {
  events: number;
  wins: number;
  points: number;
  weighted: number;
}

export interface AsiaResult {
  event_id: string;
  title: string;
  location: string;
  dates: string;
  year: string;
  tier: string;
  level: AsiaLevel;
  is_asia_tour: boolean;
  place: number;
  pdga_points: number;
}

export interface AsiaRatingPoint {
  date: string;
  rating: number;
  rounds: number;
}

export interface AsiaStreak {
  direction: "up" | "down" | "flat";
  recent_avg: number;
  season_avg: number;
  delta_pct: number;
}

export interface AsiaPlayer {
  pdga: number;
  name: string;
  country: string;
  country_key: string;
  flag: string;
  rating: number | null;
  classification: string;
  city: string;
  nationality: string;
  division: string;
  pdga_rank: number;
  weighted_rank: number;
  country_rank?: number;
  tour_weighted_points: number;
  pdga_points: number;
  events_played: number;
  wins: number;
  podiums: number;
  top10: number;
  asia_tour_events: number;
  asia_tour_points: number;
  last_active: string;
  by_level: Record<string, AsiaLevelStats>;
  results: AsiaResult[];
  rating_history?: AsiaRatingPoint[];
  streak?: AsiaStreak;
}

export interface AsiaEventDetailRow {
  pdga: number;
  name: string;
  division: string;
  place: number;
  pdga_points: number;
  rating: number | null;
  prize: string;
  flag: string;
  country: string;
  country_key: string;
}

export interface AsiaCountryBreakdown {
  flag: string;
  country: string;
  count: number;
}

export interface AsiaEventDetail {
  event_id: string;
  title: string;
  location: string;
  dates: string;
  year: string;
  tier: string;
  level: AsiaLevel;
  is_asia_tour: boolean;
  status: string;
  field_size: number;
  avg_mpo_rating: number | null;
  country_breakdown: AsiaCountryBreakdown[];
  mpo: AsiaEventDetailRow[];
  fpo: AsiaEventDetailRow[];
}

export interface AsiaCountry {
  key: string;
  name: string;
  flag: string;
}

export interface AsiaCountryStat extends AsiaCountry {
  player_count: number;
  leader: AsiaPlayer | null;
}

export interface AsiaEvent {
  event_id: string;
  title: string;
  location: string;
  dates: string;
  year: string;
  tier: string;
  level: AsiaLevel;
  is_asia_tour: boolean;
  field_size: number;
}

export interface AsiaScoring {
  levels: AsiaLevel[];
  tier_multipliers: Record<string, number>;
  primary: "pdga_points" | "tour_weighted_points";
  notes: string;
  asia_tour_official?: {
    rule: string;
    points: Record<string, number>;
  };
}

export interface AsiaTourCountingResult {
  event_id: string;
  event: string;
  tour_event: string;
  division: string;
  place: number;
  points: number;
  dates: string;
}

export interface AsiaTourStandingEntry {
  rank: number;
  pdga: number;
  name: string;
  flag: string;
  country: string;
  country_key: string;
  division: string;
  rating: number | null;
  events_played: number;
  counting: AsiaTourCountingResult[];
  all_results: AsiaTourCountingResult[];
  total_points: number;
}

export interface AsiaCountryChampion {
  country_key: string;
  country: string;
  flag: string;
  player_count: number;
  leader_pdga: number;
  leader_name: string;
  leader_division: string;
  leader_rating: number | null;
  leader_points: number;
  leader_events: number;
  leader_wins: number;
}

export interface AsiaHighlight {
  event_id: string;
  title: string;
  dates: string;
}

export interface AsiaHighlights {
  biggest_field?: AsiaHighlight & { field_size: number };
  strongest_mpo_field?: AsiaHighlight & { avg_rating: number };
  most_diverse_event?: AsiaHighlight & { country_count: number };
  most_active_player?: { pdga: number; name: string; flag: string; events: number };
  most_wins_player?: { pdga: number; name: string; flag: string; wins: number };
  podium_machine?: { pdga: number; name: string; flag: string; podiums: number };
}

export interface AsiaData {
  title: string;
  description: string;
  updated_at: string;
  years: string[];
  scoring: AsiaScoring;
  countries: AsiaCountry[];
  country_stats: Record<string, AsiaCountryStat>;
  country_champions: AsiaCountryChampion[];
  tour_standings: AsiaTourStandingEntry[];
  highlights: AsiaHighlights;
  events: AsiaEvent[];
  asia_tour_events: AsiaEvent[];
  total_events: number;
  total_players: number;
  players: AsiaPlayer[];
}
