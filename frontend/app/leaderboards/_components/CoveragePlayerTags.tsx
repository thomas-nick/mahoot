"use client";

import type { CoveragePlayerTag } from "../_lib/coverageStats";
import { displayPlayerName } from "../_lib/coverageStats";

type Props = {
  tags: CoveragePlayerTag[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
};

export function CoveragePlayerTags({ tags, activeTag, onSelectTag }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="jomezpro-tag-section">
      <header className="jomezpro-tag-header">
        <h3 className="jomezpro-tag-title">Player tags</h3>
        <p className="jomezpro-tag-sub">Click a player to filter events and round videos</p>
      </header>
      <div className="asia-country-grid jomezpro-player-tag-grid">
        <button
          type="button"
          className={`asia-country-chip ${activeTag === null ? "asia-country-chip-active" : ""}`}
          onClick={() => onSelectTag(null)}
        >
          <span className="asia-country-flag">👤</span>
          <span className="asia-country-name">All players</span>
          <span className="asia-country-count">{tags.length}+</span>
        </button>
        {tags.map((t) => (
          <button
            key={t.tag}
            type="button"
            className={`asia-country-chip ${activeTag === t.tag ? "asia-country-chip-active" : ""}`}
            onClick={() => onSelectTag(activeTag === t.tag ? null : t.tag)}
            title={t.name}
          >
            <span className="asia-country-flag">{t.name.split(" ").pop()?.slice(0, 2).toUpperCase() ?? "?"}</span>
            <span className="asia-country-name">{displayPlayerName(t.name)}</span>
            <span className="asia-country-count">{t.rounds}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
