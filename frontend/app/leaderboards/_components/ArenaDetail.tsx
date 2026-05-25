"use client";

import { formatPoints, TOP4_CAP } from "../_lib/scoring";
import type { ComputedManufacturer, ScoringMode } from "../_lib/types";
import { BrandLogo } from "./BrandLogo";

interface ArenaDetailProps {
  team: ComputedManufacturer | null;
  mode: ScoringMode;
}

export function ArenaDetail({ team, mode }: ArenaDetailProps) {
  if (!team) {
    return (
      <div className="arena-detail arena-detail-empty">
        <div className="arena-detail-empty-orb" />
        <p className="arena-detail-empty-title">Select a manufacturer</p>
        <p className="arena-detail-empty-sub">Tap any brand to view roster & top scorers</p>
      </div>
    );
  }

  const scoringSlugs = new Set(team.scoringPlayers.map((p) => p.slug));
  const sortedPlayers = [...team.players].sort((a, b) => b.points - a.points);

  return (
    <div
      className="arena-detail"
      style={{ "--brand": team.color } as React.CSSProperties}
    >
      <div className="arena-detail-stage">
        <div className="arena-detail-stage-glow" />
        <BrandLogo
          manufacturer={team.manufacturer}
          color={team.color}
          size={140}
          glow
          className="arena-detail-logo"
        />
        <div className="arena-detail-platform" />
      </div>

      <div className="arena-detail-header">
        <p className="arena-detail-rank">RANK #{team.rank}</p>
        <h3 className="arena-detail-name">{team.manufacturer}</h3>
        <div className="arena-detail-stats">
          <div>
            <p className="arena-detail-stat-value">{formatPoints(team.points)}</p>
            <p className="arena-detail-stat-label">Points</p>
          </div>
          <div>
            <p className="arena-detail-stat-value">{team.wins}</p>
            <p className="arena-detail-stat-label">Wins</p>
          </div>
          <div>
            <p className="arena-detail-stat-value">{team.top10s}</p>
            <p className="arena-detail-stat-label">Top 10s</p>
          </div>
        </div>
      </div>

      <div className="arena-detail-roster">
        <p className="arena-detail-section-label">
          Roster · {mode === "full" ? "all count" : `top ${TOP4_CAP} count`}
        </p>
        <ul className="arena-detail-players">
          {sortedPlayers.map((player) => {
            const counts = scoringSlugs.has(player.slug);
            return (
              <li
                key={player.slug}
                className={`arena-player ${counts ? "arena-player-active" : ""}`}
              >
                <span className="arena-player-rank">#{player.rank}</span>
                <span className="arena-player-name">{player.name}</span>
                <span className="arena-player-points">{player.points.toFixed(1)}</span>
                {counts && <span className="arena-player-badge">●</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
