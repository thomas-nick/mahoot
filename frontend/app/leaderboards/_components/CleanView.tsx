"use client";

import Link from "next/link";
import { formatPoints, rankDelta, compareModeLabel, TOP4_CAP } from "../_lib/scoring";
import { TOP_N } from "../_lib/tourPlayerConstants";
import type { ComputedManufacturer, RosterMeta, ScoringMode, TeamStats } from "../_lib/types";
import { BrandLogo } from "./BrandLogo";

interface CleanViewProps {
  standings: ComputedManufacturer[];
  compareStandings: ComputedManufacturer[];
  mode: ScoringMode;
  selected: string | null;
  onSelect: (manufacturer: string | null) => void;
  selectedTeam: ComputedManufacturer | null;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="clean-stat-pill">
      <span className="clean-stat-value">{value}</span>
      <span className="clean-stat-label">{label}</span>
    </div>
  );
}

function teamStatsGrid(stats: TeamStats | undefined, meta: RosterMeta | undefined) {
  if (!stats) return null;
  return (
    <>
      <div className="clean-stats-grid">
        <StatPill label="Elite T20" value={String(stats.elite_count)} />
        <StatPill label="Top 50" value={String(stats.top50_count)} />
        <StatPill label="Momentum" value={`+${stats.momentum.toFixed(0)}`} />
        <StatPill label="Win rate" value={`${(stats.win_rate * 100).toFixed(1)}%`} />
        <StatPill label="Cash rate" value={`${(stats.cash_rate * 100).toFixed(0)}%`} />
        <StatPill label="Avg pts" value={stats.avg_points.toFixed(0)} />
      </div>
      {meta && (
        <div className="clean-roster-meta">
          <span>Top 4 share {(meta.top4_share * 100).toFixed(0)}%</span>
          <span>Star gap {meta.star_gap.toFixed(0)}</span>
          <span>Pool share {(meta.market_share * 100).toFixed(1)}%</span>
          {meta.best_mover && (
            <span className="clean-best-mover">
              Hot: {meta.best_mover.name}{" "}
              {meta.best_mover.rank_gain > 0 ? `↑${meta.best_mover.rank_gain}` : `↓${Math.abs(meta.best_mover.rank_gain)}`}
            </span>
          )}
        </div>
      )}
    </>
  );
}

export function CleanView({
  standings,
  compareStandings,
  mode,
  selected,
  onSelect,
  selectedTeam,
}: CleanViewProps) {
  const leaderPoints = standings[0]?.points ?? 1;
  const compareLabel = compareModeLabel(mode);
  const scoringSlugs = new Set(selectedTeam?.scoringPlayers.map((p) => p.slug) ?? []);

  return (
    <div className="clean-view">
      <ul className="clean-list">
        {standings.map((team) => {
          const isOpen = selected === team.manufacturer;
          const isLeader = team.rank === 1;
          const barWidth = (team.points / leaderPoints) * 100;
          const delta = rankDelta(compareStandings, standings, team.manufacturer);

          return (
            <li
              key={team.manufacturer}
              className={`clean-item ${isOpen ? "clean-item-open" : ""}`}
              style={{ "--brand": team.color } as React.CSSProperties}
            >
              <button
                type="button"
                className="clean-row"
                onClick={() => onSelect(isOpen ? null : team.manufacturer)}
                aria-expanded={isOpen}
              >
                <span className={`clean-rank ${isLeader ? "clean-rank-leader" : ""}`}>
                  {team.rank}
                </span>
                <BrandLogo manufacturer={team.manufacturer} color={team.color} size={42} variant="sunk" />
                <div className="clean-meta">
                  <p className="clean-name">{team.manufacturer}</p>
                  <p className="clean-sub">
                    {mode === "full"
                      ? `${team.roster_count} players · ${team.wins}W`
                      : `${team.scoring_count}/${team.roster_count} top ${TOP4_CAP}`}
                    {team.stats && ` · ${team.stats.elite_count} elite`}
                  </p>
                </div>
                <div className="clean-points-block">
                  {delta !== 0 && (
                    <span className={`clean-delta ${delta > 0 ? "up" : "down"}`}>
                      {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                    </span>
                  )}
                  <p className="clean-points">{formatPoints(team.points)}</p>
                  <p className="clean-points-label">pts</p>
                </div>
                <span className="clean-row-chevron" aria-hidden />
              </button>

              {isOpen && selectedTeam && (
                <div className="clean-expand" style={{ "--brand": team.color } as React.CSSProperties}>
                  <div className="clean-bar clean-bar-expanded">
                    <div
                      className="clean-bar-fill"
                      style={{ width: `${barWidth}%`, backgroundColor: team.color }}
                    />
                  </div>
                  {teamStatsGrid(selectedTeam.stats, selectedTeam.roster_meta)}
                  <p className="clean-roster-label">
                    Roster · {mode === "full" ? "all count" : `top ${TOP4_CAP} count`}
                    <span className="clean-roster-hint"> vs {compareLabel}</span>
                  </p>
                  <ul className="clean-roster">
                    {[...selectedTeam.players]
                      .sort((a, b) => b.points - a.points)
                      .map((player) => {
                        const counts = scoringSlugs.has(player.slug);
                        const profile =
                          player.rank > 0 && player.rank <= TOP_N
                            ? `/leaderboards/players/${player.slug}`
                            : null;
                        return (
                          <li
                            key={player.slug}
                            className={`clean-player ${counts ? "clean-player-active" : ""}`}
                          >
                            <span className="clean-player-rank">#{player.rank}</span>
                            {profile ? (
                              <Link href={profile} className="clean-player-name tour-profile-link">
                                {player.name}
                              </Link>
                            ) : (
                              <span className="clean-player-name">{player.name}</span>
                            )}
                            <span className="clean-player-pts">{player.points.toFixed(1)}</span>
                            {player.rank_gain !== undefined && player.rank_gain !== 0 && (
                              <span className={`clean-player-move ${player.rank_gain > 0 ? "up" : "down"}`}>
                                {player.rank_gain > 0 ? `↑${player.rank_gain}` : `↓${Math.abs(player.rank_gain)}`}
                              </span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
