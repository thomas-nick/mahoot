"use client";

import Link from "next/link";
import type { CoverageEvent } from "../_lib/coverageTypes";

const SOURCE_ICONS: Record<string, string> = {
  jomezpro: "JP",
  gkpro: "GK",
  gatekeeper: "GKM",
};

type Props = {
  events: CoverageEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function CoverageEventList({ events, selectedId, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <div className="asia-empty">
        <p>No events in this view yet.</p>
        <p className="asia-empty-sub">Try clearing filters or run build_coverage_catalog.py --mahoot</p>
      </div>
    );
  }

  const leader = events[0]?.video_count ?? 1;

  return (
    <ul className="clean-list player-tour-list">
      {events.map((event, index) => {
        const isOpen = selectedId === event.id;
        const rank = index + 1;
        const barWidth = leader ? (event.video_count / leader) * 100 : 0;

        return (
          <li key={event.id} className={`clean-item ${isOpen ? "clean-item-open" : ""}`}>
            <button
              type="button"
              className="clean-row player-tour-row asia-row"
              onClick={() => onSelect(isOpen ? null : event.id)}
              aria-expanded={isOpen}
            >
              <span className={`clean-rank ${rank === 1 ? "clean-rank-leader" : ""}`}>{rank}</span>
              <span className="asia-flag coverage-event-year" aria-hidden>
                {event.year?.slice(2) ?? "—"}
              </span>
              <div className="clean-meta">
                <p className="clean-name">{event.title ?? event.id.replace(/_/g, " ")}</p>
                <p className="clean-sub">
                  {event.source_labels.join(" · ")}
                  {event.upload_window.earliest ? ` · ${event.upload_window.earliest}` : ""}
                </p>
                <div className="clean-bar-track" aria-hidden>
                  <div className="clean-bar-fill" style={{ width: `${barWidth}%` }} />
                </div>
              </div>
              <div className="clean-stat-block">
                <span className="clean-stat">{event.video_count}</span>
                <span className="clean-stat-label">videos</span>
              </div>
              <span className="clean-row-chevron" aria-hidden>{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="clean-detail coverage-event-detail">
                <div className="coverage-event-pills">
                  {event.multi_source && <span className="coverage-badge">Multi-producer</span>}
                  {event.sources.map((source) => (
                    <span key={source} className="asia-podium-pill">
                      {SOURCE_ICONS[source] ?? "▶"} {source}
                    </span>
                  ))}
                </div>
                <p className="coverage-event-detail-copy">
                  {event.round_rows.length} round rows indexed
                  {event.course ? ` · ${event.course}` : ""}
                </p>
                <Link href={`/leaderboards/coverage/${event.id}`} className="coverage-event-open-link">
                  Open watch grid →
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
