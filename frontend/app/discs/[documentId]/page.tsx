import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscImage } from "@/app/components/DiscImage";
import { getDiscDimensionsByExternalId } from "@/lib/disc-dimensions";
import { rankFlightOnlyNeighbors } from "@/lib/disc-similarity";
import {
  getAllDiscsForSimilarity,
  getCollectorReleasesByDiscDocumentId,
  getDiscByDocumentId,
  getDiscRatingsByDocumentId,
} from "@/lib/strapi";
import { CollectorReleaseForm } from "./CollectorReleaseForm";
import { CollectorReleaseManager } from "./CollectorReleaseManager";
import { DiscRatingForm } from "./DiscRatingForm";
import { EditDiscLink } from "./EditDiscLink";

export const dynamic = "force-dynamic";

type DiscDetailProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type DiscTab = "overview" | "similar" | "reviews" | "collector";

const getDiscDisplayName = (disc: {
  name: string;
  plasticName?: string | null;
}) => {
  const plastic = (disc.plasticName ?? "").trim();
  if (!plastic) return disc.name;
  const lowerName = disc.name.toLowerCase();
  const lowerPlastic = plastic.toLowerCase();
  if (lowerName.includes(lowerPlastic)) return disc.name;
  return `${plastic} ${disc.name}`.trim();
};

