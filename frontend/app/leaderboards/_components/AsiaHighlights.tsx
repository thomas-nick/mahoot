"use client";

import type { AsiaHighlights as AsiaHighlightsType } from "../_lib/asiaTypes";

interface AsiaHighlightsProps {
  highlights: AsiaHighlightsType;
}

export function AsiaHighlights({ highlights }: AsiaHighlightsProps) {
  const cards: Array<{
    key: string;
    label: string;
    value: string;
    sub: string;
    accent: string;
  }> = [];

  if (highlights.biggest_field) {
    cards.push({
      key: "biggest",
      label: "Biggest field",
      value: `${highlights.biggest_field.field_size} players`,
      sub: highlights.biggest_field.title.split(" - ")[0],
      accent: "amber",
    });
  }
  if (highlights.strongest_mpo_field) {
    cards.push({
      key: "strongest",
      label: "Strongest MPO field",
      value: `${highlights.strongest_mpo_field.avg_rating} avg`,
      sub: highlights.strongest_mpo_field.title,
      accent: "blue",
    });
  }
  if (highlights.most_diverse_event) {
    cards.push({
      key: "diverse",
      label: "Most international",
      value: `${highlights.most_diverse_event.country_count} countries`,
      sub: highlights.most_diverse_event.title.split(" - ")[0],
      accent: "teal",
    });
  }
  if (highlights.most_active_player) {
    cards.push({
      key: "active",
      label: "Most events played",
      value: `${highlights.most_active_player.events} events`,
      sub: `${highlights.most_active_player.flag} ${highlights.most_active_player.name.replace(/\s#\d+$/, "")}`,
      accent: "purple",
    });
  }
  if (highlights.most_wins_player) {
    cards.push({
      key: "wins",
      label: "Most wins",
      value: `${highlights.most_wins_player.wins} 🏆`,
      sub: `${highlights.most_wins_player.flag} ${highlights.most_wins_player.name.replace(/\s#\d+$/, "")}`,
      accent: "rose",
    });
  }
  if (highlights.podium_machine) {
    cards.push({
      key: "podium",
      label: "Podium machine",
      value: `${highlights.podium_machine.podiums} podiums`,
      sub: `${highlights.podium_machine.flag} ${highlights.podium_machine.name.replace(/\s#\d+$/, "")}`,
      accent: "emerald",
    });
  }

  if (!cards.length) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <h2 className="asia-section-title">2025-2026 highlights</h2>
        <p className="asia-section-sub">Notable performances across {cards.length} categories</p>
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
