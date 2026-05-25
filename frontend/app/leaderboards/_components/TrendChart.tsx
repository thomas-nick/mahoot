"use client";

import type { TimelineSeries } from "../_lib/timelineTypes";

interface TrendChartProps {
  title: string;
  subtitle?: string;
  weeks: string[];
  series: TimelineSeries[];
  valueLabel?: string;
}

const CHART = { w: 640, h: 220, padX: 48, padY: 28 };

function formatWeek(week: string): string {
  const parts = week.split("-");
  return parts.length >= 2 ? `Wk ${parts[1]}` : week;
}

export function TrendChart({ title, subtitle, weeks, series, valueLabel = "pts" }: TrendChartProps) {
  if (weeks.length < 2) {
    return (
      <section className="trend-chart trend-chart-empty">
        <div className="data-insights-header">
          <h2 className="data-insights-title">{title}</h2>
          {subtitle && <p className="data-insights-sub">{subtitle}</p>}
        </div>
        <p className="trend-chart-placeholder">
          History chart unlocks after 2+ weekly snapshots. Run{" "}
          <code className="trend-chart-code">npm run update</code> each week when StatMando
          posts new standings.
        </p>
      </section>
    );
  }

  const innerW = CHART.w - CHART.padX * 2;
  const innerH = CHART.h - CHART.padY * 2;

  const values = series.flatMap((s) =>
    s.points.map((p) => p.value).filter((v): v is number => v != null),
  );
  const minV = Math.min(...values) * 0.95;
  const maxV = Math.max(...values) * 1.05;
  const range = maxV - minV || 1;

  const xAt = (index: number) => CHART.padX + (index / Math.max(weeks.length - 1, 1)) * innerW;
  const yAt = (value: number) => CHART.padY + innerH - ((value - minV) / range) * innerH;

  return (
    <details className="trend-chart-details">
      <summary className="trend-chart-summary">
        <span className="trend-chart-summary-title">{title}</span>
        {subtitle && <span className="trend-chart-summary-hint">{subtitle}</span>}
        {series.length > 0 && (
          <span className="trend-chart-summary-preview">
            {series.slice(0, 3).map((s) => {
              const latest = [...s.points].reverse().find((p) => p.value != null);
              return latest ? `${s.label.split(" ")[0]} ${latest.value!.toLocaleString()}` : null;
            }).filter(Boolean).join(" · ")}
          </span>
        )}
      </summary>

      <section className="trend-chart">
        <div className="trend-chart-wrap">
        <svg
          viewBox={`0 0 ${CHART.w} ${CHART.h}`}
          className="trend-chart-svg"
          role="img"
          aria-label={title}
        >
          {[0, 0.5, 1].map((t) => {
            const y = CHART.padY + innerH * (1 - t);
            const val = minV + range * t;
            return (
              <g key={t}>
                <line
                  x1={CHART.padX}
                  x2={CHART.w - CHART.padX}
                  y1={y}
                  y2={y}
                  className="trend-grid-line"
                />
                <text x={CHART.padX - 6} y={y + 4} textAnchor="end" className="trend-axis-label">
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {weeks.map((week, i) => (
            <text
              key={week}
              x={xAt(i)}
              y={CHART.h - 6}
              textAnchor="middle"
              className="trend-axis-label"
            >
              {formatWeek(week)}
            </text>
          ))}

          {series.map((s) => {
            const defined = s.points
              .map((p, i) => (p.value != null ? { x: xAt(i), y: yAt(p.value) } : null))
              .filter(Boolean) as Array<{ x: number; y: number }>;
            if (defined.length < 2) return null;
            const d = defined.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
            return (
              <path key={s.id} d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
            );
          })}

          {series.map((s) =>
            s.points.map((p, i) =>
              p.value != null ? (
                <circle key={`${s.id}-${i}`} cx={xAt(i)} cy={yAt(p.value)} r={3.5} fill={s.color} />
              ) : null,
            ),
          )}
        </svg>

        <ul className="trend-legend">
          {series.map((s) => {
            const latest = [...s.points].reverse().find((p) => p.value != null);
            return (
              <li key={s.id} className="trend-legend-item">
                <span className="trend-legend-dot" style={{ backgroundColor: s.color }} />
                <span className="trend-legend-label">{s.label}</span>
                {latest && (
                  <span className="trend-legend-value">
                    {latest.value!.toLocaleString()} {valueLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      </section>
    </details>
  );
}
