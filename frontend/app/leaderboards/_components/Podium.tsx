"use client";

import { formatPoints } from "../_lib/scoring";
import type { ComputedManufacturer } from "../_lib/types";
import { BrandLogo } from "./BrandLogo";

interface PodiumProps {
  standings: ComputedManufacturer[];
  selected: string | null;
  onSelect: (manufacturer: string) => void;
}

export function Podium({ standings, selected, onSelect }: PodiumProps) {
  const first = standings[0];
  const second = standings[1];
  const third = standings[2];
  if (!first) return null;

  const places: Array<{
    team: ComputedManufacturer | undefined;
    rank: number;
    order: number;
  }> = [
    { team: second, rank: 2, order: 1 },
    { team: first, rank: 1, order: 2 },
    { team: third, rank: 3, order: 3 },
  ];

  return (
    <div className="podium">
      {places.map(({ team, rank, order }) => {
        if (!team) {
          return <div key={rank} className={`podium-slot podium-rank-${rank}`} style={{ order }} />;
        }
        const isSelected = selected === team.manufacturer;
        return (
          <button
            type="button"
            key={team.manufacturer}
            onClick={() => onSelect(team.manufacturer)}
            className={`podium-slot podium-rank-${rank} ${isSelected ? "podium-slot-selected" : ""}`}
            style={{ order }}
          >
            {rank === 1 && (
              <svg
                viewBox="0 0 32 20"
                className="podium-crown"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 18 L6 4 L11 12 L16 2 L21 12 L26 4 L30 18 Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="4" r="2" fill="currentColor" />
                <circle cx="16" cy="2" r="2" fill="currentColor" />
                <circle cx="26" cy="4" r="2" fill="currentColor" />
              </svg>
            )}
            <div className="podium-avatar-wrap">
              <BrandLogo
                manufacturer={team.manufacturer}
                color={team.color}
                size={rank === 1 ? 92 : 72}
                glow
              />
            </div>
            <div
              className={`podium-pedestal podium-pedestal-${rank}`}
              style={{ "--brand": team.color } as React.CSSProperties}
            >
              <span className="podium-rank-num">{rank}</span>
            </div>
            <p className="podium-name">{team.manufacturer}</p>
            <p className="podium-points">{formatPoints(team.points)}</p>
          </button>
        );
      })}
    </div>
  );
}
