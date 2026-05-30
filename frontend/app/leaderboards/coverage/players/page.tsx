import type { Metadata } from "next";
import { CoveragePlayersPage } from "../../_components/CoveragePlayersPage";
import { loadCoverageMediaStatsIndex } from "../../_lib/coverageMediaData";
import { loadCoveragePlayersIndex } from "../../_lib/coveragePlayerData";

export const metadata: Metadata = {
  title: "Players · Tournament Coverage",
  description:
    "Elite & Major tour players with linked event finishes, streaks, and round coverage across JomezPro, GK Pro, and Gatekeeper.",
};

export default async function CoveragePlayersRoute() {
  const [index, mediaIndex] = await Promise.all([
    loadCoveragePlayersIndex(),
    loadCoverageMediaStatsIndex(),
  ]);
  if (!index) {
    return (
      <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="coverage-empty">
          Player index not found. Run build_coverage_players.py from scripts/leaderboards.
        </p>
      </div>
    );
  }
  return <CoveragePlayersPage index={index} mediaIndex={mediaIndex} />;
}
