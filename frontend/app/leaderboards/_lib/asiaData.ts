import type { AsiaData } from "./asiaTypes";

export async function loadAsiaData(): Promise<AsiaData | null> {
  try {
    const data = (await import("../../../public/data/leaderboards/asia_players.json")).default;
    return data as unknown as AsiaData;
  } catch {
    return null;
  }
}
