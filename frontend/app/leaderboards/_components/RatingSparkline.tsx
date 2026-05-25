"use client";

import type { AsiaRatingPoint } from "../_lib/asiaTypes";

interface RatingSparklineProps {
  history: AsiaRatingPoint[];
  width?: number;
  height?: number;
  className?: string;
}

export function RatingSparkline({
  history,
  width = 80,
  height = 26,
  className = "",
}: RatingSparklineProps) {
  if (!history || history.length < 2) {
    return <span className={`rating-sparkline-empty ${className}`} aria-hidden>—</span>;
  }

  const ratings = history.map((p) => p.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = max - min || 1;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = history.map((p, i) => {
    const x = padding + (i / (history.length - 1)) * innerW;
    const y = padding + innerH - ((p.rating - min) / range) * innerH;
    return { x, y };
  });

  const path = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} L${points[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`;

  const first = ratings[0];
  const last = ratings[ratings.length - 1];
  const delta = last - first;
  const tone = delta > 5 ? "up" : delta < -5 ? "down" : "flat";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rating-sparkline rating-sparkline-${tone} ${className}`}
      role="img"
      aria-label={`Rating history: ${first} → ${last} (${delta >= 0 ? "+" : ""}${delta})`}
    >
      <path d={areaPath} className="rating-sparkline-area" />
      <path d={path} className="rating-sparkline-line" fill="none" />
      <circle
        cx={points[points.length - 1].x.toFixed(1)}
        cy={points[points.length - 1].y.toFixed(1)}
        r={2.5}
        className="rating-sparkline-dot"
      />
    </svg>
  );
}
