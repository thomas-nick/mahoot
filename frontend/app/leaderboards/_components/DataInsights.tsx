"use client";

import type { DivisionInsights } from "../_lib/types";

interface DataInsightsProps {
  insights: DivisionInsights | undefined;
  week: string;
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function DataInsights({ insights, week }: DataInsightsProps) {
  if (!insights) return null;

  const cards = [
    insights.deepest_roster && {
      label: "Deepest roster",
      brand: insights.deepest_roster.manufacturer,
      value: `${insights.deepest_roster.value} players`,
    },
    insights.most_elite && {
      label: "Most elite (T20)",
      brand: insights.most_elite.manufacturer,
      value: `${insights.most_elite.value} players`,
    },
    insights.hottest_momentum && {
      label: "Hot momentum",
      brand: insights.hottest_momentum.manufacturer,
      value: `+${insights.hottest_momentum.value.toLocaleString()} pts`,
    },
    insights.best_efficiency && {
      label: "Win rate",
      brand: insights.best_efficiency.manufacturer,
      value: fmtPct(insights.best_efficiency.value),
    },
    insights.most_top50 && {
      label: "Top 50 depth",
      brand: insights.most_top50.manufacturer,
      value: `${insights.most_top50.value} players`,
    },
    {
      label: "Top 4 gap",
      brand: insights.top4_leader?.manufacturer ?? "—",
      value: `${insights.top4_gap.toLocaleString()} pts`,
    },
  ].filter(Boolean) as Array<{ label: string; brand: string; value: string }>;

  const headlineCard = cards.find((c) => c.label === "Hot momentum") ?? cards[0];
  const movers = insights.biggest_movers ?? [];
  const pointsMovers = insights.points_movers ?? [];

  return (
    <details className="trend-chart-details">
      <summary className="trend-chart-summary">
        <span className="trend-chart-summary-title">Depth &amp; momentum</span>
        <span className="trend-chart-summary-hint">Wk {week} · roster analytics</span>
        {headlineCard && (
          <span className="trend-chart-summary-preview">
            {headlineCard.label}: <strong>{headlineCard.brand}</strong> · {headlineCard.value}
          </span>
        )}
      </summary>

      <section className="data-insights">
        <div className="data-insights-scroll">
          {cards.map((card) => (
            <div key={card.label} className="data-insight-card">
              <p className="data-insight-label">{card.label}</p>
              <p className="data-insight-brand">{card.brand}</p>
              <p className="data-insight-value">{card.value}</p>
            </div>
          ))}
        </div>

        {(movers.length > 0 || pointsMovers.length > 0) && (
          <div className="data-movers-grid">
            {movers.length > 0 && (
              <div className="data-movers">
                <p className="data-movers-title">Biggest rank movers</p>
                <ul className="data-movers-list">
                  {movers.slice(0, 5).map((m) => (
                    <li key={m.manufacturer} className="data-mover-row">
                      <span className="data-mover-brand">{m.manufacturer}</span>
                      <span className={`data-mover-delta ${m.delta > 0 ? "up" : "down"}`}>
                        {m.from} → {m.to} ({m.delta > 0 ? "+" : ""}{m.delta})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pointsMovers.length > 0 && (
              <div className="data-movers">
                <p className="data-movers-title">Points gained</p>
                <ul className="data-movers-list">
                  {pointsMovers.slice(0, 5).map((m) => (
                    <li key={m.manufacturer} className="data-mover-row">
                      <span className="data-mover-brand">{m.manufacturer}</span>
                      <span className={`data-mover-delta ${m.points_delta >= 0 ? "up" : "down"}`}>
                        {m.points_delta >= 0 ? "+" : ""}
                        {m.points_delta.toLocaleString()} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </details>
  );
}
