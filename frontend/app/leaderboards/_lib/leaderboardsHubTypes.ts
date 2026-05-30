export type HubBoardGroup = "tour" | "watch" | "regional";

export interface HubBoardPreview {
  href: string;
  eyebrow: string;
  title: string;
  blurb: string;
  cta: string;
  accent: string;
  group: HubBoardGroup;
  statPrimary: string;
  statSecondary?: string;
  updatedAt?: string | null;
}

export interface HubFeaturedEvent {
  coverageEventId: string;
  title: string;
  winnerMpo: string;
  winnerFpo: string | null;
  fieldSize: number | null;
  href: string;
  resultsHref: string;
}

export interface LeaderboardsHubSnapshot {
  featured: HubFeaturedEvent | null;
  boards: HubBoardPreview[];
  latestUpdated: string | null;
}
