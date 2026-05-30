import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoverageEventDashboard } from "../../_components/CoverageEventDashboard";
import { getCoverageEvent, loadCoverageCatalog } from "../../_lib/coverageData";

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

  return <CoverageEventDashboard catalog={catalog} event={event} />;
}
