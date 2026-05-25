import type { Metadata } from "next";
import { AsiaDashboard } from "../_components/AsiaDashboard";
import { loadAsiaData } from "../_lib/asiaData";

export const metadata: Metadata = {
  title: "Asia & SE Asia Leaderboard",
  description:
    "Live PDGA standings for MPO + FPO pros across Japan, Thailand, Korea, Taiwan, the Philippines and beyond. Official 2026 Asia Tour standings, country champions, and event highlights.",
  openGraph: {
    title: "Asia & SE Asia Pro Leaderboard",
    description:
      "Live PDGA standings + official 2026 Asia Tour rankings for MPO + FPO pros across Asia.",
  },
};

export default async function AsiaPage() {
  const data = await loadAsiaData();
  return <AsiaDashboard data={data} />;
}
