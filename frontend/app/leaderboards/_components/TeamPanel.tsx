"use client";

import Link from "next/link";
import { formatPoints, TOP4_CAP } from "../_lib/scoring";
import { TOP_N } from "../_lib/tourPlayerConstants";
import type { ComputedManufacturer, ScoringMode } from "../_lib/types";
import { HankoSeal } from "./HankoSeal";

interface TeamPanelProps {
  team: ComputedManufacturer | null;
  mode: ScoringMode;
}

export function TeamPanel({ team, mode }: TeamPanelProps) {
  const isFull = mode === "full";

  if (!team) {
    return (
      <div className="roster-empty">
        <span className="font-serif text-5xl text-[var(--gold)]/20">選</span>
        <p className="mt-3 font-serif text-sm text-[var(--text-muted)]">Select a manufacturer</p>
        <p className="mt-1 text-xs text-[var(--text-dim)]">View roster breakdown and scoring rows</p>
      </div>
    );
  }

  const scoringSlugs = new Set(team.scoringPlayers.map((player) => player.slug));

  return (
    <div className="roster-card relative">
      <div className="roster-accent" style={{ backgroundColor: team.color }} />

      <div className="roster-header flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <HankoSeal
            manufacturer={team.manufacturer}
            color={team.color}
            size="lg"
            pressed
            variant="light"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8070]">
              Team roster
            </p>
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide">
              {team.manufacturer}
            </h2>
            <p className="text-xs text-[#6b655c]">
              {isFull
                ? "All affiliated players count"
                : `Top ${TOP4_CAP} rows count toward cup points`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl font-bold tabular-nums text-[var(--vermillion)]">
            {formatPoints(team.points)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8070]">Total pts</p>
        </div>
      </div>

      <div className="overflow-x-auto px-1 pb-2">
        <table className="roster-table w-full min-w-[400px] text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th className="text-right">Pts</th>
              <th className="text-right">W</th>
              <th className="text-right">Counts</th>
            </tr>
          </thead>
          <tbody>
            {[...team.players]
              .sort((a, b) => b.points - a.points)
              .map((player) => {
                const counts = scoringSlugs.has(player.slug);
                return (
                  <tr
                    key={player.slug}
                    className={counts ? "row-scoring" : "row-muted"}
                  >
                    <td className="tabular-nums text-[#8a8070]">#{player.rank}</td>
                    <td className="font-medium">
                      {player.rank > 0 && player.rank <= TOP_N ? (
                        <Link
                          href={`/leaderboards/players/${player.slug}`}
                          className="tour-profile-link"
                        >
                          {player.name}
                        </Link>
                      ) : (
                        player.name
                      )}
                    </td>
                    <td className="text-right tabular-nums font-semibold">
                      {player.points.toFixed(1)}
                    </td>
                    <td className="text-right tabular-nums">{player.wins}</td>
                    <td className="text-right">
                      {counts ? (
                        <span className="badge-counts">
                          {isFull ? "ALL" : `TOP${TOP4_CAP}`}
                        </span>
                      ) : (
                        <span className="text-[#b0a898]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
