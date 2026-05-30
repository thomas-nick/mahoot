import type { Metadata } from "next";
import { CoverageMatchupPage } from "../../_components/CoverageMatchupPage";
import { loadCoveragePlayer, loadCoveragePlayersIndex } from "../../_lib/coveragePlayerData";

export const metadata: Metadata = {
  title: "Head to head · Tournament Coverage",
  description: "Compare Elite and Major event finishes when two tour players entered the same events.",
};

type PageProps = {
  searchParams: Promise<{ a?: string; b?: string; pick?: string }>;
};

export default async function CoverageMatchupRoute({ searchParams }: PageProps) {
  const { a, b, pick } = await searchParams;
  const index = await loadCoveragePlayersIndex();
  if (!index) {
    return (
      <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="coverage-empty">Player index not found.</p>
      </div>
    );
  }

  const [playerA, playerB] = await Promise.all([
    a && /^\d+$/.test(a) ? loadCoveragePlayer(a) : Promise.resolve(null),
    b && /^\d+$/.test(b) ? loadCoveragePlayer(b) : Promise.resolve(null),
  ]);

  return (
    <CoverageMatchupPage
      index={index}
      playerA={playerA}
      playerB={playerB}
      initialA={a}
      initialB={b}
      pickFocus={pick === "b" ? "b" : pick === "a" ? "a" : undefined}
    />
  );
}
