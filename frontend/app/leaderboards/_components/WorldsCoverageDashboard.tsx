"use client";

import { useMemo, useRef, useState } from "react";
import { buildYearTags, filterEditions } from "../_lib/worldsCoverageData";
import type { WorldsCoverageCatalog, WorldsType } from "../_lib/worldsCoverageTypes";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";
import { WorldsEditionList } from "./WorldsEditionList";
import { WorldsHighlights } from "./WorldsHighlights";

type Props = {
  data: WorldsCoverageCatalog;
};

const WORLDS_TYPE_ORDER: Array<{ id: WorldsType | "all"; label: string }> = [
  { id: "pro_worlds", label: "Pro Worlds" },
  { id: "masters_worlds", label: "Masters" },
  { id: "am_worlds", label: "Amateur" },
  { id: "mixed_doubles_worlds", label: "Mixed doubles" },
  { id: "all", label: "All types" },
];

export function WorldsCoverageDashboard({ data }: Props) {
  const [year, setYear] = useState("all");
  const [worldsType, setWorldsType] = useState<WorldsType | "all">("pro_worlds");
  const [producer, setProducer] = useState("all");
  const [roundsOnly, setRoundsOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<HTMLElement | null>(null);

  const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : "—";
  const proEditions = useMemo(
    () => data.editions.filter((e) => e.worlds_type === "pro_worlds"),
    [data.editions],
  );
  const yearTags = useMemo(() => buildYearTags(data.editions), [data.editions]);

  const filtered = useMemo(
    () =>
      filterEditions(data.editions, {
        year,
        worldsType,
        producer,
        roundsOnly,
        query,
      }),
    [data.editions, year, worldsType, producer, roundsOnly, query],
  );

  const videoCount = filtered.reduce((sum, e) => sum + e.video_count, 0);
  const roundCount = filtered.reduce((sum, e) => sum + e.round_count, 0);

  const scrollToList = () => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero">
        <p className="page-hero-eyebrow">PDGA &amp; disc golf championships · 2012–{data.year_range.latest}</p>
        <h1 className="page-hero-title">Worlds Coverage</h1>
        <p className="page-hero-tag">
          Every indexed Worlds video across JomezPro, Gatekeeper, GK Pro, and Central Coast Disc Golf —
          grouped by year and championship, with round coverage back to 2014.
        </p>
        <div className="page-hero-stats">
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.video_count.toLocaleString()}</span>
            <span className="page-hero-stat-label">videos</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{(data.by_content_type.round ?? 0).toLocaleString()}</span>
            <span className="page-hero-stat-label">round videos</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.edition_count}</span>
            <span className="page-hero-stat-label">editions</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{Object.keys(data.by_producer).length}</span>
            <span className="page-hero-stat-label">producers</span>
          </div>
        </div>
        <p className="page-hero-updated">Updated {updated}</p>
      </header>

      <WorldsHighlights data={data} proEditions={proEditions} />

      <section className="asia-section" ref={listRef}>
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">Browse by year</h2>
            <p className="asia-section-sub">
              {filtered.length} editions · {roundCount} rounds · {videoCount} videos in this view
            </p>
          </div>
        </header>

        <div className="asia-country-grid worlds-year-grid">
          <button
            type="button"
            className={`asia-country-chip ${year === "all" ? "asia-country-chip-active" : ""}`}
            onClick={() => {
              setYear("all");
              setSelected(null);
            }}
          >
            <span className="asia-country-flag">🏆</span>
            <span className="asia-country-name">All years</span>
            <span className="asia-country-count">{data.video_count}</span>
          </button>
          {yearTags.map((y) => (
            <button
              key={y.year}
              type="button"
              className={`asia-country-chip ${year === y.year ? "asia-country-chip-active" : ""}`}
              onClick={() => {
                setYear(y.year);
                setSelected(null);
                scrollToList();
              }}
            >
              <span className="asia-country-flag">{y.year.slice(2)}</span>
              <span className="asia-country-name">{y.year}</span>
              <span className="asia-country-count">{y.count}</span>
            </button>
          ))}
        </div>

        <div className="coverage-toolbar worlds-toolbar">
          <input
            type="search"
            className="coverage-search"
            placeholder="Search editions or video titles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search worlds coverage"
          />
        </div>

        <div className="asia-controls">
          <div className="asia-control-group">
            {WORLDS_TYPE_ORDER.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`scoring-pill ${worldsType === id ? "scoring-pill-active" : ""}`}
                onClick={() => {
                  setWorldsType(id);
                  setSelected(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="asia-control-group">
            <button
              type="button"
              className={`scoring-pill ${producer === "all" ? "scoring-pill-active" : ""}`}
              onClick={() => setProducer("all")}
            >
              All producers
            </button>
            {data.sources_loaded.map((src) => (
              <button
                key={src}
                type="button"
                className={`scoring-pill ${producer === src ? "scoring-pill-active" : ""}`}
                onClick={() => setProducer(src)}
              >
                {data.source_labels[src]}
              </button>
            ))}
          </div>
          <div className="asia-control-group">
            <button
              type="button"
              className={`scoring-pill ${roundsOnly ? "scoring-pill-active" : ""}`}
              onClick={() => setRoundsOnly(true)}
            >
              Rounds only
            </button>
            <button
              type="button"
              className={`scoring-pill ${!roundsOnly ? "scoring-pill-active" : ""}`}
              onClick={() => setRoundsOnly(false)}
            >
              All content
            </button>
          </div>
        </div>

        <WorldsEditionList editions={filtered} selectedId={selected} onSelect={setSelected} />
      </section>

      <UpdateFooter />
    </div>
  );
}
