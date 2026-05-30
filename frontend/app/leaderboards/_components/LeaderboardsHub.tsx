"use client";

import Link from "next/link";
import type { HubBoardGroup, HubBoardPreview, LeaderboardsHubSnapshot } from "../_lib/leaderboardsHubTypes";
import { LeaderboardsHighlights } from "./LeaderboardsHighlights";
import { SiteNav } from "./SiteNav";

type Props = {
  snapshot: LeaderboardsHubSnapshot;
};

const GROUP_LABEL: Record<HubBoardGroup, string> = {
  tour: "Tour standings",
  watch: "Watch & player profiles",
  regional: "Regional",
};

const GROUP_ORDER: HubBoardGroup[] = ["tour", "watch", "regional"];

function BoardCard({ board }: { board: HubBoardPreview }) {
  return (
    <Link href={board.href} className="leaderboard-hub-card">
      <span className="leaderboard-hub-card-bar" style={{ background: board.accent }} aria-hidden />
      <span className="leaderboard-hub-card-eyebrow">{board.eyebrow}</span>
      <h3 className="leaderboard-hub-card-title">{board.title}</h3>
      <p className="leaderboard-hub-card-stat">{board.stat}</p>
      <span className="leaderboard-hub-card-cta">{board.cta}</span>
    </Link>
  );
}

export function LeaderboardsHub({ snapshot }: Props) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABEL[group],
    boards: snapshot.boards.filter((b) => b.group === group),
  })).filter((g) => g.boards.length > 0);

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero">
        <p className="page-hero-eyebrow">2026 Season</p>
        <h1 className="page-hero-title">Leaderboards</h1>
        <p className="page-hero-tag">
          Live tour standings, the brand championship, Asia pros, and multi-producer tournament coverage —
          one home for every Mahoot leaderboard.
        </p>
        {snapshot.heroStats.length > 0 && (
          <div className="page-hero-stats">
            {snapshot.heroStats.map((s) => (
              <div key={s.label} className="page-hero-stat">
                <span className="page-hero-stat-value">{s.value}</span>
                <span className="page-hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}
        {snapshot.latestUpdated && (
          <p className="page-hero-updated">Live · Updated {snapshot.latestUpdated}</p>
        )}
      </header>

      {snapshot.anchors.length > 0 && (
        <div className="leaderboard-hub-anchors">
          {snapshot.anchors.map((a) => (
            <Link key={a.key} href={a.href} className="leaderboard-hub-anchor">
              <span className="leaderboard-hub-anchor-medal" aria-hidden>{a.medal}</span>
              <span className="leaderboard-hub-anchor-label">{a.label}</span>
              <span className="leaderboard-hub-anchor-name">{a.name}</span>
              <span className="leaderboard-hub-anchor-sub">{a.sub}</span>
            </Link>
          ))}
        </div>
      )}

      <LeaderboardsHighlights highlights={snapshot.highlights} />

      <section className="asia-section">
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">All leaderboards</h2>
            <p className="asia-section-sub">Pick a board to dive into standings, profiles, or coverage</p>
          </div>
        </header>

        {grouped.map(({ group, label, boards }) => (
          <div key={group} className="leaderboard-hub-group">
            <p className="leaderboard-hub-group-label">{label}</p>
            <div className="leaderboard-hub-grid">
              {boards.map((board) => (
                <BoardCard key={board.href} board={board} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <details className="tour-scoring-details">
        <summary className="tour-scoring-summary">
          <span>What&apos;s the difference?</span>
          <span className="tour-scoring-summary-hint">Player Tour vs Tour finishes</span>
        </summary>
        <section className="tour-scoring-legend">
          <p className="data-insights-sub">
            <strong>Player Tour Stats</strong> ranks pros by Mahoot&apos;s weighted season model — Majors,
            Elite Series and A-tiers scored by finish and tier, alongside the live DGPT world rank.
          </p>
          <p className="data-insights-sub">
            <strong>Tour finishes &amp; profiles</strong> is raw PDGA Elite &amp; Major results linked to
            multi-producer round coverage, with player profiles, streaks, form, and head-to-head.
          </p>
        </section>
      </details>
    </div>
  );
}
