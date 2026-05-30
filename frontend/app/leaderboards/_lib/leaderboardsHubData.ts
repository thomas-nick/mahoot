import { promises as fs } from "fs";
import path from "path";
import { computeStandings } from "./scoring";
import type { HubBoardPreview, HubFeaturedEvent, LeaderboardsHubSnapshot } from "./leaderboardsHubTypes";
import type { ManufacturersCupData } from "./types";
import type { PlayerTourData } from "./playerTourTypes";
import type { AsiaData } from "./asiaTypes";
import type { CoverageCatalog } from "./coverageTypes";
import type { CoverageResultsIndex } from "./coverageResultsTypes";
import type { CoveragePlayersIndex } from "./coveragePlayerTypes";

const DATA = path.join(process.cwd(), "public", "data");

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatUpdated(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

function shortEventTitle(title: string): string {
  return title
    .replace(/^20\d{2}\s+/i, "")
    .replace(/^DGPT\+?\s*[-–]?\s*/i, "")
    .replace(/^DGPT\s+(Elite\s+|Silver\s+|Playoffs[-\s]*)?/i, "")
    .replace(/\s+presented by .+$/i, "")
    .replace(/\s+powered by .+$/i, "")
    .trim();
}

function pickFeaturedEvent(
  resultsIndex: CoverageResultsIndex | null,
  catalog: CoverageCatalog | null,
): HubFeaturedEvent | null {
  if (!resultsIndex?.events) return null;

  const catalogIds = new Set(catalog?.events.map((e) => e.id) ?? []);
  const matched = Object.entries(resultsIndex.events)
    .filter(([, e]) => e.matched && e.winner_mpo && e.year === "2026")
    .sort(([a], [b]) => b.localeCompare(a));

  const [eventId, entry] = matched[0] ?? [];
  if (!eventId || !entry?.winner_mpo) return null;

  const title = shortEventTitle(entry.title ?? eventId.replace(/_/g, " "));
  return {
    coverageEventId: eventId,
    title,
    winnerMpo: entry.winner_mpo,
    winnerFpo: entry.winner_fpo ?? null,
    fieldSize: entry.field_size ?? null,
    href: `/leaderboards/coverage/${eventId}`,
    resultsHref: catalogIds.has(eventId) ? `/leaderboards/coverage/${eventId}` : `/leaderboards/coverage/players`,
  };
}

export async function loadLeaderboardsHubSnapshot(): Promise<LeaderboardsHubSnapshot> {
  const [manuCup, playerTour, asia, catalog, resultsIndex, playersIndex] = await Promise.all([
    readJson<ManufacturersCupData>(path.join(DATA, "leaderboards", "manufacturers_cup.json")),
    readJson<PlayerTourData>(path.join(DATA, "leaderboards", "player_tour_stats.json")),
    readJson<AsiaData>(path.join(DATA, "leaderboards", "asia_players.json")),
    readJson<CoverageCatalog>(path.join(DATA, "coverage_catalog.json")),
    readJson<CoverageResultsIndex>(path.join(DATA, "coverage_results", "index.json")),
    readJson<CoveragePlayersIndex>(path.join(DATA, "coverage_players", "index.json")),
  ]);

  const boards: HubBoardPreview[] = [];
  const updatedTimes: string[] = [];

  if (manuCup) {
    updatedTimes.push(manuCup.updated_at);
    const mpo = manuCup.divisions.MPO;
    const leader = mpo
      ? computeStandings(mpo.manufacturers, "top4").find((t) => t.manufacturer !== "Unknown")
      : null;
    boards.push({
      href: "/leaderboards/manucup",
      eyebrow: "DGPT · MPO + FPO",
      title: "Manufacturers Cup",
      blurb:
        "F1-style constructors championship — every world-standing point a pro earns counts for their disc brand.",
      cta: "Brand standings →",
      accent: "#c9a227",
      group: "tour",
      statPrimary: leader ? `#1 ${leader.manufacturer}` : "Brand standings",
      statSecondary: leader
        ? `${Math.round(leader.points).toLocaleString()} pts · Wk ${mpo?.week ?? "—"}`
        : undefined,
      updatedAt: formatUpdated(mpo?.updated_at ?? manuCup.updated_at),
    });
  }

  if (playerTour) {
    updatedTimes.push(playerTour.updated_at);
    const mpo = playerTour.divisions.MPO;
    const leader = mpo?.insights?.leader;
    boards.push({
      href: "/leaderboards/players",
      eyebrow: "DGPT · Weighted",
      title: "Player Tour Stats",
      blurb: "Mahoot weighted finish score across Majors, Elite Series and A-tiers — alongside live DGPT rank.",
      cta: "Weighted ranks →",
      accent: "#2563eb",
      group: "tour",
      statPrimary: leader ? `#1 ${leader.name}` : "Tour rankings",
      statSecondary: leader
        ? `${Math.round(leader.tour_weighted_points).toLocaleString()} weighted · DGPT #${leader.dgpt_rank}`
        : undefined,
      updatedAt: formatUpdated(playerTour.updated_at),
    });
  }

  if (playersIndex) {
    updatedTimes.push(playersIndex.updated_at);
    const top = [...playersIndex.players].sort((a, b) => b.wins - a.wins || b.podiums - a.podiums)[0];
    const formLeader = [...playersIndex.players]
      .filter((p) => p.form_avg_finish != null)
      .sort((a, b) => (a.form_avg_finish ?? 99) - (b.form_avg_finish ?? 99))[0];
    boards.push({
      href: "/leaderboards/coverage/players",
      eyebrow: "Elite & Majors · PDGA",
      title: "Tour finishes & profiles",
      blurb:
        "PDGA finishes linked to round coverage — event history, streaks, form, most filmed, and head-to-head.",
      cta: "Player profiles →",
      accent: "#7c3aed",
      group: "watch",
      statPrimary: top ? `${top.wins}W · ${top.name.split(" ").pop()}` : `${playersIndex.player_count} players`,
      statSecondary: formLeader
        ? `Form ${formLeader.form_avg_finish} · ${formLeader.name.split(" ").pop()}`
        : `${playersIndex.event_count} events w/ results`,
      updatedAt: formatUpdated(playersIndex.updated_at),
    });
  }

  if (catalog) {
    updatedTimes.push(catalog.updated_at);
    const latest = catalog.events
      .filter((e) => e.multi_source && e.upload_window.latest)
      .sort((a, b) => (b.upload_window.latest ?? "").localeCompare(a.upload_window.latest ?? ""))[0];
    boards.push({
      href: "/leaderboards/coverage",
      eyebrow: "Jomez · GK Pro · Gatekeeper",
      title: "Tournament Coverage",
      blurb: "Same event, different cards — round videos aligned across producers by upload date and division.",
      cta: "Watch events →",
      accent: "#c2410c",
      group: "watch",
      statPrimary: `${catalog.event_count} events · ${catalog.video_count.toLocaleString()} videos`,
      statSecondary: latest
        ? `Latest: ${shortEventTitle(latest.title ?? latest.id)}`
        : `${catalog.multi_source_event_count} multi-producer`,
      updatedAt: formatUpdated(catalog.updated_at),
    });
  }

  if (asia) {
    updatedTimes.push(asia.updated_at);
    const topMpo = [...asia.players]
      .filter((p) => p.division === "MPO")
      .sort((a, b) => b.pdga_points - a.pdga_points)[0];
    boards.push({
      href: "/leaderboards/asia",
      eyebrow: "PDGA · Asia & SE Asia",
      title: "Asia Leaderboard",
      blurb:
        "MPO + FPO pros across Japan, Thailand, Korea, Taiwan, the Philippines and beyond — with Asia Tour standings.",
      cta: "Asia pros →",
      accent: "#db2777",
      group: "regional",
      statPrimary: topMpo ? `#1 ${topMpo.name}` : `${asia.total_players} pros`,
      statSecondary: topMpo
        ? `${Math.round(topMpo.pdga_points).toLocaleString()} PDGA pts`
        : `${asia.total_events} events`,
      updatedAt: formatUpdated(asia.updated_at),
    });
  }

  if (resultsIndex?.updated_at) {
    updatedTimes.push(resultsIndex.updated_at);
  }

  const latestUpdated = updatedTimes.length
    ? formatUpdated(updatedTimes.sort().reverse()[0])
    : null;

  return {
    featured: pickFeaturedEvent(resultsIndex, catalog),
    boards,
    latestUpdated,
  };
}
