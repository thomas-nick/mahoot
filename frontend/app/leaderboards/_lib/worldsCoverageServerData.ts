import { promises as fs } from "fs";
import path from "path";
import type { WorldsCoverageCatalog } from "./worldsCoverageTypes";

const CATALOG_PATH = path.join(process.cwd(), "public", "data", "worlds_coverage.json");

export async function loadWorldsCoverageCatalog(): Promise<WorldsCoverageCatalog | null> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    return JSON.parse(raw) as WorldsCoverageCatalog;
  } catch {
    return null;
  }
}
