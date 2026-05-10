import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AsiaCountryFlagHero } from "@/app/asia/AsiaCountryFlagHero";
import { AsiaCountryTabNav, normalizeAsiaCountryTab } from "@/app/asia/AsiaCountryTabNav";
import { MemberShell, memberActivityCardTint, memberSectionSurface } from "@/app/components/MemberShell";
import { RatingChip } from "@/app/components/RatingChip";
import { Avatar, Card, CardHeader, EmptyState, Notice } from "@/app/components/ui";
import { getAsiaCountryConfig } from "@/lib/asia-regions";
import { resolvePublicUserAndProfile } from "@/lib/public-profile-strapi";
import {
  getCourses,
  getMostReviewedCourses,
  getPublicProfilesByCountry,
  getPublicProfilesByCountryRankedByReviewerActivity,
  getTopRatedCourses,
  toAbsoluteStrapiUrl,
  type Course,
  type PublicProfileActivityEntry,
  type PublicProfileDirectoryEntry,
} from "@/lib/strapi";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getAsiaCountryConfig(slug);
  if (!config) return { title: "Asia" };
  return {
    title: `${config.name} disc golf — Mahoot`,
    description: `Courses and community in ${config.name} on Mahoot — directory, public profiles, and reviewer activity.`,
  };
}

const pdgaEventsSearchUrl = "https://www.pdga.com/tour/events";

function mediaKindLabel(kind: string | undefined) {
  switch (kind) {
    case "video":
      return "Video";
    case "article":
      return "Article";
    case "photo":
      return "Photo";
    case "social":
      return "Social";
    default:
      return "Link";
  }
}

