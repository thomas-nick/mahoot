export interface SkinsHole {
  hole: number;
  half: string;
  carry_usd: number | null;
  result: string | null;
  winner: string | null;
  amount_usd: number | null;
}

export interface SkinsEpisode {
  episode: number;
  series: string;
  course: string | null;
  location: string | null;
  players: string[];
  ace_pot_usd: number | null;
  per_hole_usd: number | null;
  f9_url: string | null;
  b9_url: string | null;
  f9_video_id: string | null;
  b9_video_id: string | null;
  upload_date: string | null;
  year: string | null;
  holes?: SkinsHole[];
  total_payout_usd: number;
  wins_resolved: number;
  has_scores: boolean;
}

export interface SkinsWinDetail {
  episode: number;
  series: string;
  hole: number;
  half: string;
  amount_usd: number;
  course: string | null;
}

export interface SkinsPlayer {
  name: string;
  earnings_usd: number;
  wins: number;
  episodes_played: number;
  biggest_win_usd: number;
  top_courses: string[];
  series_counts: Record<string, number>;
  first_seen: string | null;
  last_seen: string | null;
  win_details: SkinsWinDetail[];
}

export interface SkinsCourse {
  course: string;
  location: string | null;
  episode_count: number;
  total_payout_usd: number;
  top_players: string[];
  series: Record<string, number>;
  last_played: string | null;
  episodes: Array<{ series: string; episode: number }>;
}

export interface SkinsSeriesBreakdown {
  series: string;
  total: number;
  scored: number;
  earliest: string | null;
  latest: string | null;
}

export interface SkinsHighlights {
  biggest_payout?: {
    episode: number;
    series: string;
    player: string;
    amount_usd: number;
    hole: number;
    half: string;
    course: string | null;
  };
  highest_earner?: { name: string; earnings_usd: number };
  most_episodes?: { name: string; episodes: number };
  biggest_ace_pot?: {
    episode: number;
    series: string;
    amount_usd: number;
    course: string | null;
  };
  top_course?: {
    course: string;
    location: string | null;
    episode_count: number;
  };
}

export interface SkinsData {
  title: string;
  description: string;
  updated_at: string;
  episodes_scored: number;
  episodes_total: number;
  total_players: number;
  players_with_wins: number;
  total_payout_usd: number;
  course_count: number;
  years: string[];
  series_breakdown: SkinsSeriesBreakdown[];
  highlights: SkinsHighlights;
  players: SkinsPlayer[];
  courses: SkinsCourse[];
  episodes: SkinsEpisode[];
  notes?: string;
}
