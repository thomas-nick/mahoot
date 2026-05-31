import type { Metadata } from "next";
import { SkinsDashboard } from "../_components/SkinsDashboard";
import { loadSkinsData } from "../_lib/skinsServerData";

export const metadata: Metadata = {
  title: "Tour Skins · GK Pro & Go Throw",
  description:
    "OTB Tour Skins, Go Throw Tour Skins, and GK Pro event skins — episode rosters, hole-by-hole payouts, and player earnings.",
};

export default async function SkinsPage() {
  const data = await loadSkinsData();
  if (!data) {
    return (
      <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="coverage-empty">
          Skins data not found. Run <code>build_gothrow_dashboard.py --mahoot</code> from the ytapi repo.
        </p>
      </div>
    );
  }
  return <SkinsDashboard data={data} />;
}
