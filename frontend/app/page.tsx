import Link from "next/link";
import { CatalogSearch } from "@/app/components/CatalogSearch";
import { DiscImage } from "@/app/components/DiscImage";
import { getDiscs, getDiscRatingSummariesByDocumentIds, getFeaturedCatalogStats } from "@/lib/strapi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, featuredDiscs] = await Promise.all([
    getFeaturedCatalogStats(),
    getDiscs({ page: 1, pageSize: 6 }),
  ]);
  const ratingSummaries = await getDiscRatingSummariesByDocumentIds(
    featuredDiscs.items.map((disc) => disc.documentId),
  );
  const topReviewedDiscs = [...featuredDiscs.items]
    .map((disc) => ({
      disc,
      summary: ratingSummaries.get(disc.documentId) ?? null,
    }))
    .filter((item) => (item.summary?.ratingCount ?? 0) > 0)
    .sort((a, b) => {
      const countDelta = (b.summary?.ratingCount ?? 0) - (a.summary?.ratingCount ?? 0);
      if (countDelta !== 0) return countDelta;
      return (b.summary?.ratingAverageOverall ?? 0) - (a.summary?.ratingAverageOverall ?? 0);
    })
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm uppercase tracking-wide text-slate-500">Disc Golf CMS Frontend</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Search first. Discover faster.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Instant search across discs and courses is the core of this experience. Start typing to
          jump directly to what you want.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <CatalogSearch variant="hero" />
            <Link
              href="/courses"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Browse all
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Tip: use facet chips in the dropdown to refine results instantly.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/submit-course"
            className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-4 text-sm text-white transition hover:bg-slate-800"
          >
            <p className="text-xs uppercase tracking-wide text-slate-200">Contribute</p>
            <p className="mt-1 text-base font-semibold">Add Course</p>
            <p className="mt-1 text-xs text-slate-200">Share a new course and get it reviewed for publishing.</p>
          </Link>
          <Link
            href="/submit-disc"
            className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-4 text-sm text-white transition hover:bg-slate-800"
          >
            <p className="text-xs uppercase tracking-wide text-slate-200">Contribute</p>
            <p className="mt-1 text-base font-semibold">Add Disc</p>
            <p className="mt-1 text-xs text-slate-200">Send disc details while we roll out full disc submissions.</p>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/discs" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
            Browse Discs
          </Link>
          <Link href="/courses" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
            Browse Courses
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Published Discs</p>
          <p className="mt-1 text-3xl font-semibold">{stats.discTotal}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Published Courses</p>
          <p className="mt-1 text-3xl font-semibold">{stats.courseTotal}</p>
        </div>
      </section>

      {topReviewedDiscs.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Top reviewed discs</h2>
            <Link href="/discs" className="text-sm text-slate-600 underline hover:text-slate-900">
              View all discs
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {topReviewedDiscs.map(({ disc, summary }) => (
              <article
                key={disc.documentId}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
              >
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <DiscImage
                    src={disc.imageUrl}
                    alt={`${disc.name} preview`}
                    className="h-36 w-full object-cover"
                    fallbackLabel="No image"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm text-slate-500">{disc.brand || "Unknown brand"}</p>
                <Link href={`/discs/${disc.documentId}`} className="mt-1 block text-lg font-semibold hover:underline">
                  {disc.name}
                </Link>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded bg-slate-100 px-2 py-1">S {disc.speed ?? "-"}</span>
                  <span className="rounded bg-slate-100 px-2 py-1">G {disc.glide ?? "-"}</span>
                  <span className="rounded bg-slate-100 px-2 py-1">T {disc.turn ?? "-"}</span>
                  <span className="rounded bg-slate-100 px-2 py-1">F {disc.fade ?? "-"}</span>
                  <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                    {summary?.ratingAverageOverall ?? "-"} /10 ({summary?.ratingCount ?? 0})
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
