"use client";

import { useMemo, useState } from "react";
import type { PlayerTourData, PlayerTourEntry } from "../_lib/playerTourTypes";
import type { TimelineData } from "../_lib/timelineTypes";
import { HistoryTrends } from "./HistoryTrends";
import { PlayerRankingsList } from "./PlayerRankingsList";
import { SiteNav } from "./SiteNav";
import { TourEventCards } from "./TourEventCards";
import { TourScoringLegend } from "./TourScoringLegend";
import { UpdateFooter } from "./UpdateFooter";

interface PlayerTourDashboardProps {
  data: PlayerTourData;
  timeline: TimelineData | null;
}

type SortMode = "tour" | "dgpt";

export function PlayerTourDashboard({ data, timeline }: PlayerTourDashboardProps) {
  const divisionKeys = Object.keys(data.divisions).sort((a, b) => {
    if (a === "MPO") return -1;
    if (b === "MPO") return 1;
    return a.localeCompare(b);
  });

  const [division, setDivision] = useState(divisionKeys[0] ?? "MPO");
  const [sort, setSort] = useState<SortMode>("tour");
  const [selected, setSelected] = useState<string | null>(null);

  const report = data.divisions[division];
  const updated = new Date(data.updated_at).toLocaleString();

  const sortedPlayers = useMemo(() => {
    const players = [...report.players];
    if (sort === "dgpt") {
      players.sort((a, b) => a.dgpt_rank - b.dgpt_rank);
    } else {
      players.sort((a, b) => a.tour_rank - b.tour_rank);
    }
    return players;
  }, [report.players, sort]);

  const selectedPlayer: PlayerTourEntry | null =
    sortedPlayers.find((p) => p.slug === selected) ?? null;

  const leader = report.insights.leader;

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <header className="page-hero">
        <p className="page-hero-eyebrow">2026 · DGPT</p>
        <h1 className="page-hero-title">Player Tour Stats</h1>
        <p className="page-hero-tag">
          Weighted finish rankings across Majors, Elite Series and A-tiers — alongside the
          live DGPT world rank for every tour pro through Wk {report.week}.
        </p>
        <div className="page-hero-stats">
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{report.player_count}</span>
            <span className="page-hero-stat-label">players</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{report.tour_player_count}</span>
            <span className="page-hero-stat-label">with tour starts</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{report.event_count}</span>
            <span className="page-hero-stat-label">events tracked</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">Wk {report.week}</span>
            <span className="page-hero-stat-label">DGPT week</span>
          </div>
        </div>
        <p className="page-hero-updated">Live · Updated {updated}</p>
      </header>

      <TourScoringLegend scoring={data.scoring} />

      <HistoryTrends timeline={timeline} division={division} mode="player_tour" />

      <div className="mb-6 flex flex-wrap justify-center gap-2 sm:gap-3">
        {divisionKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setDivision(key);
              setSelected(null);
            }}
            className={`pill ${key === "FPO" ? "pill-fpo" : ""} ${division === key ? "pill-active" : ""}`}
          >
            {key}
          </button>
        ))}
      </div>

      {leader && (
        <div className="data-insights-scroll mb-6">
          <div className="data-insight-card">
            <p className="data-insight-label">Tour leader</p>
            <p className="data-insight-brand">{leader.name}</p>
            <p className="data-insight-value">
              {leader.tour_weighted_points.toLocaleString()} pts · {leader.wins}W
            </p>
          </div>
          <div className="data-insight-card">
            <p className="data-insight-label">DGPT rank</p>
            <p className="data-insight-brand">#{leader.dgpt_rank}</p>
            <p className="data-insight-value">{leader.dgpt_points.toFixed(0)} world pts</p>
          </div>
          <div className="data-insight-card">
            <p className="data-insight-label">Events tracked</p>
            <p className="data-insight-brand">{report.event_count}</p>
            <p className="data-insight-value">
              {report.events_by_level.major ?? 0}M · {report.events_by_level.elite ?? 0}E ·{" "}
              {report.events_by_level.a_tier ?? 0}A
            </p>
          </div>
          <div className="data-insight-card">
            <p className="data-insight-label">Players w/ tour starts</p>
            <p className="data-insight-brand">{report.tour_player_count}</p>
            <p className="data-insight-value">of {report.player_count} ranked</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`scoring-pill ${sort === "tour" ? "scoring-pill-active" : ""}`}
          onClick={() => setSort("tour")}
        >
          Tour weighted
        </button>
        <button
          type="button"
          className={`scoring-pill ${sort === "dgpt" ? "scoring-pill-active" : ""}`}
          onClick={() => setSort("dgpt")}
        >
          DGPT world rank
        </button>
      </div>

      <PlayerRankingsList
        players={sortedPlayers}
        sort={sort}
        selected={selected}
        onSelect={setSelected}
        selectedPlayer={selectedPlayer}
      />

      <TourEventCards events={report.insights.recent_events} />

      <UpdateFooter />
    </div>
  );
}
