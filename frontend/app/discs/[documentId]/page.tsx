import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscImage } from "@/app/components/DiscImage";
import { HelpfulVoteButton } from "@/app/components/HelpfulVoteButton";
import { RatingChip } from "@/app/components/RatingChip";
import { ReviewByline } from "@/app/components/ReviewByline";
import { BRAND_THEME_CLASSES, matchBrandGroupByName } from "@/app/marketplace/lib";
import { getDiscDimensionsByExternalId } from "@/lib/disc-dimensions";
import { rankFlightOnlyNeighbors } from "@/lib/disc-similarity";
import {
  getAllDiscsForSimilarity,
  getDiscByDocumentId,
  getDiscRatingsByDocumentId,
  getMarketListingsByDiscDocumentId,
  getMoldReleaseSiblings,
} from "@/lib/strapi";
import { DiscRatingForm } from "./DiscRatingForm";
import { EditDiscLink } from "./EditDiscLink";
import { MarketplaceListingForm } from "./MarketplaceListingForm";
import { QuickRating } from "./QuickRating";

export const dynamic = "force-dynamic";

type DiscDetailProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type DiscTab = "specs" | "similar" | "releases" | "marketplace";

const RELEASE_TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  "limited-edition": "Limited edition",
  "tour-series": "Tour series",
  "money-run": "Money run",
  "tournament-run": "Tournament run",
};

const formatReleaseType = (value: string | null | undefined) => {
  if (!value) return "Stock";
  return RELEASE_TYPE_LABELS[value] ?? value.replace(/-/g, " ");
};

const formatProductionStatus = (value: string | null | undefined) => {
  if (value === "oop") return "Out of production";
  return "In production";
};

