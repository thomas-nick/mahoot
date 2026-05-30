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
