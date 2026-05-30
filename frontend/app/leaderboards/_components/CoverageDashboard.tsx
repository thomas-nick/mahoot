"use client";

import { useMemo, useRef, useState } from "react";
import type { CoverageCatalog, CoverageTourTagId } from "../_lib/coverageTypes";
import {
  buildPlayerTags,
  buildSourceTags,
  buildYearTags,
  computeHighlights,
  eventMatchesPlayer,
} from "../_lib/coverageStats";
import { CoverageEventList } from "./CoverageEventList";
import { CoverageHighlights } from "./CoverageHighlights";
import { CoveragePlayerTags } from "./CoveragePlayerTags";
import { CoveragePodium } from "./CoveragePodium";
import { CoverageTourTags } from "./CoverageTourTags";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";

type SortMode = "videos" | "sources" | "recent" | "name";

type Props = {
  data: CoverageCatalog;
};

export function CoverageDashboard({ data }: Props) {
  const [year, setYear] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [playerTag, setPlayerTag] = useState<string | null>(null);
  const [tourTag, setTourTag] = useState<CoverageTourTagId | null>(null);
  const [multiOnly, setMultiOnly] = useState(true);
  const [sort, setSort] = useState<SortMode>("recent");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const leaderboardRef = useRef<HTMLDivElement | null>(null);

  const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : "—";
  const yearTags = useMemo(() => buildYearTags(data.events), [data.events]);
  const sourceTags = useMemo(() => buildSourceTags(data.events, data.source_labels), [data.events, data.source_labels]);
  const playerTags = useMemo(() => buildPlayerTags(data.events), [data.events]);
  const highlights = useMemo(() => computeHighlights(data), [data]);

  const podiumEvents = useMemo(() => {
    return data.events
      .filter((e) => e.multi_source)
      .sort((a, b) => b.source_count - a.source_count || b.video_count - a.video_count)
      .slice(0, 3);
  }, [data.events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let events = [...data.events];

    if (multiOnly) {
      events = events.filter((e) => e.multi_source);
    }
    if (year !== "all") {
      events = events.filter((e) => e.year === year);
    }
    if (source !== "all") {
      events = events.filter((e) => e.sources.includes(source as CoverageCatalog["sources"][number]));
    }
    if (playerTag) {
      events = events.filter((e) => eventMatchesPlayer(e, playerTag));
    }
    if (tourTag) {
      events = events.filter((e) => e.tour_tag === tourTag);
    }
    if (q) {
      events = events.filter((e) => {
        const hay = [e.id, e.title, e.year, ...e.source_labels].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    events.sort((a, b) => {
      if (sort === "sources") return b.source_count - a.source_count || b.video_count - a.video_count;
      if (sort === "recent") {
        return (b.upload_window.latest ?? "").localeCompare(a.upload_window.latest ?? "");
      }
      if (sort === "name") {
        return (a.title ?? a.id).localeCompare(b.title ?? b.id);
      }
      return b.video_count - a.video_count;
    });

    return events;
  }, [data.events, multiOnly, year, source, playerTag, tourTag, query, sort]);

  const scrollToLeaderboard = () => {
    leaderboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectYear = (value: string) => {
    setYear(value);
    setSelected(null);
    scrollToLeaderboard();
  };

  const selectSource = (value: string) => {
    setSource(value);
    setSelected(null);
    scrollToLeaderboard();
  };

  const selectPlayer = (tag: string | null) => {
    setPlayerTag(tag);
    setSelected(null);
    scrollToLeaderboard();
  };

  const selectTourTag = (tag: CoverageTourTagId | null) => {
    setTourTag(tag);
    setSelected(null);
    scrollToLeaderboard();
  };

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero">
        <p className="page-hero-eyebrow">JomezPro · GK Pro · Gatekeeper</p>
        <h1 className="page-hero-title">Tournament Coverage</h1>
        <p className="page-hero-tag">
          Same event, different cards — round videos aligned across producers by upload date and division.
        </p>
        <div className="page-hero-stats">
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.event_count}</span>
            <span className="page-hero-stat-label">events</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.video_count.toLocaleString()}</span>
            <span className="page-hero-stat-label">round videos</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.multi_source_event_count}</span>
            <span className="page-hero-stat-label">multi-producer</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.sources.length}</span>
            <span className="page-hero-stat-label">channels</span>
          </div>
        </div>
        <p className="page-hero-updated">Indexed · Updated {updated}</p>
      </header>

      {podiumEvents.length >= 3 && <CoveragePodium events={podiumEvents} />}

      <CoverageHighlights highlights={highlights} />

      <section className="asia-section" ref={leaderboardRef}>
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">Full event catalog</h2>
            <p className="asia-section-sub">
              All {filtered.length} events · filter by year, producer, or player below
            </p>
          </div>
        </header>

        <div className="asia-country-grid">
          <button
            type="button"
            className={`asia-country-chip ${year === "all" ? "asia-country-chip-active" : ""}`}
            onClick={() => selectYear("all")}
          >
            <span className="asia-country-flag">📅</span>
            <span className="asia-country-name">All years</span>
            <span className="asia-country-count">{data.event_count}</span>
          </button>
          {yearTags.map((y) => (
            <button
              key={y.year}
              type="button"
              className={`asia-country-chip ${year === y.year ? "asia-country-chip-active" : ""}`}
              onClick={() => selectYear(y.year)}
            >
              <span className="asia-country-flag">{y.year.slice(2)}</span>
              <span className="asia-country-name">{y.year}</span>
              <span className="asia-country-count">{y.count}</span>
            </button>
          ))}
        </div>

        <div className="asia-country-grid coverage-source-grid">
          <button
            type="button"
            className={`asia-country-chip ${source === "all" ? "asia-country-chip-active" : ""}`}
            onClick={() => selectSource("all")}
          >
            <span className="asia-country-flag">▶</span>
            <span className="asia-country-name">All producers</span>
            <span className="asia-country-count">{data.event_count}</span>
          </button>
          {sourceTags.map((s) => (
            <button
              key={s.source}
              type="button"
              className={`asia-country-chip ${source === s.source ? "asia-country-chip-active" : ""}`}
              onClick={() => selectSource(s.source)}
            >
              <span className="asia-country-flag">{s.label.slice(0, 2).toUpperCase()}</span>
              <span className="asia-country-name">{s.label}</span>
              <span className="asia-country-count">{s.count}</span>
            </button>
          ))}
        </div>

        {(data.tour_tags?.length ?? 0) > 0 && (
          <CoverageTourTags
            tags={data.tour_tags ?? []}
            activeTag={tourTag}
            onSelectTag={selectTourTag}
            totalEvents={data.event_count}
          />
        )}

        <CoveragePlayerTags tags={playerTags} activeTag={playerTag} onSelectTag={selectPlayer} />

        <div className="asia-controls">
          <div className="asia-control-group">
            <button
              type="button"
              className={`scoring-pill ${multiOnly ? "scoring-pill-active" : ""}`}
              onClick={() => setMultiOnly(true)}
            >
              Multi-producer
            </button>
            <button
              type="button"
              className={`scoring-pill ${!multiOnly ? "scoring-pill-active" : ""}`}
              onClick={() => setMultiOnly(false)}
            >
              All events
            </button>
          </div>
          <div className="asia-control-group">
            <button type="button" className={`scoring-pill ${sort === "videos" ? "scoring-pill-active" : ""}`} onClick={() => setSort("videos")}>Videos</button>
            <button type="button" className={`scoring-pill ${sort === "sources" ? "scoring-pill-active" : ""}`} onClick={() => setSort("sources")}>Producers</button>
            <button type="button" className={`scoring-pill ${sort === "recent" ? "scoring-pill-active" : ""}`} onClick={() => setSort("recent")}>Recent</button>
            <button type="button" className={`scoring-pill ${sort === "name" ? "scoring-pill-active" : ""}`} onClick={() => setSort("name")}>Name</button>
          </div>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search event, Idlewild, OTB, McBeth…"
          className="coverage-search asia-search"
        />

        <CoverageEventList events={filtered} selectedId={selected} onSelect={setSelected} />
      </section>

      <details className="tour-scoring-details">
        <summary className="tour-scoring-summary">
          <span>How coverage matching works</span>
          <span className="tour-scoring-summary-hint">event ID · upload window · round slot</span>
        </summary>
        <section className="tour-scoring-legend">
          <p className="data-insights-sub">{data.description}</p>
          <div className="tour-scoring-grid">
            <div className="tour-scoring-block">
              <p className="tour-scoring-heading">Producers indexed</p>
              <ul className="tour-scoring-list">
                {data.sources.map((sourceKey) => (
                  <li key={sourceKey}>
                    <span className="tour-level-label">{data.source_labels[sourceKey]}</span>
                    <span className="tour-level-mult">{sourceTags.find((s) => s.source === sourceKey)?.count ?? 0} events</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="tour-scoring-block">
              <p className="tour-scoring-heading">Watch grid rows</p>
              <p className="tour-scoring-formula">
                Rows group by division, round, and F9/B9 (newest uploads first). Columns are producers.
                When a video title includes Lead, Chase, or Feature, that card role appears on the link.
                GK Pro and Gatekeeper often omit the card name in the title — those links show players only.
              </p>
            </div>
          </div>
        </section>
      </details>

      <UpdateFooter />
    </div>
  );
}
