import { notFound } from "next/navigation";
import { CoveragePlayerProfile } from "../../../_components/CoveragePlayerProfile";
import { SiteNav } from "../../../_components/SiteNav";
import { UpdateFooter } from "../../../_components/UpdateFooter";
import { loadCoveragePlayer } from "../../../_lib/coveragePlayerData";

type PageProps = {
  params: Promise<{ pdga: string }>;
};

export const dynamic = "force-static";

export async function generateStaticParams() {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "public", "data", "coverage_players");
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".json") && f !== "index.json")
      .map((f) => ({ pdga: f.replace(/\.json$/, "") }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { pdga } = await params;
  const player = await loadCoveragePlayer(pdga);
  if (!player) {
    return { title: "Player not found" };
  }
  return {
    title: `${player.name} · Coverage Tour`,
    description: `${player.wins} wins, ${player.podiums} podiums across ${player.events_played} Elite & Major events.`,
  };
}

export default async function CoveragePlayerPage({ params }: PageProps) {
  const { pdga } = await params;
  const player = await loadCoveragePlayer(pdga);
  if (!player) {
    notFound();
  }

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />
      <CoveragePlayerProfile player={player} />
      <UpdateFooter />
    </div>
  );
}
