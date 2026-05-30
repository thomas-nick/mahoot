"use client";

import type { CoverageTourTag, CoverageTourTagId } from "../_lib/coverageTypes";
import { COVERAGE_TOUR_TAG_ORDER } from "../_lib/coverageTags";
import { CoverageTourTagBadge } from "./CoverageTourTagBadge";

type Props = {
  tags: CoverageTourTag[];
  activeTag: CoverageTourTagId | null;
  onSelectTag: (tag: CoverageTourTagId | null) => void;
  totalEvents: number;
};

export function CoverageTourTags({ tags, activeTag, onSelectTag, totalEvents }: Props) {
  const byId = new Map(tags.map((t) => [t.id, t]));
  const ordered = COVERAGE_TOUR_TAG_ORDER.map((id) => byId.get(id)).filter(Boolean) as CoverageTourTag[];

  if (ordered.length === 0) return null;

  return (
    <div className="jomezpro-tag-section">
      <header className="jomezpro-tag-header">
        <h3 className="jomezpro-tag-title">Event tags</h3>
        <p className="jomezpro-tag-sub">Major, DGPT Elite, PDGA NT, Jomez Tour, Go Throw Tour</p>
      </header>
      <div className="asia-country-grid jomezpro-player-tag-grid">
        <button
          type="button"
          className={`asia-country-chip ${activeTag === null ? "asia-country-chip-active" : ""}`}
          onClick={() => onSelectTag(null)}
        >
          <span className="asia-country-flag">🏷️</span>
          <span className="asia-country-name">All events</span>
          <span className="asia-country-count">{totalEvents}</span>
        </button>
        {ordered.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`asia-country-chip ${activeTag === t.id ? "asia-country-chip-active" : ""}`}
            onClick={() => onSelectTag(activeTag === t.id ? null : t.id)}
          >
            <span className="asia-country-flag coverage-tour-chip-badge">
              <CoverageTourTagBadge tag={t.id} />
            </span>
            <span className="asia-country-name">{t.label}</span>
            <span className="asia-country-count">{t.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
