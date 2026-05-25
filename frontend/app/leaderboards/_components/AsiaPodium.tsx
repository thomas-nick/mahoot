"use client";

import type { AsiaPlayer } from "../_lib/asiaTypes";

interface AsiaPodiumProps {
  players: AsiaPlayer[];
  onSelect?: (pdga: number) => void;
}

const PODIUM_ORDER: Array<{ idx: number; place: 1 | 2 | 3; medal: string; tone: string }> = [
  { idx: 1, place: 2, medal: "🥈", tone: "silver" },
  { idx: 0, place: 1, medal: "🥇", tone: "gold" },
  { idx: 2, place: 3, medal: "🥉", tone: "bronze" },
];

export function AsiaPodium({ players, onSelect }: AsiaPodiumProps) {
  if (players.length < 3) return null;

  return (
    <div className="asia-podium">
      {PODIUM_ORDER.map(({ idx, place, medal, tone }) => {
        const p = players[idx];
        if (!p) return null;
        return (
          <button
            key={p.pdga}
            type="button"
            onClick={() => onSelect?.(p.pdga)}
            className={`asia-podium-card asia-podium-${tone} asia-podium-place-${place}`}
            aria-label={`Rank ${place}: ${p.name}`}
          >
            <span className="asia-podium-medal" aria-hidden>{medal}</span>
            <span className="asia-podium-flag">{p.flag}</span>
            <span className="asia-podium-name">{p.name.replace(/\s#\d+$/, "")}</span>
            <span className="asia-podium-meta">
              {p.division}
              {p.rating != null && ` · ${p.rating}`}
              {` · ${p.country}`}
            </span>
            <div className="asia-podium-stat">
              <span className="asia-podium-stat-value">{Math.round(p.pdga_points).toLocaleString()}</span>
              <span className="asia-podium-stat-label">PDGA points</span>
            </div>
            <div className="asia-podium-pills">
              <span className="asia-podium-pill"><strong>{p.events_played}</strong> events</span>
              <span className="asia-podium-pill"><strong>{p.wins}</strong> W</span>
              <span className="asia-podium-pill"><strong>{p.podiums}</strong> 🏆</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
