"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CoverageCatalog, CoverageEvent } from "../_lib/coverageTypes";
import { sortRoundRowsNewestFirst } from "../_lib/coverageData";
import { buildPlayerTags, displayPlayerName, playerTagFromName } from "../_lib/coverageStats";
import { CoveragePlayerTags } from "./CoveragePlayerTags";
import { CoverageWatchGrid } from "./CoverageWatchGrid";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";

type DivisionFilter = "all" | "MPO" | "FPO";

type Props = {
  catalog: CoverageCatalog;
  event: CoverageEvent;
};

export function CoverageEventDashboard({ catalog, event }: Props) {
  const [division, setDivision] = useState<DivisionFilter>("all");
  const [source, setSource] = useState<string>("all");
  const [playerTag, setPlayerTag] = useState<string | null>(null);

  const playerTags = useMemo(() => buildPlayerTags([event], 32), [event]);

  const filteredEvent = useMemo((): CoverageEvent => {
    let rows = [...event.round_rows];

    if (division !== "all") {
      rows = rows.filter((r) => r.division === division);
    }

    if (playerTag) {
      rows = rows
        .map((row) => {
          const cells = { ...row.cells };
          for (const [src, items] of Object.entries(cells)) {
            if (!items) continue;
            const filtered = items.filter((cell) =>
              cell.players.some((p) => playerTagFromName(p) === playerTag),
            );
            if (filtered.length > 0) {
              cells[src as keyof typeof cells] = filtered;
            } else {
              delete cells[src as keyof typeof cells];
            }
          }
          return { ...row, cells };
        })
        .filter((row) => Object.keys(row.cells).length > 0);
    }

    if (source !== "all") {
      rows = rows
        .map((row) => {
          const cell = row.cells[source as keyof typeof row.cells];
          return {
            ...row,
            cells: cell ? { [source]: cell } : {},
          };
        })
        .filter((row) => Object.keys(row.cells).length > 0);
    }

    return { ...event, round_rows: sortRoundRowsNewestFirst(rows) };
  }, [event, division, playerTag, source]);

  const activePlayerName = playerTag
    ? playerTags.find((t) => t.tag === playerTag)?.name ?? playerTag.replace(/_/g, " ")
    : null;

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <Link href="/leaderboards/coverage" className="coverage-back">
        ← All coverage events
      </Link>

      <header className="page-hero mt-4">
        <p className="page-hero-eyebrow">{event.year ?? "Event"}</p>
        <h1 className="page-hero-title">{event.title ?? event.id.replace(/_/g, " ")}</h1>
        <p className="page-hero-tag">
          {event.source_labels.join(" · ")} · {event.video_count} round videos
          {activePlayerName ? ` · ${displayPlayerName(activePlayerName)}` : ""}
        </p>
        <div className="page-hero-stats">
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{event.source_count}</span>
            <span className="page-hero-stat-label">producers</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{event.round_rows.length}</span>
            <span className="page-hero-stat-label">round rows</span>
          </div>
          <div className="page-hero-stat">
            <span className="page-hero-stat-value">{event.video_count}</span>
            <span className="page-hero-stat-label">videos</span>
          </div>
        </div>
        {event.upload_window.earliest && (
          <p className="page-hero-updated">
            Uploaded {event.upload_window.earliest}
            {event.upload_window.latest && event.upload_window.latest !== event.upload_window.earliest
              ? ` – ${event.upload_window.latest}`
              : ""}
          </p>
        )}
      </header>

      {event.multi_source && (
        <div className="coverage-event-pills coverage-event-pills-hero">
          <span className="coverage-badge">Multi-producer</span>
          {event.source_labels.map((label) => (
            <span key={label} className="asia-podium-pill">{label}</span>
          ))}
        </div>
      )}

      <CoveragePlayerTags tags={playerTags} activeTag={playerTag} onSelectTag={setPlayerTag} />

      <section className="asia-section">
        <header className="asia-section-header">
          <div>
            <h2 className="asia-section-title">Watch grid</h2>
            <p className="asia-section-sub">
              Same round, different producers — pick your commentary team and card.
            </p>
          </div>
        </header>

        <div className="asia-controls">
          <div className="asia-control-group">
            {(["all", "MPO", "FPO"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`scoring-pill ${division === d ? "scoring-pill-active" : ""}`}
                onClick={() => setDivision(d)}
              >
                {d === "all" ? "All divisions" : d}
              </button>
            ))}
          </div>
          <div className="asia-control-group">
            <button
              type="button"
              className={`scoring-pill ${source === "all" ? "scoring-pill-active" : ""}`}
              onClick={() => setSource("all")}
            >
              All producers
            </button>
            {event.sources.map((s) => (
              <button
                key={s}
                type="button"
                className={`scoring-pill ${source === s ? "scoring-pill-active" : ""}`}
                onClick={() => setSource(s)}
              >
                {catalog.source_labels[s]}
              </button>
            ))}
          </div>
        </div>

        <CoverageWatchGrid event={filteredEvent} sourceLabels={catalog.source_labels} />
      </section>

      <UpdateFooter />
    </div>
  );
}
