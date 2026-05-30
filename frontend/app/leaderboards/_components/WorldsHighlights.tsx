"use client";

import type { WorldsCoverageCatalog, WorldsEdition } from "../_lib/worldsCoverageTypes";

type Props = {
  data: WorldsCoverageCatalog;
  proEditions: WorldsEdition[];
};

export function WorldsHighlights({ data, proEditions }: Props) {
  const cards: Array<{
    key: string;
    label: string;
    value: string;
    sub: string;
    accent: string;
  }> = [];

  const topProducer = Object.entries(data.by_producer).sort((a, b) => b[1] - a[1])[0];
  if (topProducer) {
    cards.push({
      key: "producer",
      label: "Most archived",
      value: data.source_labels[topProducer[0] as keyof typeof data.source_labels] ?? topProducer[0],
      sub: `${topProducer[1]} videos indexed`,
      accent: "purple",
    });
  }

  const deepest = [...proEditions].sort((a, b) => b.round_count - a.round_count)[0];
  if (deepest?.round_count) {
    cards.push({
      key: "deepest",
      label: "Deepest Pro Worlds archive",
      value: `${deepest.round_count} rounds`,
      sub: deepest.year ?? deepest.label,
      accent: "amber",
    });
  }

  const multi = proEditions.filter((e) => e.producers.length >= 3).sort((a, b) => b.year!.localeCompare(a.year!))[0];
  if (multi) {
    cards.push({
      key: "multi",
      label: "Most producers",
      value: `${multi.producers.length} channels`,
      sub: `${multi.year} · ${multi.producer_labels.join(", ")}`,
      accent: "teal",
    });
  }

  if (data.year_range.earliest) {
    cards.push({
      key: "earliest",
      label: "Archive starts",
      value: data.year_range.earliest,
      sub: "earliest indexed round coverage",
      accent: "blue",
    });
  }

  const roundTotal = data.by_content_type.round ?? 0;
  cards.push({
    key: "rounds",
    label: "Round videos",
    value: roundTotal.toLocaleString(),
    sub: `${data.video_count.toLocaleString()} total across ${data.edition_count} editions`,
    accent: "emerald",
  });

  if (cards.length < 3) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <div>
          <h2 className="asia-section-title">Worlds archive</h2>
          <p className="asia-section-sub">Coverage indexed from {data.year_range.earliest}–{data.year_range.latest}</p>
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
