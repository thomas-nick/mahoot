"use client";

import { formatPoints, rankDelta, compareModeLabel } from "../_lib/scoring";
import type { ComputedManufacturer, ScoringMode } from "../_lib/types";
import { BrandLogo } from "./BrandLogo";

interface ArenaLeaderboardProps {
  standings: ComputedManufacturer[];
  compareStandings: ComputedManufacturer[];
  mode: ScoringMode;
  selected: string | null;
  onSelect: (manufacturer: string) => void;
}

export function ArenaLeaderboard({
  standings,
  compareStandings,
  mode,
  selected,
  onSelect,
}: ArenaLeaderboardProps) {
  const rest = standings.slice(3);
  const compareLabel = compareModeLabel(mode);

  if (rest.length === 0) return null;

  return (
    <div className="arena-list">
      {rest.map((team) => {
        const isSelected = selected === team.manufacturer;
        const delta = rankDelta(compareStandings, standings, team.manufacturer);
        return (
          <button
            key={team.manufacturer}
            type="button"
            onClick={() => onSelect(team.manufacturer)}
            className={`arena-row ${isSelected ? "arena-row-selected" : ""}`}
            style={{ "--brand": team.color } as React.CSSProperties}
          >
            <span className="arena-row-rank">{team.rank}</span>
            <BrandLogo manufacturer={team.manufacturer} color={team.color} size={42} />
            <div className="arena-row-meta">
              <p className="arena-row-name">{team.manufacturer}</p>
              <p className="arena-row-sub">
                {mode === "full"
                  ? `${team.roster_count} players · ${team.wins}W · ${team.top10s} T10`
                  : `${team.scoring_count}/${team.roster_count} top 4 · ${team.wins}W`}
              </p>
            </div>
            {delta !== 0 && (
              <span
                className={`arena-row-delta ${delta > 0 ? "arena-row-delta-up" : "arena-row-delta-down"}`}
              >
                {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                <span className="arena-row-delta-label">vs {compareLabel}</span>
              </span>
            )}
            <div className="arena-row-points">
              <p className="arena-row-value">{formatPoints(team.points)}</p>
              <p className="arena-row-label">pts</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
