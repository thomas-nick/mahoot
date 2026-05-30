import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoverageEventDashboard } from "../../_components/CoverageEventDashboard";
import { getCoverageEvent } from "../../_lib/coverageData";
import { loadCoverageCatalog } from "../../_lib/coverageServerData";
import { loadCoverageEventResults } from "../../_lib/coverageResultsData";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const catalog = await loadCoverageCatalog();
  const event = catalog ? getCoverageEvent(catalog, eventId) : null;
  return {
    title: event?.title ?? eventId.replace(/_/g, " "),
    description: event
      ? `Watch ${event.title} across ${event.source_labels.join(", ")}.`
      : "Multi-producer tournament coverage",
  };
}

export default async function CoverageEventPage({ params }: PageProps) {
  const { eventId } = await params;
  const catalog = await loadCoverageCatalog();
  if (!catalog) {
    notFound();
  }

  const event = getCoverageEvent(catalog, eventId);
  if (!event) {
    notFound();
  }

  const results = await loadCoverageEventResults(eventId);

  return <CoverageEventDashboard catalog={catalog} event={event} results={results} />;
}
