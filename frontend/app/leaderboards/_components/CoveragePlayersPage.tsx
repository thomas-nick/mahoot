"use client";

import Link from "next/link";
import { useState } from "react";
import { CoverageMediaLeaderboard } from "./CoverageMediaLeaderboard";
import { CoveragePlayersLeaderboard } from "./CoveragePlayersLeaderboard";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";
import type { DivisionFilter } from "../_lib/coverageMatchup";
import type { CoverageMediaStatsIndex, CoveragePlayersIndex } from "../_lib/coveragePlayerTypes";

type Props = {
  index: CoveragePlayersIndex;
  mediaIndex?: CoverageMediaStatsIndex | null;
};

type View = "finishes" | "filmed";

export function CoveragePlayersPage({ index, mediaIndex }: Props) {
  const [view, setView] = useState<View>("finishes");
  const [division, setDivision] = useState<DivisionFilter>("all");
  const updated = index.updated_at ? new Date(index.updated_at).toLocaleString() : "—";

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero mt-4">
        <p className="page-hero-eyebrow">Elite &amp; Majors · PDGA finishes &amp; coverage</p>
        <h1 className="page-hero-title">Players</h1>
        <p className="page-hero-tag">
          {index.player_count.toLocaleString()} pros with linked event results
          {mediaIndex ? ` · ${mediaIndex.player_count.toLocaleString()} filmed in coverage catalog` : ""}
        </p>
        <div className="page-hero-stats">
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{index.player_count.toLocaleString()}</span>
            <span className="page-hero-stat-label">players</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{index.event_count}</span>
            <span className="page-hero-stat-label">events w/ results</span>
          </div>
          {mediaIndex && (
            <div className="page-hero-stat">
              <span className="page-hero-stat-value">{mediaIndex.event_count}</span>
              <span className="page-hero-stat-label">filmed events</span>
            </div>
          )}
        </div>
        <p className="page-hero-updated">
          Updated {updated}
          {" · "}
          <Link href="/leaderboards/coverage/matchup" className="coverage-event-open-link">
            Head to head matchup
          </Link>
        </p>
      </header>

      <div className="asia-controls coverage-player-tabs">
        <div className="asia-control-group">
          {(["all", "MPO", "FPO"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`scoring-pill ${division === d ? "scoring-pill-active" : ""}`}
              onClick={() => setDivision(d)}
            >
              {d === "all" ? "All divisions" : d}
            </button>
          ))}
        </div>
      </div>

      {mediaIndex && (
        <div className="asia-controls coverage-player-tabs">
          <div className="asia-control-group">
            <button
              type="button"
              className={`scoring-pill ${view === "finishes" ? "scoring-pill-active" : ""}`}
              onClick={() => setView("finishes")}
            >
              Event finishes
            </button>
            <button
              type="button"
              className={`scoring-pill ${view === "filmed" ? "scoring-pill-active" : ""}`}
              onClick={() => setView("filmed")}
            >
              Most filmed
            </button>
          </div>
        </div>
      )}

      {view === "finishes" ? (
        <CoveragePlayersLeaderboard index={index} division={division} />
      ) : (
        mediaIndex && <CoverageMediaLeaderboard index={mediaIndex} division={division} />
      )}

      <UpdateFooter />
    </div>
  );
}
