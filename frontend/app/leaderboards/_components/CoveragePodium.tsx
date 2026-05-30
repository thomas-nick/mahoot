"use client";

import Link from "next/link";
import type { CoverageEvent } from "../_lib/coverageTypes";

const SOURCE_ICONS: Record<string, string> = {
  jomezpro: "🎬",
  gkpro: "🟢",
  gatekeeper: "🎙️",
};

type Props = {
  events: CoverageEvent[];
};

const PODIUM_ORDER: Array<{ idx: number; place: 1 | 2 | 3; medal: string; tone: string }> = [
  { idx: 1, place: 2, medal: "🥈", tone: "silver" },
  { idx: 0, place: 1, medal: "🥇", tone: "gold" },
  { idx: 2, place: 3, medal: "🥉", tone: "bronze" },
];

export function CoveragePodium({ events }: Props) {
  if (events.length < 3) return null;

  return (
    <div className="asia-podium">
      {PODIUM_ORDER.map(({ idx, place, medal, tone }) => {
        const event = events[idx];
        if (!event) return null;
        return (
          <Link
            key={event.id}
            href={`/leaderboards/coverage/${event.id}`}
            className={`asia-podium-card asia-podium-${tone} asia-podium-place-${place}`}
            aria-label={`Featured event: ${event.title}`}
          >
            <span className="asia-podium-medal" aria-hidden>{medal}</span>
            <span className="asia-podium-flag">{event.year ?? "—"}</span>
            <span className="asia-podium-name">{event.title ?? event.id.replace(/_/g, " ")}</span>
            <span className="asia-podium-meta">
              {event.source_labels.join(" · ")}
            </span>
            <div className="asia-podium-stat">
              <span className="asia-podium-stat-value">{event.video_count}</span>
              <span className="asia-podium-stat-label">round videos</span>
            </div>
            <div className="asia-podium-pills">
              {event.sources.map((source) => (
                <span key={source} className="asia-podium-pill">
                  {SOURCE_ICONS[source] ?? "▶"} {source.replace("pro", " Pro")}
                </span>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
