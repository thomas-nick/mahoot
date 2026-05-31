"use client";

import { episodeLabel } from "../_lib/skinsData";
import type { SkinsEpisode, SkinsHole } from "../_lib/skinsTypes";

function resultLabel(hole: SkinsHole): string {
  if (hole.result === "win" && hole.winner) {
    return hole.amount_usd ? `$${hole.amount_usd.toLocaleString()} · ${hole.winner}` : hole.winner;
  }
  if (hole.result === "push") return "Push";
  if (hole.result === "ace") return "Ace";
  if (hole.carry_usd) return `Carry $${hole.carry_usd}`;
  return "—";
}

function HolesTable({ holes }: { holes: SkinsHole[] }) {
  if (!holes.length) {
    return <p className="skins-holes-empty">No hole data yet — add via gothrow_edits.json in ytapi.</p>;
  }

  return (
    <table className="skins-holes-table">
      <thead>
        <tr>
          <th>Hole</th>
          <th>Half</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {holes.map((h) => (
          <tr key={`${h.half}-${h.hole}`} className={h.result === "win" ? "skins-hole-win" : undefined}>
            <td>{h.hole}</td>
            <td>{h.half}</td>
            <td>{resultLabel(h)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props = {
  episodes: SkinsEpisode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function episodeKey(ep: SkinsEpisode): string {
  return `${ep.series}|${ep.episode}`;
}

export function SkinsEpisodeList({ episodes, selectedId, onSelect }: Props) {
  if (!episodes.length) {
    return (
      <div className="asia-empty">
        <p>No episodes match these filters.</p>
      </div>
    );
  }

  return (
    <ul className="clean-list player-tour-list skins-episode-list">
      {episodes.map((ep, index) => {
        const key = episodeKey(ep);
        const isOpen = selectedId === key;
        const rank = index + 1;

        return (
          <li key={key} className={`clean-item ${isOpen ? "clean-item-open" : ""}`}>
            <button
              type="button"
              className="clean-row player-tour-row asia-row"
              onClick={() => onSelect(isOpen ? null : key)}
              aria-expanded={isOpen}
            >
              <span className={`clean-rank ${rank === 1 ? "clean-rank-leader" : ""}`}>{rank}</span>
              <span className="asia-flag skins-episode-num" aria-hidden>
                {ep.episode}
              </span>
              <div className="clean-meta">
                <p className="clean-name">
                  {ep.course ?? "Course TBD"}
                  {!ep.has_scores && <span className="skins-badge-pending">needs scores</span>}
                </p>
                <p className="clean-sub">
                  {ep.series}
                  {ep.location ? ` · ${ep.location}` : ""}
                  {ep.upload_date ? ` · ${ep.upload_date}` : ""}
                </p>
                <p className="clean-sub skins-episode-players">{ep.players.join(", ")}</p>
              </div>
              <div className="clean-stat-block">
                <span className="clean-stat">
                  {ep.total_payout_usd > 0 ? `$${ep.total_payout_usd.toLocaleString()}` : ep.per_hole_usd ? `$${ep.per_hole_usd}/hole` : "—"}
                </span>
                <span className="clean-stat-label">{ep.has_scores ? "paid out" : "per hole"}</span>
              </div>
              <span className="clean-row-chevron" aria-hidden>{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="clean-detail skins-episode-detail">
                <div className="skins-episode-meta-row">
                  {ep.ace_pot_usd != null && (
                    <span className="asia-podium-pill">Ace pot ${ep.ace_pot_usd.toLocaleString()}</span>
                  )}
                  {ep.f9_url && (
                    <a href={ep.f9_url} target="_blank" rel="noopener noreferrer" className="coverage-event-open-link">
                      Watch F9 →
                    </a>
                  )}
                  {ep.b9_url && (
                    <a href={ep.b9_url} target="_blank" rel="noopener noreferrer" className="coverage-event-open-link">
                      Watch B9 →
                    </a>
                  )}
                </div>
                <p className="skins-episode-detail-title">{episodeLabel(ep)}</p>
                <HolesTable holes={ep.holes ?? []} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
