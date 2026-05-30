import { promises as fs } from "fs";
import path from "path";
import type { CoverageMediaStatsIndex } from "./coveragePlayerTypes";

const MEDIA_INDEX = path.join(process.cwd(), "public", "data", "coverage_media_stats", "index.json");

export async function loadCoverageMediaStatsIndex(): Promise<CoverageMediaStatsIndex | null> {
  try {
    const raw = await fs.readFile(MEDIA_INDEX, "utf-8");
    return JSON.parse(raw) as CoverageMediaStatsIndex;
  } catch {
    return null;
  }
}
