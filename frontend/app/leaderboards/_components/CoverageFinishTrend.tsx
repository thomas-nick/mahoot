"use client";

import type { CoveragePlayerResult } from "../_lib/coveragePlayerTypes";

interface Props {
  results: CoveragePlayerResult[];
}

const CHART = { w: 640, h: 200, padX: 34, padY: 22 };

function dotColor(place: number): string {
  if (place === 1) return "#d97706";
  if (place <= 3) return "#0d9488";
  if (place <= 10) return "#2563eb";
  return "var(--text-muted)";
}

/** Finish placement over time (chronological). Lower place = better, drawn
 * inverted so 1st sits at the top. */
export function CoverageFinishTrend({ results }: Props) {
  const chron = [...results]
    .filter((r) => r.place > 0)
    .sort((a, b) => (a.year || "").localeCompare(b.year || "") || b.pdga_points - a.pdga_points);

  if (chron.length < 3) return null;

  const places = chron.map((r) => r.place);
  const maxPlace = Math.max(...places, 3);
  const innerW = CHART.w - CHART.padX * 2;
  const innerH = CHART.h - CHART.padY * 2;

  const xAt = (i: number) => CHART.padX + (i / Math.max(chron.length - 1, 1)) * innerW;
  const yAt = (place: number) => CHART.padY + ((place - 1) / Math.max(maxPlace - 1, 1)) * innerH;

  const points = chron.map((r, i) => ({ x: xAt(i), y: yAt(r.place), r }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const gridPlaces = Array.from(new Set([1, 3, 10, maxPlace].filter((p) => p <= maxPlace)));

  const yearTicks: Array<{ x: number; year: string }> = [];
  let lastYear = "";
  chron.forEach((r, i) => {
    if (r.year && r.year !== lastYear) {
      yearTicks.push({ x: xAt(i), year: r.year });
      lastYear = r.year;
    }
  });

  const podiumTop = yAt(1);
  const podiumBottom = yAt(3);

  return (
    <section className="trend-chart coverage-finish-trend">
      <div className="trend-chart-wrap">
        <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} className="trend-chart-svg" role="img" aria-label="Finish placement over time">
          <rect
            x={CHART.padX}
            y={podiumTop}
            width={innerW}
            height={Math.max(podiumBottom - podiumTop, 0)}
            className="coverage-finish-podium-band"
          />

          {gridPlaces.map((place) => {
            const y = yAt(place);
            return (
              <g key={place}>
                <line x1={CHART.padX} x2={CHART.w - CHART.padX} y1={y} y2={y} className="trend-grid-line" />
                <text x={CHART.padX - 6} y={y + 3} textAnchor="end" className="trend-axis-label">
                  {place === 1 ? "1st" : place}
                </text>
              </g>
            );
          })}

          {yearTicks.map((t) => (
            <text key={`${t.year}-${t.x}`} x={t.x} y={CHART.h - 4} textAnchor="middle" className="trend-axis-label">
              {t.year}
            </text>
          ))}

          <path d={line} fill="none" className="coverage-finish-line" />

          {points.map((p, i) => (
            <circle key={`${p.r.coverage_event_id}-${i}`} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={3.2} fill={dotColor(p.r.place)}>
              <title>{`${p.r.title} (${p.r.year}): ${p.r.place}${p.r.place === 1 ? "st" : ""}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </section>
  );
}
