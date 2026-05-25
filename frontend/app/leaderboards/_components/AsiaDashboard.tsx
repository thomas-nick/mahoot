"use client";

import { useMemo, useRef, useState } from "react";
import type { AsiaData } from "../_lib/asiaTypes";
import { AsiaPlayerList } from "./AsiaPlayerList";
import { AsiaPodium } from "./AsiaPodium";
import { AsiaCountryChampions } from "./AsiaCountryChampions";
import { AsiaTourStandings } from "./AsiaTourStandings";
import { AsiaHighlights } from "./AsiaHighlights";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";

interface AsiaDashboardProps {
  data: AsiaData | null;
}

type SortMode = "pdga" | "weighted" | "rating" | "asia_tour";
type DivisionFilter = "all" | "MPO" | "FPO";

export function AsiaDashboard({ data }: AsiaDashboardProps) {
  const [country, setCountry] = useState<string>("all");
  const [division, setDivision] = useState<DivisionFilter>("all");
  const [sort, setSort] = useState<SortMode>("pdga");
  const [selected, setSelected] = useState<number | null>(null);
  const leaderboardRef = useRef<HTMLDivElement | null>(null);

  const hasData = data && data.players.length > 0;
  const updated = data?.updated_at ? new Date(data.updated_at).toLocaleString() : "—";

  const filtered = useMemo(() => {
    if (!data) return [];
    let players = [...data.players];
    if (country !== "all") {
      players = players.filter((p) => p.country_key === country || (country === "INTL" && !p.country_key));
    }
    if (division !== "all") {
      players = players.filter((p) => p.division === division);
    }
    players.sort((a, b) => {
      if (sort === "weighted") return b.tour_weighted_points - a.tour_weighted_points;
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "asia_tour") return b.asia_tour_points - a.asia_tour_points;
      return b.pdga_points - a.pdga_points;
    });
    return players;
  }, [data, country, division, sort]);

  const scrollToLeaderboard = () => {
    leaderboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectCountry = (key: string) => {
    setCountry(key);
    setSelected(null);
    scrollToLeaderboard();
  };

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero">
        <p className="page-hero-eyebrow">PDGA · MPO + FPO · 2025–2026</p>
        <h1 className="page-hero-title">Asia & SE Asia Pro Leaderboard</h1>
        <p className="page-hero-tag">
          Live PDGA results from every Asia Tour stop plus the season&apos;s biggest open events
          across Japan, Thailand, Korea, Taiwan, the Philippines and beyond.
        </p>
        {hasData && (
          <div className="page-hero-stats">
            <div className="page-hero-stat">
              <span className="page-hero-stat-value">{data!.total_players}</span>
              <span className="page-hero-stat-label">pros</span>
            </div>
            <div className="page-hero-stat">
              <span className="page-hero-stat-value">{data!.total_events}</span>
              <span className="page-hero-stat-label">events</span>
            </div>
            <div className="page-hero-stat">
              <span className="page-hero-stat-value">{data!.country_champions.length}</span>
              <span className="page-hero-stat-label">countries</span>
            </div>
            <div className="page-hero-stat">
              <span className="page-hero-stat-value">{data!.tour_standings.length}</span>
              <span className="page-hero-stat-label">tour qualifiers</span>
            </div>
          </div>
        )}
        <p className="page-hero-updated">Live · Updated {updated}</p>
      </header>

      {hasData && data!.players.length >= 3 && (
        <AsiaPodium
          players={data!.players.slice(0, 3)}
          onSelect={(pdga) => {
            setSelected(pdga);
            scrollToLeaderboard();
          }}
        />
      )}

      {hasData && data!.tour_standings.length > 0 && (
        <AsiaTourStandings standings={data!.tour_standings} />
      )}

      {hasData && data!.country_champions.length > 0 && (
        <AsiaCountryChampions
          champions={data!.country_champions}
          onSelectCountry={selectCountry}
        />
      )}

      {hasData && data!.highlights && (
        <AsiaHighlights highlights={data!.highlights} />
      )}

      <section className="asia-section" ref={leaderboardRef}>
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">Full leaderboard</h2>
            <p className="asia-section-sub">
              All {filtered.length} pros{country !== "all" && data?.country_stats[country] && ` in ${data.country_stats[country].name || country}`} · sort and filter below
            </p>
          </div>
        </header>

        {hasData && (
          <div className="asia-country-grid">
            <button
              type="button"
              className={`asia-country-chip ${country === "all" ? "asia-country-chip-active" : ""}`}
              onClick={() => { setCountry("all"); setSelected(null); }}
            >
              <span className="asia-country-flag">🌏</span>
              <span className="asia-country-name">All</span>
              <span className="asia-country-count">{data!.total_players}</span>
            </button>
            {Object.values(data!.country_stats)
              .filter((c) => c.player_count > 0)
              .sort((a, b) => b.player_count - a.player_count)
              .map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`asia-country-chip ${country === c.key ? "asia-country-chip-active" : ""}`}
                  onClick={() => { setCountry(c.key); setSelected(null); }}
                >
                  <span className="asia-country-flag">{c.flag}</span>
                  <span className="asia-country-name">{c.name}</span>
                  <span className="asia-country-count">{c.player_count}</span>
                </button>
              ))}
          </div>
        )}

        {hasData && (
          <div className="asia-controls">
            <div className="asia-control-group">
              {(["all", "MPO", "FPO"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`scoring-pill ${division === d ? "scoring-pill-active" : ""}`}
                  onClick={() => setDivision(d)}
                >
                  {d === "all" ? "All divisions" : d}
                </button>
              ))}
            </div>
            <div className="asia-control-group">
              <button type="button" className={`scoring-pill ${sort === "pdga" ? "scoring-pill-active" : ""}`} onClick={() => setSort("pdga")}>PDGA pts</button>
              <button type="button" className={`scoring-pill ${sort === "weighted" ? "scoring-pill-active" : ""}`} onClick={() => setSort("weighted")}>Weighted</button>
              <button type="button" className={`scoring-pill ${sort === "asia_tour" ? "scoring-pill-active" : ""}`} onClick={() => setSort("asia_tour")}>Asia Tour pts</button>
              <button type="button" className={`scoring-pill ${sort === "rating" ? "scoring-pill-active" : ""}`} onClick={() => setSort("rating")}>Rating</button>
            </div>
          </div>
        )}

        <AsiaPlayerList
          players={filtered}
          sort={sort}
          selected={selected}
          onSelect={setSelected}
        />
      </section>

      {hasData && (
        <details className="tour-scoring-details">
          <summary className="tour-scoring-summary">
            <span>How scoring works</span>
            <span className="tour-scoring-summary-hint">PDGA points · weighted · official tour</span>
          </summary>
          <section className="tour-scoring-legend">
            <p className="data-insights-sub">{data!.scoring.notes}</p>
            <div className="tour-scoring-grid">
              <div className="tour-scoring-block">
                <p className="tour-scoring-heading">Tier multipliers (weighted)</p>
                <ul className="tour-scoring-list">
                  {data!.scoring.levels.map((level) => (
                    <li key={level}>
                      <span className="tour-level-label">{level.replace("_", " ").toUpperCase()}</span>
                      <span className="tour-level-mult">×{data!.scoring.tier_multipliers[level]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="tour-scoring-block">
                <p className="tour-scoring-heading">Official Asia Tour</p>
                <p className="tour-scoring-formula">{data!.scoring.asia_tour_official?.rule ?? "—"}</p>
                <ul className="tour-scoring-list">
                  <li><span className="tour-level-label">1st</span><span className="tour-level-mult">100 pts</span></li>
                  <li><span className="tour-level-label">2nd</span><span className="tour-level-mult">90 pts</span></li>
                  <li><span className="tour-level-label">3rd</span><span className="tour-level-mult">85 pts</span></li>
                  <li><span className="tour-level-label">5th</span><span className="tour-level-mult">75 pts</span></li>
                  <li><span className="tour-level-label">10th</span><span className="tour-level-mult">50 pts</span></li>
                  <li><span className="tour-level-label">19th</span><span className="tour-level-mult">5 pts</span></li>
                </ul>
              </div>
            </div>
          </section>
        </details>
      )}

      <UpdateFooter />
    </div>
  );
}
