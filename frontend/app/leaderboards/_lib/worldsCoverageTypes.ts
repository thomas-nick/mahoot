export type WorldsProducer = "jomezpro" | "gkpro" | "gatekeeper" | "ccdg";

export type WorldsType =
  | "pro_worlds"
  | "masters_worlds"
  | "am_worlds"
  | "junior_worlds"
  | "mixed_doubles_worlds"
  | "putting_worlds"
  | "club_worlds"
  | "other_worlds";

export type WorldsContentType = "round" | "highlights" | "preview" | "feature" | "other";

export interface WorldsVideo {
  id: string;
  source: WorldsProducer;
  source_label: string;
  title: string;
  url: string;
  upload_date: string | null;
  duration: string | null;
  category: string | null;
  year: string | null;
  worlds_type: WorldsType;
  worlds_type_label: string;
  content_type: WorldsContentType;
  content_type_label: string;
  division: string | null;
  round: number | null;
  half: string | null;
  card_type: string | null;
  is_round: boolean;
  players: string[];
  event_name: string | null;
  edition_id: string;
  edition_label: string;
}

export interface WorldsEdition {
  id: string;
  year: string | null;
  worlds_type: WorldsType;
  worlds_type_label: string;
  label: string;
  producers: WorldsProducer[];
  producer_labels: string[];
  video_count: number;
  round_count: number;
  by_producer: Record<string, number>;
  by_content_type: Record<string, number>;
  videos: WorldsVideo[];
}

export interface WorldsCoverageCatalog {
  title: string;
  description: string;
  updated_at: string;
  sources_loaded: WorldsProducer[];
  source_labels: Record<WorldsProducer, string>;
  worlds_type_labels: Record<WorldsType, string>;
  content_type_labels: Record<WorldsContentType, string>;
  video_count: number;
  edition_count: number;
  year_range: { earliest: string | null; latest: string | null };
  by_producer: Record<string, number>;
  by_worlds_type: Record<string, number>;
  by_content_type: Record<string, number>;
  editions: WorldsEdition[];
}
