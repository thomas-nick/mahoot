import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Disc } from "@/lib/strapi";

type NeighborRow = {
  sourceId: number | null;
  sourceDocumentId: string;
  neighborId: number | null;
  neighborDocumentId: string;
  neighborRank: number;
  similarityScore: number;
  sharedDimensions: number;
};

let cachedRows: NeighborRow[] | null = null;
let cachedBySource: Map<string, NeighborRow[]> | null = null;
let cachedBySourceId: Map<number, NeighborRow[]> | null = null;

const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
};

const loadRows = async (): Promise<NeighborRow[]> => {
  if (cachedRows) {
    return cachedRows;
  }

  const csvCandidates = [
    path.resolve(process.cwd(), "disc_dimension_neighbors_preview.csv"),
    path.resolve(process.cwd(), "..", "disc_dimension_neighbors_preview.csv"),
  ];
  let raw: string | null = null;
  for (const csvPath of csvCandidates) {
    try {
      raw = await readFile(csvPath, "utf8");
      break;
    } catch {
      // Try next likely location.
    }
  }
  if (!raw) {
    cachedRows = [];
    return cachedRows;
  }
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    cachedRows = [];
    return cachedRows;
  }

  const header = parseCsvLine(lines[0]);
  const index = (key: string) => header.indexOf(key);
  const iSourceId = index("source_id");
  const iSourceDoc = index("source_document_id");
  const iNeighborId = index("neighbor_id");
  const iNeighborDoc = index("neighbor_document_id");
  const iRank = index("neighbor_rank");
  const iScore = index("similarity_score");
  const iShared = index("shared_dimensions");

  if ([iRank, iScore, iShared].some((n) => n < 0)) {
    cachedRows = [];
    return cachedRows;
  }

  const rows: NeighborRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const sourceIdRaw = Number(cols[iSourceId] ?? "");
    const sourceId = Number.isFinite(sourceIdRaw) ? sourceIdRaw : null;
    const sourceDocumentId = (cols[iSourceDoc] ?? "").trim();
    const neighborIdRaw = Number(cols[iNeighborId] ?? "");
    const neighborId = Number.isFinite(neighborIdRaw) ? neighborIdRaw : null;
    const neighborDocumentId = (cols[iNeighborDoc] ?? "").trim();
    const neighborRank = Number(cols[iRank] ?? "0");
    const similarityScore = Number(cols[iScore] ?? "0");
    const sharedDimensions = Number(cols[iShared] ?? "0");

    if (!sourceDocumentId && !sourceId) {
      continue;
    }
    if (!neighborDocumentId && !neighborId) {
      continue;
    }
    if (!Number.isFinite(neighborRank) || !Number.isFinite(similarityScore)) {
      continue;
    }

    rows.push({
      sourceId,
      sourceDocumentId,
      neighborId,
      neighborDocumentId,
      neighborRank,
      similarityScore,
      sharedDimensions: Number.isFinite(sharedDimensions) ? sharedDimensions : 0,
    });
  }

  cachedRows = rows;
  return rows;
};

const loadBySource = async () => {
  if (cachedBySource) {
    return cachedBySource;
  }

  const rows = await loadRows();
  const map = new Map<string, NeighborRow[]>();
  for (const row of rows) {
    const list = map.get(row.sourceDocumentId) ?? [];
    list.push(row);
    map.set(row.sourceDocumentId, list);
  }
  for (const [key, list] of map.entries()) {
    list.sort((a, b) => a.neighborRank - b.neighborRank || a.similarityScore - b.similarityScore);
    map.set(key, list);
  }

  cachedBySource = map;

  const idMap = new Map<number, NeighborRow[]>();
  for (const row of rows) {
    if (!row.sourceId) {
      continue;
    }
    const list = idMap.get(row.sourceId) ?? [];
    list.push(row);
    idMap.set(row.sourceId, list);
  }
  for (const [key, list] of idMap.entries()) {
    list.sort((a, b) => a.neighborRank - b.neighborRank || a.similarityScore - b.similarityScore);
    idMap.set(key, list);
  }
  cachedBySourceId = idMap;

  return map;
};

export const getDiscDimensionNeighborsForDisc = async (disc: Disc, limit = 5) => {
  try {
    const bySource = await loadBySource();
    const bySourceId = cachedBySourceId ?? new Map<number, NeighborRow[]>();
    const externalIdAsNumber = Number(disc.externalId ?? "");

    const byDocRows = disc.documentId ? bySource.get(disc.documentId) ?? [] : [];
    const byIdRows = bySourceId.get(disc.id) ?? [];
    const byExternalIdRows = Number.isFinite(externalIdAsNumber)
      ? (bySourceId.get(externalIdAsNumber) ?? [])
      : [];
    const merged = [...byDocRows, ...byExternalIdRows, ...byIdRows];
    if (merged.length === 0) {
      return [] as NeighborRow[];
    }

    const deduped = new Map<string, NeighborRow>();
    for (const row of merged) {
      const key = row.neighborDocumentId || `id:${row.neighborId ?? "unknown"}:rank:${row.neighborRank}`;
      if (!deduped.has(key)) {
        deduped.set(key, row);
      }
    }

    return Array.from(deduped.values())
      .sort((a, b) => a.neighborRank - b.neighborRank || a.similarityScore - b.similarityScore)
      .slice(0, limit);
  } catch {
    return [] as NeighborRow[];
  }
};

export const getTopDiscDimensionNeighborMap = async (
  discs: Pick<Disc, "id" | "documentId" | "externalId">[]
) => {
  try {
    const bySource = await loadBySource();
    const bySourceId = cachedBySourceId ?? new Map<number, NeighborRow[]>();
    const map = new Map<string, NeighborRow>();
    for (const disc of discs) {
      const documentId = disc.documentId.trim();
      const byDoc = documentId ? (bySource.get(documentId) ?? [])[0] : null;
      const externalIdAsNumber = Number(disc.externalId ?? "");
      const byExternalId = Number.isFinite(externalIdAsNumber)
        ? (bySourceId.get(externalIdAsNumber) ?? [])[0]
        : null;
      const byId = (bySourceId.get(disc.id) ?? [])[0];
      const top = byDoc ?? byExternalId ?? byId;
      if (top) {
        map.set(disc.documentId, top);
      }
    }
    return map;
  } catch {
    return new Map<string, NeighborRow>();
  }
};