const formatPriceRange = (low: number | null | undefined, high: number | null | undefined) => {
  if (low != null && high != null) return `$${low}–$${high}`;
  if (low != null) return `from $${low}`;
  if (high != null) return `up to $${high}`;
  return null;
};

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
  // Accept legacy `?tab=collector` for backwards compatibility but render it as the new releases tab.
  const normalizedTab = tab === "collector" ? "releases" : tab;
  const activeTab: DiscTab =
    normalizedTab === "similar" || normalizedTab === "releases" || normalizedTab === "marketplace"
      ? normalizedTab
      : "specs";
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
  const [allDiscs, discRatings, releaseSiblings, marketListings] = await Promise.all([
    getAllDiscsForSimilarity(),
    getDiscRatingsByDocumentId(documentId),
    getMoldReleaseSiblings({
      moldExternalId: disc.moldExternalId,
      excludeDocumentId: disc.documentId,
    }),
    getMarketListingsByDiscDocumentId(documentId),
  ]);
  const similarByFlight = rankFlightOnlyNeighbors(disc, allDiscs, 5);
  const ratingSummary = summarizeRatings(discRatings);
  const isCollectorRelease = (disc.releaseType ?? "stock") !== "stock";
  const priceRange = formatPriceRange(disc.priceLowUsd, disc.priceHighUsd);

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/discs" className="inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Back to discs
        </Link>
        <EditDiscLink documentId={disc.documentId} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 md:aspect-auto">
            <DiscImage
              src={disc.imageUrl}
              alt={`${disc.name} image`}
              className="h-full w-full object-cover"
              fallbackLabel="No image available"
              loading="eager"
            />
          </div>

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            {(() => {
              const brandGroup = matchBrandGroupByName(disc.brand);
              if (!brandGroup) {
                return <p className="text-sm text-slate-500">{disc.brand || "Unknown brand"}</p>;
              }
              const classes = BRAND_THEME_CLASSES[brandGroup.theme];
              return (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-500">{disc.brand}</span>
                  <Link
                    href={`/marketplace?group=${brandGroup.id}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition hover:opacity-80 ${classes.chip}`}
                    title={`Browse the ${brandGroup.label} marketplace group`}
                  >
                    {brandGroup.label} group →
                  </Link>
                </div>
              );
            })()}
            <div>
              <h1 className="text-3xl font-semibold">{getDiscDisplayName(disc)}</h1>
              <p className="mt-1 text-sm text-slate-600">{disc.category || "No category"}</p>
              {(isCollectorRelease || (disc.productionStatus ?? "in-production") === "oop") ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isCollectorRelease ? (
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {formatReleaseType(disc.releaseType)}
                    </span>
                  ) : null}
                  {(disc.productionStatus ?? "in-production") === "oop" ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                      Out of production
                    </span>
                  ) : null}
                  {disc.runYear ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                      {disc.runYear}
                      {disc.runName ? ` · ${disc.runName}` : ""}
                    </span>
                  ) : disc.runName ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                      {disc.runName}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <RatingChip
                average={ratingSummary.averageOverall}
                count={ratingSummary.count}
                size="lg"
                emphasis="headline"
              />
              <a
                href="#reviews"
                className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
              >
                Read or write a review →
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label="Speed" value={disc.speed} />
              <Metric label="Glide" value={disc.glide} />
              <Metric label="Turn" value={disc.turn} />
              <Metric label="Fade" value={disc.fade} />
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="space-y-4 scroll-mt-24">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
          <p className="mt-1 text-sm text-slate-600">
            {ratingSummary.count > 0
              ? `${ratingSummary.count} player rating${ratingSummary.count === 1 ? "" : "s"} so far.`
              : "No ratings yet — be the first to share what this disc actually does."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Average overall" value={ratingSummary.averageOverall} />
          <Metric label="Review count" value={ratingSummary.count} />
          <Metric label="Avg turn delta" value={ratingSummary.averageTurnDelta} />
          <Metric label="Avg stability delta" value={ratingSummary.averageStabilityDelta} />
        </div>

        <QuickRating
          discDocumentId={disc.documentId}
          discExternalId={disc.externalId}
          discName={disc.name}
        />

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
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <ReviewByline
                      userId={rating.submittedBy?.id ?? null}
                      username={rating.submittedBy?.username ?? null}
                      emailFallback={rating.submittedBy?.email ?? null}
                      createdAt={rating.createdAt}
                    />
                    <HelpfulVoteButton
                      kind="disc"
                      ratingDocumentId={rating.documentId}
                      initialHelpfulCount={rating.helpfulCount ?? 0}
                      reviewAuthorUserId={rating.submittedBy?.id ?? null}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="full-review-form" className="scroll-mt-24">
          <DiscRatingForm
            discDocumentId={disc.documentId}
            discExternalId={disc.externalId}
            discName={disc.name}
          />
        </section>
      </section>

      <div className="relative">
        <nav className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            <TabLink href={`/discs/${disc.documentId}`} label="Specs & Dimensions" active={activeTab === "specs"} />
            <TabLink
              href={`/discs/${disc.documentId}?tab=similar`}
              label="Similar Other Molds"
              active={activeTab === "similar"}
            />
            <TabLink
              href={`/discs/${disc.documentId}?tab=releases`}
              label="Other releases"
              active={activeTab === "releases"}
            />
            <TabLink
              href={`/discs/${disc.documentId}?tab=marketplace`}
              label="Marketplace"
              active={activeTab === "marketplace"}
            />
          </div>
        </nav>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-slate-50 to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-slate-50 to-transparent sm:hidden" />
      </div>

      {activeTab === "specs" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Specs &amp; dimensions</h2>
          <p className="mt-1 text-sm text-slate-600">Manufacturer-published data for {disc.name}.</p>

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

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="Stability" value={disc.stability} />
            <Info label="Plastic" value={disc.plasticName ?? null} />
          </div>
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

      {activeTab === "releases" ? (
        <section className="space-y-6">
          {isCollectorRelease ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Release details</h2>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {formatReleaseType(disc.releaseType)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {formatProductionStatus(disc.productionStatus)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {[disc.runYear, disc.runName].filter(Boolean).join(" · ") ||
                  "Special-edition run details for this variant."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                <MetricPill label="Collector value" value={disc.collectorValue ?? null} />
                <MetricPill label="Rarity" value={disc.rarity ?? null} />
                <MetricPill label="Sought after" value={disc.soughtAfter ?? null} />
              </div>
              {priceRange ? (
                <p className="mt-2 text-xs text-slate-600">
                  Estimated value: <span className="font-medium text-slate-900">{priceRange}</span>
                </p>
              ) : null}
              {disc.runNotes ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{disc.runNotes}</p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">Other releases of this mold</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tour-series, limited-edition, and special runs of {disc.moldName ?? disc.name}.
            </p>
            {releaseSiblings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No other releases on file yet — submit a new disc variant to add one.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {releaseSiblings.map((sibling) => {
                  const siblingPrice = formatPriceRange(sibling.priceLowUsd, sibling.priceHighUsd);
                  const yearLabel =
                    typeof sibling.runYear === "number" && Number.isFinite(sibling.runYear)
                      ? sibling.runYear
                      : null;
                  const detailParts = [
                    sibling.plasticName,
                    yearLabel,
                    sibling.runName,
                    siblingPrice,
                  ].filter(Boolean);
                  return (
                    <li key={sibling.documentId}>
                      <Link
                        href={`/discs/${sibling.documentId}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{sibling.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {formatReleaseType(sibling.releaseType)}
                          </span>
                          {(sibling.productionStatus ?? "in-production") === "oop" ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              OOP
                            </span>
                          ) : null}
                        </span>
                        {detailParts.length > 0 ? (
                          <span className="text-xs text-slate-600">{detailParts.join(" · ")}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === "marketplace" ? (
        <section className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">Marketplace</h2>
            <p className="mt-1 text-sm text-slate-600">
              Peer-to-peer listings for this disc. Payments and shipping are between buyer and seller for now.
            </p>

            {marketListings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No active listings yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {marketListings.map((listing) => (
                  <li
                    key={listing.documentId ?? String(listing.id)}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-medium text-slate-900">{listing.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      ${Number(listing.priceUsd).toFixed(2)}{" "}
                      {listing.currency && listing.currency !== "USD" ? listing.currency : ""}
                      {listing.condition ? ` · ${listing.condition}` : ""}
                    </p>
                    {listing.description ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Seller: {listing.seller?.username || listing.seller?.email || "Community member"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">Sell this disc</h3>
            <p className="mt-1 text-sm text-slate-600">Create a listing tied to this disc variant.</p>
            <MarketplaceListingForm
              discDocumentId={disc.documentId}
              discExternalId={disc.externalId}
              discDisplayName={getDiscDisplayName(disc)}
            />
          </section>
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

function MetricPill({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1">
      {label}: {value ?? "-"}
      {value !== null ? "/10" : ""}
    </span>
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

