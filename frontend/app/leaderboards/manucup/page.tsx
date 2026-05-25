import type { Metadata } from "next";
import { Dashboard } from "../_components/Dashboard";
import { SiteNav } from "../_components/SiteNav";
import { loadManufacturersCupData } from "../_lib/data";
import { loadTimelineData } from "../_lib/timelineData";

export const metadata: Metadata = {
  title: "Manufacturers Cup",
  description:
    "DGPT constructors-style brand championship — every world-standing point a pro earns counts for their disc manufacturer. MPO & FPO live standings.",
  openGraph: {
    title: "Manucup · DGPT Manufacturers Cup",
    description:
      "F1-style constructors championship for disc golf brands. Live MPO & FPO standings.",
  },
};

export default async function ManucupPage() {
  const [data, timeline] = await Promise.all([
    loadManufacturersCupData(),
    loadTimelineData().catch(() => null),
  ]);

  return (
    <>
      <div className="page-content mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <SiteNav />
      </div>
      <Dashboard divisions={data.divisions} updatedAt={data.updated_at} timeline={timeline} />
    </>
  );
}
