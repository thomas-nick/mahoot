import { promises as fs } from "fs";
import path from "path";
import type { CoveragePlayer, CoveragePlayersIndex } from "./coveragePlayerTypes";

const PLAYERS_DIR = path.join(process.cwd(), "public", "data", "coverage_players");

export async function loadCoveragePlayersIndex(): Promise<CoveragePlayersIndex | null> {
  try {
    const raw = await fs.readFile(path.join(PLAYERS_DIR, "index.json"), "utf-8");
    return JSON.parse(raw) as CoveragePlayersIndex;
  } catch {
    return null;
  }
}

export async function loadCoveragePlayer(pdga: string): Promise<CoveragePlayer | null> {
  if (!/^\d+$/.test(pdga)) return null;
  try {
    const raw = await fs.readFile(path.join(PLAYERS_DIR, `${pdga}.json`), "utf-8");
    return JSON.parse(raw) as CoveragePlayer;
  } catch {
    return null;
  }
}

export async function lookupPdgaByNameTag(nameTag: string): Promise<number | null> {
  const index = await loadCoveragePlayersIndex();
  if (!index) return null;
  return index.name_index[nameTag] ?? null;
}
