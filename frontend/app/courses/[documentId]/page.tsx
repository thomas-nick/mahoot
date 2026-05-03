import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpfulVoteButton } from "@/app/components/HelpfulVoteButton";
import { RatingChip } from "@/app/components/RatingChip";
import { ReviewByline } from "@/app/components/ReviewByline";
import { getCourseByDocumentId, getCourseRatingsByDocumentId, toAbsoluteStrapiUrl } from "@/lib/strapi";
import { CourseRatingForm } from "./CourseRatingForm";
import { EditCourseLink } from "./EditCourseLink";
import { NearbyCourses } from "./NearbyCourses";

export const dynamic = "force-dynamic";

type CourseDetailProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type CourseTab = "details" | "layouts" | "media";

export default async function CourseDetailPage({ params, searchParams }: CourseDetailProps) {
  const { documentId } = await params;
  const { tab } = await searchParams;
  const activeTab: CourseTab = tab === "layouts" || tab === "media" ? tab : "details";
  const [course, ratings] = await Promise.all([
    getCourseByDocumentId(documentId),
    getCourseRatingsByDocumentId(documentId),
  ]);

  if (!course) {
    notFound();
  }

  const photoUrls = (course.photos ?? [])
    .map((photo) => toAbsoluteStrapiUrl(photo?.url))
    .filter((url): url is string => Boolean(url));
  const primaryPhoto = photoUrls[0] ?? null;
  const fallbackGif = "/mahootlabs-placeholder.png";
  const layouts = Array.isArray(course.layouts) ? course.layouts : [];

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/courses" className="inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Back to courses
        </Link>
        <EditCourseLink documentId={course.documentId} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative min-h-[440px] sm:min-h-[540px]">
          <Image
            src={primaryPhoto ?? fallbackGif}
            alt={primaryPhoto ? `${course.name} photo` : "Course media placeholder"}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/45 to-slate-900/15" />

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <p className="text-sm text-slate-100/90">
              {[course.city, course.state, course.country, course.zip].filter(Boolean).join(", ") ||
                "Unknown location"}
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{course.name}</h1>
              <a
                href="#reviews"
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white"
              >
                <span aria-hidden>★</span>
                {course.ratingAverageOverall !== null
                  ? `${course.ratingAverageOverall}/10 (${course.ratingCount ?? 0})`
                  : "Be the first to review"}
              </a>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <HeroStat label="Reviews" value={course.ratingCount ?? 0} />
              <HeroStat label="Layout" value={course.ratingAverageLayout} />
              <HeroStat label="Signage" value={course.ratingAverageSignage} />
              <HeroStat label="Maintenance" value={course.ratingAverageMaintenance} />
              <HeroStat label="Scenery" value={course.ratingAverageScenery} />
              <HeroStat label="Difficulty" value={course.difficulty ?? "-"} />
              <HeroStat label="Type" value={course.type ?? "-"} />
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="space-y-4 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
            <p className="mt-1 text-sm text-slate-600">
              {(course.ratingCount ?? 0) > 0
                ? `${course.ratingCount} player rating${(course.ratingCount ?? 0) === 1 ? "" : "s"}.`
                : "No reviews yet — be the first."}
            </p>
          </div>
          <RatingChip
            average={course.ratingAverageOverall ?? null}
            count={course.ratingCount ?? 0}
            size="lg"
            emphasis="headline"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          {ratings.length === 0 ? (
            <p className="text-sm text-slate-600">
              No reviews yet. Be the first to rate this course — it&apos;ll appear on the leaderboards.
            </p>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating) => (
                <article key={rating.documentId ?? String(rating.id)} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Overall {rating.overall ?? "-"} / 10
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {[
                        `Layout ${rating.layout ?? "-"}`,
                        `Signage ${rating.signage ?? "-"}`,
                        `Maintenance ${rating.maintenance ?? "-"}`,
                        `Scenery ${rating.scenery ?? "-"}`,
                      ].join(" · ")}
                    </span>
                  </p>
                  {rating.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{rating.comment}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <ReviewByline
                      userId={rating.submittedBy?.id ?? null}
                      username={rating.submittedBy?.username ?? null}
                      emailFallback={rating.submittedBy?.email ?? null}
                      createdAt={rating.createdAt}
                    />
                    <HelpfulVoteButton
                      kind="course"
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Rate this course</h3>
          <p className="mt-1 text-sm text-slate-600">Share your experience to help other players.</p>
          <div className="mt-4">
            <CourseRatingForm courseDocumentId={course.documentId} />
          </div>
        </section>
      </section>

      <div className="relative">
        <nav className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            <TabLink href={`/courses/${course.documentId}`} label="Course details" active={activeTab === "details"} />
            <TabLink
              href={`/courses/${course.documentId}?tab=layouts`}
              label="Layouts & Holes"
              active={activeTab === "layouts"}
            />
            <TabLink href={`/courses/${course.documentId}?tab=media`} label="Media" active={activeTab === "media"} />
          </div>
        </nav>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-slate-50 to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-slate-50 to-transparent sm:hidden" />
      </div>

      {activeTab === "details" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Course Notes</h2>
            {(course.description || course.pros || course.cons || course.latitude !== null || course.longitude !== null) ? (
              <article className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {course.description && (
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{course.description}</p>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {course.pros && (
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Pros:</span> {course.pros}
                    </p>
                  )}
                  {course.cons && (
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Cons:</span> {course.cons}
                    </p>
                  )}
                </div>
                {(course.latitude !== null || course.longitude !== null) && (
                  <p className="mt-2 text-xs text-slate-500">
                    Coordinates: {course.latitude ?? "-"}, {course.longitude ?? "-"}
                  </p>
                )}
              </article>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No overview notes added yet.</p>
            )}
          </section>
          <div className="space-y-3">
            {course.latitude !== null && course.longitude !== null ? (
              <a
                href={`https://www.google.com/maps?q=${course.latitude},${course.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Get Directions
              </a>
            ) : null}
            <NearbyCourses query={course.name} currentCourseId={course.documentId} limit={5} />
          </div>
        </div>
      )}

      {activeTab === "layouts" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Layouts & Holes</h2>
            <Link
              href={`/courses/${course.documentId}/edit?focus=layouts`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:border-slate-400"
            >
              Add or edit layouts
            </Link>
          </div>
          {layouts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No layout data yet. Add course `layouts` JSON in Strapi to show hole-by-hole info.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {layouts.map((layout, index) => {
                const holes = Array.isArray(layout?.holeDetails) ? layout.holeDetails : [];
                return (
                  <article key={`${layout?.name ?? "layout"}-${index}`} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{layout?.name || `Layout ${index + 1}`}</h3>
                      <p className="text-xs text-slate-600">
                        {[
                          layout?.holes ? `${layout.holes} holes` : null,
                          layout?.parTotal ? `Par ${layout.parTotal}` : null,
                          layout?.distanceFtTotal ? `${layout.distanceFtTotal} ft` : null,
                          layout?.distanceMTotal ? `${layout.distanceMTotal} m` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No totals"}
                      </p>
                    </div>
                    {layout?.notes && <p className="mt-2 text-sm text-slate-700">{layout.notes}</p>}
                    {holes.length > 0 ? (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="pr-4 py-2">Hole</th>
                              <th className="pr-4 py-2">Par</th>
                              <th className="pr-4 py-2">Distance (ft)</th>
                              <th className="pr-4 py-2">Distance (m)</th>
                              <th className="py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {holes.map((hole, holeIndex) => (
                              <tr key={`${hole?.holeNumber ?? "h"}-${holeIndex}`} className="border-t border-slate-100">
                                <td className="pr-4 py-2 text-slate-800">{hole?.holeNumber ?? holeIndex + 1}</td>
                                <td className="pr-4 py-2 text-slate-800">{hole?.par ?? "-"}</td>
                                <td className="pr-4 py-2 text-slate-800">{hole?.distanceFt ?? "-"}</td>
                                <td className="pr-4 py-2 text-slate-800">{hole?.distanceM ?? "-"}</td>
                                <td className="py-2 text-slate-700">{hole?.notes ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">No hole details listed for this layout.</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "media" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Course Media</h2>
          {course.videoLinks && course.videoLinks.length > 0 ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {course.videoLinks.map((link) => {
                const embedUrl = toEmbeddedVideoUrl(link);
                return (
                  <article key={link} className="rounded-xl border border-slate-200 p-4">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={`Course video ${link}`}
                        className="aspect-video w-full rounded-lg border border-slate-200"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : null}
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-3 block truncate text-sm text-slate-700 underline hover:text-slate-900 ${
                        embedUrl ? "" : "mt-0"
                      }`}
                    >
                      {link}
                    </a>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No media links yet. Add YouTube links in the course `videoLinks` field in Strapi.
            </p>
          )}
        </section>
      )}
    </article>
  );
}

function toEmbeddedVideoUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host === "youtu.be") {
      const videoId = url.pathname.replace("/", "").trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("vimeo.com")) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const videoId = pathParts[pathParts.length - 1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
  } catch {
    return null;
  }
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

function HeroStat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-xl border border-white/25 bg-white/88 p-2.5 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value ?? "-"}</p>
    </div>
  );
}
