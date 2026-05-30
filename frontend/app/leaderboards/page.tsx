import type { Metadata } from "next";
import { LeaderboardsHub } from "./_components/LeaderboardsHub";
import { loadLeaderboardsHubSnapshot } from "./_lib/leaderboardsHubData";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "Live disc golf standings: DGPT Manufacturers Cup, weighted Player Tour stats, Asia pro leaderboard, and multi-producer tournament coverage.",
};

export default async function LeaderboardsHubPage() {
  const snapshot = await loadLeaderboardsHubSnapshot();
  return <LeaderboardsHub snapshot={snapshot} />;
}
