"use client";

import { useMemo, useState } from "react";
import { computeStandings, scoringModeLabel } from "../_lib/scoring";
import type { DivisionReport, ScoringMode } from "../_lib/types";
import type { TimelineData } from "../_lib/timelineTypes";
import { ArenaView } from "./ArenaView";
import { CleanView } from "./CleanView";
import { DataInsights } from "./DataInsights";
import { DivisionMeta } from "./DivisionMeta";
import { HistoryTrends } from "./HistoryTrends";
import { HankoSeal } from "./HankoSeal";
import { Panel } from "./Panel";
import { ScoringToggle } from "./ScoringToggle";
import { StandingsTable } from "./StandingsTable";
import { SummaryCards } from "./SummaryCards";
import { TeamPanel } from "./TeamPanel";
import { ThemeToggle, type ThemeMode } from "./ThemeToggle";
import { UpdateFooter } from "./UpdateFooter";

interface DashboardProps {
  divisions: Record<string, DivisionReport>;
  updatedAt: string;
  timeline?: TimelineData | null;
}

export function Dashboard({ divisions, updatedAt, timeline = null }: DashboardProps) {
  const divisionKeys = Object.keys(divisions).sort((a, b) => {
    if (a === "MPO") return -1;
    if (b === "MPO") return 1;
    return a.localeCompare(b);
  });

  const [division, setDivision] = useState(divisionKeys[0] ?? "MPO");
  const [mode, setMode] = useState<ScoringMode>("top4");
  const [selected, setSelected] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("clean");

  const report = divisions[division];

  const top4Standings = useMemo(
    () => computeStandings(report.manufacturers, "top4"),
    [report.manufacturers],
  );

  const fullStandings = useMemo(
    () => computeStandings(report.manufacturers, "full"),
    [report.manufacturers],
  );

  const standings = mode === "top4" ? top4Standings : fullStandings;
  const compareStandings = mode === "top4" ? fullStandings : top4Standings;

  const selectedTeam =
    standings.find((team) => team.manufacturer === selected) ??
    top4Standings.find((team) => team.manufacturer === selected) ??
    fullStandings.find((team) => team.manufacturer === selected) ??
    null;

  const updated = new Date(updatedAt).toLocaleString();
  const capLabel = scoringModeLabel(mode);
  const leader = standings[0];

  const insightCards = useMemo(() => {
    const ins = report.insights;
    if (!ins) return [];
    return [
      ins.deepest_roster && { label: "Deepest roster", brand: ins.deepest_roster.manufacturer, value: `${ins.deepest_roster.value} players` },
      ins.most_elite && { label: "Most elite (T20)", brand: ins.most_elite.manufacturer, value: `${ins.most_elite.value} players` },
      ins.hottest_momentum && { label: "Hot momentum", brand: ins.hottest_momentum.manufacturer, value: `+${ins.hottest_momentum.value.toLocaleString()} pts` },
      ins.best_efficiency && { label: "Win rate", brand: ins.best_efficiency.manufacturer, value: `${(ins.best_efficiency.value * 100).toFixed(1)}%` },
      ins.most_top50 && { label: "Top 50 depth", brand: ins.most_top50.manufacturer, value: `${ins.most_top50.value} players` },
      { label: "Top 4 gap", brand: ins.top4_leader?.manufacturer ?? "—", value: `${ins.top4_gap.toLocaleString()} pts` },
    ].filter(Boolean) as Array<{ label: string; brand: string; value: string }>;
  }, [report.insights]);

  return (
    <div className={`page-content theme-${theme} mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10`}>
      <header className={theme === "clean" ? "page-hero" : "mb-6 sm:mb-10"}>
        {theme === "clean" ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="page-hero-eyebrow">2026 · DGPT</p>
                <h1 className="page-hero-title mt-2">Manufacturers Cup</h1>
                <p className="page-hero-tag">
                  Brand championship by DGPT points · {capLabel} · Wk {report.week}
                </p>
              </div>
              <ThemeToggle theme={theme} onChange={setTheme} />
            </div>
            <div className="page-hero-stats">
              {leader && (
                <div className="page-hero-stat" style={{ borderColor: leader.color }}>
                  <span className="page-hero-stat-value" title={leader.manufacturer}>
                    {leader.manufacturer}
                  </span>
                  <span className="page-hero-stat-label">leader · {Math.round(leader.points)} pts</span>
                </div>
              )}
              <div className="page-hero-stat">
                <span className="page-hero-stat-value">{report.manufacturers.length}</span>
                <span className="page-hero-stat-label">brands</span>
              </div>
              <div className="page-hero-stat">
                <span className="page-hero-stat-value">{report.player_count}</span>
                <span className="page-hero-stat-label">players</span>
              </div>
              <div className="page-hero-stat">
                <span className="page-hero-stat-value">Wk {report.week}</span>
                <span className="page-hero-stat-label">DGPT week</span>
              </div>
            </div>
            <p className="page-hero-updated">Live · Updated {updated}</p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)] sm:text-xs">
                  2026 · DGPT
                </p>
                <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight sm:mt-2 sm:text-5xl">
                  Manufacturers Cup
                </h1>
                <p className="mt-1 font-serif text-base text-[var(--accent-soft)] sm:text-lg">
                  匠杯 · Shōhai
                </p>
              </div>
              <ThemeToggle theme={theme} onChange={setTheme} />
            </div>

            <div className="divider mx-auto mt-6 max-w-xs" />
            <p className="mx-auto mt-5 max-w-md text-center text-sm leading-relaxed text-[var(--text-muted)]">
              Brand championship by DGPT points · {capLabel} vs full team
            </p>

            {leader && theme === "hanko" && (
              <div className="mx-auto mt-8 flex max-w-xs items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
                <HankoSeal manufacturer={leader.manufacturer} color={leader.color} size="md" pressed />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-dim)]">
                    Current leader
                  </p>
                  <p className="font-serif text-base font-bold">{leader.manufacturer}</p>
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-[var(--text-dim)] sm:mt-4 sm:text-center">
              Updated {updated}
            </p>
          </>
        )}
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2 sm:mb-8 sm:gap-3">
        {divisionKeys.map((key) => {
          const active = division === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setDivision(key);
                setSelected(null);
              }}
              className={`pill ${key === "FPO" ? "pill-fpo" : ""} ${active ? "pill-active" : ""}`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {insightCards.length > 0 && (
        <div className="insight-cards-strip">
          {insightCards.map((card) => (
            <div key={card.label} className="data-insight-card">
              <p className="data-insight-label">{card.label}</p>
              <p className="data-insight-brand">{card.brand}</p>
              <p className="data-insight-value">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 space-y-4 sm:mb-8">
        <ScoringToggle mode={mode} onChange={setMode} />
        {theme === "hanko" && (
          <SummaryCards
            standings={standings}
            week={report.week}
            division={division}
            scoringMode={mode}
          />
        )}
        {theme !== "clean" && (
          <DivisionMeta
            meta={report.meta}
            mapped={report.mapped_players}
            unmapped={report.unmapped_players}
          />
        )}
      </div>

      {theme === "clean" && (
        <CleanView
          standings={standings}
          compareStandings={compareStandings}
          mode={mode}
          selected={selected}
          onSelect={setSelected}
          selectedTeam={selectedTeam}
        />
      )}

      {theme === "arena" && (
        <ArenaView
          standings={standings}
          compareStandings={compareStandings}
          mode={mode}
          selected={selected}
          onSelect={setSelected}
          selectedTeam={selectedTeam}
        />
      )}

      {theme === "hanko" && (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Panel title="Standings" subtitle="順位">
            <StandingsTable
              standings={standings}
              compareStandings={compareStandings}
              mode={mode}
              selected={selected}
              onSelect={setSelected}
            />
          </Panel>
          <Panel title="Roster" subtitle="内訳">
            <TeamPanel team={selectedTeam} mode={mode} />
          </Panel>
        </div>
      )}

      <footer className="page-footer-extras">
        <DataInsights insights={report.insights} week={report.week} />
        <HistoryTrends timeline={timeline} division={division} mode="manufacturers_cup" />
        <UpdateFooter />
      </footer>
    </div>
  );
}
