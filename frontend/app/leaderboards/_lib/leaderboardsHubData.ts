import { promises as fs } from "fs";
import path from "path";
import { computeStandings } from "./scoring";
import type {
  HubAnchorItem,
  HubBoardPreview,
  HubHighlight,
  HubStatTile,
  LeaderboardsHubSnapshot,
} from "./leaderboardsHubTypes";
import type { ManufacturersCupData } from "./types";
import type { PlayerTourData } from "./playerTourTypes";
import type { AsiaData } from "./asiaTypes";
import type { CoverageCatalog } from "./coverageTypes";
import type { CoverageEventResults, CoverageResultsIndex } from "./coverageResultsTypes";
import type { CoverageMediaStatsIndex, CoveragePlayersIndex } from "./coveragePlayerTypes";
import type { WorldsCoverageCatalog } from "./worldsCoverageTypes";

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

function lastName(name: string): string {
  return name.replace(/\s+#\d+$/, "").trim();
}

const PDGA_MONTH: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** PDGA date line e.g. "07-May to 10-May-2026" → sortable "2026-05-10" */
function parsePdgaEventEnd(dates: string | null | undefined): string {
  if (!dates) return "";
  const end = dates.includes(" to ") ? dates.split(" to ").pop()!.trim() : dates.trim();
  const m = end.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return "";
  const [, day, mon, year] = m;
  const mm = PDGA_MONTH[mon.toLowerCase()];
  if (!mm) return "";
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

type Detailed2026 = {
  eventId: string;
  detail: CoverageEventResults;
  sortDate: string;
};

/** Load + sort the 2026 matched events once; reused for featured pick and strongest field. */
async function load2026Events(resultsIndex: CoverageResultsIndex | null): Promise<Detailed2026[]> {
  if (!resultsIndex?.events) return [];
  const ids = Object.entries(resultsIndex.events)
    .filter(([, e]) => e.matched && e.winner_mpo && e.year === "2026")
    .map(([eventId]) => eventId);

  const loaded = await Promise.all(
    ids.map(async (eventId) => {
      const detail = await readJson<CoverageEventResults>(
        path.join(DATA, "coverage_results", `${eventId}.json`),
      );
      if (!detail) return null;
      return {
        eventId,
        detail,
        sortDate: parsePdgaEventEnd(detail.dates) || `${detail.year ?? "2026"}-01-01`,
      } satisfies Detailed2026;
    }),
  );

  return loaded
    .filter((x): x is Detailed2026 => x !== null)
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

export async function loadLeaderboardsHubSnapshot(): Promise<LeaderboardsHubSnapshot> {
  const [manuCup, playerTour, asia, catalog, resultsIndex, playersIndex, mediaIndex, worldsCatalog] = await Promise.all([
    readJson<ManufacturersCupData>(path.join(DATA, "leaderboards", "manufacturers_cup.json")),
    readJson<PlayerTourData>(path.join(DATA, "leaderboards", "player_tour_stats.json")),
    readJson<AsiaData>(path.join(DATA, "leaderboards", "asia_players.json")),
    readJson<CoverageCatalog>(path.join(DATA, "coverage_catalog.json")),
    readJson<CoverageResultsIndex>(path.join(DATA, "coverage_results", "index.json")),
    readJson<CoveragePlayersIndex>(path.join(DATA, "coverage_players", "index.json")),
    readJson<CoverageMediaStatsIndex>(path.join(DATA, "coverage_media_stats", "index.json")),
    readJson<WorldsCoverageCatalog>(path.join(DATA, "worlds_coverage.json")),
  ]);

  const events2026 = await load2026Events(resultsIndex);
  const updatedTimes: string[] = [];

  const manuMpo = manuCup?.divisions.MPO ?? null;
  const manuLeader = manuMpo
    ? computeStandings(manuMpo.manufacturers, "top4").find((t) => t.manufacturer !== "Unknown") ?? null
    : null;
  const tourLeader = playerTour?.divisions.MPO?.insights?.leader ?? null;
  const topMpoAsia = asia
    ? [...asia.players].filter((p) => p.division === "MPO").sort((a, b) => b.pdga_points - a.pdga_points)[0] ?? null
    : null;

  if (manuCup) updatedTimes.push(manuCup.updated_at);
  if (playerTour) updatedTimes.push(playerTour.updated_at);
  if (asia) updatedTimes.push(asia.updated_at);
  if (catalog) updatedTimes.push(catalog.updated_at);
  if (resultsIndex?.updated_at) updatedTimes.push(resultsIndex.updated_at);
  if (playersIndex) updatedTimes.push(playersIndex.updated_at);

  // ── Hero stat tiles ───────────────────────────────────────────────
  const heroStats: HubStatTile[] = [];
  if (catalog) {
    heroStats.push({ value: catalog.event_count.toLocaleString(), label: "events tracked" });
  }
  if (playersIndex) {
    heroStats.push({ value: playersIndex.player_count.toLocaleString(), label: "pros profiled" });
  }
  if (catalog) {
    heroStats.push({ value: String(catalog.sources.length), label: "producers" });
  }
  if (manuMpo?.meta?.brand_count != null) {
    heroStats.push({ value: String(manuMpo.meta.brand_count), label: "brands" });
  }

  // ── Featured 3-up anchor ──────────────────────────────────────────
  const anchors: HubAnchorItem[] = [];
  const featured = events2026[0] ?? null;
  if (featured?.detail.winner_mpo) {
    anchors.push({
      key: "latest-winner",
      label: "Most recent Elite winner",
      name: lastName(featured.detail.winner_mpo.name),
      sub: `${shortEventTitle(featured.detail.title ?? featured.eventId)} · MPO`,
      href: `/leaderboards/coverage/${featured.eventId}`,
      medal: "🏆",
    });
  }
  if (manuLeader) {
    anchors.push({
      key: "manucup-leader",
      label: "Manufacturers Cup #1",
      name: manuLeader.manufacturer,
      sub: `${Math.round(manuLeader.points).toLocaleString()} pts · ${manuLeader.player_count} pros`,
      href: "/leaderboards/manucup",
      medal: "🥇",
    });
  }
  if (tourLeader) {
    anchors.push({
      key: "tour-leader",
      label: "Player Tour #1 (weighted)",
      name: lastName(tourLeader.name),
      sub: `${Math.round(tourLeader.tour_weighted_points).toLocaleString()} weighted · DGPT #${tourLeader.dgpt_rank}`,
      href: "/leaderboards/players",
      medal: "⭐",
    });
  }

  // ── Cross-board highlights ────────────────────────────────────────
  const highlights: HubHighlight[] = [];

  if (playersIndex) {
    const mostWins = [...playersIndex.players].sort((a, b) => b.wins - a.wins || b.podiums - a.podiums)[0];
    if (mostWins?.wins) {
      highlights.push({
        key: "most-wins",
        label: "Most Elite & Major wins",
        value: `${mostWins.wins} wins`,
        sub: lastName(mostWins.name),
        accent: "amber",
        href: `/leaderboards/coverage/player/${mostWins.pdga}`,
      });
    }

    const form = [...playersIndex.players]
      .filter((p) => p.form_avg_finish != null && p.events_played >= 5)
      .sort((a, b) => (a.form_avg_finish ?? 99) - (b.form_avg_finish ?? 99))[0];
    if (form?.form_avg_finish != null) {
      highlights.push({
        key: "hot-form",
        label: "Hottest form",
        value: `${form.form_avg_finish} avg`,
        sub: `${lastName(form.name)} · last 5 events`,
        accent: "blue",
        href: `/leaderboards/coverage/player/${form.pdga}`,
      });
    }
  }

  if (mediaIndex) {
    updatedTimes.push(mediaIndex.updated_at);
    const filmed = [...mediaIndex.players].sort((a, b) => b.rounds - a.rounds)[0];
    if (filmed?.rounds) {
      highlights.push({
        key: "most-filmed",
        label: "Most filmed pro",
        value: `${filmed.rounds} videos`,
        sub: `${lastName(filmed.name)} · ${filmed.lead_cards} lead cards`,
        accent: "purple",
        href: filmed.pdga ? `/leaderboards/coverage/player/${filmed.pdga}` : "/leaderboards/coverage/players",
      });
    }
  }

  const strongest = [...events2026]
    .filter((e) => e.detail.avg_mpo_rating != null)
    .sort((a, b) => (b.detail.avg_mpo_rating ?? 0) - (a.detail.avg_mpo_rating ?? 0))[0];
  if (strongest?.detail.avg_mpo_rating != null) {
    highlights.push({
      key: "strongest-field",
      label: "Strongest field (2026)",
      value: `${strongest.detail.avg_mpo_rating} avg`,
      sub: shortEventTitle(strongest.detail.title ?? strongest.eventId),
      accent: "teal",
      href: `/leaderboards/coverage/${strongest.eventId}`,
    });
  }

  if (manuMpo) {
    const mover = [...manuMpo.manufacturers]
      .filter((m) => m.manufacturer !== "Unknown")
      .sort((a, b) => b.points_gain - a.points_gain)[0];
    if (mover?.points_gain) {
      highlights.push({
        key: "manucup-mover",
        label: "Biggest brand mover",
        value: `+${Math.round(mover.points_gain).toLocaleString()} pts`,
        sub: `${mover.manufacturer} · this week`,
        accent: "rose",
        href: "/leaderboards/manucup",
      });
    }
  }

  if (resultsIndex) {
    highlights.push({
      key: "completeness",
      label: "Coverage linked to results",
      value: `${resultsIndex.matched_count}/${resultsIndex.target_count}`,
      sub: "events with PDGA finishes",
      accent: "emerald",
      href: "/leaderboards/coverage/players",
    });
  }

  // ── Board cards (slim) ────────────────────────────────────────────
  const boards: HubBoardPreview[] = [];

  if (manuCup) {
    boards.push({
      href: "/leaderboards/manucup",
      eyebrow: "DGPT · MPO + FPO",
      title: "Manufacturers Cup",
      stat: manuLeader ? `#1 ${manuLeader.manufacturer} · Wk ${manuMpo?.week ?? "—"}` : "Brand standings",
      cta: "Brand standings →",
      accent: "#c9a227",
      group: "tour",
    });
  }
  if (playerTour) {
    boards.push({
      href: "/leaderboards/players",
      eyebrow: "DGPT · Weighted",
      title: "Player Tour Stats",
      stat: tourLeader ? `#1 ${lastName(tourLeader.name)}` : "Tour rankings",
      cta: "Weighted ranks →",
      accent: "#2563eb",
      group: "tour",
    });
  }
  if (playersIndex) {
    const top = [...playersIndex.players].sort((a, b) => b.wins - a.wins || b.podiums - a.podiums)[0];
    boards.push({
      href: "/leaderboards/coverage/players",
      eyebrow: "Elite & Majors · PDGA",
      title: "Tour finishes & profiles",
      stat: top ? `${top.wins}W · ${lastName(top.name)}` : `${playersIndex.player_count} players`,
      cta: "Player profiles →",
      accent: "#7c3aed",
      group: "watch",
    });
  }
  if (catalog) {
    boards.push({
      href: "/leaderboards/coverage",
      eyebrow: "Jomez · GK Pro · Gatekeeper",
      title: "Tournament Coverage",
      stat: `${catalog.event_count} events · ${catalog.video_count.toLocaleString()} videos`,
      cta: "Watch events →",
      accent: "#c2410c",
      group: "watch",
    });
  }
  if (worldsCatalog) {
    updatedTimes.push(worldsCatalog.updated_at);
    boards.push({
      href: "/leaderboards/coverage/worlds",
      eyebrow: "Jomez · Gatekeeper · CCD · GK Pro",
      title: "Worlds Archive",
      stat: `${worldsCatalog.video_count} videos · ${worldsCatalog.year_range.earliest ?? "—"}–${worldsCatalog.year_range.latest ?? "—"}`,
      cta: "Browse Worlds →",
      accent: "#b45309",
      group: "watch",
    });
  }
  if (asia) {
    boards.push({
      href: "/leaderboards/asia",
      eyebrow: "PDGA · Asia & SE Asia",
      title: "Asia Leaderboard",
      stat: topMpoAsia ? `#1 ${lastName(topMpoAsia.name)}` : `${asia.total_players} pros`,
      cta: "Asia pros →",
      accent: "#db2777",
      group: "regional",
    });
  }

  const latestUpdated = updatedTimes.length ? formatUpdated(updatedTimes.sort().reverse()[0]) : null;

  return { heroStats, anchors, highlights, boards, latestUpdated };
}
