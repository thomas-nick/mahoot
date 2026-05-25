import type { PlayerTourData } from "./playerTourTypes";
import tourData from "../../../public/data/leaderboards/player_tour_stats.json";

export async function loadPlayerTourData(): Promise<PlayerTourData> {
  return tourData as PlayerTourData;
}
