"use client";

import Link from "next/link";
import type { PlayerTourEntry } from "../_lib/playerTourTypes";
import { TOP_N } from "../_lib/tourPlayerConstants";
import { BrandLogo } from "./BrandLogo";
import { brandColor } from "../_lib/brandAssets";

interface PlayerRankingsListProps {
  players: PlayerTourEntry[];
  sort: "tour" | "dgpt";
  selected: string | null;
  onSelect: (slug: string | null) => void;
  selectedPlayer: PlayerTourEntry | null;
}

const LEVEL_LABELS = { major: "M", elite: "E", a_tier: "A" } as const;

function hasProfile(player: PlayerTourEntry): boolean {
  return (
    (player.dgpt_rank > 0 && player.dgpt_rank <= TOP_N) ||
    (player.tour_rank > 0 && player.tour_rank <= TOP_N)
  );
}

export function PlayerRankingsList({
  players,
  sort,
  selected,
  onSelect,
  selectedPlayer,
}: PlayerRankingsListProps) {
  const leaderPoints = players[0]?.tour_weighted_points ?? 1;

  return (
    <ul className="clean-list player-tour-list">
      {players.map((player, index) => {
        const isOpen = selected === player.slug;
        const displayRank = sort === "tour" ? player.tour_rank : index + 1;
        const barWidth = (player.tour_weighted_points / leaderPoints) * 100;

        return (
          <li
            key={player.slug}
            className={`clean-item ${isOpen ? "clean-item-open" : ""}`}
          >
            <button
              type="button"
              className="clean-row player-tour-row"
              onClick={() => onSelect(isOpen ? null : player.slug)}
              aria-expanded={isOpen}
            >
              <span className={`clean-rank ${displayRank === 1 ? "clean-rank-leader" : ""}`}>
                {displayRank}
              </span>
              <BrandLogo
                manufacturer={player.manufacturer}
                color={brandColor(player.manufacturer)}
                size={44}
                variant="sunk"
              />
              <div className="clean-meta">
                <p className="clean-name">{player.name}</p>
                <p className="clean-sub">
                  DGPT #{player.dgpt_rank} · {player.manufacturer} · {player.tour_starts} starts
                  {player.wins > 0 && ` · ${player.wins}W`}
                </p>
              </div>
              <div className="clean-points-block">
                <p className="clean-points">{player.tour_weighted_points.toLocaleString()}</p>
                <p className="clean-points-label">tour pts</p>
              </div>
              <span className="clean-row-chevron" aria-hidden />
            </button>

            {isOpen && selectedPlayer && (
              <div className="clean-expand">
                <div className="clean-bar clean-bar-expanded">
                  <div
                    className="clean-bar-fill"
                    style={{ width: `${barWidth}%`, backgroundColor: "var(--accent)" }}
                  />
                </div>
                <div className="player-level-grid">
                  {(["major", "elite", "a_tier"] as const).map((level) => {
                    const stats = selectedPlayer.by_level[level];
                    if (stats.starts === 0) return null;
                    return (
                      <div key={level} className="clean-stat-pill">
                        <span className="clean-stat-value">{stats.points.toFixed(0)}</span>
                        <span className="clean-stat-label">
                          {LEVEL_LABELS[level]} · {stats.starts} start{stats.starts !== 1 ? "s" : ""}
                          {stats.wins > 0 && ` · ${stats.wins}W`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="clean-roster-label">Recent finishes</p>
                <ul className="clean-roster">
                  {selectedPlayer.recent_results.map((r) => (
                    <li key={`${r.event_key}-${r.place}`} className="clean-player clean-player-active">
                      <span className={`tour-level-badge tour-level-${r.level}`}>
                        {LEVEL_LABELS[r.level]}
                      </span>
                      <span className="clean-player-name">{r.event}</span>
                      <span className="clean-player-pts">P{r.place}</span>
                      <span className="clean-player-move up">+{r.weighted_points}</span>
                    </li>
                  ))}
                </ul>
                {hasProfile(selectedPlayer) && (
                  <Link
                    href={`/leaderboards/players/${selectedPlayer.slug}`}
                    className="player-tour-profile-cta"
                  >
                    Open player profile →
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
