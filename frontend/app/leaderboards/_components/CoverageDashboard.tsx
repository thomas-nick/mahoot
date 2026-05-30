"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CoverageCatalog } from "../_lib/coverageTypes";

type CoverageDashboardProps = {
  data: CoverageCatalog;
};

export function CoverageDashboard({ data }: CoverageDashboardProps) {
  const [query, setQuery] = useState("");
  const [multiOnly, setMultiOnly] = useState(true);

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.events.filter((event) => {
      if (multiOnly && !event.multi_source) return false;
      if (!q) return true;
      const hay = [event.id, event.title, event.year, ...(event.source_labels ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data.events, multiOnly, query]);

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="page-hero">
        <p className="page-hero-eyebrow">JomezPro · GK Pro · Gatekeeper</p>
        <h1 className="page-hero-title mt-2">Tournament Coverage</h1>
        <p className="page-hero-tag">
          {data.multi_source_event_count} events with multiple producers · {data.video_count.toLocaleString()}{" "}
          round videos indexed
        </p>
      </header>

      <div className="coverage-toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search event, year, Idlewild, OTB…"
          className="coverage-search"
        />
        <label className="coverage-toggle">
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
          />
          Multi-producer only
        </label>
      </div>

      <div className="coverage-event-list">
        {events.map((event) => (
          <Link key={event.id} href={`/leaderboards/coverage/${event.id}`} className="coverage-event-card">
            <div className="coverage-event-card-head">
              <h2>{event.title ?? event.id.replace(/_/g, " ")}</h2>
              {event.multi_source && <span className="coverage-badge">Multi-producer</span>}
            </div>
            <p className="coverage-event-meta">
              {event.source_labels.join(" · ")} · {event.video_count} videos
              {event.upload_window.earliest ? ` · ${event.upload_window.earliest}` : ""}
            </p>
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <p className="coverage-empty">No events match your filters.</p>
      )}
    </div>
  );
}
