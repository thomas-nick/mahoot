"use client";

import type { SkinsData } from "../_lib/skinsTypes";

type Props = {
  data: SkinsData;
};

export function SkinsHighlights({ data }: Props) {
  const h = data.highlights;
  const cards: Array<{ key: string; label: string; value: string; sub: string; accent: string }> = [];

  if (h.biggest_payout) {
    cards.push({
      key: "payout",
      label: "Biggest skin",
      value: `$${h.biggest_payout.amount_usd.toLocaleString()}`,
      sub: `${h.biggest_payout.player} · ${h.biggest_payout.series} #${h.biggest_payout.episode}`,
      accent: "amber",
    });
  }
  if (h.highest_earner && h.highest_earner.earnings_usd > 0) {
    cards.push({
      key: "earner",
      label: "Top earner",
      value: `$${h.highest_earner.earnings_usd.toLocaleString()}`,
      sub: h.highest_earner.name,
      accent: "emerald",
    });
  }
  if (h.most_episodes) {
    cards.push({
      key: "appearances",
      label: "Most appearances",
      value: `${h.most_episodes.episodes} eps`,
      sub: h.most_episodes.name,
      accent: "blue",
    });
  }
  if (h.biggest_ace_pot) {
    cards.push({
      key: "ace",
      label: "Biggest ace pot",
      value: `$${h.biggest_ace_pot.amount_usd.toLocaleString()}`,
      sub: `${h.biggest_ace_pot.series} #${h.biggest_ace_pot.episode}`,
      accent: "purple",
    });
  }
  if (h.top_course) {
    cards.push({
      key: "course",
      label: "Most-played course",
      value: `${h.top_course.episode_count} eps`,
      sub: h.top_course.course,
      accent: "teal",
    });
  }

  if (!cards.length) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <div>
          <h2 className="asia-section-title">Skins highlights</h2>
          <p className="asia-section-sub">Across {data.series_breakdown.length} series since 2020</p>
        </div>
      </header>
      <div className="asia-highlights-grid">
        {cards.map((c) => (
          <div key={c.key} className={`asia-highlight asia-highlight-${c.accent}`}>
            <p className="asia-highlight-label">{c.label}</p>
            <p className="asia-highlight-value">{c.value}</p>
            <p className="asia-highlight-sub">{c.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
