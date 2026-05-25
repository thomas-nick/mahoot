import type { Metadata } from "next";
import { PlayerTourDashboard } from "../_components/PlayerTourDashboard";
import { loadPlayerTourData } from "../_lib/playerTourData";
import { loadTimelineData } from "../_lib/timelineData";

export const metadata: Metadata = {
  title: "Player Tour Stats",
  description:
    "Weighted finish rankings across Majors, Elite Series and A-tiers, alongside live DGPT world standings for every MPO & FPO pro.",
  openGraph: {
    title: "Player Tour Stats",
    description:
      "Weighted finish rankings across Majors, Elite Series and A-tiers. Live DGPT MPO & FPO leaderboards.",
  },
};

export default async function PlayersPage() {
  const [data, timeline] = await Promise.all([
    loadPlayerTourData(),
    loadTimelineData().catch(() => null),
  ]);
  return <PlayerTourDashboard data={data} timeline={timeline} />;
}
