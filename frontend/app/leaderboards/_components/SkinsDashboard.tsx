"use client";

import { useMemo, useRef, useState } from "react";
import { filterEpisodes, filterPlayers } from "../_lib/skinsData";
import type { SkinsData } from "../_lib/skinsTypes";
import { SiteNav } from "./SiteNav";
import { SkinsEpisodeList } from "./SkinsEpisodeList";
import { SkinsHighlights } from "./SkinsHighlights";
import { SkinsPlayerLeaderboard } from "./SkinsPlayerLeaderboard";
import { UpdateFooter } from "./UpdateFooter";

type Props = {
  data: SkinsData;
};

type View = "episodes" | "players";

export function SkinsDashboard({ data }: Props) {
  const [view, setView] = useState<View>("episodes");
  const [series, setSeries] = useState("all");
  const [year, setYear] = useState("all");
  const [scoredOnly, setScoredOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<HTMLElement | null>(null);

  const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : "—";

  const filteredEpisodes = useMemo(
    () =>
      filterEpisodes(data.episodes, {
        series,
        year,
        scoredOnly,
        query: view === "episodes" ? query : undefined,
      }),
    [data.episodes, series, year, scoredOnly, query, view],
  );

  const filteredPlayers = useMemo(
    () => filterPlayers(data.players, view === "players" ? query : undefined),
    [data.players, query, view],
  );

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero">
        <p className="page-hero-eyebrow">GK Pro · Go Throw · OTB Tour Skins</p>
        <h1 className="page-hero-title">Tour Skins</h1>
        <p className="page-hero-tag">
          Hole-by-hole skins payouts from OTB Tour Skins, Go Throw Tour Skins, and GK Pro event skins —
          rosters from video metadata, scores from transcripts (manual review welcome).
        </p>
        <div className="page-hero-stats">
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.episodes_total}</span>
            <span className="page-hero-stat-label">episodes</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.episodes_scored}</span>
            <span className="page-hero-stat-label">scored</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.total_players}</span>
            <span className="page-hero-stat-label">players</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{data.course_count}</span>
            <span className="page-hero-stat-label">courses</span>
          </div>
        </div>
        <p className="page-hero-updated">Updated {updated}</p>
      </header>

      <SkinsHighlights data={data} />

      <section className="asia-section" ref={listRef}>
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">{view === "episodes" ? "Episodes" : "Players"}</h2>
            <p className="asia-section-sub">
              {view === "episodes"
                ? `${filteredEpisodes.length} episodes in this view`
                : `${filteredPlayers.length} players ranked by earnings`}
            </p>
          </div>
        </header>

        <div className="coverage-toolbar">
          <input
            type="search"
            className="coverage-search"
            placeholder={view === "episodes" ? "Search course, player, episode…" : "Search players…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search skins"
          />
        </div>

        <div className="asia-controls">
          <div className="asia-control-group">
            <button
              type="button"
              className={`scoring-pill ${view === "episodes" ? "scoring-pill-active" : ""}`}
              onClick={() => setView("episodes")}
            >
              Episodes
            </button>
            <button
              type="button"
              className={`scoring-pill ${view === "players" ? "scoring-pill-active" : ""}`}
              onClick={() => setView("players")}
            >
              Players
            </button>
          </div>
          {view === "episodes" && (
            <>
              <div className="asia-control-group">
                <button
                  type="button"
                  className={`scoring-pill ${series === "all" ? "scoring-pill-active" : ""}`}
                  onClick={() => setSeries("all")}
                >
                  All series
                </button>
                {data.series_breakdown.map((s) => (
                  <button
                    key={s.series}
                    type="button"
                    className={`scoring-pill ${series === s.series ? "scoring-pill-active" : ""}`}
                    onClick={() => setSeries(s.series)}
                  >
                    {s.series.replace(" Skins", "")}
                  </button>
                ))}
              </div>
              <div className="asia-control-group">
                <button
                  type="button"
                  className={`scoring-pill ${year === "all" ? "scoring-pill-active" : ""}`}
                  onClick={() => setYear("all")}
                >
                  All years
                </button>
                {data.years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`scoring-pill ${year === y ? "scoring-pill-active" : ""}`}
                    onClick={() => setYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="asia-control-group">
                <button
                  type="button"
                  className={`scoring-pill ${!scoredOnly ? "scoring-pill-active" : ""}`}
                  onClick={() => setScoredOnly(false)}
                >
                  All episodes
                </button>
                <button
                  type="button"
                  className={`scoring-pill ${scoredOnly ? "scoring-pill-active" : ""}`}
                  onClick={() => setScoredOnly(true)}
                >
                  Scored only
                </button>
              </div>
            </>
          )}
        </div>

        {view === "episodes" ? (
          <SkinsEpisodeList
            episodes={filteredEpisodes}
            selectedId={selected}
            onSelect={setSelected}
          />
        ) : (
          <SkinsPlayerLeaderboard players={filteredPlayers} />
        )}
      </section>

      <details className="tour-scoring-details">
        <summary className="tour-scoring-summary">
          <span>Manual edits &amp; refresh</span>
          <span className="tour-scoring-summary-hint">gothrow_edits.json workflow</span>
        </summary>
        <section className="tour-scoring-legend">
          <p className="data-insights-sub">{data.notes}</p>
          <p className="data-insights-sub">
            To fix or enter scores manually, edit{" "}
            <code className="trend-chart-code">frontend/public/data/gothrow_edits.json</code>{" "}
            (key format: <code className="trend-chart-code">OTB Tour Skins|164</code>), then from{" "}
            <code className="trend-chart-code">~/ytapi</code> run{" "}
            <code className="trend-chart-code">python3 merge_gothrow_edits.py</code> and{" "}
            <code className="trend-chart-code">python3 build_gothrow_dashboard.py --mahoot</code>.
          </p>
        </section>
      </details>

      <UpdateFooter />
    </div>
  );
}
