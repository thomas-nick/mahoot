import type { Metadata } from "next";
import { CoverageDashboard } from "../_components/CoverageDashboard";
import { loadCoverageCatalog } from "../_lib/coverageData";

export const metadata: Metadata = {
  title: "Tournament Coverage · Multi-Producer",
  description:
    "Watch the same DGPT event across JomezPro, GK Pro, and Gatekeeper Media — rounds aligned by upload date and card.",
};

export default async function CoveragePage() {
  const data = await loadCoverageCatalog();
  if (!data) {
    return (
      <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="coverage-empty">
          Coverage catalog not found. Run build_coverage_catalog.py --mahoot from the ytapi repo.
        </p>
      </div>
    );
  }
  return <CoverageDashboard data={data} />;
}
