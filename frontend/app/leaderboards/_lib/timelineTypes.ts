export interface TimelinePoint {
  week: string;
  value: number | null;
  rank?: number | null;
}

export interface TimelineSeries {
  id: string;
  label: string;
  color: string;
  points: TimelinePoint[];
}

export interface TimelineBlock {
  series: TimelineSeries[];
}

export interface TimelineDivision {
  weeks: string[];
  manufacturers_cup: TimelineBlock;
  player_tour: TimelineBlock;
}

export interface TimelineData {
  updated_at: string;
  divisions: Record<string, TimelineDivision>;
}
