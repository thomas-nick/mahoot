import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverageWatchGrid } from "../../_components/CoverageWatchGrid";
import { SiteNav } from "../../_components/SiteNav";
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

  return (
    <>
      <div className="page-content mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <SiteNav />
      </div>
      <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/leaderboards/coverage" className="coverage-back">
          ← All coverage events
        </Link>

        <header className="page-hero mt-4">
          <p className="page-hero-eyebrow">{event.year ?? "Event"}</p>
          <h1 className="page-hero-title mt-2">{event.title ?? event.id.replace(/_/g, " ")}</h1>
          <p className="page-hero-tag">
            {event.source_labels.join(" · ")} · {event.video_count} round videos
            {event.upload_window.earliest && event.upload_window.latest
              ? ` · uploaded ${event.upload_window.earliest} – ${event.upload_window.latest}`
              : ""}
          </p>
        </header>

        <section className="asia-section">
          <div className="asia-section-header">
            <div>
              <h2 className="asia-section-title">Watch grid</h2>
              <p className="asia-section-sub">
                Same round, different producers — pick your commentary team and card.
              </p>
            </div>
          </div>
          <CoverageWatchGrid event={event} sourceLabels={catalog.source_labels} />
        </section>
      </div>
    </>
  );
}
