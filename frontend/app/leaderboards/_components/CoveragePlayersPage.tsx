"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CoverageMediaLeaderboard } from "./CoverageMediaLeaderboard";
import { CoveragePlayersLeaderboard } from "./CoveragePlayersLeaderboard";
import { CoveragePlayersPodium } from "./CoveragePlayersPodium";
import { CoveragePlayersHighlights } from "./CoveragePlayersHighlights";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";
import { filterByDivision, type DivisionFilter } from "../_lib/coverageMatchup";
import type { CoverageMediaStatsIndex, CoveragePlayersIndex } from "../_lib/coveragePlayerTypes";

type Props = {
  index: CoveragePlayersIndex;
  mediaIndex?: CoverageMediaStatsIndex | null;
};

type View = "finishes" | "filmed";

export function CoveragePlayersPage({ index, mediaIndex }: Props) {
  const [view, setView] = useState<View>("finishes");
  const [division, setDivision] = useState<DivisionFilter>("all");
  const leaderboardRef = useRef<HTMLElement | null>(null);
  const updated = index.updated_at ? new Date(index.updated_at).toLocaleString() : "—";

  const divisionPlayers = useMemo(
    () => filterByDivision([...index.players], division),
    [index.players, division],
  );

  const podium = useMemo(
    () =>
      [...divisionPlayers]
        .sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.pdga_points - a.pdga_points)
        .slice(0, 3),
    [divisionPlayers],
  );

  const scrollToLeaderboard = () => {
    leaderboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero mt-4">
        <p className="page-hero-eyebrow">Elite &amp; Majors · PDGA finishes &amp; coverage</p>
        <h1 className="page-hero-title">Players</h1>
        <p className="page-hero-tag">
          Every pro with PDGA finishes from filmed Elite &amp; Major events — profiles, streaks, form,
          and head-to-head, all linked to multi-producer round coverage.
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
              <span className="page-hero-stat-value">{mediaIndex.player_count.toLocaleString()}</span>
              <span className="page-hero-stat-label">filmed pros</span>
            </div>
          )}
          {mediaIndex && (
            <div className="page-hero-stat">
              <span className="page-hero-stat-value">{mediaIndex.event_count}</span>
              <span className="page-hero-stat-label">filmed events</span>
            </div>
          )}
        </div>
        <p className="page-hero-updated">
          Live · Updated {updated}
          {" · "}
          <Link href="/leaderboards/coverage/matchup" className="coverage-event-open-link">
            Head to head matchup
          </Link>
        </p>
      </header>

      <CoveragePlayersPodium players={podium} />

      <CoveragePlayersHighlights players={divisionPlayers} />

      <section className="asia-section coverage-players-section" ref={leaderboardRef}>
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">Full leaderboard</h2>
            <p className="asia-section-sub">
              {view === "finishes"
                ? "Tour finishes, streaks and form — sort and filter below"
                : "Most rounds filmed across the coverage catalog"}
            </p>
          </div>
        </header>

        <div className="asia-controls">
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
          {mediaIndex && (
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
          )}
        </div>

        {view === "finishes" ? (
          <CoveragePlayersLeaderboard index={index} division={division} />
        ) : (
          mediaIndex && <CoverageMediaLeaderboard index={mediaIndex} division={division} />
        )}
      </section>

      <UpdateFooter />
    </div>
  );
}
