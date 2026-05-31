"use client";

import type { SkinsPlayer } from "../_lib/skinsTypes";

type Props = {
  players: SkinsPlayer[];
};

export function SkinsPlayerLeaderboard({ players }: Props) {
  if (!players.length) {
    return (
      <div className="asia-empty">
        <p>No players match this search.</p>
      </div>
    );
  }

  const leader = players[0]?.earnings_usd || players[0]?.episodes_played || 1;

  return (
    <ul className="clean-list player-tour-list">
      {players.map((p, i) => {
        const metric = p.earnings_usd > 0 ? p.earnings_usd : p.episodes_played;
        const barWidth = leader ? (metric / leader) * 100 : 0;
        const isEarnings = p.earnings_usd > 0;

        return (
          <li key={p.name} className="clean-item">
            <div className="clean-row coverage-tour-player-row">
              <span className={`clean-rank ${i === 0 ? "clean-rank-leader" : ""}`}>{i + 1}</span>
              <div className="clean-meta">
                <p className="clean-name">{p.name}</p>
                <p className="clean-sub">
                  {p.episodes_played} eps
                  {p.wins > 0 && ` · ${p.wins}W`}
                  {p.first_seen && p.last_seen && ` · ${p.first_seen.slice(0, 4)}–${p.last_seen.slice(0, 4)}`}
                </p>
                {p.win_details.length > 0 && (
                  <p className="clean-sub">
                    Best: ${p.biggest_win_usd.toLocaleString()} · {p.win_details[0].series} #{p.win_details[0].episode}
                  </p>
                )}
              </div>
              <div className="clean-points-block">
                <p className="clean-points">
                  {isEarnings ? `$${p.earnings_usd.toLocaleString()}` : p.episodes_played}
                </p>
                <p className="clean-points-label">{isEarnings ? "earned" : "eps"}</p>
              </div>
            </div>
            <div className="clean-bar">
              <div
                className="clean-bar-fill"
                style={{ width: `${Math.min(barWidth, 100)}%`, backgroundColor: "var(--accent)" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