export default async function DiscDetailPage({ params, searchParams }: DiscDetailProps) {
  const { documentId } = await params;
  const { tab } = await searchParams;
  const activeTab: DiscTab = tab === "similar" || tab === "reviews" || tab === "collector" ? tab : "overview";
  const disc = await getDiscByDocumentId(documentId);

  if (!disc) {
    notFound();
  }

  const csvDimensions = await getDiscDimensionsByExternalId(disc.moldExternalId ?? disc.externalId);
  const dimensions = {
    diameterCm: disc.diameterCm ?? csvDimensions.diameterCm,
    heightCm: disc.heightCm ?? csvDimensions.heightCm,
    rimDepthCm: disc.rimDepthCm ?? csvDimensions.rimDepthCm,
    rimThicknessCm: disc.rimThicknessCm ?? csvDimensions.rimThicknessCm,
    maxWeightGr: disc.maxWeightGr ?? csvDimensions.maxWeightGr,
  };
  const [allDiscs, discRatings, collectorReleases] = await Promise.all([
    getAllDiscsForSimilarity(),
    getDiscRatingsByDocumentId(documentId),
    getCollectorReleasesByDiscDocumentId(documentId),
  ]);
  const similarByFlight = rankFlightOnlyNeighbors(disc, allDiscs, 5);
  const ratingSummary = summarizeRatings(discRatings);

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/discs" className="inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Back to discs
        </Link>
        <EditDiscLink documentId={disc.documentId} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <DiscImage
            src={disc.imageUrl}
            alt={`${disc.name} image`}
            className="h-64 w-full object-cover"
            fallbackLabel="No image available"
            loading="eager"
          />
        </div>
        <p className="text-sm text-slate-500">{disc.brand || "Unknown brand"}</p>
        <h1 className="mt-1 text-3xl font-semibold">{getDiscDisplayName(disc)}</h1>
        <p className="mt-2 text-slate-600">{disc.category || "No category"}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Metric label="Speed" value={disc.speed} />
          <Metric label="Glide" value={disc.glide} />
          <Metric label="Turn" value={disc.turn} />
          <Metric label="Fade" value={disc.fade} />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Dimensions</p>
          <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-5">
            <DimensionMetric label="Diameter" value={dimensions.diameterCm} unit="cm" />
            <DimensionMetric label="Height" value={dimensions.heightCm} unit="cm" />
            <DimensionMetric label="Rim depth" value={dimensions.rimDepthCm} unit="cm" />
            <DimensionMetric label="Rim thickness" value={dimensions.rimThicknessCm} unit="cm" />
            <DimensionMetric label="Max weight" value={dimensions.maxWeightGr} unit="g" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="Stability" value={disc.stability} />
          <Info label="Plastic" value={disc.plasticName ?? null} />
        </div>
      </section>

      <div className="relative">
        <nav className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            <TabLink href={`/discs/${disc.documentId}`} label="Overview" active={activeTab === "overview"} />
            <TabLink
              href={`/discs/${disc.documentId}?tab=similar`}
              label="Similar Other Molds"
              active={activeTab === "similar"}
            />
            <TabLink
              href={`/discs/${disc.documentId}?tab=reviews`}
              label="Reviews"
              active={activeTab === "reviews"}
            />
            <TabLink
              href={`/discs/${disc.documentId}?tab=collector`}
              label="Collector"
              active={activeTab === "collector"}
            />
          </div>
        </nav>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-slate-50 to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-slate-50 to-transparent sm:hidden" />
      </div>

      {activeTab === "overview" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Disc Overview</h2>
          <p className="mt-2 text-sm text-slate-600">
            Flight numbers, dimensions, and core attributes for {disc.name}.
          </p>
        </section>
      ) : null}

      {activeTab === "similar" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Similar Other Molds</h2>
          <p className="mt-1 text-sm text-slate-600">
            Based on speed, glide, turn, and fade distance with stricter speed matching.
          </p>

          {similarByFlight.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {similarByFlight.map((item, index) => (
                <Link
                  key={item.disc.documentId}
                  href={`/discs/${item.disc.documentId}`}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        #{index + 1} similar
                        {item.disc.brand ? ` • ${item.disc.brand}` : ""}
                      </p>
                      <p className="mt-1 font-medium text-slate-900">{item.disc.name}</p>
                    </div>
                    <div
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      title="Lower is better. Based on speed/glide/turn/fade distance."
                    >
                      score {item.flightDistance.toFixed(3)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {item.speedGap !== null ? `Speed gap: ${item.speedGap.toFixed(0)}` : "Speed gap unavailable"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No similar molds found yet.</p>
          )}
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">Disc Reviews</h2>
            <p className="mt-1 text-sm text-slate-600">Community ratings with turn/stability deltas.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Average overall" value={ratingSummary.averageOverall} />
              <Metric label="Review count" value={ratingSummary.count} />
              <Metric label="Avg turn delta" value={ratingSummary.averageTurnDelta} />
              <Metric label="Avg stability delta" value={ratingSummary.averageStabilityDelta} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Recent community reviews</h3>
            {discRatings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No reviews yet. Be the first to review this disc.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {discRatings.map((rating) => (
                  <article
                    key={rating.documentId ?? String(rating.id)}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      Overall {rating.overall ?? "-"} / 10
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {[
                          `Grip ${rating.feelGrip ?? "-"}`,
                          `Forgiving ${rating.forgiving ?? "-"}`,
                          `Wind ${rating.windTrust ?? "-"}`,
                          `Shaping ${rating.shotShaping ?? "-"}`,
                        ].join(" · ")}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[
                        rating.turnDelta !== null && rating.turnDelta !== undefined
                          ? `Turn delta ${rating.turnDelta > 0 ? `+${rating.turnDelta}` : rating.turnDelta}`
                          : null,
                        rating.stabilityDelta !== null && rating.stabilityDelta !== undefined
                          ? `Stability delta ${
                              rating.stabilityDelta > 0 ? `+${rating.stabilityDelta}` : rating.stabilityDelta
                            }`
                          : null,
                        rating.throwStyle ? `Style ${rating.throwStyle}` : null,
                        rating.armSpeedBand ? `Arm ${rating.armSpeedBand}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {rating.comment ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{rating.comment}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {(rating.submittedBy?.username || rating.submittedBy?.email || "Community member") +
                        " · " +
                        (rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : "Unknown date")}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <DiscRatingForm
            discDocumentId={disc.documentId}
            discExternalId={disc.externalId}
            discName={disc.name}
          />
        </section>
      ) : null}

      {activeTab === "collector" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Collector Runs</h2>
          <p className="mt-1 text-sm text-slate-600">
            Year-based collectible releases for this disc with value, rarity, and demand signals.
          </p>
          <CollectorReleaseManager releases={collectorReleases} />
          <CollectorReleaseForm
            discDocumentId={disc.documentId}
            discExternalId={disc.externalId}
            discName={disc.name}
          />
        </section>
      ) : null}
    </article>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {label}
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value ?? "-"}</p>
    </div>
  );
}

function summarizeRatings(
  ratings: Array<{
    overall: number | null;
    turnDelta: number | null;
    stabilityDelta: number | null;
  }>,
) {
  const average = (values: number[]) =>
    values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
  const overallValues = ratings.map((rating) => rating.overall).filter((value): value is number => value !== null);
  const turnValues = ratings
    .map((rating) => rating.turnDelta)
    .filter((value): value is number => value !== null);
  const stabilityValues = ratings
    .map((rating) => rating.stabilityDelta)
    .filter((value): value is number => value !== null);

  return {
    count: ratings.length,
    averageOverall: average(overallValues),
    averageTurnDelta: average(turnValues),
    averageStabilityDelta: average(stabilityValues),
  };
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || "-"}</p>
    </div>
  );
}

function DimensionMetric({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value == null ? "-" : `${value}${unit}`}</p>
    </div>
  );
}

