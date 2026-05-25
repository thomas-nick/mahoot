"use client";

import type { PlayerTourScoring } from "../_lib/playerTourTypes";

const LEVEL_LABELS: Record<string, string> = {
  major: "Major",
  elite: "Elite (DGPT NT)",
  a_tier: "A-tier / Jomez / Q",
};

interface TourScoringLegendProps {
  scoring: PlayerTourScoring;
}

export function TourScoringLegend({ scoring }: TourScoringLegendProps) {
  return (
    <details className="tour-scoring-details">
      <summary className="tour-scoring-summary">
        <span>How scoring works</span>
        <span className="tour-scoring-summary-hint">multipliers · finish points · calibration</span>
      </summary>

      <section className="tour-scoring-legend">
        <p className="data-insights-sub">{scoring.notes}</p>

        <div className="tour-scoring-grid">
          <div className="tour-scoring-block">
            <p className="tour-scoring-heading">Event level multipliers</p>
            <ul className="tour-scoring-list">
              {scoring.levels.map((level) => (
                <li key={level}>
                  <span className="tour-level-label">{LEVEL_LABELS[level] ?? level}</span>
                  <span className="tour-level-mult">×{scoring.tier_multipliers[level]}</span>
                </li>
              ))}
            </ul>
            <p className="tour-scoring-note">B/C tiers and leagues = excluded (×0)</p>
          </div>

          <div className="tour-scoring-block">
            <p className="tour-scoring-heading">Finish base points</p>
            <ul className="tour-scoring-list">
              {Object.entries(scoring.finish_base).map(([place, pts]) => (
                <li key={place}>
                  <span className="tour-level-label">{place}</span>
                  <span className="tour-level-mult">{pts} pts</span>
                </li>
              ))}
            </ul>
            <p className="tour-scoring-formula">{scoring.formula}</p>
          </div>
        </div>

        {scoring.benchmarks && (
          <div className="tour-benchmarks">
            <p className="tour-scoring-heading">Calibration check</p>
            <ul className="tour-scoring-list">
              <li>
                <span className="tour-level-label">Major win</span>
                <span className="tour-level-mult">{scoring.benchmarks.major_win} pts</span>
              </li>
              <li>
                <span className="tour-level-label">Elite win</span>
                <span className="tour-level-mult">{scoring.benchmarks.elite_win} pts</span>
              </li>
              <li>
                <span className="tour-level-label">Elite T10</span>
                <span className="tour-level-mult">{scoring.benchmarks.elite_t10} pts</span>
              </li>
              <li>
                <span className="tour-level-label">A-tier win</span>
                <span className="tour-level-mult">{scoring.benchmarks.a_tier_win} pts</span>
              </li>
            </ul>
            <p className="tour-scoring-note">
              Elite T10 ({scoring.benchmarks.elite_t10}) &gt; A-tier win ({scoring.benchmarks.a_tier_win})
            </p>
          </div>
        )}
      </section>
    </details>
  );
}
