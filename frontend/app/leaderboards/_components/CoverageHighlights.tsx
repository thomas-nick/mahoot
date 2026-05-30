"use client";

import Link from "next/link";
import type { CoverageHighlights as CoverageHighlightsType } from "../_lib/coverageStats";

type Props = {
  highlights: CoverageHighlightsType;
};

export function CoverageHighlights({ highlights }: Props) {
  const cards: Array<{
    key: string;
    label: string;
    value: string;
    sub: string;
    accent: string;
    href?: string;
  }> = [];

  if (highlights.most_videos) {
    cards.push({
      key: "most-videos",
      label: "Most round videos",
      value: `${highlights.most_videos.video_count} videos`,
      sub: highlights.most_videos.title,
      accent: "amber",
      href: `/leaderboards/coverage/${highlights.most_videos.id}`,
    });
  }
  if (highlights.most_producers) {
    cards.push({
      key: "most-producers",
      label: "Most producers",
      value: `${highlights.most_producers.source_count} channels`,
      sub: highlights.most_producers.source_labels.join(" · "),
      accent: "blue",
      href: `/leaderboards/coverage/${highlights.most_producers.id}`,
    });
  }
  if (highlights.busiest_player) {
    cards.push({
      key: "busiest-player",
      label: "Most indexed rounds",
      value: `${highlights.busiest_player.rounds} videos`,
      sub: `${highlights.busiest_player.name} · ${highlights.busiest_player.tournaments} events`,
      accent: "purple",
    });
  }
  if (highlights.latest_multi) {
    cards.push({
      key: "latest-multi",
      label: "Latest multi-producer",
      value: highlights.latest_multi.upload_latest,
      sub: `${highlights.latest_multi.title} · ${highlights.latest_multi.source_labels.join(" · ")}`,
      accent: "teal",
      href: `/leaderboards/coverage/${highlights.latest_multi.id}`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <h2 className="asia-section-title">Coverage highlights</h2>
        <p className="asia-section-sub">Notable events and players across the indexed catalog</p>
      </header>
      <div className="asia-highlights-grid">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="asia-highlight-label">{c.label}</p>
              <p className="asia-highlight-value">{c.value}</p>
              <p className="asia-highlight-sub">{c.sub}</p>
            </>
          );
          return c.href ? (
            <Link key={c.key} href={c.href} className={`asia-highlight asia-highlight-${c.accent} coverage-highlight-link`}>
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
