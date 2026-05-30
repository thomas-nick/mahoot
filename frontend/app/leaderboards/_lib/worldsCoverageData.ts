import type { WorldsEdition, WorldsType } from "./worldsCoverageTypes";

export function buildYearTags(editions: WorldsEdition[]): Array<{ year: string; count: number }> {
  const map = new Map<string, number>();
  for (const e of editions) {
    if (!e.year) continue;
    map.set(e.year, (map.get(e.year) ?? 0) + e.video_count);
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function filterEditions(
  editions: WorldsEdition[],
  opts: {
    year?: string;
    worldsType?: WorldsType | "all";
    producer?: string;
    roundsOnly?: boolean;
    query?: string;
  },
): WorldsEdition[] {
  let list = [...editions];
  const q = opts.query?.trim().toLowerCase();

  if (opts.worldsType && opts.worldsType !== "all") {
    list = list.filter((e) => e.worlds_type === opts.worldsType);
  }
  if (opts.year && opts.year !== "all") {
    list = list.filter((e) => e.year === opts.year);
  }
  if (opts.producer && opts.producer !== "all") {
    list = list.filter((e) => e.producers.includes(opts.producer as WorldsEdition["producers"][number]));
  }
  if (opts.roundsOnly) {
    list = list.filter((e) => e.round_count > 0);
  }
  if (q) {
    list = list.filter((e) => {
      const hay = [
        e.label,
        e.year,
        e.worlds_type_label,
        ...e.producer_labels,
        ...e.videos.map((v) => v.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list.sort((a, b) => {
    const ya = a.year ?? "";
    const yb = b.year ?? "";
    if (ya !== yb) return yb.localeCompare(ya);
    return b.round_count - a.round_count || b.video_count - a.video_count;
  });
}
