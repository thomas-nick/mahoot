import type { CoverageCatalog, CoverageEvent, CoverageSource } from "./coverageTypes";

export interface CoverageYearTag {
  year: string;
  count: number;
}

export interface CoverageSourceTag {
  source: CoverageSource;
  label: string;
  count: number;
}

export interface CoveragePlayerTag {
  tag: string;
  name: string;
  rounds: number;
  tournaments: number;
}

export interface CoverageHighlights {
  most_videos?: { id: string; title: string; video_count: number; sources: string[] };
  most_producers?: { id: string; title: string; source_count: number; source_labels: string[] };
  busiest_player?: { name: string; rounds: number; tournaments: number };
  latest_multi?: { id: string; title: string; upload_latest: string; source_labels: string[] };
}

function playerTag(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildYearTags(events: CoverageEvent[]): CoverageYearTag[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const year = event.year ?? "Unknown";
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function buildSourceTags(
  events: CoverageEvent[],
  sourceLabels: Record<string, string>,
): CoverageSourceTag[] {
  const counts = new Map<CoverageSource, number>();
  for (const event of events) {
    for (const source of event.sources) {
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([source, count]) => ({
      source,
      label: sourceLabels[source] ?? source,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildPlayerTags(events: CoverageEvent[], limit = 48): CoveragePlayerTag[] {
  const byTag = new Map<string, { name: string; rounds: number; tournaments: Set<string> }>();

  for (const event of events) {
    for (const row of event.round_rows) {
      for (const cells of Object.values(row.cells)) {
        if (!cells) continue;
        for (const cell of cells) {
          for (const name of cell.players) {
            const tag = playerTag(name);
            if (!tag) continue;
            const slot = byTag.get(tag) ?? { name, rounds: 0, tournaments: new Set<string>() };
            slot.name = name;
            slot.rounds += 1;
            slot.tournaments.add(event.id);
            byTag.set(tag, slot);
          }
        }
      }
    }
  }

  return [...byTag.values()]
    .map((row) => ({
      tag: playerTag(row.name),
      name: row.name,
      rounds: row.rounds,
      tournaments: row.tournaments.size,
    }))
    .sort((a, b) => b.rounds - a.rounds || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function computeHighlights(catalog: CoverageCatalog): CoverageHighlights {
  const multi = catalog.events.filter((e) => e.multi_source);
  const highlights: CoverageHighlights = {};

  const mostVideos = [...catalog.events].sort((a, b) => b.video_count - a.video_count)[0];
  if (mostVideos) {
    highlights.most_videos = {
      id: mostVideos.id,
      title: mostVideos.title ?? mostVideos.id,
      video_count: mostVideos.video_count,
      sources: mostVideos.source_labels,
    };
  }

  const mostProducers = [...multi].sort((a, b) => b.source_count - a.source_count)[0];
  if (mostProducers) {
    highlights.most_producers = {
      id: mostProducers.id,
      title: mostProducers.title ?? mostProducers.id,
      source_count: mostProducers.source_count,
      source_labels: mostProducers.source_labels,
    };
  }

  const players = buildPlayerTags(catalog.events, 1);
  if (players[0]) {
    highlights.busiest_player = {
      name: players[0].name,
      rounds: players[0].rounds,
      tournaments: players[0].tournaments,
    };
  }

  const latestMulti = [...multi]
    .filter((e) => e.upload_window.latest)
    .sort((a, b) => (b.upload_window.latest ?? "").localeCompare(a.upload_window.latest ?? ""))[0];
  if (latestMulti) {
    highlights.latest_multi = {
      id: latestMulti.id,
      title: latestMulti.title ?? latestMulti.id,
      upload_latest: latestMulti.upload_window.latest!,
      source_labels: latestMulti.source_labels,
    };
  }

  return highlights;
}

export function eventMatchesPlayer(event: CoverageEvent, playerTag: string): boolean {
  for (const row of event.round_rows) {
    for (const cells of Object.values(row.cells)) {
      if (!cells) continue;
      for (const cell of cells) {
        if (cell.players.some((p) => playerTagFromName(p) === playerTag)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function playerTagFromName(name: string): string {
  return playerTag(name);
}

export function displayPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}
