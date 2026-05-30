"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CoveragePlayersIndex } from "../_lib/coveragePlayerTypes";
import { filterByDivision, type DivisionFilter } from "../_lib/coverageMatchup";

type SortMode = "wins" | "podiums" | "points" | "events" | "streak" | "form" | "filmed" | "lead";

type Props = {
  index: CoveragePlayersIndex;
  division?: DivisionFilter;
};

export function CoveragePlayersLeaderboard({ index, division = "all" }: Props) {
  const [sort, setSort] = useState<SortMode>("wins");

  const players = useMemo(() => {
    const list = filterByDivision([...index.players], division);
    list.sort((a, b) => {
      if (sort === "wins") return b.wins - a.wins || b.podiums - a.podiums;
      if (sort === "podiums") return b.podiums - a.podiums || b.wins - a.wins;
      if (sort === "points") return b.pdga_points - a.pdga_points;
      if (sort === "streak") {
        return (b.current_win_streak ?? 0) - (a.current_win_streak ?? 0) ||
          (b.current_podium_streak ?? 0) - (a.current_podium_streak ?? 0);
      }
      if (sort === "form") {
        const af = a.form_avg_finish ?? 999;
        const bf = b.form_avg_finish ?? 999;
        return af - bf;
      }
      if (sort === "filmed") return (b.media_rounds ?? 0) - (a.media_rounds ?? 0);
      if (sort === "lead") return (b.media_lead_cards ?? 0) - (a.media_lead_cards ?? 0);
      return b.events_played - a.events_played;
    });
    return list.slice(0, 24);
  }, [index.players, sort, division]);

  const leader =
    sort === "wins"
      ? players[0]?.wins || 1
      : sort === "podiums"
        ? players[0]?.podiums || 1
        : sort === "points"
          ? players[0]?.pdga_points || 1
          : sort === "streak"
            ? players[0]?.current_win_streak || players[0]?.current_podium_streak || 1
            : sort === "form"
              ? players.find((p) => p.form_avg_finish != null)?.form_avg_finish || 1
              : sort === "filmed"
                ? players[0]?.media_rounds || 1
                : sort === "lead"
                  ? players[0]?.media_lead_cards || 1
                  : players[0]?.events_played || 1;

  return (
    <section className="asia-section coverage-players-section">
      <div className="asia-controls">
        <div className="asia-control-group">
          {(
            [
              ["wins", "Wins"],
              ["podiums", "Podiums"],
              ["points", "PDGA pts"],
              ["streak", "Streaks"],
              ["form", "Form"],
              ["filmed", "On film"],
              ["lead", "Lead cards"],
              ["events", "Events"],
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
            sort === "wins"
              ? p.wins
              : sort === "podiums"
                ? p.podiums
                : sort === "points"
                  ? p.pdga_points
                  : sort === "streak"
                    ? p.current_win_streak || p.current_podium_streak || 0
                    : sort === "form"
                      ? p.form_avg_finish ?? 0
                      : sort === "filmed"
                        ? p.media_rounds ?? 0
                        : sort === "lead"
                          ? p.media_lead_cards ?? 0
                          : p.events_played;
          const barWidth =
            sort === "form"
              ? primary > 0 && leader
                ? (leader / primary) * 100
                : 0
              : leader
                ? (primary / leader) * 100
                : 0;
          return (
            <li key={p.pdga} className="clean-item">
              <Link
                href={`/leaderboards/coverage/player/${p.pdga}`}
                className="clean-row coverage-tour-player-row"
              >
                <span className={`clean-rank ${i === 0 ? "clean-rank-leader" : ""}`}>{i + 1}</span>
                <div className="clean-meta">
                  <p className="clean-name">
                    {p.name}
                    {p.rating != null && <span className="asia-rating"> · {p.rating}</span>}
                    <span className="asia-division-badge">{p.division}</span>
                  </p>
                  <p className="clean-sub">
                    #{p.pdga} · {p.events_played} ev
                    {p.wins > 0 && ` · ${p.wins}W`}
                    {p.podiums > 0 && ` · ${p.podiums}P`}
                    {(p.current_win_streak ?? 0) > 0 && ` · ${p.current_win_streak}W streak`}
                    {p.form_avg_finish != null && ` · form ${p.form_avg_finish}`}
                  </p>
                </div>
                <div className="clean-points-block">
                  <p className="clean-points">
                    {sort === "form" ? primary.toFixed(1) : Math.round(primary).toLocaleString()}
                  </p>
                  <p className="clean-points-label">
                    {sort === "wins"
                      ? "wins"
                      : sort === "podiums"
                        ? "podiums"
                        : sort === "points"
                          ? "pts"
                          : sort === "streak"
                            ? "streak"
                            : sort === "form"
                              ? "avg"
                              : sort === "filmed"
                                ? "videos"
                                : sort === "lead"
                                  ? "lead"
                                  : "events"}
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
    </section>
  );
}
