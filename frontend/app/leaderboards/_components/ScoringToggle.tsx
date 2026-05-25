"use client";

import type { ScoringMode } from "../_lib/types";

interface ScoringToggleProps {
  mode: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}

const HINT: Record<ScoringMode, string> = {
  top4: "Each brand's four best scorers count — fair across roster sizes.",
  full: "Every affiliated player counts — rewards the deepest rosters.",
};

export function ScoringToggle({ mode, onChange }: ScoringToggleProps) {
  return (
    <section className="scoring-toggle">
      <div className="scoring-toggle-meta">
        <p className="scoring-toggle-label">Scoring mode</p>
        <p className="scoring-toggle-hint">{HINT[mode]}</p>
      </div>
      <div className="scoring-toggle-group">
        <button
          type="button"
          onClick={() => onChange("top4")}
          className={`scoring-pill ${mode === "top4" ? "scoring-pill-active" : ""}`}
        >
          Top 4
        </button>
        <button
          type="button"
          onClick={() => onChange("full")}
          className={`scoring-pill ${mode === "full" ? "scoring-pill-active" : ""}`}
        >
          Full team
        </button>
      </div>
    </section>
  );
}
