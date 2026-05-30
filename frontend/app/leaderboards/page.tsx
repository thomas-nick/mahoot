import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "Live disc golf standings: DGPT Manufacturers Cup, weighted Player Tour stats, and the Asia & SE Asia pro leaderboard.",
};

const boards = [
  {
    href: "/leaderboards/manucup",
    eyebrow: "DGPT · MPO + FPO",
    title: "Manufacturers Cup",
    blurb:
      "F1-style constructors championship for disc golf brands. Every world-standing point a pro earns counts for their disc manufacturer.",
    accent: "#c9a227",
  },
  {
    href: "/leaderboards/players",
    eyebrow: "DGPT · Weighted",
    title: "Player Tour Stats",
    blurb:
      "Weighted finish rankings across Majors, Elite Series and A-tiers, with live DGPT world standings.",
    accent: "#2563eb",
  },
  {
    href: "/leaderboards/coverage/players",
    eyebrow: "Elite & Majors · PDGA",
    title: "Players",
    blurb:
      "Tour pros with Elite & Major finishes — event history, wins and podiums linked to multi-producer round coverage.",
    accent: "#7c3aed",
  },
  {
    href: "/leaderboards/asia",
    eyebrow: "PDGA · Asia & SE Asia",
    title: "Asia Leaderboard",
    blurb:
      "Live PDGA standings for MPO + FPO pros across Japan, Thailand, Korea, Taiwan, the Philippines and beyond. Official 2026 Asia Tour rankings.",
    accent: "#db2777",
  },
  {
    href: "/leaderboards/coverage",
    eyebrow: "Jomez · GK Pro · Gatekeeper",
    title: "Tournament Coverage",
    blurb:
      "Same event, different cards — watch JomezPro, GK Pro, and Gatekeeper round videos aligned by upload date and round.",
    accent: "#c2410c",
  },
];

export default function LeaderboardsHubPage() {
  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="page-hero">
        <p className="page-hero-eyebrow">2026 Season</p>
        <h1 className="page-hero-title mt-2">Leaderboards</h1>
        <p className="page-hero-tag">
          Live tour standings, brand championship and Asia pro leaderboard — refreshed weekly.
        </p>
      </header>

      <div className="leaderboard-hub-grid">
        {boards.map((b) => (
          <Link key={b.href} href={b.href} className="leaderboard-hub-card">
            <span
              className="leaderboard-hub-card-bar"
              style={{ background: b.accent }}
              aria-hidden
            />
            <span className="leaderboard-hub-card-eyebrow">{b.eyebrow}</span>
            <h2 className="leaderboard-hub-card-title">{b.title}</h2>
            <p className="leaderboard-hub-card-blurb">{b.blurb}</p>
            <span className="leaderboard-hub-card-cta">View standings →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
