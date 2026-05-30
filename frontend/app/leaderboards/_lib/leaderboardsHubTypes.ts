export type HubBoardGroup = "tour" | "watch" | "regional";

export type HubAccent = "amber" | "blue" | "teal" | "purple" | "rose" | "emerald";

export interface HubStatTile {
  value: string;
  label: string;
}

export interface HubAnchorItem {
  key: string;
  label: string;
  name: string;
  sub: string;
  href: string;
  medal: string;
}

export interface HubHighlight {
  key: string;
  label: string;
  value: string;
  sub: string;
  accent: HubAccent;
  href?: string;
}

export interface HubBoardPreview {
  href: string;
  eyebrow: string;
  title: string;
  stat: string;
  cta: string;
  accent: string;
  group: HubBoardGroup;
}

export interface LeaderboardsHubSnapshot {
  heroStats: HubStatTile[];
  anchors: HubAnchorItem[];
  highlights: HubHighlight[];
  boards: HubBoardPreview[];
  latestUpdated: string | null;
}
