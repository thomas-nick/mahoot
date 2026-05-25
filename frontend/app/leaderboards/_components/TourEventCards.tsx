"use client";

import type { TourEvent } from "../_lib/playerTourTypes";

interface TourEventCardsProps {
  events: TourEvent[];
}

const LEVEL_LABELS: Record<string, string> = {
  major: "Major",
  elite: "Elite",
  a_tier: "A-tier",
};

export function TourEventCards({ events }: TourEventCardsProps) {
  if (events.length === 0) return null;

  return (
    <section className="data-insights event-results mt-8">
      <div className="data-insights-header">
        <h2 className="data-insights-title">Recent tour events</h2>
        <p className="data-insights-sub">Majors, Elite Series & A-tiers only</p>
      </div>
      <div className="event-cards-scroll">
        {events.map((event) => (
          <article key={event.id} className="event-card">
            <div className="event-card-head">
              <span className={`event-tier tour-level-badge tour-level-${event.level}`}>
                {LEVEL_LABELS[event.level] ?? event.tier}
              </span>
              {event.month && <span className="event-month">{event.month}</span>}
              <span className="event-month">×{event.multiplier}</span>
            </div>
            <h3 className="event-name">{event.name}</h3>
            {event.winner && (
              <p className="event-winner">
                🏆 {event.winner.name}
                <span className="event-winner-brand"> · P{event.winner.place}</span>
              </p>
            )}
            <p className="event-meta">{event.entries} tracked finishes</p>
          </article>
        ))}
      </div>
    </section>
  );
}
