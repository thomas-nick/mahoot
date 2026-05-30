"use client";

import Link from "next/link";
import type { HubBoardGroup, HubBoardPreview, LeaderboardsHubSnapshot } from "../_lib/leaderboardsHubTypes";
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
      <h2 className="leaderboard-hub-card-title">{board.title}</h2>
      <p className="leaderboard-hub-card-stat">{board.statPrimary}</p>
      {board.statSecondary && <p className="leaderboard-hub-card-stat-sub">{board.statSecondary}</p>}
      <p className="leaderboard-hub-card-blurb">{board.blurb}</p>
      <div className="leaderboard-hub-card-foot">
        <span className="leaderboard-hub-card-cta">{board.cta}</span>
        {board.updatedAt && <span className="leaderboard-hub-card-updated">Updated {board.updatedAt}</span>}
      </div>
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

      <header className="page-hero mt-4">
        <p className="page-hero-eyebrow">2026 Season</p>
        <h1 className="page-hero-title mt-2">Leaderboards</h1>
        <p className="page-hero-tag">
          Live tour standings, brand championship, Asia pros, and multi-producer tournament coverage.
          {snapshot.latestUpdated && <> · Data through {snapshot.latestUpdated}</>}
        </p>
      </header>

      {snapshot.featured && (
        <Link href={snapshot.featured.href} className="leaderboard-hub-featured">
          <span className="leaderboard-hub-featured-label">Latest Elite finish</span>
          <h2 className="leaderboard-hub-featured-title">{snapshot.featured.title}</h2>
          <p className="leaderboard-hub-featured-winners">
            <span>MPO · {snapshot.featured.winnerMpo}</span>
            {snapshot.featured.winnerFpo && <span>FPO · {snapshot.featured.winnerFpo}</span>}
            {snapshot.featured.fieldSize != null && (
              <span className="leaderboard-hub-featured-field">{snapshot.featured.fieldSize} players</span>
            )}
          </p>
          <span className="leaderboard-hub-featured-cta">Results &amp; watch grid →</span>
        </Link>
      )}

      {grouped.map(({ group, label, boards }) => (
        <section key={group} className="leaderboard-hub-section">
          <h2 className="leaderboard-hub-section-title">{label}</h2>
          <div className={`leaderboard-hub-grid leaderboard-hub-grid-${group}`}>
            {boards.map((board) => (
              <BoardCard key={board.href} board={board} />
            ))}
          </div>
        </section>
      ))}

      <p className="leaderboard-hub-note">
        <strong>Player Tour Stats</strong> uses Mahoot&apos;s weighted season model (StatMando + PDGA).
        {" "}
        <strong>Tour finishes &amp; profiles</strong> is PDGA Elite/Major results linked to YouTube coverage.
      </p>
    </div>
  );
}
