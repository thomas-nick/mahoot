import { promises as fs } from "fs";
import path from "path";
import type { SkinsData } from "./skinsTypes";

const DATA_PATH = path.join(process.cwd(), "public", "data", "gothrow_skins.json");

export async function loadSkinsData(): Promise<SkinsData | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as SkinsData;
  } catch {
    return null;
  }
}
