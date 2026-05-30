export type CoverageSource = "jomezpro" | "gkpro" | "gatekeeper";

export type CoverageTourTagId =
  | "major"
  | "dgpt_elite"
  | "nt"
  | "jomez_tour"
  | "go_throw_tour";

export interface CoverageTourTag {
  id: CoverageTourTagId;
  label: string;
  count: number;
}

export interface CoverageVideoCell {
  id: string;
  source: CoverageSource;
  source_label: string;
  title: string | null;
  url: string;
  upload_date: string | null;
  card_type: string;
  players: string[];
}

export interface CoverageRoundRow {
  row_key: string;
  division: string;
  round: number | null;
  is_final: boolean;
  half: string | null;
  upload_window: {
    earliest: string | null;
    latest: string | null;
  };
  sources: Record<string, number>;
  cells: Partial<Record<CoverageSource, CoverageVideoCell[]>>;
}

export interface CoverageEvent {
  id: string;
  title: string | null;
  year: string | null;
  course: string | null;
  video_count: number;
  source_count: number;
  sources: CoverageSource[];
  source_labels: string[];
  multi_source: boolean;
  tour_tag?: CoverageTourTagId | null;
  tour_tag_label?: string | null;
  upload_window: {
    earliest: string | null;
    latest: string | null;
  };
  round_rows: CoverageRoundRow[];
}

export interface CoverageCatalog {
  title: string;
  description: string;
  updated_at: string;
  video_count: number;
  event_count: number;
  multi_source_event_count: number;
  sources: CoverageSource[];
  source_labels: Record<CoverageSource, string>;
  tour_tags?: CoverageTourTag[];
  tour_tag_labels?: Record<CoverageTourTagId, string>;
  events: CoverageEvent[];
  featured_events: string[];
}
