"use client";

interface FinishSparklineProps {
  history: number[];
  width?: number;
  height?: number;
  className?: string;
}

/** Recent event finishes over time. Lower place = better, so it's drawn
 * inverted (1st sits at the top) and "improving" trends render green. */
export function FinishSparkline({
  history,
  width = 80,
  height = 26,
  className = "",
}: FinishSparklineProps) {
  if (!history || history.length < 2) {
    return <span className={`rating-sparkline-empty ${className}`} aria-hidden>—</span>;
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = history.map((place, i) => {
    const x = padding + (i / (history.length - 1)) * innerW;
    // best (lowest place) at top, worst at bottom
    const y = padding + ((place - min) / range) * innerH;
    return { x, y };
  });

  const path = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} L${points[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`;

  const first = history[0];
  const last = history[history.length - 1];
  const delta = last - first; // negative = finishing better
  const tone = delta < -1 ? "up" : delta > 1 ? "down" : "flat";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rating-sparkline rating-sparkline-${tone} ${className}`}
      role="img"
      aria-label={`Recent finishes: ${first} → ${last}`}
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
