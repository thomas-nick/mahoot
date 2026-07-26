"use client";

import Link from "next/link";
import type { PlayerTourEntry, TourLevel } from "../_lib/playerTourTypes";
import {
  avgFinish,
  formLabel,
  top10Rate,
  winRate,
  type TourPlayerBundle,
} from "../_lib/tourPlayerData";
import { BrandLogo } from "./BrandLogo";
import { brandColor } from "../_lib/brandAssets";

const LEVEL_LABELS: Record<TourLevel, string> = {
  major: "Major",
  elite: "Elite",
  a_tier: "A-tier",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="asia-flight-stat">
      <span className="asia-flight-stat-value">{value}</span>
      <span className="asia-flight-stat-label">{label}</span>
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function FormBadge({ player }: { player: PlayerTourEntry }) {
  const form = formLabel(player);
  if (form.deltaPct == null) return null;
  const sign = form.deltaPct > 0 ? "+" : "";
  const tone =
    form.deltaPct >= 12 ? "tour-form-hot" : form.deltaPct <= -12 ? "tour-form-cool" : "tour-form-steady";
  return (
    <span className={`tour-form-badge ${tone}`}>
      {form.label} {sign}
      {form.deltaPct.toFixed(0)}%
    </span>
  );
}

export function TourPlayerProfile({ bundle }: { bundle: TourPlayerBundle }) {
  const { player, division, week, year } = bundle;
  const color = brandColor(player.manufacturer);
  const initials = player.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const form = formLabel(player);
  const finish = avgFinish(player);
  const wins = (player.recent_results ?? []).filter((r) => r.place === 1);
  const levels = (["major", "elite", "a_tier"] as const).filter(
    (l) => (player.by_level[l]?.starts ?? 0) > 0,
  );

  return (
    <article className="asia-flight-profile tour-flight-profile">
      <Link href="/leaderboards/players" className="asia-flight-back">
        ← Player Tour Stats
      </Link>

      <header className="asia-flight-profile-hero">
        <div className="asia-flight-profile-art" aria-hidden style={{ borderColor: color }}>
          <BrandLogo manufacturer={player.manufacturer} color={color} size={72} variant="sunk" />
          <span className="asia-flight-profile-initials tour-flight-initials-fallback">
            {initials}
          </span>
        </div>
        <div className="asia-flight-profile-intro">
          <p className="asia-flight-pill">
            {division} · {player.manufacturer} · Wk {week ?? "—"}
          </p>
          <h1>{player.name}</h1>
          <p className="asia-flight-hero-sub">
            DGPT world #{player.dgpt_rank} · Weighted tour #{player.tour_rank} · {year} season
          </p>
          <div className="tour-rank-chips">
            <span className="tour-rank-chip">DGPT #{player.dgpt_rank}</span>
            <span className="tour-rank-chip">Tour #{player.tour_rank}</span>
            <span className="tour-rank-chip">{player.manufacturer}</span>
            <FormBadge player={player} />
          </div>
          <div className="asia-flight-cta-row">
            <Link href="/leaderboards/manucup" className="asia-flight-cta">
              Manufacturers Cup
            </Link>
            <Link href="/leaderboards/players" className="asia-flight-cta-ghost">
              Full board
            </Link>
          </div>
        </div>
      </header>

      <section className="asia-flight-stat-grid" aria-label="Season summary">
        <Stat label="DGPT points" value={player.dgpt_points.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
        <Stat label="Weighted pts" value={player.tour_weighted_points.toLocaleString()} />
        <Stat label="Starts" value={player.tour_starts} />
        <Stat label="Wins" value={player.wins} />
        <Stat label="Podiums" value={player.podiums} />
        <Stat label="Top 10" value={player.top10} />
        <Stat label="Win rate" value={pct(winRate(player))} />
        <Stat label="Top 10 rate" value={pct(top10Rate(player))} />
        <Stat label="Avg finish" value={finish != null ? finish.toFixed(1) : "—"} />
        <Stat
          label="Pts gain"
          value={
            player.dgpt_points_gain >= 0
              ? `+${player.dgpt_points_gain.toLocaleString()}`
              : player.dgpt_points_gain.toLocaleString()
          }
        />
      </section>

      <div className="tour-side-grid">
        <section className="tour-side-card">
          <h2>Form</h2>
          <p className="tour-side-lead">
            <FormBadge player={player} />
          </p>
          <p className="asia-flight-muted">{form.detail}</p>
        </section>

        <section className="tour-side-card">
          <h2>Tier mix</h2>
          <ul className="tour-tier-list">
            {levels.map((level) => {
              const s = player.by_level[level];
              return (
                <li key={level}>
                  <span>{LEVEL_LABELS[level]}</span>
                  <span>
                    {s.starts} ev · {s.wins}W · {s.points.toFixed(0)} pts
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="tour-side-card">
          <h2>Brand</h2>
          <div className="tour-brand-row">
            <BrandLogo manufacturer={player.manufacturer} color={color} size={40} variant="sunk" />
            <div>
              <p className="tour-side-lead">{player.manufacturer}</p>
              <p className="asia-flight-muted">
                {player.dgpt_points.toFixed(1)} DGPT pts toward Manufacturers Cup
              </p>
            </div>
          </div>
          <Link href="/leaderboards/manucup" className="asia-flight-profile-link">
            View brand standings →
          </Link>
        </section>
      </div>

      <section className="asia-flight-section">
        <div className="asia-flight-section-head">
          <h2>Recent results</h2>
          <p className="asia-flight-muted">
            {(player.recent_results ?? []).length} finishes in the weighted tour sample
          </p>
        </div>
        <div className="tour-table-wrap">
          <table className="tour-results-table">
            <thead>
              <tr>
                <th>Place</th>
                <th>Event</th>
                <th>Tier</th>
                <th>Month</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {(player.recent_results ?? []).map((r) => (
                <tr key={`${r.event_key}-${r.place}-${r.weighted_points}`}>
                  <td className={r.place === 1 ? "clean-rank-leader" : undefined}>
                    {r.place}
                  </td>
                  <td>{r.event}</td>
                  <td>
                    <span className={`tour-level-badge tour-level-${r.level}`}>
                      {LEVEL_LABELS[r.level]}
                    </span>
                  </td>
                  <td>{r.month}</td>
                  <td>+{r.weighted_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {wins.length > 0 && (
        <section className="asia-flight-section">
          <div className="asia-flight-section-head">
            <h2>Win ledger</h2>
            <p className="asia-flight-muted">{wins.length} win{wins.length === 1 ? "" : "s"} this sample</p>
          </div>
          <div className="tour-table-wrap">
            <table className="tour-results-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Tier</th>
                  <th>Month</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {wins.map((r) => (
                  <tr key={`win-${r.event_key}`}>
                    <td>{r.event}</td>
                    <td>{LEVEL_LABELS[r.level]}</td>
                    <td>{r.month}</td>
                    <td>+{r.weighted_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="asia-flight-muted tour-flight-foot">
        Weighted tour scoring · Majors ×4 · Elite ×2.5 · A-tier ×0.35. Player data from DGPT /
        StatMando pipeline. Course & marketplace links coming via mahoot catalog.
      </p>
    </article>
  );
}
