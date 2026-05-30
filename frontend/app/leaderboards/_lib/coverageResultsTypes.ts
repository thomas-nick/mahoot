export interface CoverageResultRow {
  pdga: number;
  name: string;
  division: string;
  place: number;
  pdga_points: number;
  rating: number | null;
  prize: string;
  score: string | null;
}

export interface CoverageEventResults {
  coverage_event_id: string;
  pdga_event_id: string;
  title: string | null;
  year: string | null;
  location: string | null;
  dates: string | null;
  tier: string | null;
  tour_tag: string | null;
  field_size: number;
  mpo_count: number;
  fpo_count: number;
  avg_mpo_rating: number | null;
  winner_mpo: CoverageResultRow | null;
  winner_fpo: CoverageResultRow | null;
  mpo: CoverageResultRow[];
  fpo: CoverageResultRow[];
  updated_at: string;
}

export interface CoverageResultsIndexEntry {
  matched: boolean;
  pdga_event_id?: string;
  title?: string | null;
  year?: string | null;
  field_size?: number;
  winner_mpo?: string | null;
  winner_fpo?: string | null;
}

export interface CoverageResultsIndex {
  updated_at: string;
  matched_count: number;
  target_count: number;
  events: Record<string, CoverageResultsIndexEntry>;
}
