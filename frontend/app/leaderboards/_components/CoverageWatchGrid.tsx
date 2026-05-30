"use client";

import type { CoverageEvent, CoverageSource } from "../_lib/coverageTypes";
import { formatRoundLabel } from "../_lib/coverageData";

const SOURCE_ORDER: CoverageSource[] = ["jomezpro", "gkpro", "gatekeeper"];

const SOURCE_COLORS: Record<CoverageSource, string> = {
  jomezpro: "#2563eb",
  gkpro: "#059669",
  gatekeeper: "#c2410c",
};

type CoverageWatchGridProps = {
  event: CoverageEvent;
  sourceLabels: Record<string, string>;
};

export function CoverageWatchGrid({ event, sourceLabels }: CoverageWatchGridProps) {
  const activeSources = SOURCE_ORDER.filter((s) => event.sources.includes(s));

  if (event.round_rows.length === 0) {
    return <p className="coverage-empty">No round videos indexed for this event yet.</p>;
  }

  return (
    <div className="coverage-grid-wrap">
      <table className="coverage-grid">
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Uploaded</th>
            {activeSources.map((source) => (
              <th key={source} scope="col">
                <span className="coverage-source-pill" style={{ borderColor: SOURCE_COLORS[source] }}>
                  {sourceLabels[source] ?? source}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {event.round_rows.map((row) => (
            <tr key={row.row_key}>
              <td className="coverage-round-label">{formatRoundLabel(row)}</td>
              <td className="coverage-upload">
                {row.upload_window.earliest ?? "—"}
              </td>
              {activeSources.map((source) => {
                const cells = row.cells[source] ?? [];
                return (
                  <td key={source} className="coverage-cell">
                    {cells.length === 0 ? (
                      <span className="coverage-missing">—</span>
                    ) : (
                      cells.map((cell) => (
                        <a
                          key={cell.id}
                          href={cell.url}
                          target="_blank"
                          rel="noreferrer"
                          className="coverage-video-card"
                        >
                          <span className="coverage-card-type">{cell.card_type}</span>
                          <span className="coverage-players">
                            {cell.players.slice(0, 4).join(", ") || cell.title}
                          </span>
                        </a>
                      ))
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
