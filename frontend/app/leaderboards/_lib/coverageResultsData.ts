import { promises as fs } from "fs";
import path from "path";
import type { CoverageEventResults } from "./coverageResultsTypes";

export async function loadCoverageEventResults(
  eventId: string,
): Promise<CoverageEventResults | null> {
  if (!/^[a-z0-9_]+$/.test(eventId)) return null;
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "coverage_results",
    `${eventId}.json`,
  );
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as CoverageEventResults;
  } catch {
    return null;
  }
}
