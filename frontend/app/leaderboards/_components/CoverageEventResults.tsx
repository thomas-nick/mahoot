"use client";

import Link from "next/link";
import { useState } from "react";
import type { CoverageEventResults, CoverageResultRow } from "../_lib/coverageResultsTypes";
import { playerTagFromName } from "../_lib/coverageStats";

type Props = {
  results: CoverageEventResults;
  coveredPlayerTags?: Set<string>;
  onWatchPlayer?: (nameTag: string) => void;
};

type DivisionTab = "MPO" | "FPO";

function cleanName(name: string): string {
  return name.replace(/\s#\d+$/, "");
}

function ResultsTable({
  rows,
  label,
  accent,
  coveredPlayerTags,
  onWatchPlayer,
}: {
  rows: CoverageResultRow[];
  label: string;
  accent: string;
  coveredPlayerTags?: Set<string>;
  onWatchPlayer?: (nameTag: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="asia-event-division">
      <div className="asia-event-division-head">
        <span className="asia-event-division-tag" style={{ backgroundColor: accent }}>
          {label.split(" ")[0]}
        </span>
        <span className="asia-event-division-name">{label}</span>
        <span className="asia-event-division-count">{rows.length} players</span>
      </div>
      <ol className="asia-event-results">
        {rows.map((r) => {
          const tag = playerTagFromName(cleanName(r.name));
          const hasCoverage = coveredPlayerTags?.has(tag);
          return (
            <li
              key={r.pdga}
              className={`asia-event-result ${r.place === 1 ? "asia-event-result-winner" : ""} ${
                r.place <= 3 ? `asia-event-result-podium asia-event-result-podium-${r.place}` : ""
              }`}
            >
              <span className="asia-event-place">{r.place}</span>
              <div className="asia-event-result-meta">
                <p className="asia-event-result-name">
                  <Link href={`/leaderboards/coverage/player/${r.pdga}`} className="asia-event-link">
                    {cleanName(r.name)}
                  </Link>
                </p>
                <p className="asia-event-result-sub">
                  <span>#{r.pdga}</span>
                  {r.rating != null && <span>{r.rating} rtg</span>}
                  {r.score && <span>{r.score} total</span>}
                </p>
              </div>
              <div className="asia-event-result-stats">
                <span className="asia-event-points">{Math.round(r.pdga_points)}</span>
                <span className="asia-event-points-label">pts</span>
                {r.prize && <span className="asia-event-prize">{r.prize}</span>}
                {hasCoverage && onWatchPlayer && (
                  <button
                    type="button"
                    className="coverage-watch-rounds-btn"
                    onClick={() => onWatchPlayer(tag)}
                  >
                    Watch rounds
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function CoverageEventResultsPanel({ results, coveredPlayerTags, onWatchPlayer }: Props) {
  const [tab, setTab] = useState<DivisionTab>("MPO");
  const rows = tab === "MPO" ? results.mpo : results.fpo;
  const showTabs = results.mpo.length > 0 && results.fpo.length > 0;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <div>
          <h2 className="asia-section-title">Event results</h2>
          <p className="asia-section-sub">
            PDGA finishes · {results.field_size} players
            {results.dates ? ` · ${results.dates}` : ""}
          </p>
        </div>
      </header>

      {(results.winner_mpo || results.winner_fpo) && (
        <div className="coverage-results-podium">
          {results.winner_mpo && (
            <div className="coverage-results-podium-card">
              <span className="coverage-results-podium-label">MPO</span>
              <Link
                href={`/leaderboards/coverage/player/${results.winner_mpo.pdga}`}
                className="coverage-results-podium-name coverage-results-podium-link"
              >
                {cleanName(results.winner_mpo.name)}
              </Link>
              {results.winner_mpo.prize && (
                <span className="coverage-results-podium-prize">{results.winner_mpo.prize}</span>
              )}
              {coveredPlayerTags?.has(playerTagFromName(cleanName(results.winner_mpo.name))) && onWatchPlayer && (
                <button
                  type="button"
                  className="coverage-watch-rounds-btn coverage-watch-rounds-btn-podium"
                  onClick={() => onWatchPlayer(playerTagFromName(cleanName(results.winner_mpo!.name)))}
                >
                  Watch rounds
                </button>
              )}
            </div>
          )}
          {results.winner_fpo && (
            <div className="coverage-results-podium-card">
              <span className="coverage-results-podium-label">FPO</span>
              <Link
                href={`/leaderboards/coverage/player/${results.winner_fpo.pdga}`}
                className="coverage-results-podium-name coverage-results-podium-link"
              >
                {cleanName(results.winner_fpo.name)}
              </Link>
              {results.winner_fpo.prize && (
                <span className="coverage-results-podium-prize">{results.winner_fpo.prize}</span>
              )}
              {coveredPlayerTags?.has(playerTagFromName(cleanName(results.winner_fpo.name))) && onWatchPlayer && (
                <button
                  type="button"
                  className="coverage-watch-rounds-btn coverage-watch-rounds-btn-podium"
                  onClick={() => onWatchPlayer(playerTagFromName(cleanName(results.winner_fpo!.name)))}
                >
                  Watch rounds
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showTabs && (
        <div className="asia-controls coverage-results-tabs">
          {(["MPO", "FPO"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`scoring-pill ${tab === d ? "scoring-pill-active" : ""}`}
              onClick={() => setTab(d)}
            >
              {d} ({d === "MPO" ? results.mpo_count : results.fpo_count})
            </button>
          ))}
        </div>
      )}

      <ResultsTable
        rows={rows}
        label={tab === "MPO" ? "MPO final standings" : "FPO final standings"}
        accent={tab === "MPO" ? "#2563eb" : "#db2777"}
        coveredPlayerTags={coveredPlayerTags}
        onWatchPlayer={onWatchPlayer}
      />

      {results.location && (
        <p className="coverage-results-source">
          📍 {results.location}
          {results.pdga_event_id && (
            <>
              {" · "}
              <a
                href={`https://www.pdga.com/tour/event/${results.pdga_event_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="coverage-event-open-link"
              >
                PDGA event
              </a>
            </>
          )}
        </p>
      )}
    </section>
  );
}
