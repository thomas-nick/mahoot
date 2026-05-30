"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { computeCoverageMatchup } from "../_lib/coverageMatchup";
import type { CoveragePlayer, CoveragePlayersIndex } from "../_lib/coveragePlayerTypes";
import { CoverageTourTagBadge } from "./CoverageTourTagBadge";
import type { CoverageTourTagId } from "../_lib/coverageTypes";
import { SiteNav } from "./SiteNav";
import { UpdateFooter } from "./UpdateFooter";

type Props = {
  index: CoveragePlayersIndex;
  playerA: CoveragePlayer | null;
  playerB: CoveragePlayer | null;
  initialA?: string;
  initialB?: string;
  pickFocus?: "a" | "b";
};

function cleanName(name: string): string {
  return name.replace(/\s+#\d+$/, "").trim();
}

function PlayerPicker({
  label,
  players,
  value,
  excludePdga,
  divisionFilter,
  onChange,
  autoFocus,
}: {
  label: string;
  players: CoveragePlayersIndex["players"];
  value: number | null;
  excludePdga?: number | null;
  divisionFilter?: string | null;
  onChange: (pdga: number | null) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = players.find((p) => p.pdga === value) ?? null;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = players.filter((p) => p.pdga !== excludePdga);
    if (divisionFilter) {
      list = list.filter((p) => p.division === divisionFilter);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.pdga).includes(q) ||
          p.name_tag.includes(q.replace(/\s+/g, "_")),
      );
    }
    return list.slice(0, 8);
  }, [players, query, excludePdga, divisionFilter]);

  return (
    <div className="coverage-matchup-picker">
      <label className="coverage-matchup-picker-label">{label}</label>
      {selected ? (
        <div className="coverage-matchup-selected">
          <span className="coverage-matchup-selected-name">{selected.name}</span>
          <span className="coverage-matchup-selected-meta">
            #{selected.pdga} · {selected.division}
          </span>
          <button type="button" className="coverage-matchup-clear" onClick={() => onChange(null)}>
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            className="coverage-search asia-search"
            placeholder="Search by name or PDGA #"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={autoFocus}
          />
          {query.trim() && suggestions.length > 0 && (
            <ul className="coverage-matchup-suggestions">
              {suggestions.map((p) => (
                <li key={p.pdga}>
                  <button
                    type="button"
                    className="coverage-matchup-suggestion"
                    onClick={() => {
                      onChange(p.pdga);
                      setQuery("");
                    }}
                  >
                    <span>{p.name}</span>
                    <span className="coverage-matchup-suggestion-meta">
                      #{p.pdga} · {p.division}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function CoverageMatchupPage({
  index,
  playerA,
  playerB,
  initialA,
  initialB,
  pickFocus,
}: Props) {
  const router = useRouter();
  const pdgaA = playerA?.pdga ?? (initialA ? Number(initialA) : null);
  const pdgaB = playerB?.pdga ?? (initialB ? Number(initialB) : null);

  const updateUrl = (a: number | null, b: number | null) => {
    const params = new URLSearchParams();
    if (a) params.set("a", String(a));
    if (b) params.set("b", String(b));
    const qs = params.toString();
    router.push(qs ? `/leaderboards/coverage/matchup?${qs}` : "/leaderboards/coverage/matchup");
  };

  const matchup = useMemo(() => {
    if (!playerA || !playerB || playerA.pdga === playerB.pdga) return null;
    return computeCoverageMatchup(playerA, playerB);
  }, [playerA, playerB]);

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />

      <Link href="/leaderboards/coverage/players" className="coverage-back">
        ← All players
      </Link>

      <header className="page-hero mt-4">
        <p className="page-hero-eyebrow">Elite &amp; Majors</p>
        <h1 className="page-hero-title">Head to head</h1>
        <p className="page-hero-tag">Shared events · who finished ahead when both played</p>
      </header>

      <div className="coverage-matchup-pickers">
        <PlayerPicker
          label="Player A"
          players={index.players}
          value={pdgaA}
          excludePdga={pdgaB}
          divisionFilter={playerB?.division ?? null}
          onChange={(pdga) => updateUrl(pdga, pdgaB)}
          autoFocus={pickFocus === "a" || (!pdgaA && !pickFocus)}
        />
        <span className="coverage-matchup-vs">vs</span>
        <PlayerPicker
          label="Player B"
          players={index.players}
          value={pdgaB}
          excludePdga={pdgaA}
          divisionFilter={playerA?.division ?? null}
          onChange={(pdga) => updateUrl(pdgaA, pdga)}
          autoFocus={pickFocus === "b"}
        />
      </div>

      {playerA && playerB && playerA.pdga === playerB.pdga && (
        <p className="coverage-matchup-empty">Pick two different players.</p>
      )}

      {matchup && (
        <section className="asia-section">
          {matchup.division_mismatch && (
            <p className="coverage-matchup-warn">
              {matchup.player_a.division} vs {matchup.player_b.division} — finish comparison only
              counts shared events in the same division.
            </p>
          )}

          <div className="coverage-matchup-scoreboard">
            <div className={`coverage-matchup-side ${matchup.a_wins > matchup.b_wins ? "coverage-matchup-side-lead" : ""}`}>
              <Link href={`/leaderboards/coverage/player/${matchup.player_a.pdga}`} className="coverage-matchup-name">
                {cleanName(matchup.player_a.name)}
              </Link>
              <span className="coverage-matchup-record">{matchup.a_wins}</span>
              <span className="coverage-matchup-record-label">events ahead</span>
              {matchup.a_avg_place != null && (
                <span className="coverage-matchup-avg">avg {matchup.a_avg_place}</span>
              )}
            </div>
            <div className="coverage-matchup-center">
              <span className="coverage-matchup-shared">{matchup.shared_events}</span>
              <span className="coverage-matchup-shared-label">shared events</span>
              {matchup.ties > 0 && (
                <span className="coverage-matchup-ties">{matchup.ties} ties</span>
              )}
            </div>
            <div className={`coverage-matchup-side ${matchup.b_wins > matchup.a_wins ? "coverage-matchup-side-lead" : ""}`}>
              <Link href={`/leaderboards/coverage/player/${matchup.player_b.pdga}`} className="coverage-matchup-name">
                {cleanName(matchup.player_b.name)}
              </Link>
              <span className="coverage-matchup-record">{matchup.b_wins}</span>
              <span className="coverage-matchup-record-label">events ahead</span>
              {matchup.b_avg_place != null && (
                <span className="coverage-matchup-avg">avg {matchup.b_avg_place}</span>
              )}
            </div>
          </div>

          {matchup.shared_events === 0 ? (
            <p className="coverage-matchup-empty">No shared Elite or Major events in the dataset.</p>
          ) : (
            <ul className="coverage-matchup-events">
              {matchup.events.map((ev) => (
                <li key={ev.coverage_event_id} className="coverage-matchup-event">
                  <div className="coverage-matchup-event-places">
                    <span
                      className={`coverage-matchup-place ${ev.winner === "a" ? "coverage-matchup-place-win" : ""}`}
                    >
                      {ev.place_a}
                    </span>
                    <span
                      className={`coverage-matchup-place ${ev.winner === "b" ? "coverage-matchup-place-win" : ""}`}
                    >
                      {ev.place_b}
                    </span>
                  </div>
                  <div className="coverage-matchup-event-meta">
                    <p className="coverage-matchup-event-title">
                      {ev.has_coverage ? (
                        <Link href={`/leaderboards/coverage/${ev.coverage_event_id}`} className="asia-event-link">
                          {ev.title}
                        </Link>
                      ) : (
                        ev.title
                      )}
                      {ev.tour_tag && (
                        <span className="coverage-player-inline-tag">
                          <CoverageTourTagBadge tag={ev.tour_tag as CoverageTourTagId} />
                        </span>
                      )}
                    </p>
                    <p className="coverage-matchup-event-sub">{ev.year}</p>
                  </div>
                  <span className="coverage-matchup-event-edge">
                    {ev.winner === "a"
                      ? cleanName(matchup.player_a.name).split(" ").pop()
                      : ev.winner === "b"
                        ? cleanName(matchup.player_b.name).split(" ").pop()
                        : "Tie"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!playerA && !playerB && (
        <p className="coverage-matchup-empty">Search and pick two players to compare finishes.</p>
      )}

      {(playerA || playerB) && !(playerA && playerB) && (
        <p className="coverage-matchup-empty">Pick the second player to see the matchup.</p>
      )}

      <UpdateFooter />
    </div>
  );
}
