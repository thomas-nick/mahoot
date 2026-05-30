"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { CoveragePlayer, CoveragePlayerResult } from "../_lib/coveragePlayerTypes";
import type { CoverageTourTagId } from "../_lib/coverageTypes";
import { CoverageTourTagBadge } from "./CoverageTourTagBadge";
import { CoverageFinishTrend } from "./CoverageFinishTrend";
import { COVERAGE_STAT_TIPS, CoverageStatTip } from "./CoverageStatTip";

type Props = {
  player: CoveragePlayer;
};

type Tab = "events" | "stats" | "coverage";

const TOUR_TAG_LABEL: Record<string, string> = {
  major: "Major",
  dgpt_elite: "DGPT Elite",
  nt: "PDGA NT",
  jomez_tour: "Jomez Tour",
  go_throw_tour: "Go Throw Tour",
};

function cleanName(name: string): string {
  return name.replace(/\s+#\d+$/, "").trim();
}

function shortEventTitle(title: string): string {
  return title
    .replace(/^20\d{2}\s+/i, "")
    .replace(/^DGPT\+?\s*[-–]?\s*/i, "")
    .replace(/^DGPT\s+(Elite\s+|Silver\s+|Playoffs[-\s]*)?/i, "")
    .replace(/\s+presented by .+$/i, "")
    .replace(/\s+powered by .+$/i, "")
    .trim();
}

function computeByTag(results: CoveragePlayerResult[]) {
  const map = new Map<string, { events: number; wins: number; podiums: number; points: number }>();
  for (const r of results) {
    const key = r.tour_tag || "other";
    const slot = map.get(key) ?? { events: 0, wins: 0, podiums: 0, points: 0 };
    slot.events += 1;
    if (r.place === 1) slot.wins += 1;
    if (r.place <= 3) slot.podiums += 1;
    slot.points += r.pdga_points;
    map.set(key, slot);
  }
  return [...map.entries()].sort((a, b) => b[1].points - a[1].points);
}

function computeByYear(results: CoveragePlayerResult[]) {
  const map = new Map<string, { events: number; wins: number; podiums: number; points: number; places: number[] }>();
  for (const r of results) {
    const key = r.year || "?";
    const slot = map.get(key) ?? { events: 0, wins: 0, podiums: 0, points: 0, places: [] };
    slot.events += 1;
    if (r.place === 1) slot.wins += 1;
    if (r.place <= 3) slot.podiums += 1;
    slot.points += r.pdga_points;
    slot.places.push(r.place);
    map.set(key, slot);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function StreakPill({
  value,
  label,
  tip,
  hot,
}: {
  value: number | string;
  label: string;
  tip: string;
  hot?: boolean;
}) {
  if (value === 0 || value === "0") return null;
  return (
    <div className={`clean-stat-pill ${hot ? "coverage-streak-hot" : ""}`}>
      <span className="clean-stat-value">{value}</span>
      <CoverageStatTip tip={tip} className="clean-stat-label coverage-stat-tip-label">
        {label}
      </CoverageStatTip>
    </div>
  );
}

function HeroStat({ value, label, tip }: { value: ReactNode; label: string; tip: string }) {
  return (
    <div className="page-hero-stat">
      <span className="page-hero-stat-value">{value}</span>
      <CoverageStatTip tip={tip} className="page-hero-stat-label coverage-stat-tip-label">
        {label}
      </CoverageStatTip>
    </div>
  );
}

function StatPill({ value, label, tip, className }: { value: ReactNode; label: string; tip: string; className?: string }) {
  return (
    <div className={`clean-stat-pill ${className ?? ""}`.trim()}>
      <span className="clean-stat-value">{value}</span>
      <CoverageStatTip tip={tip} className="clean-stat-label coverage-stat-tip-label">
        {label}
      </CoverageStatTip>
    </div>
  );
}

function EventRow({ result: r }: { result: CoveragePlayerResult }) {
  const label = shortEventTitle(r.title) || r.title;
  return (
    <li className="coverage-player-event-item">
      <div className="coverage-player-event-row">
        <span
          className={`coverage-player-event-place ${r.place === 1 ? "clean-rank-leader" : ""} ${r.place <= 3 ? "coverage-place-podium" : ""}`}
        >
          {r.place}
        </span>
        <div className="coverage-player-event-meta">
          <p className="coverage-player-event-title">
            {r.has_coverage ? (
              <Link href={`/leaderboards/coverage/${r.coverage_event_id}`} className="asia-event-link">
                {label}
              </Link>
            ) : (
              label
            )}
            {r.tour_tag && (
              <span className="coverage-player-inline-tag">
                <CoverageTourTagBadge tag={r.tour_tag as CoverageTourTagId} />
              </span>
            )}
          </p>
          <p className="coverage-player-event-sub">
            {r.year}
            {r.rating != null && ` · ${r.rating} rtg`}
            {r.score && ` · ${r.score} total`}
            {r.prize && ` · ${r.prize}`}
          </p>
        </div>
        <div className="coverage-player-event-pts">
          <span className="clean-points">+{Math.round(r.pdga_points)}</span>
          <span className="clean-points-label">pts</span>
        </div>
      </div>
    </li>
  );
}

export function CoveragePlayerProfile({ player }: Props) {
  const [tab, setTab] = useState<Tab>("stats");

  const avgPlace = useMemo(() => {
    if (!player.results.length) return null;
    const sum = player.results.reduce((a, r) => a + r.place, 0);
    return (sum / player.results.length).toFixed(1);
  }, [player.results]);

  const winRate = useMemo(() => {
    if (!player.results.length) return null;
    return ((player.wins / player.results.length) * 100).toFixed(1);
  }, [player.results, player.wins]);

  const byTag = useMemo(() => computeByTag(player.results), [player.results]);
  const byYear = useMemo(() => computeByYear(player.results), [player.results]);

  return (
    <div className="coverage-player-profile">
      <Link href="/leaderboards/coverage/players" className="coverage-back">
        ← All players
      </Link>

      <header className="page-hero mt-4">
        <p className="page-hero-eyebrow">
          {player.division} · PDGA #{player.pdga}
        </p>
        <h1 className="page-hero-title">{cleanName(player.name)}</h1>
        <p className="page-hero-tag">
          Elite &amp; Major series
          {player.rating != null && ` · ${player.rating} rating`}
          {player.first_event_year && player.last_event_year && (
            <> · {player.first_event_year}–{player.last_event_year}</>
          )}
        </p>
        <p className="page-hero-updated">
          <a
            href={`https://www.pdga.com/player/${player.pdga}`}
            target="_blank"
            rel="noopener noreferrer"
            className="coverage-event-open-link"
          >
            PDGA profile
          </a>
          {" · "}
          <Link
            href={`/leaderboards/coverage/matchup?a=${player.pdga}&pick=b`}
            className="coverage-event-open-link"
          >
            Head to head
          </Link>
        </p>
      </header>

      <div className="asia-controls coverage-player-tabs">
        <div className="asia-control-group">
          <button
            type="button"
            className={`scoring-pill ${tab === "events" ? "scoring-pill-active" : ""}`}
            onClick={() => setTab("events")}
          >
            Events ({player.results.length})
          </button>
          <button
            type="button"
            className={`scoring-pill ${tab === "stats" ? "scoring-pill-active" : ""}`}
            onClick={() => setTab("stats")}
          >
            Tour stats
          </button>
          {player.media && (
            <button
              type="button"
              className={`scoring-pill ${tab === "coverage" ? "scoring-pill-active" : ""}`}
              onClick={() => setTab("coverage")}
            >
              On film ({player.media.rounds})
            </button>
          )}
        </div>
      </div>

      {tab === "events" && (
        <section className="asia-section">
          <header className="asia-section-header">
            <div>
              <h2 className="asia-section-title">Event history</h2>
              <p className="asia-section-sub">Tap an event for round coverage and watch grid</p>
            </div>
          </header>

          <ul className="coverage-player-events">
            {player.results.map((r) => (
              <EventRow key={`${r.coverage_event_id}-${r.division}`} result={r} />
            ))}
          </ul>
        </section>
      )}

      {tab === "stats" && (
        <section className="asia-section">
          <header className="asia-section-header">
            <div>
              <h2 className="asia-section-title">Tour stats</h2>
              <p className="asia-section-sub">
                Elite &amp; Major series · {player.events_played} events ·{" "}
                <CoverageStatTip tip={COVERAGE_STAT_TIPS.scope} className="coverage-stat-tip-inline">
                  what&apos;s included
                </CoverageStatTip>
              </p>
            </div>
          </header>

          <div className="page-hero-stats coverage-player-statbar">
            <HeroStat value={player.events_played} label="events" tip={COVERAGE_STAT_TIPS.events} />
            <HeroStat value={player.wins} label="wins" tip={COVERAGE_STAT_TIPS.wins} />
            <HeroStat value={player.podiums} label="podiums" tip={COVERAGE_STAT_TIPS.podiums} />
            <HeroStat value={player.top10} label="top 10" tip={COVERAGE_STAT_TIPS.top10} />
            <HeroStat
              value={Math.round(player.pdga_points).toLocaleString()}
              label="pdga pts"
              tip={COVERAGE_STAT_TIPS.pdgaPts}
            />
          </div>

          {player.results.length >= 3 && (
            <>
              <h3 className="coverage-player-stat-heading">
                Finish trend{" "}
                <CoverageStatTip tip="Placement in each filmed Elite or Major event over time. Lower is better — the shaded band marks podium finishes (top 3)." className="coverage-stat-tip-heading">
                  ⓘ
                </CoverageStatTip>
              </h3>
              <CoverageFinishTrend results={player.results} />
            </>
          )}

          <div className="player-level-grid coverage-player-stat-grid">
            {player.form_avg_finish != null && (player.form_events ?? 0) > 0 && (
              <StatPill
                value={player.form_avg_finish}
                label={`form · last ${player.form_events}`}
                tip={COVERAGE_STAT_TIPS.form}
                className="coverage-form-pill"
              />
            )}
            {avgPlace != null && (
              <StatPill value={avgPlace} label="avg finish" tip={COVERAGE_STAT_TIPS.avgFinish} />
            )}
            {winRate != null && (
              <StatPill value={`${winRate}%`} label="win rate" tip={COVERAGE_STAT_TIPS.winRate} />
            )}
            {player.rating != null && (
              <StatPill value={player.rating} label="rating" tip={COVERAGE_STAT_TIPS.rating} />
            )}
          </div>

          <h3 className="coverage-player-stat-heading">
            Streaks{" "}
            <CoverageStatTip tip="Current streaks count back from the most recent event. Career bests scan all events in order." className="coverage-stat-tip-heading">
              ⓘ
            </CoverageStatTip>
          </h3>
          <div className="player-level-grid coverage-player-streak-grid">
            <StreakPill value={player.current_win_streak ?? 0} label="win streak" tip={COVERAGE_STAT_TIPS.winStreak} hot />
            <StreakPill value={player.current_podium_streak ?? 0} label="podium streak" tip={COVERAGE_STAT_TIPS.podiumStreak} hot />
            <StreakPill value={player.current_top10_streak ?? 0} label="top-10 streak" tip={COVERAGE_STAT_TIPS.top10Streak} />
            <StreakPill value={player.winless_streak ?? 0} label="winless streak" tip={COVERAGE_STAT_TIPS.winlessStreak} />
            <StreakPill value={player.best_win_streak ?? 0} label="best win run" tip={COVERAGE_STAT_TIPS.bestWinRun} />
            <StreakPill value={player.best_podium_streak ?? 0} label="best podium run" tip={COVERAGE_STAT_TIPS.bestPodiumRun} />
          </div>

          {byTag.length > 0 && (
            <>
              <h3 className="coverage-player-stat-heading">
                By tour level{" "}
                <CoverageStatTip tip={COVERAGE_STAT_TIPS.byTourLevel} className="coverage-stat-tip-heading">
                  ⓘ
                </CoverageStatTip>
              </h3>
              <div className="player-level-grid">
                {byTag.map(([tag, s]) => (
                  <div key={tag} className="clean-stat-pill">
                    <span className="clean-stat-value">{Math.round(s.points).toLocaleString()}</span>
                    <CoverageStatTip tip={COVERAGE_STAT_TIPS.byTourLevel} className="clean-stat-label coverage-stat-tip-label">
                      {TOUR_TAG_LABEL[tag] ?? tag} · {s.events} ev
                      {s.wins > 0 && ` · ${s.wins}W`}
                      {s.podiums > 0 && ` · ${s.podiums}P`}
                    </CoverageStatTip>
                  </div>
                ))}
              </div>
            </>
          )}

          {byYear.length > 0 && (
            <>
              <h3 className="coverage-player-stat-heading">
                By year{" "}
                <CoverageStatTip tip={COVERAGE_STAT_TIPS.byYear} className="coverage-stat-tip-heading">
                  ⓘ
                </CoverageStatTip>
              </h3>
              <ul className="coverage-player-year-list">
                <li className="coverage-player-year-row coverage-player-year-header">
                  <span className="coverage-player-year-label">Year</span>
                  <CoverageStatTip tip={COVERAGE_STAT_TIPS.yearEv} className="coverage-player-year-stat coverage-stat-tip-label">
                    ev
                  </CoverageStatTip>
                  <CoverageStatTip tip={COVERAGE_STAT_TIPS.yearWP} className="coverage-player-year-stat coverage-stat-tip-label">
                    W · P
                  </CoverageStatTip>
                  <CoverageStatTip tip={COVERAGE_STAT_TIPS.yearAvg} className="coverage-player-year-stat coverage-stat-tip-label">
                    avg
                  </CoverageStatTip>
                  <CoverageStatTip tip={COVERAGE_STAT_TIPS.yearPts} className="coverage-player-year-pts coverage-stat-tip-label">
                    pts
                  </CoverageStatTip>
                </li>
                {byYear.map(([year, s]) => {
                  const avg = s.places.length
                    ? (s.places.reduce((a, p) => a + p, 0) / s.places.length).toFixed(1)
                    : "—";
                  return (
                    <li key={year} className="coverage-player-year-row">
                      <span className="coverage-player-year-label">{year}</span>
                      <span className="coverage-player-year-stat">{s.events} ev</span>
                      <span className="coverage-player-year-stat">{s.wins}W · {s.podiums}P</span>
                      <span className="coverage-player-year-stat">avg {avg}</span>
                      <span className="coverage-player-year-pts">{Math.round(s.points).toLocaleString()} pts</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "coverage" && player.media && (
        <section className="asia-section">
          <header className="asia-section-header">
            <div>
              <h2 className="asia-section-title">On film</h2>
              <p className="asia-section-sub">
                Round videos across JomezPro, GK Pro, and Gatekeeper in the coverage catalog
              </p>
            </div>
          </header>

          <div className="page-hero-stats coverage-player-statbar">
            <HeroStat value={player.media.rounds} label="round videos" tip={COVERAGE_STAT_TIPS.roundVideos} />
            <HeroStat value={player.media.lead_cards} label="lead cards" tip={COVERAGE_STAT_TIPS.leadCards} />
            <HeroStat value={player.media.chase_cards} label="chase cards" tip={COVERAGE_STAT_TIPS.chaseCards} />
            <HeroStat value={player.media.tournaments} label="events" tip={COVERAGE_STAT_TIPS.filmedEvents} />
          </div>

          {Object.keys(player.media.by_source).length > 0 && (
            <>
              <h3 className="coverage-player-stat-heading">
                By producer{" "}
                <CoverageStatTip tip={COVERAGE_STAT_TIPS.byProducer} className="coverage-stat-tip-heading">
                  ⓘ
                </CoverageStatTip>
              </h3>
              <div className="player-level-grid">
                {Object.entries(player.media.by_source)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <StatPill key={source} value={count} label={source} tip={COVERAGE_STAT_TIPS.byProducer} />
                  ))}
              </div>
            </>
          )}

          <p className="coverage-player-coverage-hint">
            Open an event from the Events tab to jump into that tournament&apos;s watch grid filtered to this player.
          </p>
        </section>
      )}
    </div>
  );
}
