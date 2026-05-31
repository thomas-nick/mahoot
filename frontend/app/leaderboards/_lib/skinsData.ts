import type { SkinsEpisode, SkinsPlayer } from "./skinsTypes";

export function filterEpisodes(
  episodes: SkinsEpisode[],
  opts: {
    series?: string;
    year?: string;
    scoredOnly?: boolean;
    query?: string;
  },
): SkinsEpisode[] {
  let list = [...episodes];
  const q = opts.query?.trim().toLowerCase();

  if (opts.series && opts.series !== "all") {
    list = list.filter((e) => e.series === opts.series);
  }
  if (opts.year && opts.year !== "all") {
    list = list.filter((e) => e.year === opts.year);
  }
  if (opts.scoredOnly) {
    list = list.filter((e) => e.has_scores);
  }
  if (q) {
    list = list.filter((e) => {
      const hay = [
        e.series,
        String(e.episode),
        e.course,
        e.location,
        ...e.players,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list.sort((a, b) => {
    const da = a.upload_date ?? "";
    const db = b.upload_date ?? "";
    if (da !== db) return db.localeCompare(da);
    return b.episode - a.episode;
  });
}

export function filterPlayers(players: SkinsPlayer[], query?: string): SkinsPlayer[] {
  const q = query?.trim().toLowerCase();
  let list = [...players].sort(
    (a, b) => b.earnings_usd - a.earnings_usd || b.episodes_played - a.episodes_played,
  );
  if (q) {
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  return list;
}

export function episodeLabel(ep: SkinsEpisode): string {
  return `${ep.series} #${ep.episode}`;
}
