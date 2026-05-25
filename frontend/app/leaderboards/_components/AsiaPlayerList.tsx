"use client";

import Link from "next/link";
import type { AsiaPlayer } from "../_lib/asiaTypes";
import { RatingSparkline } from "./RatingSparkline";

interface AsiaPlayerListProps {
  players: AsiaPlayer[];
  sort: "pdga" | "weighted" | "rating" | "asia_tour";
  selected: number | null;
  onSelect: (pdga: number | null) => void;
}

const LEVEL_LABEL: Record<string, string> = {
  major: "M",
  elite: "E",
  asia_tour: "AT",
  a_tier: "A",
  b_tier: "B",
  c_tier: "C",
};

function formatPrimary(player: AsiaPlayer, sort: AsiaPlayerListProps["sort"]): number {
  if (sort === "weighted") return player.tour_weighted_points;
  if (sort === "rating") return player.rating ?? 0;
  if (sort === "asia_tour") return player.asia_tour_points;
  return player.pdga_points;
}

const SORT_LABEL: Record<AsiaPlayerListProps["sort"], string> = {
  pdga: "pdga pts",
  weighted: "weighted",
  rating: "rating",
  asia_tour: "AT pts",
};

export function AsiaPlayerList({ players, sort, selected, onSelect }: AsiaPlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="asia-empty">
        <p>No players in this view yet.</p>
        <p className="asia-empty-sub">
          Run <code className="trend-chart-code">python3 asia.py</code> from the repo root to scrape PDGA.
        </p>
      </div>
    );
  }

  const leader = players[0] ? formatPrimary(players[0], sort) : 1;

  return (
    <ul className="clean-list player-tour-list">
      {players.map((player, index) => {
        const isOpen = selected === player.pdga;
        const rank = index + 1;
        const primary = formatPrimary(player, sort);
        const barWidth = leader ? (primary / leader) * 100 : 0;

        return (
          <li
            key={player.pdga}
            className={`clean-item ${isOpen ? "clean-item-open" : ""}`}
          >
            <button
              type="button"
              className="clean-row player-tour-row asia-row"
              onClick={() => onSelect(isOpen ? null : player.pdga)}
              aria-expanded={isOpen}
            >
              <span className={`clean-rank ${rank === 1 ? "clean-rank-leader" : ""}`}>
                {rank}
              </span>
              <span className="asia-flag" aria-label={player.country} title={player.country}>
                {player.flag}
              </span>
              <div className="clean-meta">
                <p className="clean-name">
                  {player.name}
                  {player.rating != null && (
                    <span className="asia-rating"> · {player.rating}</span>
                  )}
                  <span className="asia-division-badge">{player.division}</span>
                  {player.streak && player.streak.direction !== "flat" && (
                    <span
                      className={`asia-streak asia-streak-${player.streak.direction}`}
                      title={`Last 3 events avg ${player.streak.recent_avg.toFixed(0)} pts vs season ${player.streak.season_avg.toFixed(0)} pts`}
                    >
                      {player.streak.direction === "up" ? "↑" : "↓"} {Math.abs(player.streak.delta_pct).toFixed(0)}%
                    </span>
                  )}
                </p>
                <p className="clean-sub">
                  #{player.pdga} ·{" "}
                  {player.events_played} ev
                  {player.wins > 0 && ` · ${player.wins}W`}
                  {player.podiums > 0 && ` · ${player.podiums}P`}
                  {player.asia_tour_events > 0 && ` · ${player.asia_tour_events} AT`}
                  {player.city && ` · ${player.city}`}
                </p>
              </div>
              {player.rating_history && player.rating_history.length >= 2 && (
                <div className="asia-row-sparkline" title="Rating trend">
                  <RatingSparkline history={player.rating_history} />
                </div>
              )}
              <div className="clean-points-block">
                <p className="clean-points">{Math.round(primary).toLocaleString()}</p>
                <p className="clean-points-label">{SORT_LABEL[sort]}</p>
              </div>
              <span className="clean-row-chevron" aria-hidden />
            </button>

            {isOpen && (
              <div className="clean-expand">
                <div className="clean-bar clean-bar-expanded">
                  <div
                    className="clean-bar-fill"
                    style={{ width: `${Math.min(barWidth, 100)}%`, backgroundColor: "var(--accent)" }}
                  />
                </div>
                <div className="player-level-grid">
                  {Object.entries(player.by_level).map(([level, stats]) => {
                    if (!stats || stats.events === 0) return null;
                    return (
                      <div key={level} className="clean-stat-pill">
                        <span className="clean-stat-value">{Math.round(stats.points)}</span>
                        <span className="clean-stat-label">
                          {LEVEL_LABEL[level] ?? level} · {stats.events} ev
                          {stats.wins > 0 && ` · ${stats.wins}W`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="clean-roster-label">
                  {player.country} · {player.classification || "Pro"}
                  {player.last_active && ` · last played ${player.last_active}`}
                </p>
                <ul className="clean-roster">
                  {player.results.map((r) => (
                    <li
                      key={`${r.event_id}-${r.dates}`}
                      className="clean-player clean-player-active"
                    >
                      <span
                        className={`tour-level-badge tour-level-${r.level}`}
                        title={r.is_asia_tour ? "PDGA Asia Tour event" : `Tier ${r.tier}`}
                      >
                        {LEVEL_LABEL[r.level] ?? r.tier}
                      </span>
                      <Link
                        href={`/leaderboards/asia/event/${r.event_id}`}
                        className="clean-player-name asia-event-link"
                      >
                        {r.title}
                      </Link>
                      <span className="clean-player-pts">P{r.place}</span>
                      <span className="clean-player-move up">
                        +{Math.round(r.pdga_points)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
