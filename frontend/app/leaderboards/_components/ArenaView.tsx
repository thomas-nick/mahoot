"use client";

import type { ComputedManufacturer, ScoringMode } from "../_lib/types";
import { ArenaDetail } from "./ArenaDetail";
import { ArenaLeaderboard } from "./ArenaLeaderboard";
import { Podium } from "./Podium";

interface ArenaViewProps {
  standings: ComputedManufacturer[];
  compareStandings: ComputedManufacturer[];
  mode: ScoringMode;
  selected: string | null;
  onSelect: (manufacturer: string) => void;
  selectedTeam: ComputedManufacturer | null;
}

export function ArenaView({
  standings,
  compareStandings,
  mode,
  selected,
  onSelect,
  selectedTeam,
}: ArenaViewProps) {
  return (
    <div className="arena-grid">
      <div className="arena-board">
        <Podium standings={standings} selected={selected} onSelect={onSelect} />
        <ArenaLeaderboard
          standings={standings}
          compareStandings={compareStandings}
          mode={mode}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
      <ArenaDetail team={selectedTeam} mode={mode} />
    </div>
  );
}
