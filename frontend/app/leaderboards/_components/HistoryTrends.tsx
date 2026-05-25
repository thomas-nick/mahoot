"use client";

import type { TimelineData } from "../_lib/timelineTypes";
import { TrendChart } from "./TrendChart";

interface HistoryTrendsProps {
  timeline: TimelineData | null;
  division: string;
  mode: "player_tour" | "manufacturers_cup";
}

export function HistoryTrends({ timeline, division, mode }: HistoryTrendsProps) {
  const div = timeline?.divisions[division];
  if (!div) return null;

  const block = mode === "player_tour" ? div.player_tour : div.manufacturers_cup;
  const title = mode === "player_tour" ? "Tour points over time" : "Manufacturers Cup over time";
  const subtitle =
    mode === "player_tour"
      ? "Top players · weighted tour points by week"
      : "Top brands · top-4 cap points by week";

  return (
    <TrendChart
      title={title}
      subtitle={subtitle}
      weeks={div.weeks}
      series={block.series}
      valueLabel="pts"
    />
  );
}
