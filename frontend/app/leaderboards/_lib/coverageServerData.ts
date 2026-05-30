import { promises as fs } from "fs";
import path from "path";
import type { CoverageCatalog } from "./coverageTypes";

const CATALOG_PATH = path.join(process.cwd(), "public", "data", "coverage_catalog.json");

export async function loadCoverageCatalog(): Promise<CoverageCatalog | null> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    return JSON.parse(raw) as CoverageCatalog;
  } catch {
    return null;
  }
}
