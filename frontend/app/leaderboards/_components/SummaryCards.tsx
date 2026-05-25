"use client";

import { formatPoints, scoringModeLabel } from "../_lib/scoring";
import type { ComputedManufacturer, ScoringMode } from "../_lib/types";
import { HankoSeal } from "./HankoSeal";

interface SummaryCardsProps {
  standings: ComputedManufacturer[];
  week: string;
  division: string;
  scoringMode: ScoringMode;
}

export function SummaryCards({
  standings,
  week,
  division,
  scoringMode,
}: SummaryCardsProps) {
  const leader = standings[0];
  const runnerUp = standings[1];
  const gap = leader && runnerUp ? leader.points - runnerUp.points : 0;
  const modeLabel = scoringModeLabel(scoringMode);

  const cards = [
    {
      label: "Leader",
      value: leader?.manufacturer ?? "—",
      sub: leader ? `${formatPoints(leader.points)} pts` : "",
      seal: leader,
    },
    {
      label: "Gap to 2nd",
      value: formatPoints(gap),
      sub: runnerUp ? runnerUp.manufacturer : "",
      seal: runnerUp,
    },
    {
      label: "Field",
      value: `${standings.length} brands`,
      sub: `${division} · Wk ${week} · ${modeLabel}`,
      seal: null,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <div className="flex items-start justify-between gap-2">
            <p className="stat-label">{card.label}</p>
            {card.seal && (
              <HankoSeal
                manufacturer={card.seal.manufacturer}
                color={card.seal.color}
                size="sm"
                variant="light"
              />
            )}
          </div>
          <p className="stat-value truncate uppercase">{card.value}</p>
          <p className="stat-sub">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
