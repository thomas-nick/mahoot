import type { CoverageCatalog, CoverageEvent } from "./coverageTypes";

export async function loadCoverageCatalog(): Promise<CoverageCatalog | null> {
  try {
    const data = (await import("../../../public/data/coverage_catalog.json")).default;
    return data as unknown as CoverageCatalog;
  } catch {
    return null;
  }
}

export function getCoverageEvent(catalog: CoverageCatalog, eventId: string): CoverageEvent | null {
  return catalog.events.find((e) => e.id === eventId) ?? null;
}

export function formatRoundLabel(row: {
  division: string;
  round: number | null;
  is_final: boolean;
  half: string | null;
}): string {
  const parts = [row.division];
  if (row.is_final) {
    parts.push("Final");
  } else if (row.round != null) {
    parts.push(`R${row.round}`);
  }
  if (row.half) {
    parts.push(row.half);
  }
  return parts.join(" · ");
}

/** Lead / chase / feature when parsed from title; null = role not in metadata (hide badge). */
export function formatCardTypeLabel(cardType: string): string | null {
  switch (cardType) {
    case "lead":
      return "Lead card";
    case "chase":
      return "Chase card";
    case "feature":
      return "Feature card";
    default:
      return null;
  }
}

export function sortRoundRowsNewestFirst<T extends { upload_window: { earliest: string | null }; is_final: boolean; round: number | null; half: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const da = a.upload_window.earliest ?? "";
    const db = b.upload_window.earliest ?? "";
    if (da !== db) return db.localeCompare(da);
    const ra = a.is_final ? 999 : (a.round ?? 0);
    const rb = b.is_final ? 999 : (b.round ?? 0);
    if (ra !== rb) return rb - ra;
    return (b.half ?? "").localeCompare(a.half ?? "");
  });
}
