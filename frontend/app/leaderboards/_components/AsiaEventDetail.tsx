"use client";

import Link from "next/link";
import type { AsiaEventDetail, AsiaEventDetailRow } from "../_lib/asiaTypes";

interface AsiaEventDetailProps {
  event: AsiaEventDetail;
}

function DivisionTable({
  rows,
  label,
  accent,
}: {
  rows: AsiaEventDetailRow[];
  label: string;
  accent: string;
}) {
  if (!rows.length) return null;
  return (
    <div className="asia-event-division">
      <div className="asia-event-division-head">
        <span className="asia-event-division-tag" style={{ backgroundColor: accent }}>
          {label.split(" ")[0]}
        </span>
        <span className="asia-event-division-name">{label}</span>
        <span className="asia-event-division-count">{rows.length} players</span>
      </div>
      <ol className="asia-event-results">
        {rows.map((r) => (
          <li
            key={r.pdga}
            className={`asia-event-result ${r.place === 1 ? "asia-event-result-winner" : ""} ${
              r.place <= 3 ? `asia-event-result-podium asia-event-result-podium-${r.place}` : ""
            }`}
          >
            <span className="asia-event-place">{r.place}</span>
            <span className="asia-event-flag" title={r.country || "International"}>
              {r.flag}
            </span>
            <div className="asia-event-result-meta">
              <p className="asia-event-result-name">{r.name.replace(/\s#\d+$/, "")}</p>
              <p className="asia-event-result-sub">
                <span>#{r.pdga}</span>
                {r.rating != null && <span>{r.rating} rtg</span>}
                {r.country && <span>{r.country}</span>}
              </p>
            </div>
            <div className="asia-event-result-stats">
              <span className="asia-event-points">{r.pdga_points.toFixed(0)}</span>
              <span className="asia-event-points-label">pts</span>
              {r.prize && <span className="asia-event-prize">{r.prize}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AsiaEventDetailView({ event }: AsiaEventDetailProps) {
  const winnerMpo = event.mpo[0];
  const winnerFpo = event.fpo[0];

  return (
    <div className="asia-event">
      <Link href="/leaderboards/asia" className="asia-event-back">
        ← Back to Asia leaderboard
      </Link>

      <header className="asia-event-hero">
        <div className="asia-event-hero-top">
          <span
            className={`asia-event-eyebrow ${event.is_asia_tour ? "asia-event-eyebrow-tour" : ""}`}
          >
            {event.is_asia_tour ? "PDGA Asia Tour" : `${event.tier}-Tier`}
            <span className="asia-event-eyebrow-dot">·</span>
            <span>{event.year}</span>
          </span>
        </div>
        <h1 className="asia-event-title">{event.title}</h1>
        <div className="asia-event-meta">
          <span className="asia-event-meta-item">📍 {event.location}</span>
          <span className="asia-event-meta-item">📅 {event.dates}</span>
          {event.status && <span className="asia-event-meta-item">{event.status}</span>}
        </div>

        <dl className="asia-event-statbar">
          <div className="asia-event-statbar-item">
            <dt>Players</dt>
            <dd>{event.field_size}</dd>
          </div>
          {event.avg_mpo_rating != null && (
            <div className="asia-event-statbar-item">
              <dt>Avg MPO rating</dt>
              <dd>{event.avg_mpo_rating}</dd>
            </div>
          )}
          <div className="asia-event-statbar-item">
            <dt>Countries</dt>
            <dd>{event.country_breakdown.length}</dd>
          </div>
          {winnerMpo && (
            <div className="asia-event-statbar-item asia-event-statbar-winner">
              <dt>MPO winner</dt>
              <dd>
                <span className="asia-event-statbar-flag">{winnerMpo.flag}</span>
                {winnerMpo.name.replace(/\s#\d+$/, "")}
              </dd>
            </div>
          )}
        </dl>
      </header>

      {event.country_breakdown.length > 0 && (
        <section className="asia-event-countries">
          <p className="asia-section-sub">Field by country</p>
          <div className="asia-event-country-list">
            {event.country_breakdown.map((c) => (
              <span key={`${c.flag}-${c.country}`} className="asia-event-country-pill">
                <span className="asia-event-country-flag">{c.flag}</span>
                <span className="asia-event-country-name">{c.country}</span>
                <span className="asia-event-country-count">{c.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="asia-event-divisions">
        <DivisionTable rows={event.mpo} label="MPO · Mixed Pro Open" accent="#2563eb" />
        <DivisionTable rows={event.fpo} label="FPO · Women's Pro Open" accent="#db2777" />
      </div>

      {winnerFpo && !event.mpo.length && (
        <p className="asia-event-status">FPO-only event.</p>
      )}

      <p className="asia-event-pdga-link">
        <a
          href={`https://www.pdga.com/tour/event/${event.event_id}`}
          target="_blank"
          rel="noopener"
        >
          View full results & scorecards on pdga.com →
        </a>
      </p>
    </div>
  );
}
