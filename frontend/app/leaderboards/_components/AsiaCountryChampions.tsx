"use client";

import type { AsiaCountryChampion } from "../_lib/asiaTypes";

interface AsiaCountryChampionsProps {
  champions: AsiaCountryChampion[];
  onSelectCountry?: (key: string) => void;
}

export function AsiaCountryChampions({ champions, onSelectCountry }: AsiaCountryChampionsProps) {
  if (!champions.length) return null;

  return (
    <section className="asia-section">
      <header className="asia-section-header">
        <h2 className="asia-section-title">Country champions</h2>
        <p className="asia-section-sub">
          Top pro from each country · sortable by PDGA points · click a card to filter the leaderboard
        </p>
      </header>
      <div className="asia-champ-grid">
        {champions.map((c) => (
          <button
            key={c.country_key}
            type="button"
            className="asia-champ-card"
            onClick={() => onSelectCountry?.(c.country_key)}
          >
            <span className="asia-champ-flag" aria-hidden>{c.flag}</span>
            <div className="asia-champ-body">
              <p className="asia-champ-country">{c.country}</p>
              <p className="asia-champ-name">{c.leader_name.replace(/\s#\d+$/, "")}</p>
              <p className="asia-champ-meta">
                {c.leader_division}
                {c.leader_rating != null && ` · ${c.leader_rating}`}
              </p>
              <div className="asia-champ-stats">
                <span><strong>{Math.round(c.leader_points)}</strong> pts</span>
                <span><strong>{c.leader_events}</strong> ev</span>
                {c.leader_wins > 0 && <span><strong>{c.leader_wins}</strong> W</span>}
              </div>
              <p className="asia-champ-footer">{c.player_count} pros in country</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
