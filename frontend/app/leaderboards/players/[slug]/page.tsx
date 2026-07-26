import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "../../_components/SiteNav";
import { TourPlayerProfile } from "../../_components/TourPlayerProfile";
import { UpdateFooter } from "../../_components/UpdateFooter";
import {
  listTopTourPlayers,
  loadTourPlayerBySlug,
} from "../../_lib/tourPlayerData";
import "../../asia-flight.css";
import "../../tour-flight.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-static";

export async function generateStaticParams() {
  const players = await listTopTourPlayers();
  return players.map(({ player }) => ({ slug: player.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await loadTourPlayerBySlug(slug);
  if (!bundle) return { title: "Player not found" };
  const { player, division } = bundle;
  return {
    title: `${player.name} · DGPT Player Profile`,
    description: `${division} · DGPT #${player.dgpt_rank} · ${player.wins} wins · ${player.tour_weighted_points} weighted tour pts · ${player.manufacturer}`,
  };
}

export default async function TourPlayerPage({ params }: PageProps) {
  const { slug } = await params;
  const bundle = await loadTourPlayerBySlug(slug);
  if (!bundle) notFound();

  return (
    <div className="page-content theme-clean asia-flight tour-flight mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />
      <TourPlayerProfile bundle={bundle} />
      <UpdateFooter />
    </div>
  );
}
