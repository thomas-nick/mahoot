import type { Metadata } from "next";
import { WorldsCoverageDashboard } from "../../_components/WorldsCoverageDashboard";
import { loadWorldsCoverageCatalog } from "../../_lib/worldsCoverageServerData";

export const metadata: Metadata = {
  title: "Worlds Coverage · Multi-Producer Archive",
  description:
    "Browse PDGA Pro Worlds and championship coverage from 2012–2025 across JomezPro, Gatekeeper, GK Pro, and Central Coast Disc Golf.",
};

export default async function WorldsCoveragePage() {
  const data = await loadWorldsCoverageCatalog();
  if (!data) {
    return (
      <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="coverage-empty">
          Worlds catalog not found. Run <code>build_worlds_catalog.py --mahoot</code> from the ytapi repo.
        </p>
      </div>
    );
  }
  return <WorldsCoverageDashboard data={data} />;
}
