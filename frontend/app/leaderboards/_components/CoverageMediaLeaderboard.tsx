"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CoverageMediaStatsIndex } from "../_lib/coveragePlayerTypes";
import { filterByDivision, type DivisionFilter } from "../_lib/coverageMatchup";

type SortMode = "rounds" | "lead" | "tournaments";

type Props = {
  index: CoverageMediaStatsIndex;
  division?: DivisionFilter;
};

export function CoverageMediaLeaderboard({ index, division = "all" }: Props) {
  const [sort, setSort] = useState<SortMode>("rounds");

  const players = useMemo(() => {
    const list = filterByDivision([...index.players], division);
    list.sort((a, b) => {
      if (sort === "lead") return b.lead_cards - a.lead_cards || b.rounds - a.rounds;
      if (sort === "tournaments") return b.tournaments - a.tournaments || b.rounds - a.rounds;
      return b.rounds - a.rounds || b.lead_cards - a.lead_cards;
    });
    return list.slice(0, 24);
  }, [index.players, sort, division]);

  const leader =
    sort === "lead"
      ? players[0]?.lead_cards || 1
      : sort === "tournaments"
        ? players[0]?.tournaments || 1
        : players[0]?.rounds || 1;

  return (
    <>
      <div className="asia-controls">
        <div className="asia-control-group">
          {(
            [
              ["rounds", "Round videos"],
              ["lead", "Lead cards"],
              ["tournaments", "Events"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`scoring-pill ${sort === id ? "scoring-pill-active" : ""}`}
              onClick={() => setSort(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="clean-list player-tour-list">
        {players.map((p, i) => {
          const primary =
            sort === "lead" ? p.lead_cards : sort === "tournaments" ? p.tournaments : p.rounds;
          const barWidth = leader ? (primary / leader) * 100 : 0;
          const href = p.pdga
            ? `/leaderboards/coverage/player/${p.pdga}`
            : `/leaderboards/coverage?player=${encodeURIComponent(p.name_tag)}`;

          return (
            <li key={p.name_tag} className="clean-item">
              <Link href={href} className="clean-row coverage-tour-player-row">
                <span className={`clean-rank ${i === 0 ? "clean-rank-leader" : ""}`}>{i + 1}</span>
                <div className="clean-meta">
                  <p className="clean-name">
                    {p.name}
                    {p.division && <span className="asia-division-badge">{p.division}</span>}
                  </p>
                  <p className="clean-sub">
                    {p.rounds} videos · {p.lead_cards} lead
                    {p.chase_cards > 0 && ` · ${p.chase_cards} chase`}
                    {p.pdga ? ` · #${p.pdga}` : ""}
                  </p>
                </div>
                <div className="clean-points-block">
                  <p className="clean-points">{primary.toLocaleString()}</p>
                  <p className="clean-points-label">
                    {sort === "lead" ? "lead" : sort === "tournaments" ? "events" : "videos"}
                  </p>
                </div>
                <span className="clean-row-chevron" aria-hidden />
              </Link>
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
    </>
  );
}
