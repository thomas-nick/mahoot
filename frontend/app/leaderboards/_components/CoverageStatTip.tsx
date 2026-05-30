"use client";

import type { ReactNode } from "react";

type Props = {
  tip: string;
  children: ReactNode;
  className?: string;
};

/** Label or stat with hover/focus tooltip (desktop) and native title fallback. */
export function CoverageStatTip({ tip, children, className }: Props) {
  return (
    <span className={`coverage-stat-tip ${className ?? ""}`.trim()} tabIndex={0} title={tip}>
      {children}
      <span className="coverage-stat-tip-bubble" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

export const COVERAGE_STAT_TIPS = {
  scope:
    "PDGA final standings from Elite & Major events linked to our tournament coverage catalog — not full career or DGPT season standings.",
  events: "Elite & Major events in our dataset where this player has a linked PDGA finish.",
  wins: "1st-place finishes at those events.",
  podiums: "Top-3 finishes (1st, 2nd, or 3rd).",
  top10: "Finishes inside the top 10.",
  pdgaPts: "Total PDGA points earned at matched Elite & Major events.",
  form: "Average finishing place over their most recent events in this dataset (lower is better).",
  avgFinish: "Average finishing place across all matched events (lower is better).",
  winRate: "Share of matched events they won.",
  rating: "Highest PDGA rating shown on a result row in this dataset.",
  winStreak: "Consecutive 1st-place finishes, counting back from their most recent event.",
  podiumStreak: "Consecutive top-3 finishes from their most recent event.",
  top10Streak: "Consecutive top-10 finishes from their most recent event.",
  winlessStreak: "Events in a row without a win, starting from the most recent. Stops at their last victory.",
  bestWinRun: "Longest streak of back-to-back wins in this dataset.",
  bestPodiumRun: "Longest streak of back-to-back top-3 finishes in this dataset.",
  byTourLevel:
    "Totals split by event tier (Major, DGPT Elite, etc.). Points are PDGA points; ev = events, W = wins, P = podiums.",
  byYear:
    "Season breakdown by calendar year. avg = average finish (lower is better); pts = PDGA points that year.",
  yearEv: "Events played that year.",
  yearWP: "Wins and podiums (top 3) that year.",
  yearAvg: "Average finishing place that year — lower is better.",
  yearPts: "PDGA points earned that year.",
  roundVideos: "Round videos in the coverage catalog (JomezPro, GK Pro, Gatekeeper) featuring this player.",
  leadCards: "Times they appeared on a lead card in uploaded round coverage.",
  chaseCards: "Times they appeared on a chase card in uploaded round coverage.",
  filmedEvents: "Distinct tournaments with at least one round video featuring them.",
  byProducer: "Round video appearances by YouTube producer.",
} as const;
