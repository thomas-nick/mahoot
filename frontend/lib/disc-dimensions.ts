import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type DiscDimensions = {
  diameterCm: number | null;
  heightCm: number | null;
  rimDepthCm: number | null;
  rimThicknessCm: number | null;
  maxWeightGr: number | null;
};

let cachedDimensionsByExternalId: Map<string, DiscDimensions> | null = null;

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

const toNumber = (value: string | undefined) => {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const getCsvRaw = async () => {
  const candidates = [
    path.resolve(process.cwd(), "merged_disc_with_pdga_enrichment_preview.csv"),
    path.resolve(process.cwd(), "..", "merged_disc_with_pdga_enrichment_preview.csv"),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // Try next location.
    }
  }

  return null;
};

const loadMap = async () => {
  if (cachedDimensionsByExternalId) {
    return cachedDimensionsByExternalId;
  }

  const raw = await getCsvRaw();
  if (!raw) {
    cachedDimensionsByExternalId = new Map();
    return cachedDimensionsByExternalId;
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    cachedDimensionsByExternalId = new Map();
    return cachedDimensionsByExternalId;
  }

  const header = parseCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  const iExternalId = idx("id");
  const iNameSlug = idx("name_slug");
  const iBrandSlug = idx("brand_slug");
  const iPdgaDiameter = idx("pdga_diameter_cm");
  const iPdgaHeight = idx("pdga_height_cm");
  const iPdgaRimDepth = idx("pdga_rim_depth_cm");
  const iPdgaRimThickness = idx("pdga_rim_thickness_cm");
  const iPdgaMaxWeight = idx("pdga_max_weight_gr");
  const iJrDiameter = idx("jr_diameter");
  const iJrHeight = idx("jr_height");
  const iJrRimDepth = idx("jr_rimdepth");
  const iJrRimThickness = idx("Rim Thickness (cm)");
  const iJrMaxWeight = idx("jr_maxweight");

  const out = new Map<string, DiscDimensions>();
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const externalId = (cols[iExternalId] ?? "").trim();
    const nameSlug = (cols[iNameSlug] ?? "").trim();
    const brandSlug = (cols[iBrandSlug] ?? "").trim();
    const compositeExternalId = nameSlug && brandSlug ? `${brandSlug}-${nameSlug}` : "";

    if (!externalId && !compositeExternalId) {
      continue;
    }

    const dimensions: DiscDimensions = {
      diameterCm: toNumber(cols[iPdgaDiameter]) ?? toNumber(cols[iJrDiameter]),
      heightCm: toNumber(cols[iPdgaHeight]) ?? toNumber(cols[iJrHeight]),
      rimDepthCm: toNumber(cols[iPdgaRimDepth]) ?? toNumber(cols[iJrRimDepth]),
      rimThicknessCm: toNumber(cols[iPdgaRimThickness]) ?? toNumber(cols[iJrRimThickness]),
      maxWeightGr: toNumber(cols[iPdgaMaxWeight]) ?? toNumber(cols[iJrMaxWeight]),
    };

    if (externalId) {
      out.set(externalId, dimensions);
    }
    if (compositeExternalId) {
      out.set(compositeExternalId, dimensions);
    }
  }

  cachedDimensionsByExternalId = out;
  return out;
};

export const getDiscDimensionsByExternalId = async (externalId: string) => {
  const map = await loadMap();
  return (
    map.get(externalId) ?? {
      diameterCm: null,
      heightCm: null,
      rimDepthCm: null,
      rimThicknessCm: null,
      maxWeightGr: null,
    }
  );
};
