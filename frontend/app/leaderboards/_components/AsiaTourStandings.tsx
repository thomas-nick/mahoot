"use client";

import { useState } from "react";
import type { AsiaTourStandingEntry } from "../_lib/asiaTypes";

interface AsiaTourStandingsProps {
  standings: AsiaTourStandingEntry[];
}

export function AsiaTourStandings({ standings }: AsiaTourStandingsProps) {
  const [division, setDivision] = useState<"all" | "MPO" | "FPO">("all");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = division === "all"
    ? standings
    : standings.filter((s) => s.division === division);

  if (!filtered.length) return null;

  const leader = filtered[0]?.total_points || 1;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <div>
          <h2 className="asia-section-title">
            <span className="asia-section-badge">OFFICIAL</span> 2026 PDGA Asia Tour Standings
          </h2>
          <p className="asia-section-sub">
            Top 4 finishes count · 1st=100, 2nd=90, 3rd=85 … 19th=5 · min 2 events to qualify
          </p>
        </div>
        <div className="asia-section-tabs">
          {(["all", "MPO", "FPO"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`asia-section-tab ${division === d ? "asia-section-tab-active" : ""}`}
              onClick={() => setDivision(d)}
            >
              {d === "all" ? "All" : d}
            </button>
          ))}
        </div>
      </header>

      <ol className="asia-tour-table">
        {filtered.slice(0, 25).map((s, i) => {
          const rank = i + 1;
          const isOpen = open === s.pdga;
          const barWidth = (s.total_points / leader) * 100;
          return (
            <li key={s.pdga} className={`asia-tour-row ${isOpen ? "asia-tour-row-open" : ""}`}>
              <button
                type="button"
                className="asia-tour-row-head"
                onClick={() => setOpen(isOpen ? null : s.pdga)}
                aria-expanded={isOpen}
              >
                <span className={`asia-tour-rank ${rank <= 3 ? `asia-tour-rank-${rank}` : ""}`}>
                  {rank}
                </span>
                <span className="asia-flag">{s.flag}</span>
                <div className="asia-tour-name-block">
                  <p className="asia-tour-name">
                    {s.name.replace(/\s#\d+$/, "")}
                    <span className="asia-division-badge">{s.division}</span>
                    {s.rating != null && <span className="asia-rating"> · {s.rating}</span>}
                  </p>
                  <p className="asia-tour-sub">
                    {s.country} · {s.events_played} tour events played · best {Math.min(4, s.events_played)} count
                  </p>
                </div>
                <div className="asia-tour-total">
                  <span className="asia-tour-total-value">{s.total_points}</span>
                  <span className="asia-tour-total-label">pts</span>
                </div>
                <span className="clean-row-chevron" aria-hidden />
              </button>
              {isOpen && (
                <div className="asia-tour-detail">
                  <div className="clean-bar clean-bar-expanded">
                    <div
                      className="clean-bar-fill"
                      style={{ width: `${Math.min(barWidth, 100)}%`, backgroundColor: "var(--accent)" }}
                    />
                  </div>
                  <p className="asia-tour-detail-label">All Asia Tour events</p>
                  <ul className="asia-tour-detail-list">
                    {s.all_results.map((r, j) => {
                      const counts = s.counting.some((c) => c.event_id === r.event_id);
                      return (
                        <li
                          key={`${r.event_id}-${j}`}
                          className={`asia-tour-detail-row ${counts ? "asia-tour-detail-counts" : ""}`}
                        >
                          <span className="asia-tour-detail-event">{r.event}</span>
                          <span className="asia-tour-detail-place">P{r.place}</span>
                          <span className="asia-tour-detail-points">{r.points} pts</span>
                          {counts && <span className="asia-tour-detail-flag">counts</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {filtered.length > 25 && (
        <p className="asia-tour-more">+ {filtered.length - 25} more qualified players</p>
      )}
    </section>
  );
}
