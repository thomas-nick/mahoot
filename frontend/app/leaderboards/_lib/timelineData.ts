import type { TimelineData } from "./timelineTypes";
import timelineData from "../../../public/data/leaderboards/timeline.json";

export async function loadTimelineData(): Promise<TimelineData> {
  return timelineData as TimelineData;
}
