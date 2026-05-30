"use client";

import Link from "next/link";
import type { CoveragePlayerSummary } from "../_lib/coveragePlayerTypes";

interface Props {
  players: CoveragePlayerSummary[];
}

const PODIUM_ORDER: Array<{ idx: number; place: 1 | 2 | 3; medal: string; tone: string }> = [
  { idx: 1, place: 2, medal: "🥈", tone: "silver" },
  { idx: 0, place: 1, medal: "🥇", tone: "gold" },
  { idx: 2, place: 3, medal: "🥉", tone: "bronze" },
];

export function CoveragePlayersPodium({ players }: Props) {
  if (players.length < 3) return null;

  return (
    <div className="asia-podium">
      {PODIUM_ORDER.map(({ idx, place, medal, tone }) => {
        const p = players[idx];
        if (!p) return null;
        return (
          <Link
            key={p.pdga}
            href={`/leaderboards/coverage/player/${p.pdga}`}
            className={`asia-podium-card asia-podium-${tone} asia-podium-place-${place}`}
            aria-label={`Rank ${place}: ${p.name}`}
          >
            <span className="asia-podium-medal" aria-hidden>{medal}</span>
            <span className="asia-podium-name">{p.name.replace(/\s#\d+$/, "")}</span>
            <span className="asia-podium-meta">
              {p.division}
              {p.rating != null && ` · ${p.rating}`}
              {` · #${p.pdga}`}
            </span>
            <div className="asia-podium-stat">
              <span className="asia-podium-stat-value">{p.wins}</span>
              <span className="asia-podium-stat-label">wins</span>
            </div>
            <div className="asia-podium-pills">
              <span className="asia-podium-pill"><strong>{p.events_played}</strong> events</span>
              <span className="asia-podium-pill"><strong>{p.podiums}</strong> 🏆</span>
              <span className="asia-podium-pill"><strong>{p.top10}</strong> top 10</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
