"use client";

import { formatPoints, rankDelta, compareModeLabel } from "../_lib/scoring";
import type { ComputedManufacturer, ScoringMode } from "../_lib/types";
import { HankoSeal } from "./HankoSeal";

interface StandingsTableProps {
  standings: ComputedManufacturer[];
  compareStandings: ComputedManufacturer[];
  mode: ScoringMode;
  selected: string | null;
  onSelect: (manufacturer: string) => void;
}

function rankClass(rank: number): string {
  if (rank === 1) return "rank-gold";
  if (rank === 2) return "rank-silver";
  if (rank === 3) return "rank-bronze";
  return "rank-default";
}

export function StandingsTable({
  standings,
  compareStandings,
  mode,
  selected,
  onSelect,
}: StandingsTableProps) {
  const leaderPoints = standings[0]?.points ?? 1;
  const compareLabel = compareModeLabel(mode);

  return (
    <div className="space-y-2">
      {standings.map((team) => {
        const delta = rankDelta(compareStandings, standings, team.manufacturer);
        const isSelected = selected === team.manufacturer;
        const isLeader = team.rank === 1;
        const barWidth = (team.points / leaderPoints) * 100;

        return (
          <button
            key={team.manufacturer}
            type="button"
            onClick={() => onSelect(team.manufacturer)}
            className={`standing-row ${isSelected ? "standing-row-selected" : ""} ${
              isLeader && !isSelected ? "standing-row-leader" : ""
            }`}
          >
            <span
              className={`font-serif text-center text-xl font-bold tabular-nums sm:text-2xl ${rankClass(team.rank)}`}
            >
              {team.rank}
            </span>

            <HankoSeal
              manufacturer={team.manufacturer}
              color={team.color}
              size="sm"
              pressed={isSelected}
              variant={isSelected ? "light" : "dark"}
            />

            <div className="min-w-0">
              <p className="truncate font-serif text-base font-bold uppercase tracking-wide sm:text-lg">
                {team.manufacturer}
              </p>
              <p className={`text-xs ${isSelected ? "text-[#6b655c]" : "text-[var(--text-muted)]"}`}>
                {mode === "full"
                  ? `${team.roster_count} players · ${team.wins}W · ${team.top10s} T10`
                  : `${team.scoring_count}/${team.roster_count} top 4 · ${team.wins}W · ${team.top10s} T10`}
              </p>
              <div className="points-bar">
                <div
                  className="points-bar-fill"
                  style={{ width: `${barWidth}%`, backgroundColor: team.color }}
                />
              </div>
            </div>

            <div className="hidden text-right sm:block">
              {delta !== 0 && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    delta > 0 ? "text-[var(--jade)]" : "text-[var(--vermillion)]"
                  }`}
                >
                  {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                  <span className="block font-normal opacity-70">vs {compareLabel}</span>
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="font-serif text-lg font-bold tabular-nums sm:text-xl">
                {formatPoints(team.points)}
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-dim)]">pts</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