export default async function AsiaCountryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const config = getAsiaCountryConfig(slug);
  if (!config) notFound();

  const tab = normalizeAsiaCountryTab(sp.tab);
  const country = config.strapiCountry;
  const mediaItems = config.mediaItems ?? [];
  const pdgaHistory = config.pdgaHistory ?? [];

  let courses: Course[] = [];
  let topRated: Course[] = [];
  let mostReviewed: Course[] = [];
  let directory: PublicProfileDirectoryEntry[] = [];
  let activityLeaders: PublicProfileActivityEntry[] = [];
  let spotlight: Array<{ blurb: string; username: string; label: string }> = [];

  if (tab === "overview") {
    const spotlightResolved = await Promise.all(
      config.curatedSpotlight.map(async (row) => {
        const bundle = await resolvePublicUserAndProfile(row.username);
        if (!bundle?.user?.username) return null;
        return {
          blurb: row.blurb,
          username: bundle.user.username,
          label: bundle.profile?.displayName?.trim() || bundle.user.username,
        };
      }),
    );
    spotlight = spotlightResolved.filter(Boolean) as Array<{ blurb: string; username: string; label: string }>;
  }

  if (tab === "courses") {
    const [coursesResult, tr, mr] = await Promise.all([
      getCourses({ country, page: 1, pageSize: 24 }),
      getTopRatedCourses({ limit: 8, country }),
      getMostReviewedCourses({ limit: 8, country }),
    ]);
    courses = coursesResult.items ?? [];
    topRated = tr;
    mostReviewed = mr;
  }

  if (tab === "community") {
    const [dir, leaders] = await Promise.all([
      getPublicProfilesByCountry(country, 48),
      getPublicProfilesByCountryRankedByReviewerActivity(country, 12),
    ]);
    directory = dir;
    activityLeaders = leaders;
  }

  return (
    <MemberShell className="space-y-8">
      <AsiaCountryFlagHero
        name={config.name}
        iso2={config.iso2}
        subtitle="Community spotlight and Mahoot data — course directory, public profiles, and reviewer activity (not PDGA rankings)."
      />

      <AsiaCountryTabNav slug={config.slug} active={tab} />

      {tab === "overview" ? (
        <>
          <Card className={`border-white/60 ${memberSectionSurface}`}>
            <CardHeader title="On the ground" description="Short editorial context for this country." />
            <div className="space-y-3 text-sm leading-relaxed text-slate-700">
              {config.narrative.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <p className="text-xs text-slate-500">
                National competitive rankings can ship when we have clear, permissioned sources. Until then we label
                leaderboards honestly.
              </p>
            </div>
          </Card>

          {spotlight.length > 0 ? (
            <Card className={`border-white/60 ${memberSectionSurface}`}>
              <CardHeader
                title="Community spotlight"
                description="Curated locals — nominated copy, not a skill ladder."
              />
              <ul className="space-y-3">
                {spotlight.map((row) => (
                  <li key={row.username}>
                    <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3">
                      <Link
                        href={`/u/${encodeURIComponent(row.username)}`}
                        className="font-semibold text-slate-900 hover:text-sky-800"
                      >
                        {row.label}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">{row.blurb}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className={`border-white/60 ${memberSectionSurface}`}>
            <CardHeader title="Explore this hub" description="Jump to courses, community, media, and PDGA history." />
            <ul className="grid gap-2 sm:grid-cols-2">
              <li>
                <Link
                  href={`/asia/${config.slug}?tab=courses`}
                  scroll={false}
                  className="block rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-sky-200"
                >
                  Courses on Mahoot →
                </Link>
              </li>
              <li>
                <Link
                  href={`/asia/${config.slug}?tab=community`}
                  scroll={false}
                  className="block rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-sky-200"
                >
                  Community directory →
                </Link>
              </li>
              <li>
                <Link
                  href={`/asia/${config.slug}?tab=media`}
                  scroll={false}
                  className="block rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-sky-200"
                >
                  Media →
                </Link>
              </li>
              <li>
                <Link
                  href={`/asia/${config.slug}?tab=pdga`}
                  scroll={false}
                  className="block rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-sky-200"
                >
                  PDGA history →
                </Link>
              </li>
              <li>
                <Link
                  href={`/asia/${config.slug}?tab=events`}
                  scroll={false}
                  className="block rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-sky-200"
                >
                  Tournaments & events →
                </Link>
              </li>
            </ul>
          </Card>
        </>
      ) : null}

      {tab === "courses" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Courses</h2>
          <p className="text-sm text-slate-600">
            Filtered by country field matching <span className="font-medium">{country}</span>.{" "}
            <Link
              href={`/courses?q=${encodeURIComponent(config.name)}`}
              className="font-medium text-sky-800 underline-offset-2 hover:underline"
            >
              Search all courses
            </Link>
            .
          </p>

          {(topRated.length > 0 || mostReviewed.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {topRated.length > 0 ? (
                <Card className={`border-white/60 ${memberSectionSurface}`}>
                  <CardHeader title="Top rated (Mahoot)" description="By community averages — min. one rating." />
                  <ul className="space-y-2">
                    {topRated.map((course: Course, i: number) => (
                      <li key={course.documentId}>
                        <Link
                          href={`/courses/${course.documentId}`}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-sm transition hover:border-sky-200 ${memberActivityCardTint(i)}`}
                        >
          <span className="font-medium text-slate-900">{course.name}</span>
                          <RatingChip average={course.ratingAverageOverall} count={course.ratingCount} size="sm" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {mostReviewed.length > 0 ? (
                <Card className={`border-white/60 ${memberSectionSurface}`}>
                  <CardHeader title="Most reviewed" description="Volume on Mahoot." />
                  <ul className="space-y-2">
                    {mostReviewed.map((course: Course, i: number) => (
                      <li key={`${course.documentId}-mr`}>
                        <Link
                          href={`/courses/${course.documentId}`}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-sm transition hover:border-sky-200 ${memberActivityCardTint(i)}`}
                        >
                          <span className="font-medium text-slate-900">{course.name}</span>
                          <span className="text-xs text-slate-500">{course.ratingCount ?? 0} reviews</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          )}

          {courses.length === 0 ? (
            <EmptyState
              label={`No courses tagged yet for “${country}”. Add or update a course in Strapi, or search the full directory while data grows.`}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {courses.map((course: Course, i: number) => (
                <li key={course.documentId}>
                  <Link
                    href={`/courses/${course.documentId}`}
                    className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 text-sm transition hover:border-sky-200 ${memberActivityCardTint(i)}`}
                  >
                    <span className="min-w-0 font-medium text-slate-900">
                      <span className="block truncate">{course.name}</span>
                      <span className="block truncate text-xs font-normal text-slate-500">
                        {[course.city, course.state].filter(Boolean).join(", ") || "Location TBD"}
                      </span>
                    </span>
                    <RatingChip average={course.ratingAverageOverall} count={course.ratingCount} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "community" ? (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Community directory</h2>
            <p className="text-sm text-slate-600">
              Public Mahoot members who set this country on their profile. Rows follow the same visibility rules as
              individual username pages (blocked accounts are excluded).
            </p>
            {directory.length === 0 ? (
              <Notice variant="info">
                No public profiles list this country yet — nudge locals to fill location in account settings.
              </Notice>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {directory.map((member, i) => (
                  <li key={member.userId}>
                    <Link
                      href={`/u/${encodeURIComponent(member.username)}`}
                      className={`flex items-center gap-3 rounded-2xl border border-slate-200/80 p-3 text-sm transition hover:border-sky-200 ${memberActivityCardTint(i)}`}
                    >
                      <Avatar
                        label={member.displayName ?? member.username}
                        src={toAbsoluteStrapiUrl(member.avatarUrl)}
                        size="md"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">
                          {member.displayName ?? member.username}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{member.city ?? member.username}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Active on Mahoot</h2>
            <p className="text-sm text-slate-600">
              Reviewer activity only: disc + course reviews and helpful votes on Mahoot. Not a measure of tournament
              skill.
            </p>
            {activityLeaders.length === 0 ? (
              <Notice variant="info">
                No reviewer activity yet from members listing this country — leave reviews to climb this list.
              </Notice>
            ) : (
              <ol className="space-y-2">
                {activityLeaders.map((row, index) => (
                  <li key={row.userId}>
                    <Link
                      href={`/u/${encodeURIComponent(row.username)}`}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 text-sm transition hover:border-sky-200 ${memberActivityCardTint(index)}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <Avatar
                          label={row.displayName ?? row.username}
                          src={toAbsoluteStrapiUrl(row.avatarUrl)}
                          size="sm"
                        />
                        <span className="min-w-0 truncate font-medium text-slate-900">
                          {row.displayName ?? row.username}
                        </span>
                      </span>
                      <span className="text-xs text-slate-600">
                        {row.discReviewCount} disc · {row.courseReviewCount} course · {row.helpfulVotesReceived} helpful
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}

      {tab === "media" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Media</h2>
          <p className="text-sm text-slate-600">
            Videos, photo albums, long-form stories, and social posts that help tell {config.name}&apos;s disc golf
            story. Add entries in{" "}
            <code className="rounded bg-slate-100 px-1 text-xs text-slate-800">asia-regions.ts</code> for this country.
          </p>
          {mediaItems.length === 0 ? (
            <Notice variant="info">
              Nothing listed yet — curate YouTube features, Instagram collections, local news, or tournament photo
              galleries here. Prefer static links you control so travelers get stable references.
            </Notice>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {mediaItems.map((item) => (
                <li key={`${item.href}-${item.title}`}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm transition hover:border-sky-200"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {mediaKindLabel(item.kind)}
                      </span>
                      {item.sourceLabel ? (
                        <span className="text-[11px] font-medium text-slate-400">{item.sourceLabel}</span>
                      ) : null}
                    </span>
                    <span className="mt-2 block font-semibold text-slate-900">{item.title}</span>
                    {item.description ? (
                      <span className="mt-1 block text-xs leading-snug text-slate-600">{item.description}</span>
                    ) : null}
                    <span className="mt-2 block truncate text-[11px] text-slate-400" aria-hidden>
                      {item.href}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "pdga" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Historical PDGA events</h2>
          <p className="text-sm text-slate-600">
            Manually curated links to official PDGA event pages (typically past sanctioned tournaments in or near{" "}
            {config.name}). Mahoot does not import PDGA results yet — this tab is a reading list, not a results database.
          </p>
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Find more on PDGA: </span>
              <a
                href={pdgaEventsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-800 underline-offset-2 hover:underline"
              >
                Browse PDGA tour events
              </a>{" "}
              and filter by location or date when the site allows.
            </p>
          </div>
          {pdgaHistory.length === 0 ? (
            <Notice variant="info">
              No historical events listed yet. Add `pdgaHistory` entries in country config — each row should point at
              the canonical event URL on pdga.com when possible.
            </Notice>
          ) : (
            <ol className="space-y-3">
              {[...pdgaHistory]
                .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
                .map((ev, i) => (
                  <li key={`${ev.href}-${i}`}>
                    <a
                      href={ev.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block rounded-2xl border border-slate-200/80 p-4 text-sm transition hover:border-sky-200 ${memberActivityCardTint(i)}`}
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        {ev.year ? (
                          <span className="font-mono text-xs font-semibold text-slate-500">{ev.year}</span>
                        ) : null}
                        {ev.tier ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {ev.tier}
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-1 block font-semibold text-slate-900">{ev.title}</span>
                      {ev.notes ? <span className="mt-1 block text-xs text-slate-600">{ev.notes}</span> : null}
                      <span className="mt-2 block truncate text-[11px] text-slate-400" aria-hidden>
                        {ev.href}
                      </span>
                    </a>
                  </li>
                ))}
            </ol>
          )}
        </section>
      ) : null}

      {tab === "events" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Tournaments &amp; events</h2>
          <p className="text-sm text-slate-600">
            Hand-maintained pointers — verify dates with the organizer or sanctioning body. We will add richer calendars
            when data has a stable home.
          </p>
          {config.eventLinks.length === 0 ? (
            <Notice variant="info">
              Add association or PDGA search links in code config when you have stable URLs for this country.
            </Notice>
          ) : (
            <ul className="space-y-2">
              {config.eventLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-sky-900 transition hover:border-sky-300"
                  >
                    {link.label}
                    {link.description ? (
                      <span className="mt-1 block text-xs font-normal text-slate-600">{link.description}</span>
                    ) : null}
                    <span className="mt-1 block text-[11px] text-slate-400" aria-hidden>
                      {link.href}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <p className="text-center text-sm text-slate-500">
        <Link href="/asia" className="font-medium text-sky-800 underline-offset-2 hover:underline">
          ← Asia hub
        </Link>
      </p>
    </MemberShell>
  );
}
