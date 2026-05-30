"use client";

import Link from "next/link";
import type { CoveragePlayerSummary } from "../_lib/coveragePlayerTypes";

interface Props {
  players: CoveragePlayerSummary[];
}

interface HighlightCard {
  key: string;
  label: string;
  value: string;
  sub: string;
  accent: string;
  pdga: number;
}

function lastName(name: string): string {
  return name.replace(/\s#\d+$/, "");
}

function best<T>(items: T[], score: (item: T) => number | null): T | null {
  let top: T | null = null;
  let topScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s == null) continue;
    if (s > topScore) {
      topScore = s;
      top = item;
    }
  }
  return top;
}

export function CoveragePlayersHighlights({ players }: Props) {
  if (players.length < 3) return null;

  const cards: HighlightCard[] = [];

  const mostWins = best(players, (p) => p.wins);
  if (mostWins?.wins) {
    cards.push({
      key: "wins",
      label: "Most wins",
      value: `${mostWins.wins} 🏆`,
      sub: lastName(mostWins.name),
      accent: "amber",
      pdga: mostWins.pdga,
    });
  }

  const podiumMachine = best(players, (p) => p.podiums);
  if (podiumMachine?.podiums) {
    cards.push({
      key: "podiums",
      label: "Podium machine",
      value: `${podiumMachine.podiums} podiums`,
      sub: lastName(podiumMachine.name),
      accent: "emerald",
      pdga: podiumMachine.pdga,
    });
  }

  const hotForm = players
    .filter((p) => p.form_avg_finish != null && p.events_played >= 5)
    .sort((a, b) => (a.form_avg_finish ?? 99) - (b.form_avg_finish ?? 99))[0];
  if (hotForm?.form_avg_finish != null) {
    cards.push({
      key: "form",
      label: "Hottest form",
      value: `${hotForm.form_avg_finish} avg`,
      sub: `${lastName(hotForm.name)} · last 5`,
      accent: "blue",
      pdga: hotForm.pdga,
    });
  }

  const streak = best(players, (p) => p.current_win_streak ?? 0);
  if (streak && (streak.current_win_streak ?? 0) > 1) {
    cards.push({
      key: "streak",
      label: "Win streak",
      value: `${streak.current_win_streak} in a row`,
      sub: lastName(streak.name),
      accent: "rose",
      pdga: streak.pdga,
    });
  }

  const mostFilmed = best(players, (p) => p.media_rounds ?? 0);
  if (mostFilmed && (mostFilmed.media_rounds ?? 0) > 0) {
    cards.push({
      key: "filmed",
      label: "Most filmed",
      value: `${mostFilmed.media_rounds} videos`,
      sub: lastName(mostFilmed.name),
      accent: "purple",
      pdga: mostFilmed.pdga,
    });
  }

  const mostActive = best(players, (p) => p.events_played);
  if (mostActive?.events_played) {
    cards.push({
      key: "active",
      label: "Most events",
      value: `${mostActive.events_played} events`,
      sub: lastName(mostActive.name),
      accent: "teal",
      pdga: mostActive.pdga,
    });
  }

  if (cards.length < 3) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <div>
          <h2 className="asia-section-title">Player highlights</h2>
          <p className="asia-section-sub">Standout numbers across {cards.length} categories</p>
        </div>
      </header>
      <div className="asia-highlights-grid">
        {cards.map((c) => (
          <Link
            key={c.key}
            href={`/leaderboards/coverage/player/${c.pdga}`}
            className={`asia-highlight asia-highlight-${c.accent} coverage-highlight-link`}
          >
            <p className="asia-highlight-label">{c.label}</p>
            <p className="asia-highlight-value">{c.value}</p>
            <p className="asia-highlight-sub">{c.sub}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
