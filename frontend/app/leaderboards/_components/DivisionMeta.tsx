"use client";

import type { DivisionMeta as DivisionMetaType } from "../_lib/types";

interface DivisionMetaProps {
  meta: DivisionMetaType | undefined;
  mapped: number;
  unmapped: number;
}

export function DivisionMeta({ meta, mapped, unmapped }: DivisionMetaProps) {
  if (!meta) return null;

  return (
    <div className="division-meta">
      <div className="division-meta-stat">
        <span className="division-meta-value">{meta.brand_count}</span>
        <span className="division-meta-label">brands</span>
      </div>
      <div className="division-meta-stat">
        <span className="division-meta-value">{(meta.coverage_pct * 100).toFixed(0)}%</span>
        <span className="division-meta-label">mapped</span>
      </div>
      <div className="division-meta-stat">
        <span className="division-meta-value">{meta.total_wins}</span>
        <span className="division-meta-label">wins</span>
      </div>
      <div className="division-meta-stat">
        <span className="division-meta-value">{mapped}</span>
        <span className="division-meta-label">affiliated</span>
      </div>
      {unmapped > 0 && (
        <div className="division-meta-stat division-meta-muted">
          <span className="division-meta-value">{unmapped}</span>
          <span className="division-meta-label">excluded</span>
        </div>
      )}
    </div>
  );
}
