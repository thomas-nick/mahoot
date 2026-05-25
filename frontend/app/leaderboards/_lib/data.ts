import type { ManufacturersCupData } from "./types";
import cupData from "../../../public/data/leaderboards/manufacturers_cup.json";

export async function loadManufacturersCupData(): Promise<ManufacturersCupData> {
  return cupData as ManufacturersCupData;
}
