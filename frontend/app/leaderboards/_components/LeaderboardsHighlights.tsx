"use client";

import Link from "next/link";
import type { HubHighlight } from "../_lib/leaderboardsHubTypes";

type Props = {
  highlights: HubHighlight[];
};

export function LeaderboardsHighlights({ highlights }: Props) {
  if (!highlights.length) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <div>
          <h2 className="asia-section-title">Across the boards</h2>
          <p className="asia-section-sub">Standout numbers from every leaderboard this season</p>
        </div>
      </header>
      <div className="asia-highlights-grid">
        {highlights.map((c) => {
          const inner = (
            <>
              <p className="asia-highlight-label">{c.label}</p>
              <p className="asia-highlight-value">{c.value}</p>
              <p className="asia-highlight-sub">{c.sub}</p>
            </>
          );
          return c.href ? (
            <Link
              key={c.key}
              href={c.href}
              className={`asia-highlight asia-highlight-${c.accent} coverage-highlight-link`}
            >
              {inner}
            </Link>
          ) : (
            <div key={c.key} className={`asia-highlight asia-highlight-${c.accent}`}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
